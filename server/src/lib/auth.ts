// Аутентификация и сессии: bcrypt, серверные сессии (в БД только SHA-256 хеш токена),
// throttle входных попыток, аудит и простой in-memory rate limiter.
import crypto from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { db } from '../db.js';
import { ApiError } from '../http.js';

export const BCRYPT_ROUNDS = 11;
export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000;
/** Продлеваем сессию при активности, если прошло больше часа с последнего продления. */
export const SESSION_RENEW_AFTER_MS = 60 * 60 * 1000;

export interface AuthUser {
  id: number;
  role: 'student' | 'staff';
  login: string;
}

// Расширяем Request текущим пользователем (ставит requireAuth / optionalAuth).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Пароли
// ---------------------------------------------------------------------------
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Политика пароля: ≥ 8 символов, буква + цифра, не совпадает с логином. */
export function checkPasswordPolicy(next: string, login: string): void {
  const weak: Record<string, string> = {};
  if (next.length < 8) weak.next = 'Пароль — не меньше 8 символов';
  else if (!/[A-Za-zА-Яа-я]/.test(next)) weak.next = 'Добавьте хотя бы одну букву';
  else if (!/[0-9]/.test(next)) weak.next = 'Добавьте хотя бы одну цифру';
  else if (next.toLowerCase() === login.toLowerCase()) weak.next = 'Пароль не должен совпадать с логином';
  else if (new Set(next).size < 4) weak.next = 'Пароль слишком простой';
  if (weak.next) throw new ApiError(400, 'WEAK_PASSWORD', weak.next, weak);
}

// ---------------------------------------------------------------------------
// Хеширование IP (без хранения адреса) и токенов
// ---------------------------------------------------------------------------
export function ipHash(req: Request): string {
  const ip = req.ip ?? 'unknown';
  return crypto.createHmac('sha256', config.ipSalt).update(ip).digest('hex').slice(0, 32);
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function newSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// ---------------------------------------------------------------------------
// Cookie
// ---------------------------------------------------------------------------
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function readSessionToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[config.sessionCookie];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.sessionCookie, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  const opts = cookieOptions();
  delete opts.maxAge;
  res.clearCookie(config.sessionCookie, opts);
}

// ---------------------------------------------------------------------------
// Сессии
// ---------------------------------------------------------------------------
interface SessionRow {
  token_hash: string;
  user_id: number;
  created_at: number;
  expires_at: number;
  role: 'student' | 'staff';
  login: string;
}

export function createSession(userId: number, req: Request): string {
  const token = newSessionToken();
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    sha256(token),
    userId,
    now,
    now + SESSION_TTL_MS,
    (req.get('user-agent') ?? '').slice(0, 200) || null,
    ipHash(req),
  );
  return token;
}

/**
 * Возвращает пользователя по cookie и, при необходимости, продлевает сессию.
 * В БД сравнивается только SHA-256 хеш токена — поддельная cookie просто не найдётся.
 */
