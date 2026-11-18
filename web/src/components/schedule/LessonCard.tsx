import { Clock, UserRound } from 'lucide-react';
import { cx } from '@/lib/cx';
import { fillForSubject } from '@/lib/eventColor';
import type { TodayLecture, WeekEntry } from '@/lib/types';

type Kind = WeekEntry['kind'];

/** Тип занятия пишется в скобках: (лек), (практ), (сем). Цветом тип не кодируем. */
const KIND_SHORT: Record<Kind, string> = {
  lecture: 'лек',
  seminar: 'сем',
  language: 'яз',
  physical: 'физ',
  consult: 'конс',
  exam: 'экз',
};

export function kindBracket(kind: Kind): string {
  return `(${KIND_SHORT[kind] ?? 'пара'})`;
}

export type LessonStatus = 'upcoming' | 'now' | 'done' | 'cancelled' | 'moved_away';

/**
 * Блок занятия по кадру: заливка предмета, радиус 8, паддинг 6/8.
 * Первая строка — время и тип в скобках, дальше название, последней — аудитория.
 */
export function LessonBlock({
  entry,
  codes,
  status = 'upcoming',
  className,
  onClick,
}: {
  entry: WeekEntry;
  codes: readonly string[];
  status?: LessonStatus;
  className?: string;
  onClick?: () => void;
}) {
  const fill = status === 'cancelled' ? 'bg-surface-hover text-muted' : fillForSubject(entry.subjectCode, codes);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'flex w-full flex-col gap-0.5 rounded-[8px] px-2 py-1.5 text-left',
        fill,
        onClick && 'cursor-pointer transition-[filter] duration-150 hover:brightness-[1.06]',
        className,
      )}
    >
      <span className="flex items-center gap-1 text-[11px] leading-[1.3] font-medium tabular-nums">
        <span className="nums">
          {entry.start}–{entry.end}
        </span>
        <span>{kindBracket(entry.kind)}</span>
        {status === 'now' && <span className="ml-auto rounded-full bg-ink/85 px-1.5 text-[9px] font-semibold text-white">сейчас</span>}
      </span>
      <span className={cx('line-clamp-1 text-[12px] leading-[1.25] font-semibold', status === 'cancelled' && 'line-through')}>
        {entry.subject}
      </span>
      <span className="truncate text-[11px] leading-[1.3] font-medium opacity-80">
        {entry.room}
        {entry.change && status !== 'cancelled' ? ` · ${changeMark(entry.change.kind)}` : ''}
      </span>
    </Tag>
  );
}

function changeMark(kind: NonNullable<WeekEntry['change']>['kind']): string {
  switch (kind) {
    case 'cancelled':
      return 'отменено';
    case 'moved':
      return 'перенос';
    case 'added':
      return 'добавлено';
    case 'room':
      return 'нов. ауд.';
    case 'time':
      return 'нов. время';
    default:
      return '';
  }
}

/** Карточка «следующая пара» для главной: белая, иконка акцента, факт первой строкой. */
export function NextLessonCard({
  lecture,
  countdown,
  finishedLabel,
}: {
  lecture: TodayLecture | null;
  countdown: string;
  finishedLabel: string;
}) {
  if (!lecture) {
    return (
      <div className="rounded-[12px] border border-line bg-surface p-4">
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Clock className="size-4 text-quiet" strokeWidth={1.75} aria-hidden="true" />
          {finishedLabel}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <p className="text-[12px] text-quiet">Следующая пара · {countdown.toLowerCase()}</p>
      <p className="mt-1 text-sm font-semibold text-ink">
        {lecture.start}–{lecture.end} · {lecture.subject} {lecture.kindLabel ? `(${lecture.kindLabel.toLowerCase()})` : ''}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          {lecture.teacher}
        </span>
        <span>{lecture.room}</span>
        <span className="truncate">{lecture.building}</span>
      </p>
    </div>
  );
}
