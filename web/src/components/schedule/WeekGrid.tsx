import { MapPin } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { WeekDay } from '@/lib/types';

/** Десктопная сетка недели: 7 колонок, пары с изменениями выделены цветом. */
export function WeekGrid({ days }: { days: WeekDay[] }) {
  return (
    <div className="hidden gap-2.5 lg:grid lg:grid-cols-7">
      {days.map((item) => (
        <div
          key={item.date}
          className={cx(
            'flex min-h-[180px] flex-col rounded-[16px] border p-2',
            item.isToday ? 'border-brand/40 bg-brand-soft/30' : 'border-line bg-surface-2/60',
          )}
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-bold tracking-wide text-muted uppercase">{item.weekdayLabel}</span>
            <span className={cx('nums text-sm font-extrabold', item.isToday ? 'text-brand-ink' : 'text-ink')}>{item.dayLabel}</span>
          </div>
          {item.entries.length === 0 ? (
            <p className="mt-4 text-center text-[11px] text-muted">нет пар</p>
          ) : (
            <ul className="space-y-1.5">
              {item.entries.map((entry) => {
                const change = entry.change;
                const tone = !change
                  ? 'border-line bg-surface'
                  : change.kind === 'cancelled'
                    ? 'border-danger/40 bg-danger-soft/60'
                    : change.kind === 'moved'
                      ? 'border-info/35 bg-info-soft/60'
                      : 'border-warn/40 bg-warn-soft/60';
                const tag = !change
                  ? null
                  : change.kind === 'cancelled'
                    ? 'отменено'
                    : change.kind === 'room'
                      ? 'ауд. изменена'
                      : change.kind === 'moved'
                        ? 'перенос'
                        : change.kind === 'time'
                          ? 'время изменено'
                          : 'добавлено';
                return (
                  <li key={entry.id}>
                    <div className={cx('rounded-lg border p-1.5 text-[11px] leading-tight', tone)}>
                      <p className="nums font-bold text-ink">
                        {entry.start}–{entry.end}
                      </p>
                      <p className={cx('mt-0.5 line-clamp-2 font-semibold', change?.kind === 'cancelled' ? 'text-muted line-through' : 'text-ink')}>
                        {entry.subject}
                      </p>
                      <p className="mt-0.5 flex items-center gap-0.5 text-muted">
                        <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                        {entry.room}
                      </p>
                      {tag && (
                        <p
                          className={cx(
                            'mt-1 truncate text-[10px] font-bold',
                            change?.kind === 'cancelled' ? 'text-danger-ink' : change?.kind === 'moved' || change?.kind === 'added' ? 'text-info-ink' : 'text-warn-ink',
                          )}
                          title={change?.note}
                        >
                          {tag}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
