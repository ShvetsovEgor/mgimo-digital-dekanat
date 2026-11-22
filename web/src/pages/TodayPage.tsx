import { CalendarDays, Hourglass } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Progress';
import { ErrorState } from '@/components/ui/States';
import { DeadlinesList } from '@/components/DeadlinesList';
import { AttentionCard } from '@/components/home/AttentionCard';
import { RequestsCard } from '@/components/home/RequestsCard';
import { ScholarshipCard } from '@/components/home/ScholarshipCard';
import { TodayScheduleCard } from '@/components/home/TodayScheduleCard';
import { DemoTimeControl } from '@/components/schedule/DemoTimeControl';
import { greeting, humanDay, pluralize } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useNow, useProfile, useProgress, useRequests, useToday } from '@/lib/queries';

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
      <header className="mb-6 sm:mb-7">
        {profile.isLoading ? (
          <Skeleton className="h-8 w-3/5" />
        ) : (
          <>
            <h1 className="text-[32px] leading-[1.08] text-ink sm:text-[38px]">
              {greeting(now)}
              {name ? `, ${name}` : ''}
            </h1>
          </>
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
      </header>

      <div className="mb-5 lg:hidden">
        <DemoTimeControl />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)] lg:gap-6">
        <div className="flex flex-col gap-5">
          {today.isLoading && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-20 w-full rounded-[12px]" />
              <Skeleton className="h-64 w-full rounded-[12px]" />
            </div>
          )}
          {today.isError && (
            <ErrorState error={today.error} onRetry={() => void today.refetch()} title="Расписание не загрузилось" />
          )}
          {today.data && <TodayScheduleCard today={today.data} now={now} />}
          {today.data && <AttentionCard today={today.data} progress={progress.data} requests={requests.data} />}
        </div>

        <div className="flex flex-col gap-5">
          <div className="hidden lg:block">
            <DemoTimeControl />
          </div>
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
