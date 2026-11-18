import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useStaffMessages, useStaffRequests, useStaffStats } from '@/lib/queries';
import { StaffOrderList } from '@/components/staff/StaffOrderList';
import { StaffQuestions } from '@/components/staff/StaffQuestions';
import { StaffStats } from '@/components/staff/StaffStats';
import { AnnouncementComposer } from '@/components/staff/AnnouncementComposer';

type Tab = 'requests' | 'messages' | 'announce';

const TABS: Tab[] = ['requests', 'messages', 'announce'];
const tabFromParam = (value: string | null): Tab => (TABS.includes(value as Tab) ? (value as Tab) : 'requests');
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'ready' | 'rejected';

const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'Все' },
  { value: 'pending' as const, label: 'Ожидают' },
  { value: 'in_progress' as const, label: 'В работе' },
  { value: 'ready' as const, label: 'Готовы' },
  { value: 'rejected' as const, label: 'Отклонены' },
];

export default function StaffPage() {
  useDocumentTitle('Кабинет сотрудника — Дедлайн');
  const stats = useStaffStats();
  // Раздел живёт в адресе (?tab=): навигация — только через сайдбар, без дублирующих вкладок.
  const [params] = useSearchParams();
  const tab = tabFromParam(params.get('tab'));
  const [status, setStatus] = useState<StatusFilter>('pending');
  const orders = useStaffRequests(status === 'all' ? null : status);
  const messages = useStaffMessages();
  const client = useQueryClient();

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['staff'] });
  };

  return (
    <div className="animate-fade">
      <PageHeader
        title="Кабинет деканата"
        description="Заявки факультета МО: принять в работу, выдать готовый документ или отказать с причиной."
      />
      {stats.isLoading && <Skeleton className="mb-3 h-24 w-full rounded-[12px]" />}
      {stats.isError && <ErrorState error={stats.error} onRetry={() => void stats.refetch()} title="Данные кабинета не загрузились" compact />}
      {stats.data && <StaffStats stats={stats.data} />}

      <div className="mt-3" />

      {tab === 'requests' && (
        <Card padding="md">
          <CardHeader title="Заявки студентов" count={orders.data?.length} />
          <div role="group" aria-label="Фильтр по статусу" className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STATUS_OPTIONS.map((option) => (
              <Chip key={option.value} selected={status === option.value} onClick={() => setStatus(option.value)}>
                {option.label}
              </Chip>
            ))}
          </div>
          {orders.isLoading && <ListSkeleton count={3} lines={2} />}
          {orders.isError && <ErrorState error={orders.error} onRetry={() => void orders.refetch()} title="Заявки не загрузились" />}
          {orders.data && <StaffOrderList orders={orders.data} onChange={refresh} filterLabel={status} />}
        </Card>
      )}

      {tab === 'messages' && (
        <StaffQuestions
          messages={messages.data}
          loading={messages.isLoading}
          error={messages.error}
          onRetry={() => void messages.refetch()}
          onChange={refresh}
        />
      )}

      {tab === 'announce' && <AnnouncementComposer onPublished={refresh} />}
    </div>
  );
}
