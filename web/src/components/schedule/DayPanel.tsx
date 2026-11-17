import { MapPin, UserRound } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/States';
import { cx } from '@/lib/cx';
import type { WeekDay } from '@/lib/types';

/** Мобильный/планшетный вид недели: выбранный день списком. */
export function DayPanel({ day }: { day: WeekDay }) {
  return (
    <Card padding="md" className={cx('mt-3', day.isToday && 'border-brand/30')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-ink">
          {day.weekdayLabel}, {day.dayLabel} {day.monthLabel}
          {day.isToday && <span className="ml-2 text-[12px] font-semibold text-brand-ink">сегодня</span>}
        </p>
        <span className="text-[12px] text-muted">{day.entries.length > 0 ? `${day.entries.length} в расписании` : 'пар нет'}</span>
      </div>
      {day.isHoliday && <p className="mb-2 rounded-lg bg-warn-soft px-2 py-1.5 text-[12px] font-semibold text-warn-ink">Нерабочий день</p>}
      {day.entries.length === 0 ? (
        <EmptyState compact title="В этот день занятий нет" description="Можно посвятить день дедлайнам — они в разделе «Уведомления»." />
      ) : (
        <ul className="space-y-2">
          {day.entries.map((entry) => (
            <li key={entry.id}>
              <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="nums text-sm font-extrabold text-ink">
                    {entry.start}–{entry.end}
                  </span>
                  <Badge tone="neutral" size="sm">
                    {entry.kindLabel}
                  </Badge>
                </div>
                <p className={cx('mt-1 text-[15px] font-bold', entry.change?.kind === 'cancelled' ? 'text-muted line-through' : 'text-ink')}>
                  {entry.subject}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3" aria-hidden="true" /> {entry.teacher}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden="true" /> ауд. {entry.room} · {entry.buildingShort}
                  </span>
                </p>
                {entry.change && (
                  <p
                    className={cx(
                      'mt-1.5 rounded-md px-2 py-1 text-[11px] font-semibold',
                      entry.change.kind === 'cancelled'
                        ? 'bg-danger-soft text-danger-ink'
                        : entry.change.kind === 'room' || entry.change.kind === 'time'
                          ? 'bg-warn-soft text-warn-ink'
                          : 'bg-info-soft text-info-ink',
                    )}
                  >
                    {entry.change.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
