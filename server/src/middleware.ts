// Middleware доступа: аутентификация по cookie, роли и защита от CSRF.
import type { Request, RequestHandler } from 'express';
import { getSessionUser, readSessionToken, type AuthUser } from './lib/auth.js';
import { ApiError } from './http.js';

/** Требует валидную сессию, иначе 401 UNAUTHENTICATED. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readSessionToken(req);
  const user = token ? getSessionUser(token) : null;
  if (!user) {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Требуется вход в систему'));
    return;
  }
  req.authUser = user;
  next();
};

/** Требует роль (студент попадёт на staff-маршрут → 403 FORBIDDEN). */
export function requireRole(role: AuthUser['role']): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Требуется вход в систему'));
      return;
    }
    if (req.authUser.role !== role) {
      next(new ApiError(403, 'FORBIDDEN', 'Недостаточно прав для этого действия'));
      return;
    }
    next();
  };
}

/** Текущий пользователь (после requireAuth гарантированно есть). */
export function currentUser(req: Request): AuthUser {
  if (!req.authUser) throw new ApiError(401, 'UNAUTHENTICATED', 'Требуется вход в систему');
  return req.authUser;
}

// ---------------------------------------------------------------------------
// CSRF: cookie SameSite=Lax + проверка Origin / Sec-Fetch-Site для не-GET.
// ---------------------------------------------------------------------------
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function firstHeader(value: string | undefined): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first ? first : null;
}

/** Разрешённые host'ы: host запроса + x-forwarded-host (за reverse-proxy). */
function allowedHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  const host = firstHeader(req.get('host'));
  if (host) hosts.add(host.toLowerCase());
  const fwd = firstHeader(req.get('x-forwarded-host'));
  if (fwd) hosts.add(fwd.toLowerCase());
  return hosts;
}

export function originAllowed(req: Request): boolean {
  const site = req.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;

  const origin = req.get('origin');
  if (!origin) return true; // не-браузерные клиенты (curl, тесты) Origin не шлют
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  return allowedHosts(req).has(originHost);
}

export const csrfOriginCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (!originAllowed(req)) {
    next(new ApiError(403, 'FORBIDDEN', 'Запрос отклонён: не совпадает источник (CSRF)'));
    return;
  }
  next();
};
