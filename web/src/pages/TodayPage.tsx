import { CalendarDays, FilePlus2, HelpCircle, Hourglass, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Progress';
import { ErrorState } from '@/components/ui/States';
import { DeadlinesList } from '@/components/DeadlinesList';
import { AttentionCard } from '@/components/home/AttentionCard';
import { RequestsCard } from '@/components/home/RequestsCard';
import { ScholarshipCard } from '@/components/home/ScholarshipCard';
import { TodayScheduleCard } from '@/components/home/TodayScheduleCard';
import { greeting, humanDay, pluralize } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useNow, useProfile, useProgress, useRequests, useToday } from '@/lib/queries';

const QUICK_ACTIONS = [
  { to: '/requests/new', label: 'Справка', icon: FilePlus2 },
  { to: '/scholarship', label: 'Калькулятор', icon: Wallet },
  { to: '/notifications?ask=1', label: 'Задать вопрос', icon: HelpCircle },
];

export default function TodayPage() {
  const now = useNow();
  const profile = useProfile();
  const today = useToday();
  const progress = useProgress();
  const requests = useRequests();

  useDocumentTitle('Главная — Дедлайн');
  const name = profile.data?.profile.firstName ?? '';

  return (
    <div className="animate-fade">
      <header className="mb-2">
        {profile.isLoading ? (
          <Skeleton className="h-8 w-3/5" />
        ) : (
          <h1 className="text-2xl font-semibold text-ink">
            {greeting(now)}
            {name ? `, ${name}` : ''}
          </h1>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden="true" />
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

        {/* Быстрые действия — одна компактная строка пилюль */}
        <nav aria-label="Быстрые действия" className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink no-underline transition-colors hover:bg-surface-hover"
            >
              <action.icon className="size-4 text-brand" strokeWidth={1.75} aria-hidden="true" />
              {action.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {today.isLoading && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-20 w-full rounded-[12px]" />
              <Skeleton className="h-64 w-full rounded-[12px]" />
            </div>
          )}
          {today.isError && (
            <ErrorState error={today.error} onRetry={() => void today.refetch()} title="Расписание не загрузилось" />
          )}
          {today.data && <AttentionCard today={today.data} progress={progress.data} requests={requests.data} />}
          {today.data && <TodayScheduleCard today={today.data} now={now} />}
        </div>

        <div className="flex flex-col gap-3">
          <ScholarshipCard />
          <RequestsCard
            requests={requests.data}
            loading={requests.isLoading}
            error={requests.isError}
            onRetry={() => void requests.refetch()}
          />
          <Card padding="md">
            <CardHeader
              title="Не опоздать"
              icon={<Hourglass className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
              action={<ActionLink to="/notifications?tab=deadlines">Все</ActionLink>}
            />
            <DeadlinesList limit={3} hideDone />
          </Card>
        </div>
      </div>
    </div>
  );
}
