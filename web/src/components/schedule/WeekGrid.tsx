import { useMemo } from 'react';
import { cx } from '@/lib/cx';
import { LessonBlock } from './LessonCard';
import type { WeekDay } from '@/lib/types';

const ROW_HEIGHT = 52; // px на час
const FIRST_HOUR = 8; // раньше 08:00 занятий не бывает — не тратим высоту впустую
const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, index) => index + FIRST_HOUR); // 08:00 … 21:00
const START_MIN = FIRST_HOUR * 60;
const END_MIN = LAST_HOUR * 60;

/** Положение «сейчас» по вертикали; null — текущее время вне учебного окна. */
function nowTop(now: Date): number | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < START_MIN || minutes > END_MIN) return null;
  return ((minutes - START_MIN) / 60) * ROW_HEIGHT;
}

/**
 * Неделя по кадру: вертикальный день с раннего утра до позднего вечера,
 * слева колонка часов 56 px, дальше равные колонки дней с линиями часов.
 */
export function WeekCalendar({
  days,
  now,
  onOpenChange,
}: {
  days: WeekDay[];
  now: Date;
  onOpenChange?: (entryId: number) => void;
}) {
  const codes = useMemo(() => days.flatMap((day) => day.entries.map((entry) => entry.subjectCode)), [days]);
  const height = ((END_MIN - START_MIN) / 60) * ROW_HEIGHT;
  const todayIndex = days.findIndex((day) => day.isToday);

  return (
    <div className="overflow-x-auto rounded-[12px] border border-line bg-surface">
      <div className="min-w-[760px]">
        {/* подписи дней над колонками */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
          <span />
          {days.map((day) => (
            <div key={day.date} className={cx('px-2 py-2 text-center text-[13px] font-semibold', day.isToday ? 'text-brand' : 'text-ink')}>
              {day.weekdayLabel}
              <span className="ml-1 font-normal text-quiet">{day.dayLabel}</span>
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height }}>
          {/* часы */}
          <div className="relative border-r border-line">
            {HOURS.slice(0, -1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[12px] text-quiet tabular-nums"
                style={{ top: (hour - HOURS[0]!) * ROW_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {/* линии часов: 1px #EEEEF0 */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-[56px]" aria-hidden="true">
            {HOURS.slice(1, -1).map((hour) => (
              <span
                key={hour}
                className="absolute right-0 left-0 h-px bg-grid"
                style={{ top: (hour - HOURS[0]!) * ROW_HEIGHT }}
              />
            ))}
          </div>
          {/* дни */}
          {days.map((day, index) => (
            <div key={day.date} className={cx('relative', index === 0 ? '' : 'border-l border-grid')}>
              {day.isHoliday && <span className="absolute inset-0 bg-grid/40" aria-hidden="true" />}
              {day.entries.map((entry) => {
                const top = ((entry.startMin - START_MIN) / 60) * ROW_HEIGHT;
                const blockHeight = Math.max(38, ((entry.endMin - entry.startMin) / 60) * ROW_HEIGHT - 6);
                const cancelled = entry.change?.kind === 'cancelled';
                return (
                  <div key={entry.id} className="absolute right-[3px] left-[3px]" style={{ top: top + 3, height: blockHeight }}>
                    <LessonBlock
                      entry={entry}
                      codes={codes}
                      status={cancelled ? 'cancelled' : undefined}
                      className="h-full overflow-hidden"
                      onClick={entry.change && onOpenChange ? () => onOpenChange(entry.id) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {/* линия «сейчас»: горизонтальная, 2px по ширине колонки текущего дня */}
          {todayIndex >= 0 && nowTop(now) !== null && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: `calc(56px + ${todayIndex} * (100% - 56px) / 7)`,
                width: 'calc((100% - 56px) / 7)',
                top: nowTop(now) ?? 0,
              }}
              aria-hidden="true"
            >
              <span className="absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-now" />
              <span className="absolute top-0 left-0 size-2 -translate-x-1 -translate-y-1/2 rounded-full bg-now" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
