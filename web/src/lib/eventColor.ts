// Пастель предметов: один предмет — один цвет на лекции, практику и т.п.
// Цвет закрепляется за предметом по его коду (стабильно между неделями и устройствами).

export const EVENT_PALETTE = ['lilac', 'slate', 'aqua', 'green', 'rose'] as const;
export type EventColor = (typeof EVENT_PALETTE)[number];

/** Классы заливки блока занятия (пастель кадра, чернила на ней всегда #1C1B23). */
export const EVENT_FILL: Record<EventColor, string> = {
  lilac: 'bg-event-lilac text-ink',
  slate: 'bg-event-slate text-ink',
  aqua: 'bg-event-aqua text-ink',
  green: 'bg-event-green text-ink',
  rose: 'bg-event-rose text-ink',
};

/** Цвет предмета — по порядку появления кодов в заданном наборе (новый предмет получает следующий свободный). */
export function colorForSubject(code: string, codes: readonly string[]): EventColor {
  const unique = Array.from(new Set(codes));
  const index = Math.max(0, unique.indexOf(code));
  return EVENT_PALETTE[index % EVENT_PALETTE.length] ?? 'lilac';
}

export function fillForSubject(code: string, codes: readonly string[]): string {
  return EVENT_FILL[colorForSubject(code, codes)];
}
