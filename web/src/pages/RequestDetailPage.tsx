import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Download,
  FileText,
  Info,
  MessageCircleQuestion,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { SectionTitle } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/OrderCard';
import { Timeline } from '@/components/requests/Timeline';
import { documentUrl, isMock } from '@/lib/cx';
import { downloadWithSession } from '@/lib/tab-session';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf, useRequest } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useQueryClient } from '@tanstack/react-query';
import type { Order } from '@/lib/types';

export default function RequestDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const query = useRequest(numericId);
  const client = useQueryClient();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useDocumentTitle('Заявка — Дедлайн');

  const cancel = async (order: Order) => {
    setCancelling(true);
    try {
      await api.post<Order>(`/requests/${order.id}/cancel`, undefined, { mockRoute: mockRouteOf(`/requests/${order.id}/cancel`) });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['requests'] }),
        client.invalidateQueries({ queryKey: ['requests', 'item', order.id] }),
      ]);
      toast.success('Заявка отменена — при необходимости подайте новую');
      setConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось отменить заявку');
    } finally {
      setCancelling(false);
    }
  };

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="space-y-3">
        <BackLink />
        <ErrorState error={new ApiError(404, 'NOT_FOUND', 'Такой заявки нет.')} title="Заявка не найдена" />
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <BackLink />
      {query.isLoading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-[12px]" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
          <Skeleton className="h-16 w-full rounded-[12px]" />
        </div>
      )}
      {query.isError && (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title={query.error instanceof ApiError && query.error.status === 404 ? 'Заявка не найдена' : 'Не удалось открыть заявку'}
        />
      )}
      {query.data && (
        <OrderDetails
          order={query.data}
          onCancel={() => setConfirmOpen(true)}
          onDownload={() => {
            if (isMock()) {
              toast.show('В демо без сервера PDF не формируется — на рабочем сервере скачается документ с QR', 'info');
              return;
            }
            const id = query.data?.id ?? numericId;
            void downloadWithSession(documentUrl(id), `document-${id}.pdf`).catch(() =>
              toast.error('Не удалось скачать документ. Попробуйте ещё раз.'),
            );
          }}
        />
      )}
      {query.data && (
        <Sheet
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Отменить заявку?"
          description={`Заявка ${query.data.number} будет закрыта. Если она была нужна — можно подать новую.`}
          size="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Оставить
              </Button>
              <Button variant="danger" loading={cancelling} onClick={() => void cancel(query.data as Order)}>
                Отменить заявку
              </Button>
            </div>
          }
        >
          <p className="text-[13px] text-muted">
            Отмена необратима. Деканат увидит, что заявка снята, и не будет её обрабатывать. Готовые документы отменить нельзя.
          </p>
        </Sheet>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/requests"
      className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline underline-offset-2"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Мои заявки
    </Link>
  );
}

function statusIcon(order: Order) {
  if (order.status === 'ready') return <CheckCircle2 className="size-5" aria-hidden="true" />;
  if (order.status === 'rejected') return <XCircle className="size-5" aria-hidden="true" />;
  if (order.status === 'cancelled') return <Info className="size-5" aria-hidden="true" />;
  return <BellRing className="size-5" aria-hidden="true" />;
}

