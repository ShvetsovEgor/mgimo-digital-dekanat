import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Info, MapPin, UserRound } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { CHANGE_LABELS } from './meta';
import { formatDateLong } from '@/lib/format';
import type { ScheduleChange } from '@/lib/types';

const SEVERITY_ICON = {
  cancelled: AlertTriangle,
  room: MapPin,
  time: CalendarClock,
  moved: ArrowRight,
  added: Info,
};

const TONE_CLASS = {
  danger: { card: 'border-danger/35 bg-danger-soft/40', icon: 'bg-danger-soft text-danger-ink' },
  warn: { card: 'border-warn/35 bg-warn-soft/40', icon: 'bg-warn-soft text-warn-ink' },
  info: { card: 'border-info/30 bg-info-soft/40', icon: 'bg-info-soft text-info-ink' },
} as const;

/** Карточка одного изменения расписания: кто, когда и почему задал правку. */
export function ChangeCard({ change, compact }: { change: ScheduleChange; compact?: boolean }) {
  const meta = CHANGE_LABELS[change.kind];
  const Icon = SEVERITY_ICON[change.kind] ?? Info;
  const tone = TONE_CLASS[meta.accent];
  return (
    <Card padding="sm" accent={meta.accent} className={tone.card}>
      <div className="flex gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone.icon}`} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={meta.tone} size="sm">
              {meta.label}
            </Badge>
            <span className="truncate text-sm font-bold text-ink">{change.subject}</span>
          </div>
          <p className="mt-1 text-[13px] text-ink/80">
            <span className="font-semibold">{change.from}</span>
            {change.to && (
              <>
                {' '}
                <span aria-hidden="true">→</span> <span className="font-semibold text-ink">{change.to}</span>
              </>
            )}
          </p>
          {!compact && change.note && <p className="mt-1 text-[13px] text-muted">{change.note}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
            <CheckCircle2 className="size-3 text-ok" aria-hidden="true" />
            <span>
              {change.publishedBy} · {change.published}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" aria-hidden="true" />
              опубликовано деканатом
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}

interface ChangesSectionProps {
  changes: ScheduleChange[];
  title?: string;
}

/** Список «Изменения на неделе». */
export function ChangesSection({ changes, title = 'Изменения на неделе' }: ChangesSectionProps) {
  if (changes.length === 0) {
    return (
      <Card padding="md" className="flex items-center gap-3 border-dashed">
        <span className="grid size-9 place-items-center rounded-xl bg-ok-soft text-ok-ink" aria-hidden="true">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Изменений нет</p>
          <p className="text-[13px] text-muted">Расписание недели совпадает с исходным.</p>
        </div>
      </Card>
    );
  }
  return (
    <section aria-labelledby="changes-title">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="changes-title" className="text-[16px] font-bold text-ink">
          {title}
        </h2>
        <span className="nums rounded-full bg-line/60 px-2 py-0.5 text-xs font-semibold text-muted">{changes.length}</span>
      </div>
      <ul className="space-y-2">
        {changes.map((change) => (
          <li key={`${change.entryId}-${change.kind}`}>
            <ChangeCard change={change} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Последнее обновление: {formatDateLong(new Date())}. Изменения публикует только деканат — и у каждого видна причина.
      </p>
    </section>
  );
}
