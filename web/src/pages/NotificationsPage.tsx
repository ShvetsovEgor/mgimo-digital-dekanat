import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCheck, Hourglass, Megaphone, MessageCircle, Pin, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { DeadlinesList } from '@/components/DeadlinesList';
import { NotificationList } from '@/components/NotificationList';
import { AskForm } from '@/components/notifications/AskForm';
import { MyQuestions } from '@/components/notifications/MyQuestions';
import { ApiError, api } from '@/lib/http';
import { keys, mockRouteOf, useAnnouncements, useMessages, useNotifications } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { Announcement, AnnouncementCategory, Notification } from '@/lib/types';

type Tab = 'all' | 'announcements' | 'deadlines';

const TABS = [
  { value: 'all' as const, label: 'Уведомления' },
  { value: 'announcements' as const, label: 'Объявления' },
  { value: 'deadlines' as const, label: 'Дедлайны' },
];

export default function NotificationsPage() {
  useDocumentTitle('Уведомления — Дедлайн');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'announcements' ? 'announcements' : params.get('tab') === 'deadlines' ? 'deadlines' : 'all';
  const askOpen = params.get('ask') === '1';
  const setAsk = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set('ask', '1');
    else next.delete('ask');
    setParams(next, { replace: true });
  };

  const notifications = useNotifications();
  const unread = useMemo(() => (notifications.data ?? []).filter((item) => !item.read).length, [notifications.data]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Уведомления"
        description="События кабинета: расписание, оценки, заявки и сообщения деканата."
        actions={
          <Button variant="outline" size="sm" onClick={() => setAsk(true)} iconLeft={<MessageCircle className="size-4" aria-hidden="true" />}>
            Новый вопрос
          </Button>
        }
      />
      <Segmented
        label="Разделы уведомлений"
        className="mb-4"
        value={tab}
        onChange={(value) => setParams(value === 'all' ? {} : { tab: value }, { replace: true })}
        options={TABS}
      />
      {tab === 'all' && <FeedTab unread={unread} onRead={setAsk} />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'deadlines' && (
        <Card padding="md">
          <CardHeader title="Дедлайны" icon={<Hourglass className="size-[18px]" aria-hidden="true" />} />
          <DeadlinesList />
          <p className="mt-2 text-[12px] text-muted">Отметьте выполненное — отметка сохранится и на других устройствах.</p>
        </Card>
      )}
      <AskForm open={askOpen} onClose={() => setAsk(false)} />
    </div>
  );
}

function FeedTab({ unread, onRead }: { unread: number; onRead: (open: boolean) => void }) {
  const notifications = useNotifications();
  const messages = useMessages();
  const client = useQueryClient();
  const toast = useToast();
  const [marking, setMarking] = useState(false);

  const markAll = async () => {
    setMarking(true);
    try {
      await api.post('/notifications/read-all', undefined, { mockRoute: mockRouteOf('/notifications/read-all') });
      await client.invalidateQueries({ queryKey: keys.notifications });
      toast.success('Все уведомления прочитаны');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось отметить');
    } finally {
      setMarking(false);
    }
  };

  const markOne = async (item: Notification) => {
    if (item.read) return;
    client.setQueryData<Notification[]>(keys.notifications, (old) =>
      (old ?? []).map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
    );
    try {
      await api.post(`/notifications/${item.id}/read`, undefined, { mockRoute: mockRouteOf(`/notifications/${item.id}/read`) });
    } catch {
      /* не мешаем пользователю: при следующей загрузке статус уточнится */
    } finally {
      void client.invalidateQueries({ queryKey: keys.notifications });
    }
  };

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-[10px] bg-surface-hover px-3 py-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            <BellRing className="size-4" aria-hidden="true" />
            Непрочитанных: {unread}
          </p>
          <Button variant="outline" size="sm" loading={marking} onClick={() => void markAll()} iconLeft={<CheckCheck className="size-4" aria-hidden="true" />}>
            Прочитать всё
          </Button>
        </div>
      )}

      {notifications.isLoading && <ListSkeleton count={3} lines={2} />}
      {notifications.isError && (
        <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} title="Лента не загрузилась" />
      )}
      {notifications.data && (
        <NotificationList items={notifications.data} onOpen={(item) => void markOne(item)} />
      )}

      <Card padding="md">
        <CardHeader title="Мои вопросы деканату" icon={<MessageCircle className="size-[18px]" aria-hidden="true" />} />
        {messages.isLoading && <ListSkeleton count={1} lines={2} />}
        {messages.isError && <ErrorState error={messages.error} onRetry={() => void messages.refetch()} compact />}
        {messages.data && <MyQuestions items={messages.data} />}
        <Button variant="primary" size="sm" fullWidth className="mt-2" onClick={() => onRead(true)} iconLeft={<Send className="size-4" aria-hidden="true" />}>
          Задать вопрос деканату
        </Button>
      </Card>
    </div>
  );
}

const CATEGORY_TONE: Record<AnnouncementCategory, 'brand' | 'info' | 'gold' | 'ok' | 'danger'> = {
  important: 'danger',
  session: 'info',
  study: 'brand',
  documents: 'ok',
  life: 'gold',
};

function AnnouncementsTab() {
  const announcements = useAnnouncements();
  const sorted = useMemo(() => {
    const items = [...(announcements.data ?? [])];
    return items.sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [announcements.data]);

  return (
    <div className="space-y-3">
      {announcements.isLoading && <ListSkeleton count={2} lines={4} />}
      {announcements.isError && (
        <ErrorState error={announcements.error} onRetry={() => void announcements.refetch()} title="Объявления не загрузились" />
      )}
      {announcements.data && sorted.length === 0 && (
        <EmptyState
          icon={<Megaphone className="size-6" aria-hidden="true" />}
          title="Объявлений пока нет"
          description="Деканат сообщит здесь о зачётной неделе, изменениях правил и событиях факультета."
        />
      )}
      {sorted.map((item) => (
        <AnnouncementCard key={item.id} announcement={item} />
      ))}
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card as="article" accent={announcement.pinned ? 'info' : null} padding="md">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={CATEGORY_TONE[announcement.category] ?? 'neutral'} size="sm">
          {announcement.categoryLabel}
        </Badge>
        {announcement.pinned && (
          <Badge tone="gold" size="sm" icon={<Pin className="size-3" aria-hidden="true" />}>
            закреплено
          </Badge>
        )}
        <span className="ml-auto text-[11px] text-muted">{announcement.createdAtLabel}</span>
      </div>
      <h2 className="mt-1.5 text-sm leading-snug font-semibold text-ink">{announcement.title}</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink">{announcement.body}</p>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
        <Megaphone className="size-3" aria-hidden="true" />
        {announcement.scope}
      </p>
    </Card>
  );
}
