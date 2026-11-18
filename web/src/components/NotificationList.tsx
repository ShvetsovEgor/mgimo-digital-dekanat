import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellOff } from 'lucide-react';
import { Badge, Dot } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Progress';
import { useNotifications } from '@/lib/queries';
import { cx } from '@/lib/cx';
import type { Notification, NotificationType } from '@/lib/types';

export const NOTIFICATION_META: Record<NotificationType, { label: string; tone: 'brand' | 'ok' | 'warn' | 'info' | 'gold' | 'danger' }> = {
  schedule: { label: 'Расписание', tone: 'info' },
  grade: { label: 'Оценки', tone: 'ok' },
  request: { label: 'Заявки', tone: 'brand' },
  announcement: { label: 'Деканат', tone: 'gold' },
  deadline: { label: 'Дедлайн', tone: 'warn' },
  message: { label: 'Сообщение', tone: 'brand' },
  info: { label: 'Новость', tone: 'neutral' as 'info' },
};

interface NotificationListProps {
  items?: Notification[];
  loading?: boolean;
  limit?: number;
  onOpen?: (item: Notification) => void;
}

/** Лента уведомлений: непрочитанные с акцентной полосой. */
export function NotificationList({ items, loading, limit, onOpen }: NotificationListProps) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-[10px]" />
        <Skeleton className="h-16 w-full rounded-[10px]" />
        <Skeleton className="h-16 w-full rounded-[10px]" />
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-[12px] bg-surface-hover text-muted" aria-hidden="true">
          <BellOff className="size-5" />
        </span>
        <p className="mt-2.5 text-sm font-semibold text-ink">Пока тихо</p>
        <p className="mt-0.5 text-[13px] text-muted">Здесь появятся изменения расписания, оценки и статусы заявок.</p>
      </Card>
    );
  }
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <ul className="space-y-2">
      {visible.map((item) => {
        const meta = NOTIFICATION_META[item.type] ?? NOTIFICATION_META.info;
        const content = (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {!item.read && <Dot tone="brand" />}
                <span className={cx('truncate text-sm', item.read ? 'font-semibold text-ink' : 'font-semibold text-ink')}>
                  {item.title}
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-muted">{item.relative}</span>
            </span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{item.body}</span>
            <span className="mt-1.5 flex items-center justify-between gap-2">
              <Badge tone={meta.tone} size="sm">
                {meta.label}
              </Badge>
              {item.link && (
                <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand">
                  Открыть <ArrowRight className="size-3" aria-hidden="true" />
                </span>
              )}
            </span>
          </>
        );
        return (
          <li key={item.id}>
            <div
              className={cx(
                'rounded-[10px] border transition-colors',
                item.read ? 'border-line bg-surface' : 'border-brand bg-surface-hover',
              )}
            >
              {onOpen ? (
                <button type="button" onClick={() => onOpen(item)} className="block w-full cursor-pointer p-3 text-left">
                  {content}
                </button>
              ) : item.link ? (
                <Link to={item.link} className="block p-3 no-underline">
                  {content}
                </Link>
              ) : (
                <div className="p-3">{content}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Виджет «Последние события» для главного экрана. */
export function NotificationsWidget() {
  const query = useNotifications();
  return (
    <div>
      <NotificationList items={query.data} loading={query.isLoading} limit={3} />
      <div className="mt-2 flex justify-end">
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline underline-offset-2"
        >
          <Bell className="size-3.5" aria-hidden="true" />
          Все уведомления
        </Link>
      </div>
    </div>
  );
}
