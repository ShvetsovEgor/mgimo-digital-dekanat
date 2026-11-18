import { MapPin, UserRound } from 'lucide-react';
import { EmptyState } from '../ui/States';
import { LessonBlock } from './LessonCard';
import { cx } from '@/lib/cx';
import { useMemo } from 'react';
import type { WeekDay } from '@/lib/types';

/** Мобильный вид недели: дни-чипы над днями, выбранный день — пастельными блоками по времени. */
export function DayPanel({ day }: { day: WeekDay }) {
  const codes = useMemo(() => day.entries.map((entry) => entry.subjectCode), [day]);
  return (
    <section aria-label={`${day.weekdayLabel}, ${day.dayLabel} ${day.monthLabel}`} className="mt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink first-letter:uppercase">
          {day.weekdayLabel}, {day.dayLabel} {day.monthLabel}
        </p>
        <span className="text-[12px] text-quiet">{day.entries.length > 0 ? `${day.entries.length} в расписании` : 'пар нет'}</span>
      </div>
      {day.isHoliday && <p className="mb-2 text-[12px] text-muted">Нерабочий день</p>}
      {day.entries.length === 0 ? (
        <EmptyState title="В этот день занятий нет" description="Можно заняться дедлайнами — они в разделе «Уведомления»." />
      ) : (
        <ol className="space-y-1.5">
          {day.entries.map((entry) => (
            <li key={entry.id}>
              <LessonBlock entry={entry} codes={codes} status={entry.change?.kind === 'cancelled' ? 'cancelled' : undefined} />
              {entry.change && (
                <p className={cx('mt-1 pl-2 text-[12px]', entry.change.kind === 'cancelled' ? 'text-now' : 'text-muted')}>
                  {entry.change.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      {day.entries.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-quiet">
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3" strokeWidth={1.75} aria-hidden="true" />
            {day.entries[0]?.teacher}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" strokeWidth={1.75} aria-hidden="true" />
            {day.entries[0]?.buildingShort}
          </span>
        </p>
      )}
    </section>
  );
}
