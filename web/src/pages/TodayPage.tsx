import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  FileText,
  GraduationCap,
  HelpCircle,
  Hourglass,
  MessageCircle,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { LessonBlock, NextLessonCard } from '@/components/schedule/LessonCard';
import { relativeTimeLabel } from '@/components/schedule/meta';
import { DeadlinesList } from '@/components/DeadlinesList';
import { NotificationList } from '@/components/NotificationList';
import { ScholarshipAlertCard } from '@/components/scholarship/ScholarshipAlertCard';
import { greeting } from '@/lib/format';
import { daysUntil, humanDay, pluralize } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import {
  useNotifications,
  useNow,
  useProfile,
  useProgress,
  useRequests,
  useToday,
} from '@/lib/queries';
import type { Order, ProgressBundle, ScheduleToday } from '@/lib/types';

const QUICK_ACTIONS = [
  { to: '/requests/new', label: 'Заказать справку', hint: '1 рабочий день', icon: FilePlus2 },
  { to: '/schedule', label: 'Расписание', hint: 'неделя и изменения', icon: CalendarDays },
  { to: '/progress', label: 'Мои оценки', hint: 'рейтинг и сессия', icon: GraduationCap },
  { to: '/notifications?ask=1', label: 'Нужна помощь', hint: 'вопрос деканату', icon: HelpCircle },
];

