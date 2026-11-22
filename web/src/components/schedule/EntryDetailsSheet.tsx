import { Building2, CalendarClock, Info, MapPin, UserRound, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { kindBracket } from './LessonCard';
import type { WeekEntry } from '@/lib/types';

export function EntryDetailsSheet({ entry, onClose }: { entry: WeekEntry | null; onClose: () => void }) {
  const change = entry?.change;
  return (
    <Sheet
      open={Boolean(entry)}
      onClose={onClose}
      title={entry?.subject ?? 'Занятие'}
      description={entry ? `${entry.date} · ${entry.start}–${entry.end} ${kindBracket(entry.kind)}` : undefined}
      size="sm"
    >
      {entry && (
        <div className="space-y-4">
          {change && (
            <div className="rounded-[10px] border border-line bg-surface-hover p-3">
              <Badge tone={change.kind === 'cancelled' ? 'danger' : 'info'}>{change.kind === 'cancelled' ? 'Занятие отменено' : 'В расписании есть изменение'}</Badge>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">{change.note}</p>
              <p className="mt-1 text-[12px] text-muted">Опубликовал(а): {change.publishedBy} · {change.published}</p>
            </div>
          )}
          <dl className="space-y-3 text-[14px]">
            <Detail icon={<UserRound className="size-4" aria-hidden="true" />} label="Преподаватель" value={entry.teacher} />
            <Detail icon={<MapPin className="size-4" aria-hidden="true" />} label="Аудитория" value={entry.room} />
            <Detail icon={<Building2 className="size-4" aria-hidden="true" />} label="Корпус" value={entry.building} />
            <Detail icon={<Users className="size-4" aria-hidden="true" />} label="Группа" value={`${entry.group}${entry.subgroup ? ` · подгруппа ${entry.subgroup}` : ''}`} />
            <Detail icon={<CalendarClock className="size-4" aria-hidden="true" />} label="Время" value={`${entry.start}–${entry.end}`} />
          </dl>
          {!change && (
            <p className="flex gap-2 border-t border-line pt-3 text-[12px] text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Занятие проводится по исходному расписанию без изменений.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
      <div>
        <dt className="text-[12px] text-muted">{label}</dt>
        <dd className="mt-0.5 text-ink">{value}</dd>
      </div>
    </div>
  );
}
