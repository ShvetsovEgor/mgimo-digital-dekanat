import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, type Tone } from './ui/Badge';
import { Card } from './ui/Card';
import { REQUEST_STATUS_TONE } from '@/lib/cx';
import { cx } from '@/lib/cx';
import type { Order } from '@/lib/types';

interface StatusBadgeProps {
  status: Order['status'];
  label: string;
  size?: 'sm' | 'md';
}

/** Бейдж статуса заявки с единой палитрой по всем экранам. */
export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const tone = (REQUEST_STATUS_TONE[status] ?? 'neutral') as Tone;
  return (
    <Badge tone={tone} size={size} dot>
      {label}
    </Badge>
  );
}

/** Контекстная строка под названием: что произошло и когда. */
export function statusContext(order: Order): string {
  if (order.status === 'ready') return order.readyAtLabel ? `Готово · ${order.readyAtLabel}` : 'Готово';
  if (order.status === 'rejected') return order.rejectReason ? `Отклонена: ${order.rejectReason}` : 'Отклонена';
  if (order.status === 'cancelled') return 'Отменена вами';
  if (order.isOverdue) return `Просрочено · ожидалось ${order.dueLabel}`;
  if (order.status === 'in_progress') return `В работе · прогноз ${order.dueLabel}`;
  return `Прогноз готовности: ${order.dueLabel}`;
}

interface OrderCardProps {
  order: Order;
  to?: string;
  badge?: ReactNode;
}

export function OrderCard({ order, to, badge }: OrderCardProps) {
  const accent = order.isOverdue ? 'warn' : order.status === 'rejected' ? 'danger' : order.status === 'ready' ? 'ok' : null;
  const inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
          <FileText className="size-3.5" aria-hidden="true" />
          <span className="nums">{order.number}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {badge}
          <StatusBadge status={order.status} label={order.statusLabel} size="sm" />
        </span>
      </div>
      <h3 className="mt-1 text-sm leading-snug font-semibold text-ink">{order.typeTitle}</h3>
      <p className="mt-1 line-clamp-2 text-[13px] text-muted">{statusContext(order)}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-line pt-2.5 text-[12px] text-muted">
        <span>
          Подана {order.createdAtLabel}
          {order.isOverdue && <span className="font-semibold text-ink"> · просрочено</span>}
        </span>
        <span className="font-semibold text-brand">{to ? 'Открыть' : 'Детали'}</span>
      </div>
    </>
  );

  return (
    <Card as="article" padding="md" interactive accent={accent} className={cx('h-full', order.status === 'cancelled' && 'opacity-80')}>
      {to ? (
        <Link to={to} className="block no-underline">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Card>
  );
}

export type { OrderCardProps };
