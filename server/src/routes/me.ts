// Личный кабинет студента: профиль, пароль, 2FA, выход со всех устройств.
import { Router } from 'express';
import { asyncRoute, ApiError, sendOk } from '../http.js';
import { currentUser, requireAuth } from '../middleware.js';
import {
  audit,
  checkPasswordPolicy,
  hashPassword,
  ipHash,
  readSessionToken,
  revokeAllSessions,
  verifyPassword,
} from '../lib/auth.js';
import { passwordChangeInput, profilePatchInput, twoFactorInput } from '../schemas.js';
import { db } from '../db.js';
import { toDeanery, toProfile, type DeaneryContact, type Profile } from '../lib/mappers.js';
import {
  departmentIdOfStudent,
  getFaculty,
  getProfileRow,
  isTwoFactor,
  securityInfo,
  setTwoFactor,
  updateProfileContact,
} from '../lib/repo.js';
import { resolveNow } from '../today.js';
import { formatDateLong } from '../lib/format.js';

export function createMeRouter(): Router {
  const meRouter = Router();
  meRouter.use(requireAuth);
  registerRoutes(meRouter);
  return meRouter;
}

export interface ProfileResponse {
  profile: Profile;
  deanery: DeaneryContact;
}

/** Профиль и контакты деканата — только по сессии, никаких id в URL. */
export function profileResponse(userId: number, now: Date): ProfileResponse {
  const row = getProfileRow(userId);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Профиль не найден');
  const faculty = getFaculty(departmentIdOfStudent(userId) ?? -1);
  if (!faculty) throw new ApiError(404, 'NOT_FOUND', 'Деканат не найден');
  const security = securityInfo(userId, isTwoFactor(userId));
  const securityView = {
    twoFactor: security.twoFactor,
    lastPasswordChange: formatMonthDay(security.lastPasswordChange),
    activeSessions: security.activeSessions,
  };
  const profile = toProfile(row, securityView, now);
  if (security.twoFactor) {
    profile.verification = {
      ...profile.verification,
      note: `${profile.verification.note} · 2FA включена`,
    };
  }
  return { profile, deanery: toDeanery(faculty) };
}

/** ISO-строка времени из БД → «12 сентября». */
function formatMonthDay(iso: string): string {
  const normalized = iso.trim().replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDateLong(d);
}

function registerRoutes(meRouter: Router): void {

// GET /api/me/profile
meRouter.get(
  '/me/profile',
  asyncRoute(async (req, res) => {
    const { now } = resolveNow(req);
    sendOk(res, profileResponse(currentUser(req).id, now));
  }),
);

// PATCH /api/me/profile — только телефон и телеграм (остальное read-only)
meRouter.patch(
  '/me/profile',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const parsed = profilePatchInput.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? '_')] = issue.message;
      throw new ApiError(400, 'VALIDATION', 'Проверьте правильность заполнения полей', fields);
    }
    updateProfileContact(user.id, parsed.data);
    if (parsed.data.notifyMode) {
      db.prepare('UPDATE profiles SET notify_mode = ? WHERE user_id = ?').run(parsed.data.notifyMode, user.id);
    }
    audit(user, 'profile_update', 'profile', user.id, ipHash(req));
    sendOk(res, profileResponse(user.id, resolveNow(req).now));
  }),
);

// POST /api/me/password — текущий + новый, все остальные сессии отзываются
meRouter.post(
  '/me/password',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const parsed = passwordChangeInput.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? '_')] = issue.message;
      throw new ApiError(400, 'VALIDATION', 'Проверьте пароль', fields);
    }
    const { current, next, confirm } = parsed.data;
    if (confirm !== undefined && confirm !== next) {
      throw new ApiError(400, 'PASSWORD_MISMATCH', 'Пароли не совпадают', {
        confirm: 'Пароли не совпадают',
      });
    }
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as
      | { password_hash: string }
      | undefined;
    if (!row || !(await verifyPassword(current, row.password_hash))) {
      audit(user, 'password_change_failed', 'user', user.id, ipHash(req));
      throw new ApiError(403, 'WRONG_PASSWORD', 'Текущий пароль указан неверно', {
        current: 'Неверный текущий пароль',
      });
    }
    if (await verifyPassword(next, row.password_hash)) {
      throw new ApiError(400, 'WEAK_PASSWORD', 'Новый пароль должен отличаться от текущего', {
        next: 'Новый пароль совпадает с текущим',
      });
    }
    // Политика пароля (≥ 8, буква + цифра, не равен логину) — после проверки текущего пароля.
    checkPasswordPolicy(next, user.login);
    const hash = await hashPassword(next);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    // Отзываем все сессии, кроме текущей.
    revokeAllSessions(user.id, readSessionToken(req) ?? undefined);
    audit(user, 'password_change', 'user', user.id, ipHash(req));
    res.status(204).end();
  }),
);

// POST /api/me/logout-all — выйти на всех устройствах (включая это)
meRouter.post(
  '/me/logout-all',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    revokeAllSessions(user.id);
    audit(user, 'logout_all', 'user', user.id, ipHash(req));
    res.status(204).end();
  }),
);

// POST /api/me/2fa — включить/выключить двухфакторную аутентификацию (демо-переключатель)
meRouter.post(
  '/me/2fa',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const parsed = twoFactorInput.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'VALIDATION', 'Некорректное значение');
    setTwoFactor(user.id, parsed.data.enabled);
    audit(user, parsed.data.enabled ? '2fa_enable' : '2fa_disable', 'user', user.id, ipHash(req));
    sendOk(res, profileResponse(user.id, resolveNow(req).now));
  }),
);
}
