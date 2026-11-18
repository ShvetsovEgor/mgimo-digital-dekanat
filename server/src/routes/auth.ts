// Роуты авторизации и публичной проверки документов.
import { Router } from 'express';
import {
  audit,
  assertNotThrottled,
  clearSessionCookie,
  clearThrottle,
  createSession,
  getSessionUser,
  hashPassword,
  ipHash,
  readSessionToken,
  registerFailure,
  revokeSession,
  setSessionCookie,
  throttleKey,
  throttleRetryAfter,
  verifyPassword,
} from '../lib/auth.js';
import { asyncRoute, ApiError, sendOk } from '../http.js';
import { loginInput, tokenParam } from '../schemas.js';
import { db } from '../db.js';
import { verifyDocumentToken } from '../lib/doc-sign.js';

export const authRouter = Router();

interface LoginRow {
  id: number;
  role: 'student' | 'staff';
  password_hash: string;
}

export interface LoginResult {
  student: { login: string; name: string; group: string };
}

/** Данные для шапки кабинета: студент — ФИО и группа, сотрудник — ФИО и должность. */
export function loginResultFor(userId: number, login: string): LoginResult {
  const row = db
    .prepare(
      `SELECT u.login, p.last_name, p.first_name, p.middle_name, p.group_code,
              s.full_name AS staff_name, s.position
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN staff_profiles s ON s.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as
    | {
        login: string;
        last_name: string | null;
        first_name: string | null;
        middle_name: string | null;
        group_code: string | null;
        staff_name: string | null;
        position: string | null;
      }
    | undefined;
  if (!row) return { student: { login, name: login, group: '' } };
  if (row.staff_name) {
    return {
      student: { login: row.login, name: row.staff_name, group: row.position ?? 'Деканат' },
    };
  }
  return {
    student: {
      login: row.login,
      name: `${row.last_name ?? ''} ${row.first_name ?? ''} ${row.middle_name ?? ''}`.trim(),
      group: row.group_code ?? '',
    },
  };
}

// POST /api/auth/login
authRouter.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const parsed = loginInput.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION', 'Проверьте логин и пароль', {
        login: 'Введите логин',
        password: 'Введите пароль',
      });
    }
    const { login, password } = parsed.data;
    const key = throttleKey(login, req);
    assertNotThrottled(key);

    const user = db
      .prepare('SELECT u.id, u.role, u.password_hash FROM users u WHERE u.login = ?')
      .get(login) as LoginRow | undefined;

    // Одинаковый ответ для неверного логина и пароля (без перечисления аккаунтов);
    // для несуществующего логина всё равно выполняем bcrypt-сравнение — время ответа одинаково.
    const ok = await verifyPassword(password, user?.password_hash ?? dummyHash());
    if (!user || !ok) {
      registerFailure(key);
      audit(null, 'login_failed', 'user', null, ipHash(req));
      throw unauthError(throttleRetryAfter(key));
    }

    if (needsRehash(user.password_hash)) {
      const fresh = await hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(fresh, user.id);
    }

    const token = createSession(user.id, req);
    setSessionCookie(res, token);
    clearThrottle(key);
    audit({ id: user.id, role: user.role, login }, 'login', 'user', user.id, ipHash(req));
    // Токен возвращаем и в ответе: вкладка запомнит его в sessionStorage и будет присылать
    // заголовком, чтобы вход во второй вкладке не менял аккаунт в первой.
    sendOk(res, { ...loginResultFor(user.id, login), tabToken: token });
  }),
);

function unauthError(retryAfter: number): ApiError {
  const err = new ApiError(401, 'INVALID_CREDENTIALS', 'Неверный логин или пароль');
  if (retryAfter > 0) (err as ApiError & { retryAfter?: number }).retryAfter = retryAfter;
  return err;
}

// POST /api/auth/logout
authRouter.post(
  '/auth/logout',
  asyncRoute(async (req, res) => {
    const token = readSessionToken(req);
    const user = token ? getSessionUser(token) : null;
    if (token) revokeSession(token);
    clearSessionCookie(res);
    if (user) audit(user, 'logout', 'user', user.id, ipHash(req));
    res.status(204).end();
  }),
);

// GET /api/auth/me
authRouter.get(
  '/auth/me',
  asyncRoute(async (req, res) => {
    const token = readSessionToken(req);
    const user = token ? getSessionUser(token) : null;
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Требуется вход в систему');
    sendOk(res, loginResultFor(user.id, user.login));
  }),
);

// POST /api/auth/tab — своя сессия для вкладки.
// Новая вкладка наследует cookie браузера, но получает отдельную запись сессии:
// тогда «Выйти» в ней не отзывает сессию соседней вкладки.
authRouter.post(
  '/auth/tab',
  asyncRoute(async (req, res) => {
    const current = readSessionToken(req);
    const user = current ? getSessionUser(current) : null;
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Требуется вход в систему');
    const token = createSession(user.id, req);
    sendOk(res, { tabToken: token });
  }),
);

// ---------------------------------------------------------------------------
// Публичные роуты без префикса /api (health, проверка документов)
// ---------------------------------------------------------------------------
export const publicRouter = Router();

publicRouter.get('/health', (_req, res) => {
  sendOk(res, { status: 'ok', time: new Date().toISOString() });
});

// GET /api/verify/:token — публичная проверка подлинности (без персональных данных)
publicRouter.get(
  '/verify/:token',
  asyncRoute(async (req, res) => {
    const parsed = tokenParam.safeParse(req.params);
    if (!parsed.success) throw new ApiError(404, 'NOT_FOUND', 'Документ не найден');
    const result = verifyDocumentToken(parsed.data.token);
    audit(null, result.verified ? 'verify_ok' : 'verify_fail', 'document', null, ipHash(req));
    sendOk(res, result);
  }),
);

function needsRehash(hash: string): boolean {
  const m = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  return !m || Number(m[1]) < 11;
}

/**
 * Валидный bcrypt-хеш фиксированной строки: при несуществующем логине всё равно выполняется
 * bcrypt-сравнение, чтобы время ответа не выдавало наличие аккаунта. Секрета здесь нет.
 */
const DUMMY_HASH = '$2b$11$DCKZJFIEhbHHqGsfs1YzQ.IaK5KCffBRim/lskFUHEtRXk7ikCPh2';
function dummyHash(): string {
  return DUMMY_HASH;
}
