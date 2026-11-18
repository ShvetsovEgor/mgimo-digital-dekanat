import { AlertTriangle, ArrowRight, CalendarClock, Info, MapPin, UserRound } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { cx } from '@/lib/cx';
import { fillForSubject } from '@/lib/eventColor';
import { CHANGE_LABELS } from './meta';
import type { ScheduleChange } from '@/lib/types';

const ICON = {
  cancelled: AlertTriangle,
  room: MapPin,
  time: CalendarClock,
  moved: ArrowRight,
  added: Info,
};

const SUBJECT_CODES: Record<ScheduleChange['kind'], string[]> = {
  cancelled: [],
  room: [],
  time: [],
  moved: [],
  added: [],
};

/**
 * Карточка изменения: пастельная плашка предмета слева, факт первой строкой,
 * дальше причина и автор правки тихой сноской.
 */
export function ChangeCard({ change, compact }: { change: ScheduleChange; compact?: boolean }) {
  const meta = CHANGE_LABELS[change.kind];
  const Icon = ICON[change.kind] ?? Info;
  // Плашка предмета: цвет выводится из названия, чтобы совпадать с блоком в сетке недели.
  const fill = fillForSubject(`change-${change.subject}`, SUBJECT_CODES[change.kind] ?? []);
  return (
    <Card padding="sm" className="flex gap-3">
      <span
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-[8px]',
          change.kind === 'cancelled' ? 'bg-surface-hover text-now' : fill,
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-ink">{change.subject}</span>
          <Badge tone={change.kind === 'cancelled' ? 'danger' : 'brand'} size="sm">
            {meta.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">
          {change.from}
          {change.to && (
            <>
              {' '}
              <span aria-hidden="true">→</span> <span className="text-ink">{change.to}</span>
            </>
          )}
        </p>
        {!compact && change.note && <p className="mt-1 text-[13px] text-muted">{change.note}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-quiet">
          <UserRound className="size-3" strokeWidth={1.75} aria-hidden="true" />
          <span>
            {change.publishedBy} · {change.published}
          </span>
        </p>
      </div>
    </Card>
  );
}
