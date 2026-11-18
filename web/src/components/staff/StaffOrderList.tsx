import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronDown, MessageCircle, Send, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TextAreaField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { EmptyState } from '../ui/States';
import { useToast } from '../ui/Toast';
import { StatusBadge } from '../OrderCard';
import { RequestThread } from '../RequestThread';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf } from '@/lib/queries';
import { cx } from '@/lib/cx';
import type { StaffOrder, StaffRequestUpdate } from '@/lib/types';

interface StaffOrderListProps {
  orders: StaffOrder[];
  onChange: () => void;
  filterLabel: string;
}

export function StaffOrderList({ orders, onChange, filterLabel }: StaffOrderListProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title={filterLabel === 'all' ? 'Заявок нет' : 'В этом статусе заявок нет'}
        description="Все заявки факультета МО появятся здесь сразу после подачи из кабинета студента."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id}>
          <StaffOrderRow order={order} onChange={onChange} />
        </li>
      ))}
    </ul>
  );
}

function StaffOrderRow({ order, onChange }: { order: StaffOrder; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cx('rounded-[10px] border bg-surface', order.isOverdue ? 'border-line' : 'border-line')}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="nums text-[11px] font-semibold text-muted">{order.number}</p>
          <p className="truncate text-[14px] font-semibold text-ink">{order.typeTitle}</p>
          <p className="truncate text-[12px] text-muted">
            {order.student.name} · {order.student.group} · {order.createdAtLabel}
          </p>
          <span className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
            <StatusBadge status={order.status} label={order.statusLabel} size="sm" />
            {order.isOverdue && <Badge tone="warn" size="sm">срок прошёл</Badge>}
          </span>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <StatusBadge status={order.status} label={order.statusLabel} size="sm" />
          {order.isOverdue && <Badge tone="warn" size="sm" icon={<AlertTriangle className="size-3" aria-hidden="true" />}>срок прошёл</Badge>}
        </div>
        <ChevronDown className={cx('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <OrderActions order={order} onChange={onChange} />}
    </div>
  );
}

function OrderActions({ order, onChange }: { order: StaffOrder; onChange: () => void }) {
  const toast = useToast();
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = async (body: StaffRequestUpdate) => {
    setBusy(body.status);
    setError(null);
    try {
      await api.patch<StaffOrder>(`/staff/requests/${order.id}`, body, { mockRoute: mockRouteOf(`/staff/requests/${order.id}`) });
      await client.invalidateQueries({ queryKey: ['staff'] });
      toast.success(body.status === 'ready' ? 'Документ выдан — студент получит уведомление' : body.status === 'in_progress' ? 'Заявка в работе' : 'Статус обновлён');
      onChange();
      setRejectOpen(false);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : 'Не получилось обновить статус';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (reason.trim().length < 5) {
      setReasonError('Напишите причину — студент увидит её в кабинете');
      return;
    }
    await patch({ status: 'rejected', rejectReason: reason.trim() });
  };

  return (
    <div className="border-t border-line px-3 py-3">
      {order.fields.length > 0 && (
        <dl className="mb-2 space-y-1">
          {order.fields.map((field) => (
            <div key={field.label} className="flex justify-between gap-3 text-[12px]">
              <dt className="text-muted">{field.label}</dt>
              <dd className="text-right font-semibold text-ink">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && <p role="alert" className="mb-2 rounded-[8px] bg-surface-hover px-2 py-1.5 text-[12px] font-semibold text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {order.status === 'pending' && (
          <Button size="sm" variant="outline" loading={busy === 'in_progress'} onClick={() => void patch({ status: 'in_progress' })}>
            Взять в работу
          </Button>
        )}
        {(order.status === 'pending' || order.status === 'in_progress') && (
          <>
            <Button size="sm" loading={busy === 'ready'} onClick={() => void patch({ status: 'ready' })} iconLeft={<CheckCircle2 className="size-4" aria-hidden="true" />}>
              Готово
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)} iconLeft={<XCircle className="size-4" aria-hidden="true" />}>
              Отклонить
            </Button>
          </>
        )}
        {(order.status === 'ready' || order.status === 'rejected') && (
          <p className="text-[12px] text-muted">Заявка завершена — действий не требуется.</p>
        )}
      </div>

      {/* Чат по заявке доступен всегда: сверху — текущая заявка, ниже — переписка со студентом. */}
      <section aria-label="Чат по заявке" className="border-t border-line px-3 pt-3 pb-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
          <MessageCircle className="size-4 text-brand" strokeWidth={1.75} aria-hidden="true" />
          Чат по заявке
          <span className="font-normal text-muted">· доступен всегда</span>
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] bg-surface-2 px-2.5 py-2">
          <span className="nums text-[11px] font-semibold text-muted">{order.number}</span>
          <span className="text-[12px] font-semibold text-ink">{order.typeTitle}</span>
          <StatusBadge status={order.status} label={order.statusLabel} size="sm" />
          <span className="ml-auto truncate text-[11px] text-muted">
            {order.student.name} · {order.student.group}
          </span>
        </div>
        <RequestThread requestId={order.id} scope="staff" compact />
      </section>

      <Sheet
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Отклонить заявку"
        description={`${order.number} · ${order.student.name}`}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Отмена</Button>
            <Button variant="danger" loading={busy === 'rejected'} onClick={() => void reject()} iconLeft={<Send className="size-4" aria-hidden="true" />}>
              Отклонить и сообщить
            </Button>
          </div>
        }
      >
        <TextAreaField
          label="Причина отказа"
          required
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          error={reasonError ?? undefined}
          hint="Сформулируйте, что сделать, чтобы получить документ"
          placeholder="Например: пересдачи назначаются после зачётной недели, обратитесь после 1 декабря"
          valueLength={reason.length}
          maxLength={400}
        />
      </Sheet>
    </div>
  );
}
