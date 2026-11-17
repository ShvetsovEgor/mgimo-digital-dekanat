// Кабинет сотрудника деканата: заявки своего факультета, ответы на вопросы, объявления, статистика.
import { Router } from 'express';
import type { Request } from 'express';
import { asyncRoute, ApiError, sendOk, validationError } from '../http.js';
import { currentUser, requireRole } from '../middleware.js';
import { audit, ipHash } from '../lib/auth.js';
import { announcementInput, idParam, replyInput, staffRequestsQuery, staffStatusInput } from '../schemas.js';
import { resolveNow } from '../today.js';
import { toLocalIso } from '../lib/time.js';
import { formOf, toAnnouncement, toOrder } from '../lib/mappers.js';
import {
  addNotification,
  announcementById,
  departmentStats,
  getFaculty,
  getStaffProfile,
  messagesForDepartment,
  replyToMessage,
  requestByIdForDepartment,
  requestsForDepartment,
  shortStaffName,
  studentRefById,
  studentsOfDepartment,
  insertAnnouncement,
  type RequestFullRow,
} from '../lib/repo.js';
import { updateRequestStatus } from '../lib/requests.js';
import { dateTimeLabel, relativeDateTimeLabel } from '../lib/format.js';

export function createStaffRouter(): Router {
  const staffRouter = Router();
  staffRouter.use(requireRole('staff'));
  registerRoutes(staffRouter);
  return staffRouter;
}

function registerRoutes(staffRouter: Router): void {

/** Факультет текущего сотрудника — по сессии, а не по параметру запроса. */
function staffDepartment(req: Request): { departmentId: number; fullName: string; shortName: string } {
  const user = currentUser(req);
  const profile = getStaffProfile(user.id);
  if (!profile) throw new ApiError(403, 'FORBIDDEN', 'Профиль сотрудника не найден');
  const faculty = getFaculty(profile.department_id);
  if (!faculty) throw new ApiError(403, 'FORBIDDEN', 'Деканат не найден');
  return { departmentId: profile.department_id, fullName: profile.full_name, shortName: shortStaffName(profile.full_name) };
}

function staffOrder(row: RequestFullRow, now: Date) {
  const student = studentRefById(row.user_id) ?? { name: 'Студент', group: '—', login: '—' };
  return {
    ...toOrder(row, { now, formFields: formOf(row.type_form_json).fields }),
    student,
  };
}

// GET /api/staff/stats
staffRouter.get(
  '/staff/stats',
  asyncRoute(async (req, res) => {
    const { departmentId } = staffDepartment(req);
    sendOk(res, departmentStats(departmentId));
  }),
);

// GET /api/staff/requests?status=
staffRouter.get(
  '/staff/requests',
  asyncRoute(async (req, res) => {
    const parsed = staffRequestsQuery.safeParse(req.query);
    if (!parsed.success) throw validationError(parsed.error);
    const { departmentId } = staffDepartment(req);
    const { now } = resolveNow(req);
    const rows = requestsForDepartment(departmentId, parsed.data.status);
    sendOk(res, rows.map((r) => staffOrder(r, now)));
  }),
);

// PATCH /api/staff/requests/:id — смена статуса только по заявке своего факультета
staffRouter.patch(
  '/staff/requests/:id',
  asyncRoute(async (req, res) => {
    const idParsed = idParam.safeParse(req.params);
    if (!idParsed.success) throw validationError(idParsed.error);
    const parsed = staffStatusInput.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error);
    const staff = staffDepartment(req);
    const { now } = resolveNow(req);
    updateRequestStatus(idParsed.data.id, staff.departmentId, {
      status: parsed.data.status,
      comment: parsed.data.comment ?? null,
      rejectReason: parsed.data.rejectReason ?? null,
      by: staff.shortName,
      now,
    });
    audit(currentUser(req), 'request_status', 'request', idParsed.data.id, ipHash(req));
    const row = requestByIdForDepartment(idParsed.data.id, staff.departmentId);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена');
    sendOk(res, staffOrder(row, now));
  }),
);

// GET /api/staff/messages — вопросы студентов своего факультета
staffRouter.get(
  '/staff/messages',
  asyncRoute(async (req, res) => {
    const { departmentId } = staffDepartment(req);
    const { now } = resolveNow(req);
    const rows = messagesForDepartment(departmentId);
    sendOk(
      res,
      rows.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        student: { name: m.student_name, group: m.group_code },
        createdAtLabel: dateTimeLabel(m.created_at),
        relative: relativeDateTimeLabel(m.created_at, now),
        status: m.status,
        reply: m.reply,
        repliedAtLabel: m.replied_at ? dateTimeLabel(m.replied_at) : null,
      })),
    );
  }),
);

// POST /api/staff/messages/:id/reply
staffRouter.post(
  '/staff/messages/:id/reply',
  asyncRoute(async (req, res) => {
    const idParsed = idParam.safeParse(req.params);
    if (!idParsed.success) throw validationError(idParsed.error);
    const parsed = replyInput.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error);
    const staff = staffDepartment(req);
    const { now } = resolveNow(req);
    const changed = replyToMessage(idParsed.data.id, staff.departmentId, parsed.data.reply, staff.shortName, toLocalIso(now));
    if (changed === 0) throw new ApiError(404, 'NOT_FOUND', 'Вопрос не найден');
    const owner = messagesForDepartment(staff.departmentId).find((m) => m.id === idParsed.data.id);
    if (owner) {
      addNotification(
        owner.user_id,
        'message',
        'Ответ деканата',
        `На ваш вопрос «${owner.subject}» ответил ${staff.shortName}: ${parsed.data.reply.slice(0, 160)}`,
        '/messages',
        toLocalIso(now),
      );
    }
    audit(currentUser(req), 'message_reply', 'message', idParsed.data.id, ipHash(req));
    sendOk(res, { id: idParsed.data.id, status: 'answered' });
  }),
);

// POST /api/staff/announcements — публикация объявления (своему деканату или всем)
staffRouter.post(
  '/staff/announcements',
  asyncRoute(async (req, res) => {
    const parsed = announcementInput.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error);
    const staff = staffDepartment(req);
    const { now } = resolveNow(req);
    const iso = toLocalIso(now);
    const departmentId = parsed.data.forAll ? null : staff.departmentId;
    const id = insertAnnouncement({
      authorUserId: currentUser(req).id,
      departmentId,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
      createdAt: iso,
    });
    // Уведомляем всех студентов своего деканата (объявление «для всех» видно всем факультетам).
    for (const s of studentsOfDepartment(staff.departmentId)) {
      addNotification(s.user_id, 'announcement', parsed.data.title, parsed.data.body.slice(0, 240), '/announcements', iso);
    }
    audit(currentUser(req), 'announcement_create', 'announcement', id, ipHash(req));
    const row = announcementById(id);
    if (!row) throw new ApiError(500, 'INTERNAL', 'Не удалось создать объявление');
    sendOk(res, toAnnouncement(row, now), 201);
  }),
);
}
