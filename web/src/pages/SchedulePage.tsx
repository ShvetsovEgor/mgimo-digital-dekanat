import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/Layout';
import { useToast } from '@/components/ui/Toast';
import { ChangeCard } from '@/components/schedule/ChangeCard';
import { DayPanel } from '@/components/schedule/DayPanel';
import { LessonBlock, NextLessonCard } from '@/components/schedule/LessonCard';
import { WeekCalendar } from '@/components/schedule/WeekGrid';
import { relativeTimeLabel } from '@/components/schedule/meta';
import { calendarUrl, cx, isMock } from '@/lib/cx';
import { downloadWithSession } from '@/lib/tab-session';
import { formatDateLong } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useNow, useToday, useWeek } from '@/lib/queries';
import type { ScheduleWeek } from '@/lib/types';

type View = 'today' | 'week';

export default function SchedulePage() {
  const [params, setParams] = useSearchParams();
  // По умолчанию открываем неделю: студенту нужен обзор, а не только сегодняшний день.
  const view: View = params.get('view') === 'today' ? 'today' : 'week';
  const setView = (next: View) => setParams(next === 'week' ? {} : { view: next }, { replace: true });
  useDocumentTitle('Расписание — Дедлайн');

  return (
    <div className="animate-fade">
      <PageHeader
        title="Расписание"
        actions={<CalendarButton />}
      />
      <Segmented
        label="Вид расписания"
        className="mb-4 lg:w-auto"
        value={view}
        onChange={setView}
        options={[
          { value: 'today', label: 'Сегодня' },
          { value: 'week', label: 'Неделя' },
        ]}
      />
      {view === 'today' ? <TodayView /> : <WeekView />}
    </div>
  );
}

function CalendarButton() {
  const toast = useToast();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (isMock()) {
          toast.show('В демо без сервера файл не создаётся — на рабочем сервере скачается .ics для календаря', 'info');
          return;
        }
        void downloadWithSession(calendarUrl(), 'schedule.ics').catch(() =>
          toast.error('Не удалось скачать календарь. Попробуйте ещё раз.'),
        );
      }}
      iconLeft={<CalendarPlus className="size-4" aria-hidden="true" />}
    >
      В календарь
    </Button>
  );
}