export default function TodayPage() {
  const now = useNow();
  const profile = useProfile();
  const today = useToday();
  const progress = useProgress();
  const requests = useRequests();
  const notifications = useNotifications();

  useDocumentTitle('Главная — Дедлайн');

  const name = profile.data?.profile.firstName ?? '';
  const countdown = today.data?.next ? relativeTimeLabel(today.data.next, now) : '';

  return (
    <div className="animate-fade">
      <header className="mb-4">
        {profile.isLoading ? (
          <Skeleton className="h-8 w-3/5" />
        ) : (
          <h1 className="text-2xl font-semibold text-ink">
            {greeting(now)}
            {name ? `, ${name}` : ''}
          </h1>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" aria-hidden="true" />
            {today.data?.dateLabel ?? humanDay(new Date().toISOString(), now)}
          </span>
          {today.data && (
            <>
              <span aria-hidden="true">·</span>
              <span>{today.data.weekParityLabel}</span>
              {today.data.total > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {today.data.done} из {pluralize(today.data.total, 'пары', 'пар', 'пар')} позади
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </header>

      {notifications.isError && <OfflineNote error={notifications.error} onRetry={() => void notifications.refetch()} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {today.isLoading && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-[168px] w-full rounded-[12px]" />
              <Skeleton className="h-20 w-full rounded-[12px]" />
            </div>
          )}
          {today.isError && (
            <ErrorState error={today.error} onRetry={() => void today.refetch()} title="Расписание не загрузилось" />
          )}
          {today.data && (
            <>
              <NextLessonCard
                lecture={today.data.next}
                countdown={countdown}
                finishedLabel={
                  today.data.entries.length === 0
                    ? 'Сегодня занятий нет — свободный день'
                    : 'На сегодня пары закончились'
                }
              />
              <AttentionCard today={today.data} progress={progress.data} requests={requests.data} />
            </>
          )}

          <section aria-labelledby="quick-actions" className="grid grid-cols-2 gap-2.5">
            <h2 id="quick-actions" className="sr-only">
              Быстрые действия
            </h2>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to + action.label}
                to={action.to}
                className="group flex min-h-[76px] flex-col justify-between gap-3 rounded-[12px] border border-line bg-surface p-4 transition-colors hover:bg-surface-hover"
              >
                <span className="text-brand">
                  <action.icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm leading-[1.3] font-semibold text-ink">{action.label}</span>
                  <span className="block text-[11px] text-muted">{action.hint}</span>
                </span>
              </Link>
            ))}
          </section>

          <section aria-labelledby="today-schedule">
            <CardHeader
              id="today-schedule"
              title="Сегодня в расписании"
              icon={<CalendarDays className="size-[18px]" aria-hidden="true" />}
              count={today.data?.entries.length}
              action={
                <ActionLink to="/schedule">Вся неделя</ActionLink>
              }
            />
            {today.data && <TodaySchedulePreview today={today.data} />}
          </section>
        </div>

        <div className="space-y-4">
          <ScholarshipAlertCard />
          <RequestsCard requests={requests.data} loading={requests.isLoading} error={requests.isError} onRetry={() => void requests.refetch()} />
          <Card padding="md">
            <CardHeader
              title="Не опоздать"
              icon={<Hourglass className="size-[18px]" aria-hidden="true" />}
              action={
                <ActionLink to="/notifications?tab=deadlines">Все</ActionLink>
              }
            />
            <DeadlinesList limit={3} />
          </Card>
          <Card padding="md">
            <CardHeader
              title="Последние события"
              icon={<Bell className="size-[18px]" aria-hidden="true" />}
              action={
                <ActionLink to="/notifications">Все</ActionLink>
              }
            />
            <NotificationList items={notifications.data} loading={notifications.isLoading} limit={3} />
          </Card>
          <Card padding="md">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <MessageCircle className="size-[18px] text-brand" strokeWidth={1.75} aria-hidden="true" />
              Быстрый вопрос деканату
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Не нужно идти в ауд. 214 — ответ придёт в уведомления{profile.data ? `, обычно ${profile.data.deanery.responseTime.replace('обычно ', '')}` : ''}.
            </p>
            <ActionLink to="/notifications?ask=1" className="mt-1">Задать вопрос</ActionLink>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TodaySchedulePreview({ today }: { today: ScheduleToday }) {
  if (today.entries.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-6" aria-hidden="true" />}
        title="Сегодня занятий нет — свободный день"
        description="Переключитесь на расписание недели, чтобы спланировать дальше."
        action={
          <ActionLink to="/schedule?view=week">Расписание недели</ActionLink>
        }
        compact
      />
    );
  }
  return (
    <ul className="space-y-2">
      {today.entries.map((entry) => (
        <li key={entry.id}>
          <LessonBlock entry={entry} codes={today.entries.map((item) => item.subjectCode)} status={entry.status} />
        </li>
      ))}
    </ul>
  );
}

interface AttentionCardProps {
  today: ScheduleToday;
  progress?: ProgressBundle;
  requests?: Order[];
}

/** «Что требует внимания сегодня» — изменения, дедлайны, риски по автомату. */
function AttentionCard({ today, progress, requests }: AttentionCardProps) {
  const items = useMemo(() => {
    const list: { id: string; tone: 'warn' | 'danger' | 'info'; text: string; to: string; cta: string }[] = [];
    if (today.changes.length > 0) {
      list.push({
        id: 'changes',
        tone: 'warn',
        text: `${pluralize(today.changes.length, 'изменение', 'изменения', 'изменений')} в расписании недели`,
        to: '/schedule',
        cta: 'Смотреть',
      });
    }
    const active = (requests ?? []).filter((order) => order.status === 'ready' && order.canDownload);
    if (active.length > 0) {
      const first = active[0];
      list.push({
        id: 'ready',
        tone: 'info',
        text: first ? `Справка ${first.number} готова — скачайте PDF` : '',
        to: first ? `/requests/${first.id}` : '/requests',
        cta: 'Открыть',
      });
    }
    if (progress && progress.summary.riskCount > 0) {
      list.push({
        id: 'risk',
        tone: 'danger',
        text: `${pluralize(progress.summary.riskCount, 'дисциплина', 'дисциплины', 'дисциплин')} под угрозой «автомата»`,
        to: '/progress',
        cta: 'Что делать',
      });
    }
    return list.slice(0, 3);
  }, [today.changes.length, progress, requests]);

  if (items.length === 0) return null;

  return (
    <Card padding="md">
      <CardHeader title="Что требует внимания" icon={<AlertTriangle className="size-[18px]" aria-hidden="true" />} />
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              className="flex min-h-11 items-center justify-between gap-3 rounded-[8px] px-1 py-1.5 text-sm no-underline transition-colors hover:bg-surface-hover"
            >
              <span className="flex min-w-0 items-center gap-2 text-ink">
                {item.tone === 'info' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <AlertTriangle className={item.tone === 'danger' ? 'size-4 shrink-0 text-now' : 'size-4 shrink-0 text-quiet'} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="line-clamp-2 sm:truncate">{item.text}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand">
                {item.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RequestsCard({ requests, loading, error, onRetry }: { requests?: Order[]; loading: boolean; error: boolean; onRetry: () => void }) {
  const active = (requests ?? []).filter((order) => order.status === 'pending' || order.status === 'in_progress');
  const latestReady = (requests ?? []).find((order) => order.status === 'ready');
  const shown = latestReady ? [...active, latestReady] : active;
  return (
    <Card padding="md">
      <CardHeader
        title="Заявки"
        icon={<FileText className="size-[18px]" aria-hidden="true" />}
        count={shown.length}
        action={
          <ActionLink to="/requests">Все</ActionLink>
        }
      />
      {loading && <SkeletonCard lines={2} />}
      {error && <ErrorState error={new Error('Заявки не загрузились')} onRetry={onRetry} compact />}
      {!loading && !error && shown.length === 0 && (
        <EmptyState
          title="Активных заявок нет"
          description="Справку об обучении можно заказать за пару кликов."
          action={
            <ActionLink to="/requests/new">Новая заявка</ActionLink>
          }
          compact
        />
      )}
      {!loading && !error && shown.length > 0 && (
        <ul className="space-y-2">
          {shown.slice(0, 3).map((order) => {
            const days = daysUntil(order.dueAt);
            const ready = order.status === 'ready';
            const tail = ready
              ? order.readyAtLabel
                ? ` · ${order.readyAtLabel}`
                : ''
              : days >= 0
                ? ` · через ${pluralize(days, 'день', 'дня', 'дней')}`
                : ' · просрочено';
            return (
              <li key={order.id}>
                <Link
                  to={`/requests/${order.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-[8px] px-1 py-1.5 no-underline transition-colors hover:bg-surface-hover"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-[8px] ${
                      ready ? 'bg-surface-hover text-ink' : 'bg-surface-hover text-brand'
                    }`}
                    aria-hidden="true"
                  >
                    {ready ? <CheckCircle2 className="size-[18px]" /> : <Hourglass className="size-[18px]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{order.typeTitle}</span>
                    <span className="nums block truncate text-[12px] text-muted">
                      {order.number} · {order.statusLabel}
                      {tail}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-quiet" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 border-t border-line pt-2">
        <ActionLink to="/requests/new">Новая заявка</ActionLink>
      </div>
    </Card>
  );
}

function OfflineNote({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-line bg-surface-hover px-3 py-2 text-[13px] text-ink" role="status">
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        Часть данных не загрузилась{(error as Error | null)?.message ? `: ${(error as Error).message}` : '.'}{' '}
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2">
          Повторить
        </Button>
      </p>
    </div>
  );
}
