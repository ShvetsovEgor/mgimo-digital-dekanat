import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, FolderOpen, History } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/States';
import { OrderCard } from '@/components/OrderCard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useRequests } from '@/lib/queries';
import type { Order } from '@/lib/types';

type Bucket = 'active' | 'history';

export function isActive(order: Order): boolean {
  return order.status === 'pending' || order.status === 'in_progress';
}

export default function RequestsPage() {
  useDocumentTitle('Заявки — Дедлайн');
  const requests = useRequests();
  const [params, setParams] = useSearchParams();
  const bucket: Bucket = params.get('tab') === 'history' ? 'history' : 'active';

  const groups = useMemo(() => {
    const all = requests.data ?? [];
    return {
      active: all.filter(isActive),
      history: all.filter((order) => !isActive(order)),
      ready: all.filter((order) => order.status === 'ready' && order.canDownload),
    };
  }, [requests.data]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Заявки и справки"
        description="Заказ без визита в деканат: статус обновляется сам, готовый документ — PDF с QR-подписью."
        actions={
          <ButtonLink to="/requests/new" iconLeft={<FilePlus2 className="size-4" aria-hidden="true" />}>
            Новая заявка
          </ButtonLink>
        }
      />

      {requests.isLoading && <ListSkeleton count={3} />}
      {requests.isError && (
        <ErrorState error={requests.error} onRetry={() => void requests.refetch()} title="Заявки не загрузились" />
      )}

      {requests.data && requests.data.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="size-6" aria-hidden="true" />}
          title="Заявок пока нет"
          description="Начните со справки об обучении — она бесплатна и готова за 1 рабочий день."
          action={
            <ButtonLink to="/requests/new" iconLeft={<FilePlus2 className="size-4" aria-hidden="true" />}>
              Заказать справку
            </ButtonLink>
          }
        />
      )}

      {requests.data && requests.data.length > 0 && (
        <div className="space-y-3">
          <Segmented
            label="Тип заявок"
            value={bucket}
            onChange={(value) => setParams(value === 'active' ? {} : { tab: value }, { replace: true })}
            options={[
              { value: 'active', label: 'Активные', badge: groups.active.length },
              { value: 'history', label: 'История', badge: groups.history.length },
            ]}
          />

          {bucket === 'active' && (
            <>
              {groups.ready.length > 0 && (
                <Card padding="sm" className="border-ok/35 bg-ok-soft/50">
                  <p className="text-[13px] font-bold text-ok-ink">
                    {groups.ready.length === 1 ? 'Готов ваш документ' : `Готовы документы: ${groups.ready.length}`}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {groups.ready.map((order) => (
                      <li key={order.id}>
                        <Link
                          to={`/requests/${order.id}`}
                          className="nums flex min-h-9 items-center justify-between gap-2 text-[13px] font-semibold text-ok-ink hover:underline underline-offset-2"
                        >
                          {order.typeTitle} · {order.number}
                          <span aria-hidden="true">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {groups.active.length === 0 ? (
                <EmptyState
                  icon={<History className="size-6" aria-hidden="true" />}
                  title="Активных заявок нет"
                  description="Все заказы завершены — они в истории. Нужна новая справка?"
                  action={<ButtonLink to="/requests/new" variant="tonal">Новая заявка</ButtonLink>}
                />
              ) : (
                <OrderList orders={groups.active} />
              )}
            </>
          )}

          {bucket === 'history' &&
            (groups.history.length === 0 ? (
              <EmptyState
                icon={<History className="size-6" aria-hidden="true" />}
                title="История пуста"
                description="Завершённые заявки будут храниться здесь — с номером, статусом и документом."
              />
            ) : (
              <OrderList orders={groups.history} />
            ))}
        </div>
      )}
    </div>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {orders.map((order) => (
        <li key={order.id}>
          <OrderCard order={order} to={`/requests/${order.id}`} />
        </li>
      ))}
    </ul>
  );
}
