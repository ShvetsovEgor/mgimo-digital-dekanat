// Утилиты классов и общие константы интерфейса.

import { mockEnabled } from './mode';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** Статусы заявок → человеческий тон и подпись. */
export const REQUEST_STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  pending: 'info',
  in_progress: 'warn',
  ready: 'ok',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** Ссылка на скачивание PDF. */
export function documentUrl(id: number): string {
  return `/api/requests/${id}/document`;
}

export function isMock(): boolean {
  return mockEnabled();
}

/** «Скачать» в демо без сервера: показываем подсказку вместо битой ссылки. */
export function downloadHint(mock: boolean): string | null {
  return mock ? 'В демо-PDF-файл не формируется: на рабочем сервере здесь откроется PDF с QR-подписью.' : null;
}

export function calendarUrl(weekOffset = 0): string {
  return weekOffset ? `/api/schedule/export.ics?week=${weekOffset}` : '/api/schedule/export.ics';
}
