import type { ScheduleChange, TodayLecture, WeekEntry } from '@/lib/types';
import type { Tone } from '../ui/Badge';

export const KIND_STYLES: Record<WeekEntry['kind'] | 'default', { tone: Tone; short: string }> = {
  lecture: { tone: 'brand', short: 'Лекция' },
  seminar: { tone: 'info', short: 'Семинар' },
  language: { tone: 'gold', short: 'Язык' },
  physical: { tone: 'ok', short: 'Физра' },
  consult: { tone: 'neutral', short: 'Консультация' },
  exam: { tone: 'danger', short: 'Экзамен' },
  default: { tone: 'neutral', short: 'Пара' },
};

export const CHANGE_LABELS: Record<ScheduleChange['kind'], { label: string; tone: Tone; accent: 'warn' | 'danger' | 'info' }> = {
  room: { label: 'Аудитория изменена', tone: 'warn', accent: 'warn' },
  cancelled: { label: 'Отменено', tone: 'danger', accent: 'danger' },
  moved: { label: 'Перенос', tone: 'info', accent: 'info' },
  added: { label: 'Добавлено', tone: 'info', accent: 'info' },
  time: { label: 'Время изменено', tone: 'warn', accent: 'warn' },
};

export function relativeTimeLabel(target: TodayLecture, now: Date): string {
  if (target.isNow) return 'Сейчас идёт';
  const [h, m] = target.start.split(':').map(Number);
  const start = new Date(now);
  start.setHours(h ?? 0, m ?? 0, 0, 0);
  const diff = Math.round((start.getTime() - now.getTime()) / 60000);
  if (diff <= 0) return 'Скоро начнётся';
  if (diff < 60) return `До пары ${diff} мин`;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return minutes === 0 ? `До пары ${hours} ч` : `До пары ${hours} ч ${minutes} мин`;
}
