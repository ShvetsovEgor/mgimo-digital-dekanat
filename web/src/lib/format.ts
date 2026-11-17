// Форматирование: русские даты, числа, склонения, относительное время.
// Без зависимостей — всё на Intl, локаль ru-RU.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RU_MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const RU_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Склонение: plural(3, ['день','дня','дней']) → «дня». */
export function plural(count: number, forms: [one: string, few: string, many: string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** «3 дня», «1 день», «2 часа» */
export function pluralize(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, [one, few, many])}`;
}

/** «1 234 ₽», «12 500» — неразрывный пробел между разрядами. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatMoney(value: number): string {
  return `${formatNumber(value)} ₽`;
}

/** «17 ноя» */
export function formatDateShort(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${RU_MONTHS_GEN[date.getMonth()]?.slice(0, 3)}`;
}

/** «17 ноября» */
export function formatDateLong(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${RU_MONTHS_GEN[date.getMonth()]}`;
}

/** «понедельник, 17 ноября» */
export function formatDateFull(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return `${RU_WEEKDAYS[date.getDay()]}, ${formatDateLong(date)}`;
}

/** «17.11.2026» */
export function formatDateNumeric(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

/** Из «HH:MM» → минуты от полуночи. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** «7 ч 05 мин» / «45 мин» */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${String(m).padStart(2, '0')} мин`;
}

/** «через 1 ч 20 мин» по разнице в миллисекундах (может быть отрицательной). */
export function relativeFromMs(ms: number): { text: string; upcoming: boolean; minutes: number } {
  const minutes = Math.round(ms / MINUTE);
  if (minutes <= 0) {
    return { text: minutes > -60 ? 'идёт сейчас' : `закончилась ${formatDuration(-minutes)} назад`, upcoming: false, minutes };
  }
  return { text: `через ${formatDuration(minutes)}`, upcoming: true, minutes };
}

/** Относительно «сейчас» для ISO-даты. */
export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < MINUTE) return 'только что';
  if (abs < HOUR) return diff > 0 ? `через ${Math.round(abs / MINUTE)} мин` : `${Math.round(abs / MINUTE)} мин назад`;
  if (abs < DAY) return diff > 0 ? `через ${Math.round(abs / HOUR)} ч` : `${Math.round(abs / HOUR)} ч назад`;
  const days = Math.round(abs / DAY);
  if (days === 1) return diff > 0 ? 'завтра' : 'вчера';
  if (days < 7) return diff > 0 ? `через ${pluralize(days, 'день', 'дня', 'дней')}` : `${pluralize(days, 'день', 'дня', 'дней')} назад`;
  return formatDateShort(date);
}

/** Сколько полных календарных дней до даты (0 — сегодня, 1 — завтра). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = startOfDay(new Date(iso));
  const today = startOfDay(now);
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** «сегодня» / «завтра» / «вчера» / «17 ноября» */
export function humanDay(iso: string, now: Date = new Date()): string {
  const diff = daysUntil(iso, now);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff === -1) return 'вчера';
  return formatDateLong(new Date(iso));
}

/** Человеческое приветствие по времени суток. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** «1 234 ₽» из строки сервера сохраняем как есть, но убираем лишние пробелы. */
export function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Процент 0..100 целым числом. */
export function percent(value: number): string {
  return `${Math.round(value)}%`;
}
