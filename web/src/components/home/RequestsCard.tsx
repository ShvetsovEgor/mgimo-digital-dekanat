import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Hourglass } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { daysUntil, pluralize } from '@/lib/format';
import type { Order } from '@/lib/types';

/** Ближайшие заявки: чистый список строк без вложенных рамок. */
export function RequestsCard({
  requests,
  loading,
  error,
  onRetry,
}: {
  requests?: Order[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  // Готовый документ показываем в «Что требует внимания», здесь — только заявки в работе.
  const shown = (requests ?? []).filter((order) => order.status === 'pending' || order.status === 'in_progress');

  return (
    <Card padding="md">
      <CardHeader
        title="Заявки"
        icon={<FileText className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
        count={shown.length}
        action={<ActionLink to="/requests">Все</ActionLink>}
      />
      {loading && <SkeletonCard lines={2} />}
      {error && <ErrorState error={new Error('Заявки не загрузились')} onRetry={onRetry} compact />}
      {!loading && !error && shown.length === 0 && (
        <EmptyState
          title="Активных заявок нет"
          description="Справку об обучении можно заказать за пару кликов."
          action={<ActionLink to="/requests/new">Новая заявка</ActionLink>}
          compact
        />
      )}
      {!loading && !error && shown.length > 0 && (
        <ul className="divide-y divide-line">
          {shown.slice(0, 3).map((order) => {
            const ready = order.status === 'ready';
            const days = daysUntil(order.dueAt);
            return (
              <li key={order.id}>
                <Link
                  to={`/requests/${order.id}`}
                  className="flex min-h-11 items-center gap-3 py-1.5 no-underline transition-colors hover:text-brand"
                >
                  <span className="shrink-0 text-quiet" aria-hidden="true">
                    {ready ? <CheckCircle2 className="size-[18px]" strokeWidth={1.75} /> : <Hourglass className="size-[18px]" strokeWidth={1.75} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{order.typeTitle}</span>
                    <span className="nums block truncate text-[12px] text-muted">
                      {order.number} · {order.statusLabel}
                      {ready
                        ? order.readyAtLabel
                          ? ` · ${order.readyAtLabel}`
                          : ''
                        : days >= 0
                          ? ` · через ${pluralize(days, 'день', 'дня', 'дней')}`
                          : ' · просрочено'}
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
