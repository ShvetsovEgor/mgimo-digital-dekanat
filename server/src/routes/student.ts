// Успеваемость, дедлайны, уведомления, объявления, сообщения деканату.
import { z } from 'zod';
import { Router } from 'express';
import type { Request } from 'express';
import { asyncRoute, ApiError, sendOk, validationError } from '../http.js';
import { currentUser, requireAuth } from '../middleware.js';
import { audit, ipHash, rateLimit } from '../lib/auth.js';
import { deadlineSchema, notificationSchema } from '../contract.js';
import { messageInput } from '../schemas.js';
import { db } from '../db.js';
import { resolveNow } from '../today.js';
import { toLocalIso } from '../lib/time.js';
import { toAnnouncement, toDeadline, toNotification } from '../lib/mappers.js';
import { dateTimeLabel, relativeDateTimeLabel } from '../lib/format.js';
import {
  addNotification,
  announcementsFor,
  deadlineExistsForGroup,
  deadlinesFor,
  departmentIdOfStudent,
  messagesForUser,
  notificationsFor,
  studentGroup,
} from '../lib/repo.js';
import { buildProgress } from '../lib/progress.js';

export function createStudentRouter(): Router {
  const studentRouter = Router();
  studentRouter.use(requireAuth);
  registerRoutes(studentRouter);
  return studentRouter;
}

function registerRoutes(studentRouter: Router): void {

function groupOf(req: Request): string {
  const sg = studentGroup(currentUser(req).id);
  if (!sg) throw new ApiError(404, 'NOT_FOUND', 'Профиль студента не найден');
  return sg.group;
}

function parseId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'VALIDATION', 'Некорректный идентификатор', { id: 'Некорректный идентификатор' });
  }
  return id;
}

// GET /api/progress — только своя успеваемость (по сессии)
studentRouter.get(
  '/progress',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    sendOk(res, buildProgress(user.id, groupOf(req)));
  }),
);

const deadlineList = z.array(deadlineSchema);

// GET /api/deadlines
studentRouter.get(
  '/deadlines',
  asyncRoute(async (req, res) => {
    const { now } = resolveNow(req);
    const rows = deadlinesFor(currentUser(req).id, groupOf(req));
    sendOk(res, deadlineList.parse(rows.map((r) => toDeadline(r, now))));
  }),
);

// POST /api/deadlines/:id/toggle — отметить выполненным / снять отметку
studentRouter.post(
  '/deadlines/:id/toggle',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const { now } = resolveNow(req);
    const id = parseId(req);
    const groupCode = groupOf(req);
    // Дедлайн своей группы — иначе 404 (не раскрываем существование чужих).
    if (!deadlineExistsForGroup(id, groupCode)) throw new ApiError(404, 'NOT_FOUND', 'Дедлайн не найден');
    const done = db.prepare('SELECT 1 FROM deadline_done WHERE user_id = ? AND deadline_id = ?').get(user.id, id);
    if (done) {
      db.prepare('DELETE FROM deadline_done WHERE user_id = ? AND deadline_id = ?').run(user.id, id);
    } else {
      db.prepare('INSERT INTO deadline_done (user_id, deadline_id, done_at) VALUES (?, ?, ?)').run(
        user.id,
        id,
        toLocalIso(now),
      );
    }
    audit(user, done ? 'deadline_undone' : 'deadline_done', 'deadline', id, ipHash(req));
    const rows = deadlinesFor(user.id, groupCode);
    sendOk(res, deadlineList.parse(rows.map((r) => toDeadline(r, now))));
  }),
);

// GET /api/notifications
const notificationList = z.array(notificationSchema);
studentRouter.get(
  '/notifications',
  asyncRoute(async (req, res) => {
    const { now } = resolveNow(req);
    const rows = notificationsFor(currentUser(req).id);
    sendOk(res, notificationList.parse(rows.map((r) => toNotification(r, now))));
  }),
);

// POST /api/notifications/:id/read
studentRouter.post(
  '/notifications/:id/read',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req);
    const exists = db.prepare('SELECT id, created_at FROM notifications WHERE id = ? AND user_id = ?').get(id, user.id) as
      | { id: number; created_at: string }
      | undefined;
    if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Уведомление не найдено');
    db.prepare(
      `INSERT INTO notif_reads (user_id, notification_id, read_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, notification_id) DO NOTHING`,
    ).run(user.id, id, new Date().toISOString());
    res.status(204).end();
  }),
);

// POST /api/notifications/read-all
studentRouter.post(
  '/notifications/read-all',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    db.prepare(
      `INSERT INTO notif_reads (user_id, notification_id, read_at)
       SELECT user_id, id, ? FROM notifications WHERE user_id = ?
       ON CONFLICT(user_id, notification_id) DO NOTHING`,
    ).run(new Date().toISOString(), user.id);
    res.status(204).end();
  }),
);

// GET /api/announcements — общие объявления + своего факультета
studentRouter.get(
  '/announcements',
  asyncRoute(async (req, res) => {
    const { now } = resolveNow(req);
    const user = currentUser(req);
    const rows = announcementsFor(departmentIdOfStudent(user.id));
    sendOk(res, rows.map((r) => toAnnouncement(r, now)));
  }),
);

// GET /api/messages — свои вопросы деканату
studentRouter.get(
  '/messages',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const rows = messagesForUser(user.id);
    sendOk(
      res,
      rows.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        createdAt: m.created_at,
        createdAtLabel: dateTimeLabel(m.created_at),
        relative: relativeDateTimeLabel(m.created_at, resolveNow(req).now),
        status: m.status,
        reply: m.reply,
        repliedAtLabel: m.replied_at ? dateTimeLabel(m.replied_at) : null,
      })),
    );
  }),
);

// POST /api/messages — быстрый вопрос деканату (rate limit 5 за 10 минут)
studentRouter.post(
  '/messages',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    rateLimit(`messages|${user.id}`, 5, 10 * 60 * 1000);
    const parsed = messageInput.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error);
    const departmentId = departmentIdOfStudent(user.id);
    if (!departmentId) throw new ApiError(404, 'NOT_FOUND', 'Деканат не найден');
    const { now } = resolveNow(req);
    const iso = toLocalIso(now);
    const info = db
      .prepare(
        `INSERT INTO messages (user_id, department_id, subject, body, status, reply, created_at, replied_at, replied_by)
         VALUES (?, ?, ?, ?, 'new', NULL, ?, NULL, NULL)`,
      )
      .run(user.id, departmentId, parsed.data.subject, parsed.data.body, iso);
    const id = Number(info.lastInsertRowid);
    addNotification(
      user.id,
      'message',
      'Вопрос отправлен в деканат',
      `«${parsed.data.subject}» — ответим в рабочее время и пришлём уведомление.`,
      '/requests',
      iso,
    );
    audit(user, 'message_create', 'message', id, ipHash(req));
    sendOk(res, { id, status: 'new' }, 201);
  }),
);
}
