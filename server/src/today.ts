// «Сегодня» в цифровом деканате: дата, чётность недели и номер учебного дня.
// Дату можно подставить (?date=YYYY-MM-DD только для чтения, env DEMO_TODAY), чтобы жюри видело «живой» день.
import type { Request } from 'express';
import { ApiError } from './http.js';
import { fullDateLabel } from './lib/format.js';
import { parseLocal, toDateString, weekParity } from './lib/time.js';

export interface UniversityDay {
  number: number;
  label: string;
}

export interface TodayInfo {
  date: string;
  iso: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekParity: 'odd' | 'even';
  universityDay: UniversityDay;
}

/** Праздничные дни вуза (фиксированные правила демо-календаря). */
export const HOLIDAYS: ReadonlyArray<{ month: number; day: number; label: string }> = [
  { month: 1, day: 1, label: 'Новый год' },
  { month: 1, day: 8, label: 'Новогодние каникулы' },
  { month: 2, day: 23, label: 'День защитника Отечества' },
  { month: 3, day: 8, label: 'Международный женский день' },
  { month: 5, day: 1, label: 'Праздник Весны и Труда' },
  { month: 5, day: 9, label: 'День Победы' },
  { month: 6, day: 12, label: 'День России' },
  { month: 11, day: 4, label: 'День народного единства' },
];

export function holidayLabel(d: Date): string | null {
  const h = HOLIDAYS.find((x) => x.month === d.getMonth() + 1 && x.day === d.getDate());
  return h ? h.label : null;
}

export function isHoliday(d: Date): boolean {
  return holidayLabel(d) !== null;
}

/** Учебный день: все календарные дни с 1 сентября, кроме воскресений и праздников. */
export function universityDayNumber(d: Date): number {
  const year = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  const start = new Date(year, 8, 1); // 1 сентября
  const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (cur < start) return 0;
  let count = 0;
  for (const t = new Date(start); t <= cur; t.setDate(t.getDate() + 1)) {
    if (t.getDay() === 0) continue; // воскресенье
    if (isHoliday(t)) continue;
    count += 1;
  }
  return count;
}

export function universityDay(d: Date): UniversityDay {
  const number = universityDayNumber(d);
  return { number, label: number > 0 ? `Учебный день ${number}` : 'Учебный год ещё не начался' };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  return toDateString(parseLocal(s)) === s;
}

/**
 * Дата «сегодня» для API с учётом переопределений:
 * 1) ?date=YYYY-MM-DD (только для чтения — проверяется в роутах),
 * 2) env DEMO_TODAY,
 * 3) реальное системное время.
 * Время суток всегда реальное, чтобы «сейчас» и «до пары» оставались правдоподобными.
 */
export function resolveNow(req?: Request): { now: Date; overridden: boolean } {
  const real = new Date();
  const q = req?.query?.date;
  const override = typeof q === 'string' && q.length > 0 ? q : process.env.DEMO_TODAY || null;
  if (!override) return { now: real, overridden: false };
  if (!isValidDateString(override)) {
    throw new ApiError(400, 'VALIDATION', 'Дата должна быть в формате YYYY-MM-DD', {
      date: 'Неверный формат даты',
    });
  }
  const d = parseLocal(override);
  d.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), 0);
  return { now: d, overridden: true };
}

export type TodayResult = TodayInfo & { now: Date; dateLabel: string; weekParityLabel: string };

export function todayInfo(now: Date): TodayResult {
  const apiWeekday = now.getDay() === 0 ? 7 : now.getDay();
  const parity = weekParity(now);
  return {
    date: toDateString(now),
    iso: now.toISOString(),
    weekday: apiWeekday as TodayInfo['weekday'],
    weekParity: parity,
    universityDay: universityDay(now),
    now,
    dateLabel: fullDateLabel(now),
    weekParityLabel: parity === 'odd' ? 'нечётная неделя' : 'чётная неделя',
  };
}

export function getToday(req?: Request): TodayResult {
  return todayInfo(resolveNow(req).now);
}

/** Переопределение даты — только для чтения: не-GET-запросы с ?date отклоняются. */
export function assertReadOnlyDateOverride(req: Request): void {
  const q = req.query?.date;
  if (typeof q === 'string' && q && req.method !== 'GET' && req.method !== 'HEAD') {
    throw new ApiError(403, 'FORBIDDEN', 'Переопределение даты доступно только для чтения');
  }
}
