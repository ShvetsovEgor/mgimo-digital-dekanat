import type { ReactNode } from 'react';
import { ArrowRight, MapPin, MoveRight, UserRound, XCircle } from 'lucide-react';
import { Badge, Dot } from '../ui/Badge';
import { Card } from '../ui/Card';
import { CHANGE_LABELS, KIND_STYLES } from './meta';
import { cx } from '@/lib/cx';
import type { TodayEntry, TodayLecture, WeekEntry } from '@/lib/types';

interface LessonCardProps {
  entry: WeekEntry;
  status?: TodayEntry['status'];
  showDate?: boolean;
  action?: ReactNode;
}

/** Карточка пары: время, предмет, преподаватель, аудитория, плашка изменения. */
export function LessonCard({ entry, status, showDate, action }: LessonCardProps) {
  const kind = KIND_STYLES[entry.kind] ?? KIND_STYLES.default;
  const changeMeta = entry.change ? CHANGE_LABELS[entry.change.kind] : null;
  const cancelled = status === 'cancelled' || entry.change?.kind === 'cancelled';
  const muted = cancelled || status === 'done' || status === 'moved_away';

  return (
    <Card
      as="article"
      padding="sm"
      accent={entry.change ? (changeMeta?.accent ?? 'info') : null}
      className={cx('relative', muted && 'bg-surface-2')}
      aria-label={`${entry.subject}, ${entry.start}–${entry.end}`}
    >
      <div className="flex gap-3">
        <div className="w-[52px] shrink-0 border-r border-line pr-2 text-right">
          <p className={cx('nums text-[15px] font-extrabold', cancelled ? 'text-muted line-through' : 'text-ink')}>
            {entry.start}
          </p>
          <p className="nums text-[11px] text-muted">{entry.end}</p>
          {status === 'now' && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-ok-ink">
              <Dot tone="ok" pulse /> идёт
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={kind.tone} size="sm">
              {entry.kindLabel || kind.short}
            </Badge>
            {entry.subgroup && (
              <Badge tone="neutral" size="sm">
                подгр. {entry.subgroup}
              </Badge>
            )}
            {showDate && <span className="nums text-[11px] font-semibold text-muted">{entry.date.slice(5).split('-').reverse().join('.')}</span>}
          </div>

          <h3 className={cx('mt-1 text-[15px] leading-snug font-bold', cancelled ? 'text-muted line-through' : 'text-ink')}>
            {entry.subject}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{entry.teacher}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                ауд. {entry.room} · {entry.buildingShort}
              </span>
            </span>
          </div>

          {entry.change && changeMeta && (
            <div
              className={cx(
                'mt-2 rounded-lg px-2 py-1.5 text-[12px] leading-snug',
                changeMeta.accent === 'danger'
                  ? 'bg-danger-soft text-danger-ink'
                  : changeMeta.accent === 'warn'
                    ? 'bg-warn-soft text-warn-ink'
                    : 'bg-info-soft text-info-ink',
              )}
            >
              <span className="inline-flex items-start gap-1 font-semibold">
                {changeMeta.accent === 'danger' ? (
                  <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <MoveRight className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                )}
                {entry.change.note}
              </span>
            </div>
          )}

          {status === 'moved_away' && (
            <p className="mt-2 rounded-lg bg-info-soft px-2 py-1.5 text-[12px] font-semibold text-info-ink">
              Пара перенесена{entry.movedTo ? ` на ${entry.movedTo}` : ' на другой день'} — не приходите в это время
            </p>
          )}

          {action && <div className="mt-2.5">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

interface NextLessonCardProps {
  lecture: TodayLecture | null;
  countdown: string;
  finishedLabel?: string;
  compact?: boolean;
}

/** Крупная карточка «Следующая пара» с обратным отсчётом. */
export function NextLessonCard({ lecture, countdown, finishedLabel, compact }: NextLessonCardProps) {
  if (!lecture) {
    return (
      <Card padding="md" className="border-dashed bg-surface-2">
        <p className="text-sm font-bold text-ink">{finishedLabel ?? 'На сегодня пары закончились'}</p>
        <p className="mt-0.5 text-[13px] text-muted">Можно закрыть хвосты: ближайшие дедлайны — ниже.</p>
      </Card>
    );
  }
  return (
    <section
      aria-label="Следующая пара"
      className={cx(
        'relative overflow-hidden rounded-[22px] bg-brand-strong p-4 text-white shadow-lift sm:p-5',
        compact && 'p-3.5',
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full border border-gold/25 bg-gold/10"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] uppercase ring-1 ring-white/15">
            {lecture.isNow ? 'Сейчас идёт' : 'Следующая пара'}
          </span>
          <span
            className="nums inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[13px] font-extrabold text-[#221a03]"
            aria-live="polite"
          >
            <ArrowRight className="size-3.5" aria-hidden="true" />
            {countdown}
          </span>
        </div>
        <h2 className="mt-2.5 text-xl leading-tight font-extrabold tracking-tight sm:text-[24px]">{lecture.subject}</h2>
        <p className="mt-1 text-sm text-white/70">{lecture.kindLabel}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-[11px] text-white/55 uppercase">Время</dt>
            <dd className="nums font-bold">
              {lecture.start}–{lecture.end}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-white/55 uppercase">Аудитория</dt>
            <dd className="font-bold">{lecture.room}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[11px] text-white/55 uppercase">Преподаватель</dt>
            <dd className="truncate font-bold">{lecture.teacher}</dd>
          </div>
        </dl>
        <p className="mt-2.5 text-[12px] text-white/55">{lecture.building}</p>
      </div>
    </section>
  );
}