export function getSessionUser(token: string): AuthUser | null {
  const row = db
    .prepare(
      `SELECT s.token_hash, s.user_id, s.created_at, s.expires_at, u.role, u.login
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as SessionRow | undefined;
  if (!row) return null;
  const now = Date.now();
  if (row.expires_at <= now) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash);
    return null;
  }
  if (now - row.created_at > SESSION_RENEW_AFTER_MS) {
    // Скользящее продление: обновляем окно и «время активности».
    db.prepare('UPDATE sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?').run(
      now,
      now + SESSION_TTL_MS,
      row.token_hash,
    );
  }
  return { id: row.user_id, role: row.role, login: row.login };
}

export function revokeSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

/** Отзыв всех сессий пользователя; можно сохранить текущую. */
export function revokeAllSessions(userId: number, exceptToken?: string): void {
  if (exceptToken) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, sha256(exceptToken));
  } else {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}

export function countActiveSessions(userId: number): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?').get(
    userId,
    Date.now(),
  ) as { c: number };
  return row.c;
}

/** Удаление просроченных сессий (вызывается по таймеру раз в час). */
export function purgeExpiredSessions(): number {
  const info = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  return info.changes;
}

// ---------------------------------------------------------------------------
// Throttle входных попыток: 10 неудач за 15 минут на ключ login|ipHash → блок 15 минут.
// ---------------------------------------------------------------------------
export const THROTTLE_MAX_FAILURES = 10;
export const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
export const THROTTLE_BLOCK_MS = 15 * 60 * 1000;

export function throttleKey(login: string, req: Request): string {
  return `login|${login.toLowerCase()}|${ipHash(req)}`;
}

/** Бросает 429 TOO_MANY_ATTEMPTS, если ключ заблокирован. */
export function assertNotThrottled(key: string): void {
  const row = db.prepare('SELECT blocked_until FROM login_throttle WHERE key = ?').get(key) as
    | { blocked_until: number | null }
    | undefined;
  if (!row?.blocked_until) return;
  const left = row.blocked_until - Date.now();
  if (left > 0) {
    throw new ApiError(
      429,
      'TOO_MANY_ATTEMPTS',
      'Слишком много попыток входа. Попробуйте позже.',
      undefined,
    );
  }
}

/** Сколько секунд осталось до разблокировки (для заголовка Retry-After). */
export function throttleRetryAfter(key: string): number {
  const row = db.prepare('SELECT blocked_until FROM login_throttle WHERE key = ?').get(key) as
    | { blocked_until: number | null }
    | undefined;
  if (!row?.blocked_until) return 0;
  return Math.max(0, Math.ceil((row.blocked_until - Date.now()) / 1000));
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const row = db.prepare('SELECT failures, first_at, blocked_until FROM login_throttle WHERE key = ?').get(key) as
    | { failures: number; first_at: number; blocked_until: number | null }
    | undefined;
  if (!row || now - row.first_at > THROTTLE_WINDOW_MS) {
    db.prepare(
      `INSERT INTO login_throttle (key, failures, first_at, blocked_until) VALUES (?, 1, ?, NULL)
       ON CONFLICT(key) DO UPDATE SET failures = 1, first_at = excluded.first_at, blocked_until = NULL`,
    ).run(key, now);
    return;
  }
  const failures = row.failures + 1;
  const blockedUntil = failures >= THROTTLE_MAX_FAILURES ? now + THROTTLE_BLOCK_MS : null;
  db.prepare('UPDATE login_throttle SET failures = ?, blocked_until = ? WHERE key = ?').run(
    failures,
    blockedUntil,
    key,
  );
}

export function clearThrottle(key: string): void {
  db.prepare('DELETE FROM login_throttle WHERE key = ?').run(key);
}

// ---------------------------------------------------------------------------
// Аудит (без PII: только id/роль, действие, сущность, хеш IP)
// ---------------------------------------------------------------------------
export function audit(
  actor: AuthUser | null,
  action: string,
  entity: string | null,
  entityId: string | number | null,
  ip: string,
): void {
  db.prepare(
    `INSERT INTO audit_log (actor_user_id, actor_role, action, entity, entity_id, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    actor?.id ?? null,
    actor?.role ?? null,
    action,
    entity,
    entityId === null ? null : String(entityId),
    ip,
    new Date().toISOString(),
  );
}

// ---------------------------------------------------------------------------
// Простой in-memory rate limiter (для /api/verify и /api/messages)
// ---------------------------------------------------------------------------
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Пропускает запрос, если за окно ключ виден не чаще `limit` раз.
 * Иначе бросает 429 RATE_LIMITED с заголовком Retry-After.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    const err = new ApiError(429, 'RATE_LIMITED', 'Слишком много запросов. Попробуйте через минуту.');
    (err as ApiError & { retryAfter?: number }).retryAfter = retryAfter;
    throw err;
  }
}
