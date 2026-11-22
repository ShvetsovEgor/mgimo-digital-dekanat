import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useWeek } from '@/lib/queries';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { cx } from '@/lib/cx';
import { EntryDetailsSheet } from '@/components/schedule/EntryDetailsSheet';
import { fillForSubject } from '@/lib/eventColor';
import type { ScheduleToday } from '@/lib/types';

type Entry = ScheduleToday['entries'][number];

interface LiveState {
  kind: 'now' | 'soon' | 'finished' | 'free';
  label: string;
  highlightId: number | null;
  badge: 'now' | 'next' | null;
}

/** Живой статус дня: идёт пара, скоро следующая, всё прошло или свободный день. */
function liveState(today: ScheduleToday, now: Date): LiveState {
  const current = today.entries.find((entry) => entry.status === 'now');
  if (current) return { kind: 'now', label: 'Идёт пара', highlightId: current.id, badge: 'now' };

  const next = today.entries.find((entry) => entry.status === 'upcoming');
  if (next) {
    const minutes = next.startMin - (now.getHours() * 60 + now.getMinutes());
    if (minutes <= 30) {
      return {
        kind: 'soon',
        label: minutes <= 1 ? 'Вот-вот начнётся' : `Через ${minutes} мин`,
        highlightId: next.id,
        badge: 'next',
      };
    }
    return { kind: 'soon', label: `Следующая в ${next.start}`, highlightId: next.id, badge: 'next' };
  }

  if (today.entries.length === 0) return { kind: 'free', label: 'Свободный день', highlightId: null, badge: null };
  return { kind: 'finished', label: 'Пары закончились', highlightId: null, badge: null };
}

function LiveBadge({ live }: { live: LiveState }) {
  if (live.kind === 'finished' || live.kind === 'free') {
    return (
      <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border border-line px-2 text-[11px] text-muted">
        {live.label}
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full bg-brand px-2 text-[11px] font-medium text-white">
      <span className="size-1.5 rounded-full bg-white/90" aria-hidden="true" />
      {live.label}
    </span>
  );
}

const DAY_START = 8 * 60; // 08:00
const DAY_END = 18 * 60; // 18:00
const HOUR_HEIGHT = 40; // px на час
const DAY_HEIGHT = ((DAY_END - DAY_START) / 60) * HOUR_HEIGHT;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START / 60 + i);

/** Таймлайн дня: блок пары стоит на своём времени, поэтому карточка сразу читается как расписание. */
function DayTimeline({ entries, now, liveId, liveMark, onOpenEntry }: { entries: Entry[]; now: Date; liveId: number | null; liveMark: 'now' | 'next' | null; onOpenEntry: (entry: Entry) => void }) {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const showNow = minutesNow >= DAY_START && minutesNow <= DAY_END;

  return (
    <div className="relative mt-1" style={{ height: DAY_HEIGHT }} aria-hidden={false}>
      {HOURS.map((hour) => (
        <div key={hour} className="absolute inset-x-0 flex items-start gap-2" style={{ top: (hour - DAY_START / 60) * HOUR_HEIGHT }}>
          <span className="w-9 shrink-0 -translate-y-1/2 text-right text-[10px] text-quiet tabular-nums">
            {String(hour).padStart(2, '0')}:00
          </span>
          <span className="mt-0 h-px flex-1 bg-grid" />
        </div>
      ))}

      <div className="absolute top-0 right-0 bottom-0 left-11">
        {entries.map((entry) => {
          const top = ((entry.startMin - DAY_START) / 60) * HOUR_HEIGHT;
          const height = Math.max(44, ((entry.endMin - entry.startMin) / 60) * HOUR_HEIGHT - 4);
          const cancelled = entry.change?.kind === 'cancelled';
          const mark = liveId === entry.id ? liveMark : null;
          const elapsed = Math.min(1, Math.max(0, (minutesNow - entry.startMin) / (entry.endMin - entry.startMin)));
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onOpenEntry(entry)}
              aria-label={`${entry.subject}, ${entry.start}–${entry.end}. Открыть детали`}
              className={cx(
                'absolute inset-x-0 cursor-pointer overflow-hidden rounded-[8px] px-2 py-1.5 text-left transition-[filter] hover:brightness-[1.06]',
                cancelled ? 'bg-surface-hover text-muted' : fillForSubject(entry.subjectCode, entries.map((item) => item.subjectCode)),
                mark && 'ring-2 ring-brand',
              )}
              style={{ top, height }}
            >
              {elapsed > 0 && !cancelled && (
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 bg-ink/42 dark:bg-black/45"
                  style={{ height: `${elapsed * 100}%` }}
                  aria-hidden="true"
                />
              )}
              <p className="relative z-10 flex items-center gap-1.5 text-[10px] leading-none font-medium tabular-nums">
                <span>
                  {entry.start}–{entry.end}
                </span>
                {mark && <span className="rounded-full bg-ink px-1 py-0.5 text-[9px] font-bold text-white uppercase">{mark === 'now' ? 'Сейчас' : 'Следующая'}</span>}
                {cancelled && <span className="rounded-full bg-surface px-1 py-0.5 text-[9px] font-bold text-now uppercase">Отменено</span>}
              </p>
              <p className={cx('relative z-10 mt-0.5 line-clamp-1 text-[12px] leading-tight font-semibold', cancelled && 'line-through')}>{entry.subject}</p>
              <p className="relative z-10 line-clamp-1 text-[10.5px] leading-tight opacity-80">
                {entry.room}
                {' · '}
                {cancelled ? (entry.change?.note ?? 'отменено') : entry.teacher}
              </p>
            </button>
          );
        })}

        {showNow && (
          <div className="pointer-events-none absolute inset-x-0" style={{ top: ((minutesNow - DAY_START) / 60) * HOUR_HEIGHT }} aria-hidden="true">
            <span className="absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-now" />
          </div>
        )}
      </div>
    </div>
  );
}

/** «Сегодня в расписании» с живым статусом в шапке карточки. */
export function TodayScheduleCard({ today, now }: { today: ScheduleToday; now: Date }) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const live = liveState(today, now);
  const week = useWeek(0);
  const todayIndex = week.data?.days.findIndex((day) => day.isToday) ?? -1;
  const tomorrow = todayIndex >= 0 ? week.data?.days[todayIndex + 1] : undefined;
  const tomorrowFirst = tomorrow?.entries[0];

  return (
    <Card padding="lg" className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-lg text-ink">
          <CalendarDays className="size-[18px] shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <span>Сегодня в расписании</span>
          <LiveBadge live={live} />
        </h2>
        <ActionLink to="/schedule" className="shrink-0 whitespace-nowrap">
          Вся неделя
        </ActionLink>
      </div>

      {today.entries.length === 0 ? (
        <EmptyState
          title="Сегодня занятий нет"
          description="Свободный день — можно заняться дедлайнами."
          action={<ActionLink to="/schedule">Расписание недели</ActionLink>}
          compact
        />
      ) : (
        <DayTimeline entries={today.entries} now={now} liveId={live.highlightId} liveMark={live.badge} onOpenEntry={setSelectedEntry} />
      )}
      {tomorrowFirst && (
        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-center gap-x-1.5 border-t border-line pt-2 text-[12px] text-muted">
            <span className="text-quiet">Завтра:</span>
            <span className="nums">{tomorrowFirst.start}</span>
            <span className="text-ink">{tomorrowFirst.subject}</span>
            <span aria-hidden="true">·</span>
            <span>ауд. {tomorrowFirst.room}</span>
          </p>
        </div>
      )}
      <EntryDetailsSheet entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </Card>
  );
}
