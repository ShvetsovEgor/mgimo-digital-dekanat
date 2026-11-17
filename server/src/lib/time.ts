// Утилиты времени. Все даты хранятся в ISO-строках «локального» времени вуза (Europe/Moscow),
// сервер работает в TZ=Europe/Moscow (см. Dockerfile/env). Так расписание и дедлайны не «плывут».
export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
export const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'] as const;

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalIso(d: Date): string {
  return `${toDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseLocal(s: string): Date {
  // 'YYYY-MM-DDTHH:mm:ss' | 'YYYY-MM-DD HH:mm:ss' (SQLite datetime) | 'YYYY-MM-DD' → локальная дата
  const [datePart, timePart = '00:00:00'] = s.split(/[T ]/);
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, Math.floor(ss || 0));
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Понедельник недели, содержащей дату. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (r.getDay() + 6) % 7; // Пн=0
  r.setDate(r.getDate() - diff);
  return r;
}

/** ISO-номер недели (для определения чётности). */
export function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function weekParity(d: Date): 'odd' | 'even' {
  return isoWeek(d) % 2 === 1 ? 'odd' : 'even';
}

/** Рабочие минуты (пн–пт, 09:00–18:00) между now и длительностью; возвращает дедлайн-время. */
export function addWorkingMinutes(from: Date, minutes: number): Date {
  const d = new Date(from);
  let left = minutes;
  while (left > 0) {
    const day = d.getDay();
    const hour = d.getHours() + d.getMinutes() / 60;
    if (day === 0 || day === 6) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      continue;
    }
    if (hour < 9) {
      d.setHours(9, 0, 0, 0);
      continue;
    }
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
    const available = Math.max(0, (endOfDay.getTime() - d.getTime()) / 60_000);
    if (available >= left) {
      return addMinutes(d, left);
    }
    left -= available;
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

export function humanMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h} ч ${min} мин`;
  if (h) return `${h} ч`;
  return `${min} мин`;
}

export function formatClock(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
