// createApp(): сборка Express-приложения (используется и сервером, и тестами).
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { db, isSeeded, migrate } from './db.js';
import { ApiError, errorHandler, notFoundHandler, requestLogger } from './http.js';
import { csrfOriginCheck } from './middleware.js';
import { authRouter, publicRouter } from './routes/auth.js';
import { createMeRouter } from './routes/me.js';
import { createScheduleRouter } from './routes/schedule.js';
import { createStudentRouter } from './routes/student.js';
import { createRequestsRouter } from './routes/requests.js';
import { createStaffRouter } from './routes/staff.js';
import { buildMeta } from './meta.js';
import { getToday } from './today.js';
import { runSeed } from './seed/run.js';
import { contextScreens, maybeResetExpiredDemo } from './lib/demo-lifecycle.js';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // CSP в dev не ставим — Vite HMR использует eval/inline и websocket.
  if (config.isProd) {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

export interface AppOptions {
  /** Не запускать seed автоматически (тесты наполняют БД сами). */
  seedOnEmpty?: boolean;
}

function isKnownApiPath(path: string): boolean {
  return KNOWN_API_PATHS.has(path) || KNOWN_API_DYNAMIC.some((re) => re.test(path));
}

const KNOWN_API_PATHS = new Set([
  '/auth/logout', '/auth/me', '/auth/tab',
  '/me/profile', '/me/scholarship', '/me/password', '/me/logout-all', '/me/2fa',
  '/schedule/today', '/schedule/week', '/schedule/export.ics',
  '/progress', '/deadlines', '/requests/types', '/requests', '/notifications',
  '/notifications/read-all', '/announcements', '/messages',
  '/staff/stats', '/staff/requests', '/staff/messages', '/staff/announcements',
]);
/** Динамические пути вида /requests/:id, /notifications/:id/read, /verify/:token */
const KNOWN_API_DYNAMIC = [
  /^\/requests\/\d+$/,
  /^\/requests\/\d+\/(cancel|document)$/,
  /^\/notifications\/\d+\/read$/,
  /^\/deadlines\/\d+\/toggle$/,
  /^\/staff\/requests\/\d+$/,
  /^\/staff\/messages\/\d+\/reply$/,
  /^\/verify\/[A-Za-z0-9._-]+$/,
];

export function createApp(options: AppOptions = {}): express.Express {
  migrate();
  if ((options.seedOnEmpty ?? process.env.SEED_ON_EMPTY !== '0') && !isSeeded()) {
    runSeed();
  }

  const app = express();
  // Доверяем одному проxy перед сервером (reverse proxy платформы) для req.ip.
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '64kb' }));
  // JSON-cookie: без внешних зависимостей, нужны для чтения сессии.
  app.use(cookieParser);
  app.use(csrfOriginCheck);

  // Публичные
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, data: { status: 'ok', time: new Date().toISOString() } });
  });
  app.get('/api/meta', (_req, res) => {
    if (maybeResetExpiredDemo()) {
      res.json({ ok: true, data: { ...buildMeta(getToday()), reset: true } });
      return;
    }
    res.json({ ok: true, data: buildMeta(getToday()) });
  });
  // Снимки экранов «холодного старта» (только демо-данные с вымышленными ФИО)
  app.get('/api/seed-context/:name', (req, res) => {
    const list = contextScreens();
    const name = String(req.params.name ?? '').replace(/\.png$/, '');
    const shot = list.find((s) => s.name === name);
    if (!shot) {
      res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Снимок не найден' } });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(shot.file);
  });
  app.use('/api', publicRouter); // /api/verify/:token
  app.use('/api', authRouter); // /api/auth/*

  // Авторизованные роуты. Каждый роутер регистрирует только свои пути, поэтому его guard
  // не перехватывает чужие запросы: неизвестный /api-путь доходит до notFoundHandler (404).
  // Неизвестные /api-пути отвечают JSON-404 раньше, чем сработают guard'ы роутеров.
  app.use('/api', (req, _res, next) => {
    if (!isKnownApiPath(req.path)) {
      next(new ApiError(404, 'NOT_FOUND', 'Такого метода API нет'));
      return;
    }
    next();
  });
  app.use('/api', createMeRouter());
  app.use('/api', createScheduleRouter());
  app.use('/api', createStudentRouter());
  app.use('/api', createRequestsRouter());
  app.use('/api', createStaffRouter());

  // Неизвестный /api-маршрут: 404 в конверте.
  app.use('/api', notFoundHandler);

  // Неизвестный /api-маршрут: 404 в конверте (не 401 от requireAuth зарегистрированных роутов).
  app.use('/api', notFoundHandler);

  // Статика собранного фронта + SPA fallback
  const indexHtml = path.join(config.webDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.webDist, {
        index: false,
        setHeaders(res, filePath) {
          if (isHashedAsset(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (req.path.startsWith('/api') || req.path.startsWith('/healthz')) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.get('/healthz', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    res.status(row.ok === 1 ? 200 : 503).type('text/plain').send('ok');
  });

  // Все ошибки (включая 404 неизвестных путей) — в едином конверте.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

/** Разбор заголовка Cookie в req.cookies (только имя=значение, без decodeURIComponent для сессии). */
function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (header) {
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      if (!name) continue;
      try {
        cookies[name] = decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        cookies[name] = part.slice(eq + 1).trim();
      }
    }
  }
  (req as Request & { cookies?: Record<string, string> }).cookies = cookies;
  next();
}

/** Vite кладёт в assets/ файлы с хешем в имени (index-abc123.js). */
function isHashedAsset(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/');
  if (!norm.includes('/assets/')) return false;
  return /\.[0-9a-f]{8,}\.(js|css|woff2?|ttf|png|svg|webp|jpg)$/i.test(norm);
}