function OrderDetails({ order, onCancel, onDownload }: { order: Order; onCancel: () => void; onDownload: () => void }) {
  const accent = order.status === 'rejected' ? 'danger' : order.status === 'ready' ? 'ok' : order.isOverdue ? 'warn' : 'info';
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <Card as="section" padding="lg" accent={accent}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
                <FileText className="size-3.5" aria-hidden="true" />
                <span className="nums">{order.number}</span>
              </p>
              <h1 className="mt-1 text-xl leading-tight font-semibold text-ink sm:text-[24px]">{order.typeTitle}</h1>
            </div>
            <StatusBadge status={order.status} label={order.statusLabel} />
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-surface-2 px-3 py-2.5 text-[13px] text-ink">
            <span className="mt-0.5 shrink-0 text-brand">{statusIcon(order)}</span>
            <span>
              {order.status === 'ready' && `Документ готов${order.readyAtLabel ? ` · ${order.readyAtLabel}` : ''}. Скачайте PDF — он подписан и проверяется по QR.`}
              {order.status === 'pending' && `Заявка ждёт проверки деканата. Прогноз готовности — ${order.dueLabel}.`}
              {order.status === 'in_progress' && `Заявка в работе${order.statusNote ? `: ${order.statusNote.toLowerCase()}` : ''}. Прогноз готовности — ${order.dueLabel}.`}
              {order.status === 'rejected' && 'Заявку отклонили — причина ниже. Можно подать новую с исправлениями.'}
              {order.status === 'cancelled' && 'Заявка отменена и больше не обрабатывается.'}
            </span>
          </p>

          {order.isOverdue && order.status !== 'ready' && (
            <p className="mt-2 flex items-center gap-1.5 rounded-[8px] bg-surface-hover px-2.5 py-1.5 text-[12px] font-semibold text-ink">
              <AlertTriangle className="size-3.5" aria-hidden="true" /> Срок прошёл — деканат уже в курсе, уточните статус вопросом.
            </p>
          )}

          {order.rejectReason && (
            <div role="alert" className="mt-2 rounded-[10px] border border-line bg-surface-hover px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-danger uppercase">Причина отказа</p>
              <p className="mt-0.5 text-[13px] font-medium text-danger">{order.rejectReason}</p>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {order.canDownload && (
              <Button onClick={onDownload} iconLeft={<Download className="size-4" aria-hidden="true" />}>
                Скачать PDF
              </Button>
            )}
            {order.canCancel && (
              <Button variant="outline" onClick={onCancel} iconLeft={<XCircle className="size-4" aria-hidden="true" />}>
                Отменить заявку
              </Button>
            )}
            {!order.canCancel && !order.canDownload && (
              <ButtonLink to="/requests/new" variant="outline">
                Подать новую заявку
              </ButtonLink>
            )}
          </div>
        </Card>

        <Card as="section" padding="md">
          <CardHeader title="Данные заявки" />
          <dl className="divide-y divide-line">
            {order.fields.length === 0 && <p className="pb-2 text-[13px] text-muted">Форма не требовала дополнительных данных.</p>}
            {order.fields.map((field) => (
              <div key={field.label} className="flex items-start justify-between gap-3 py-2">
                <dt className="text-[13px] text-muted">{field.label}</dt>
                <dd className="max-w-[62%] text-right text-[14px] font-semibold break-words text-ink">{field.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card as="section" padding="md">
          <CardHeader title="История заявки" />
          <Timeline steps={order.history} />
        </Card>
      </div>

      <aside className="space-y-3">
        <Card padding="md">
          <SectionTitle>Сроки</SectionTitle>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Подана</dt>
              <dd className="font-semibold text-ink">{order.createdAtLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{order.status === 'ready' ? 'Готова' : 'Прогноз готовности'}</dt>
              <dd className="font-semibold text-ink">{order.readyAtLabel ?? order.dueLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Тип услуги</dt>
              <dd className="font-semibold text-ink">
                {order.category === 'certificate' ? 'Справка' : order.category === 'application' ? 'Заявление' : 'Сервис'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card padding="md" className="bg-surface-hover">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            <ShieldCheck className="size-4" aria-hidden="true" /> Подлинность документа
          </p>
          <p className="mt-1 text-[12px] text-muted">
            В PDF встроен QR-код со ссылкой на публичную проверку подписи. Проверка показывает только номер и дату — без персональных данных.
          </p>
          <Link
            to="/verify/ЗВ-2030-000012.demo"
            className="mt-2 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-brand hover:underline underline-offset-2"
          >
            Пример страницы проверки
          </Link>
        </Card>

        <Card padding="md">
          <p className="text-[13px] text-muted">Вопрос по заявке?</p>
          <ButtonLink
            to="/notifications?ask=1"
            variant="outline"
            size="sm"
            fullWidth
            className="mt-2"
            iconLeft={<MessageCircleQuestion className="size-4" aria-hidden="true" />}
          >
            Спросить деканат
          </ButtonLink>
        </Card>
      </aside>
    </div>
  );
}
