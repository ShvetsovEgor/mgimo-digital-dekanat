// Расписание: сегодня, неделя, экспорт .ics. Только расписание своей группы.
import { Router } from 'express';
import type { Request } from 'express';
import { asyncRoute, ApiError, sendOk } from '../http.js';
import { currentUser, requireAuth } from '../middleware.js';
import { audit, ipHash } from '../lib/auth.js';
import { schemas } from '../contract.js';
import { resolveNow, todayInfo } from '../today.js';
import { scheduleForGroup, studentGroup } from '../lib/repo.js';
import { buildIcs, buildToday, buildWeek, type ScheduleContext } from '../lib/schedule.js';

export function createScheduleRouter(): Router {
  const scheduleRouter = Router();
  scheduleRouter.use(requireAuth);
  registerRoutes(scheduleRouter);
  return scheduleRouter;
}

function registerRoutes(scheduleRouter: Router): void {

function context(req: Request): ScheduleContext {
  const user = currentUser(req);
  const sg = studentGroup(user.id);
  if (!sg) throw new ApiError(404, 'NOT_FOUND', 'Профиль студента не найден');
  const { now } = resolveNow(req);
  const today = todayInfo(now);
  return {
    now,
    group: sg.group,
    subgroup: sg.subgroup,
    weekParityLabel: today.weekParityLabel,
    universityDayLabel: today.universityDay.label,
  };
}

function weekOffset(req: Request): number {
  const raw = typeof req.query.week === 'string' ? req.query.week : '0';
  if (!['-1', '0', '1'].includes(raw)) {
    throw new ApiError(400, 'VALIDATION', 'week может быть -1, 0 или 1', { week: 'Недопустимое значение' });
  }
  return Number(raw);
}

// GET /api/schedule/today?date=
scheduleRouter.get(
  '/schedule/today',
  asyncRoute(async (req, res) => {
    const ctx = context(req);
    const rows = scheduleForGroup(ctx.group);
    sendOk(res, schemas.scheduleTodaySchema.parse(buildToday(rows, ctx)));
  }),
);

// GET /api/schedule/week?date=&week=0|-1|1
scheduleRouter.get(
  '/schedule/week',
  asyncRoute(async (req, res) => {
    const ctx = context(req);
    const rows = scheduleForGroup(ctx.group);
    sendOk(res, schemas.scheduleWeekSchema.parse(buildWeek(rows, ctx, weekOffset(req))));
  }),
);

// GET /api/schedule/export.ics?date=&week= — только пары своей группы, без персональных данных
scheduleRouter.get(
  '/schedule/export.ics',
  asyncRoute(async (req, res) => {
    const ctx = context(req);
    const rows = scheduleForGroup(ctx.group);
    const ics = buildIcs(rows, ctx, weekOffset(req));
    audit(currentUser(req), 'schedule_export', 'schedule', ctx.group, ipHash(req));
    res.status(200);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="schedule-${ctx.group}.ics"; filename*=UTF-8''${encodeURIComponent(`Расписание ${ctx.group}.ics`)}`,
    );
    res.send(ics);
  }),
);
}