// ---------------------------------------------------------------------------
// «Сегодня»
// ---------------------------------------------------------------------------
function TodayView() {
  const today = useToday();
  const now = useNow();

  if (today.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-[12px]" />
        <Skeleton className="h-24 w-full rounded-[12px]" />
        <Skeleton className="h-24 w-full rounded-[12px]" />
      </div>
    );
  }
  if (today.isError) return <ErrorState error={today.error} onRetry={() => void today.refetch()} title="Расписание не загрузилось" />;
  if (!today.data) return null;

  const data = today.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink first-letter:uppercase">{data.dateLabel}</p>
          <p className="text-[13px] text-muted">
            {data.weekParityLabel} · {data.universityDay}
          </p>
        </div>
        <Badge tone={data.finished ? 'neutral' : 'ok'} dot>
          {data.total === 0 ? 'свободный день' : data.finished ? 'всё прошло' : `${data.done} из ${data.total} прошло`}
        </Badge>
      </div>

      {data.total > 0 && (
        <NextLessonCard
          lecture={data.next}
          countdown={data.next ? relativeTimeLabel(data.next, now) : ''}
          finishedLabel="На сегодня пары закончились"
        />
      )}

      <section aria-labelledby="today-timeline">
        <h2 id="today-timeline" className="mb-2.5 text-sm font-semibold text-ink">
          Лента дня
        </h2>
        {data.entries.length === 0 ? (
          <EmptyState
            icon={<Coffee className="size-6" aria-hidden="true" />}
            title="Сегодня занятий нет — свободный день"
            description="Отдохните или посмотрите расписание недели: изменения уже отмечены."
          />
        ) : (
          <ol className="space-y-1.5">
            {data.entries.map((entry) => (
              <li key={entry.id}>
                <LessonBlock entry={entry} codes={data.entries.map((item) => item.subjectCode)} status={entry.status} />
                {entry.change && <p className="mt-1 pl-2 text-[12px] text-muted">{entry.change.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {data.changes.length > 0 && (
        <section aria-labelledby="today-changes">
          <h2 id="today-changes" className="mb-2.5 text-sm font-semibold text-ink">
            Изменения на неделе
          </h2>
          <ul className="space-y-2">
            {data.changes.map((change) => (
              <li key={`${change.entryId}-${change.kind}`}>
                <ChangeCard change={change} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// «Неделя»
// ---------------------------------------------------------------------------
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}


function WeekView() {
  // Смещение недели, а не дата: дата в запросе подменяла бы «сегодня» и ломала подсветку текущего дня.
  const [offset, setOffset] = useState(0);
  const anchor = useMemo(() => {
    const monday = startOfWeek(new Date());
    monday.setDate(monday.getDate() + offset * 7);
    return monday;
  }, [offset]);
  const week = useWeek(offset);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[12px] border border-line bg-surface p-2">
        <IconButton label="Предыдущая неделя" variant="ghost" onClick={() => setOffset((value) => value - 1)}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </IconButton>
        <div className="flex-1 text-center" aria-live="polite">
          <p className="text-sm font-semibold text-ink">{week.data?.weekLabel ?? formatDateLong(anchor)}</p>
          <p className="text-[12px] text-muted">{week.data?.parityLabel ?? '…'}</p>
        </div>
        <IconButton label="Следующая неделя" variant="ghost" onClick={() => setOffset((value) => value + 1)}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </IconButton>
      </div>
      {offset !== 0 && (
        <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
          Вернуться к текущей неделе
        </Button>
      )}

      {week.isLoading && (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-[10px]" />
          <Skeleton className="h-32 w-full rounded-[12px]" />
          <Skeleton className="h-32 w-full rounded-[12px]" />
        </div>
      )}
      {week.isError && <ErrorState error={week.error} onRetry={() => void week.refetch()} title="Неделя не загрузилась" />}
      {week.data && <WeekBody week={week.data} />}
    </div>
  );
}

function WeekBody({ week }: { week: ScheduleWeek }) {
  const now = useNow();
  const toast = useToast();
  const todayIndex = week.days.findIndex((day) => day.isToday);
  const [selected, setSelected] = useState(() => (todayIndex >= 0 ? todayIndex : 0));
  const day = week.days[selected] ?? week.days[0];

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <div role="tablist" aria-label="Дни недели" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {week.days.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={item.date}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${item.weekdayLabel}, ${item.dayLabel} ${item.monthLabel}${item.isToday ? ', сегодня' : ''}`}
                onClick={() => setSelected(index)}
                className={cx(
                  'flex w-[54px] shrink-0 cursor-pointer flex-col items-center rounded-[10px] border px-1 py-1.5 transition-colors',
                  active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-surface-2',
                )}
              >
                <span className={cx('text-[11px] font-semibold', active ? 'text-white/80' : 'text-muted')}>{item.weekdayLabel}</span>
                <span className="nums text-lg leading-tight font-semibold">{item.dayLabel}</span>
                <span className={cx('nums text-[10px]', active ? 'text-white/75' : 'text-muted')}>
                  {item.entries.length > 0 ? `${item.entries.length} пар` : '—'}
                </span>
                {item.isToday && <span className="mt-0.5 size-1 rounded-full bg-gold" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {day && <DayPanel day={day} />}
      </div>

      <div className="hidden lg:block">
        <WeekCalendar
          days={week.days}
          now={now}
          onOpenChange={(entryId) => {
            const change = week.changes.find((item) => item.entryId === entryId);
            if (change) toast.show(`${change.kindLabel}: ${change.note}`, 'info');
          }}
        />
      </div>

      {week.changes.length > 0 && (
        <section aria-labelledby="week-changes">
          <h2 id="week-changes" className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink">
            Изменения на неделе
            <span className="nums rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-muted">{week.changes.length}</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {week.changes.map((change) => (
              <li key={`${change.entryId}-${change.kind}`}>
                <ChangeCard change={change} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <CalendarDays className="size-3.5" aria-hidden="true" />
        {week.parityLabel} · {week.weekLabel}. Изменения публикует деканат — они появляются сразу.
      </p>
    </div>
  );
}
