// Заявки и справки: каталог, создание, статус, отмена, PDF только владельцу.
import { Router } from 'express';
import type { Request } from 'express';
import { asyncRoute, ApiError, sendOk, validationError } from '../http.js';
import { currentUser, requireAuth } from '../middleware.js';
import { audit, ipHash, type AuthUser } from '../lib/auth.js';
import { createRequestInput, idParam } from '../schemas.js';
import { resolveNow } from '../today.js';
import { db } from '../db.js';
import { publicBaseUrl } from '../config.js';
import {
  orderFields,
  parseJson,
  toOrder,
  toRequestType,
  type FormFieldJson,
  formOf,
  type Order,
  type OrderHistory,
  type RequestStatus,
} from '../lib/mappers.js';
import {
  requestByIdForUser,
  requestTypeByCode,
  requestTypes,
  requestsForUser,
  getFaculty,
  getProfileRow,
  departmentIdOfStudent,
  pastResults,
} from '../lib/repo.js';
import { createRequest, orderForUser } from '../lib/requests.js';
import { documentFileName, renderDocument, type DocumentInput } from '../documents.js';
import { toLocalIso } from '../lib/time.js';

export function createRequestsRouter(): Router {
  const requestsRouter = Router();
  requestsRouter.use(requireAuth);
  registerRoutes(requestsRouter);
  return requestsRouter;
}

function registerRoutes(requestsRouter: Router): void {

function parseId(req: Request): number {
  const parsed = idParam.safeParse(req.params);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data.id;
}

/** Каталог услуг: динамические опции (например, дисциплины студента для пересдачи). */
requestsRouter.get(
  '/requests/types',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const courses = db
      .prepare(
        `SELECT c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY c.title`,
      )
      .all(user.id) as Array<{ title: string }>;
    const courseOptions = courses.map((c) => ({ value: c.title, label: c.title }));
    const dynamic = (fieldName: string, name: string): FormFieldJson[] => {
      const type = requestTypeByCode(name);
      if (!type) return [];
      return formOf(type.form_json).fields.map((f) => (f.name === fieldName ? { ...f, options: courseOptions } : f));
    };
    const retakeFields = dynamic('courseCode', 'retake');
    const retakeFieldNames = new Set(retakeFields.map((f) => f.name));
    sendOk(
      res,
      requestTypes().map((row) => {
        const base = toRequestType(row);
        if (!retakeFieldNames.size || base.code !== 'retake') return base;
        return { ...base, fields: base.fields.map((f) => retakeFields.find((r) => r.name === f.name) ?? f) };
      }),
    );
  }),
);

// GET /api/requests — новые сверху
requestsRouter.get(
  '/requests',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const { now } = resolveNow(req);
    const rows = requestsForUser(user.id);
    const orders: Order[] = rows.map((r) =>
      toOrder(r, { now, formFields: formOf(r.type_form_json).fields }),
    );
    sendOk(res, orders);
  }),
);

// POST /api/requests — создать заявку
requestsRouter.post(
  '/requests',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const parsed = createRequestInput.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error);
    const { now } = resolveNow(req);
    if (req.query.date) {
      throw new ApiError(403, 'FORBIDDEN', 'Переопределение даты доступно только для чтения');
    }
    const departmentId = departmentIdOfStudent(user.id);
    if (!departmentId) throw new ApiError(404, 'NOT_FOUND', 'Деканат не найден');
    const created = createRequest({
      userId: user.id,
      departmentId,
      typeCode: parsed.data.typeCode,
      rawValues: parsed.data.values,
      now,
    });
    audit(user, 'request_create', 'request', created.id, ipHash(req));
    sendOk(res, orderForUser(created.id, user.id, now), 201);
  }),
);

// GET /api/requests/:id — только своя (чужая → 404)
requestsRouter.get(
  '/requests/:id',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const { now } = resolveNow(req);
    sendOk(res, orderForUser(parseId(req), user.id, now));
  }),
);

// POST /api/requests/:id/cancel — только pending/in_progress, только своя
requestsRouter.post(
  '/requests/:id/cancel',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const { now } = resolveNow(req);
    cancelOrder(parseId(req), user, now, ipHash(req));
    sendOk(res, orderForUser(parseId(req), user.id, now));
  }),
);

const CANCELLABLE: ReadonlySet<RequestStatus> = new Set<RequestStatus>(['pending', 'in_progress']);

function cancelOrder(id: number, user: AuthUser, now: Date, ip: string): void {
  const row = requestByIdForUser(id, user.id);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена');
  if (!CANCELLABLE.has(row.status)) {
    throw new ApiError(409, 'REQUEST_NOT_CANCELLABLE', 'Эту заявку отменить уже нельзя');
  }
  const iso = toLocalIso(now);
  const history: OrderHistory[] = parseJson<OrderHistory[]>(row.history_json, []).map((h) => ({
    ...h,
    done: true,
    current: false,
  }));
  history.push({ label: 'Отменена студентом', at: iso, by: 'Студент', done: true, current: true });
  db.prepare(
    `UPDATE requests SET status = 'cancelled', updated_at = ?, history_json = ? WHERE id = ? AND user_id = ? AND status IN ('pending','in_progress')`,
  ).run(iso, JSON.stringify(history), id, user.id);
  audit(user, 'request_cancel', 'request', id, ip);
}

// GET /api/requests/:id/document — PDF только владельцу и только для готовой заявки
requestsRouter.get(
  '/requests/:id/document',
  asyncRoute(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req);
    const row = requestByIdForUser(id, user.id);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена');
    if (row.status !== 'ready') {
      throw new ApiError(409, 'REQUEST_NOT_READY', 'Документ ещё не готов');
    }
    const profile = getProfileRow(user.id);
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Профиль не найден');
    const faculty = getFaculty(departmentIdOfStudent(user.id) ?? -1);
    const fields = formOf(row.type_form_json).fields;
    const transcript = pastResults(user.id).map((r) => ({
      semester: r.semester,
      course: r.course_title,
      credits: r.credits,
      rating: r.rating,
      grade: r.grade,
      ects: r.ects,
    }));
    const kind = row.category === 'application' ? 'application' : row.category === 'service' ? 'transcript' : 'certificate';
    const input: DocumentInput = {
      kind,
      request: {
        number: row.number,
        typeTitle: row.type_title,
        statusLabel: 'Готово',
        createdAt: row.created_at,
        dueAt: row.due_at,
        readyAt: row.ready_at,
        values: parseJson<Record<string, unknown>>(row.payload_json, {}),
        history: [],
      },
      identity: {
        fullName: `${profile.last_name} ${profile.first_name} ${profile.middle_name}`.trim(),
        faculty: profile.faculty_full,
        program: profile.program_name,
        programCode: profile.program_code,
        course: profile.course,
        group: profile.group_code,
        recordBook: profile.record_book,
      },
      fields,
      dean: faculty?.dean ?? 'А. В. Мельников',
      facultyFull: faculty?.full_name ?? profile.faculty_full,
      baseUrl: publicBaseUrl(req),
      transcript,
    };
    const pdf = await renderDocument(input);
    audit(user, 'document_download', 'request', id, ipHash(req));
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(documentFileName(input))}`,
    );
    res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  }),
);
}
