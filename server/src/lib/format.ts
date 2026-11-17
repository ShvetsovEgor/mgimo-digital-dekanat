// Форматирование дат и подписей для API (русская локаль, Europe/Moscow).
// Сервер работает в TZ=Europe/Moscow, поэтому используем локальные методы Date.
import { WEEKDAYS_FULL, addDays, parseLocal, toDateString } from './time.js';

export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;
export const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 0 — «сегодня», -1 — «вчера», 1 — «завтра», иначе null. */
export function dayShift(dateStr: string, now = new Date()): number | null {
  const a = startOfDay(parseLocal(dateStr)).getTime();
  const b = startOfDay(now).getTime();
  const diff = Math.round((a - b) / 86_400_000);
  return diff >= -1 && diff <= 1 ? diff : null;
}

/** «17 ноя, 15:04» */
export function dateTimeLabel(iso: string): string {
  const d = parseLocal(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «вчера, 16:42» / «17 ноя, 15:04» — для публикации изменений расписания. */
export function relativeDateTimeLabel(iso: string, now = new Date()): string {
  const d = parseLocal(iso);
  const shift = dayShift(toDateString(d), now);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (shift === 0) return `сегодня, ${hhmm}`;
  if (shift === -1) return `вчера, ${hhmm}`;
  return dateTimeLabel(iso);
}

/** «17 ноября» */
export function dayMonthLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «понедельник, 17 ноября» */
export function fullDateLabel(d: Date): string {
  return `${WEEKDAYS_FULL[(d.getDay() + 6) % 7].toLowerCase()}, ${dayMonthLabel(d)}`;
}

/** «17–23 ноября» (или «30 ноября – 6 декабря», «28 дек 2026 – 3 янв 2027»). */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_GEN[end.getMonth()]}`;
  }
  if (weekStart.getFullYear() === end.getFullYear()) {
    return `${weekStart.getDate()} ${MONTHS_GEN[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS_GEN[end.getMonth()]}`;
  }
  return `${weekStart.getDate()} ${MONTHS_GEN[weekStart.getMonth()]} ${weekStart.getFullYear()} – ${end.getDate()} ${MONTHS_GEN[end.getMonth()]} ${end.getFullYear()}`;
}

/** «через 3 дня», «завтра», «сегодня», «просрочено на 1 день». */
export function daysRelativeLabel(dueIso: string, now = new Date()): string {
  const target = parseLocal(dueIso);
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  if (diff < 0) {
    const n = Math.abs(diff);
    return `просрочено на ${n} ${pluralDays(n)}`;
  }
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff === 2) return 'послезавтра';
  return `через ${diff} ${pluralDays(diff)}`;
}

export function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

/** «сейчас», «5 минут назад», «2 часа назад», «вчера», «17 ноября». */
export function relativePastLabel(iso: string, now = new Date()): string {
  const d = parseLocal(iso);
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'сейчас';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24 && dayShift(toDateString(d), now) === 0) {
    return `${hours} ч назад`;
  }
  const shift = dayShift(toDateString(d), now);
  if (shift === -1) return 'вчера';
  if (shift === 1) return 'завтра';
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «до пары 45 мин», «через 1 ч 20 мин». */
export function humanDelta(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}
