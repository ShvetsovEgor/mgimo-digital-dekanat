import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from './ui/Button';
import { TextAreaField } from './ui/Field';
import { ErrorState } from './ui/States';
import { useToast } from './ui/Toast';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf, useRequestThread } from '@/lib/queries';
import { cx } from '@/lib/cx';

/**
 * Переписка по заявке: доступна всегда, независимо от статуса.
 * Одна и та же панель у студента и у сотрудника деканата — отличается только адрес API.
 */
export function RequestThread({
  requestId,
  scope,
  compact = false,
}: {
  requestId: number;
  scope: 'student' | 'staff';
  compact?: boolean;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const thread = useRequestThread(requestId, scope);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = scope === 'staff' ? `/staff/requests/${requestId}/messages` : `/requests/${requestId}/messages`;

  const send = async () => {
    if (body.trim().length < 2) {
      setError('Сообщение слишком короткое');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(base, { body: body.trim() }, { mockRoute: mockRouteOf(base) });
      setBody('');
      await client.invalidateQueries({ queryKey: ['request-thread'] });
      if (scope === 'staff') await client.invalidateQueries({ queryKey: ['staff'] });
      toast.success(scope === 'staff' ? 'Сообщение отправлено студенту' : 'Сообщение отправлено в деканат');
    } catch (caught) {
      const text = caught instanceof ApiError ? caught.message : 'Не получилось отправить сообщение';
      setError(text);
      toast.error(text);
    } finally {
      setBusy(false);
    }
  };

  const messages = thread.data ?? [];

  return (
    <div className="flex flex-col">
      <div
        className={cx(
          'space-y-2 overflow-y-auto px-1 py-2',
          compact ? 'max-h-[220px]' : 'max-h-[360px]',
          thread.isLoading && 'min-h-16',
        )}
        aria-live="polite"
      >
        {thread.isLoading && <p className="px-2 text-[13px] text-muted">Загружаем переписку…</p>}
        {thread.isError && <ErrorState error={thread.error} onRetry={() => void thread.refetch()} title="Переписка не загрузилась" compact />}
        {!thread.isLoading && !thread.isError && messages.length === 0 && (
          <p className="px-2 text-[13px] text-muted">
            Переписки пока нет. {scope === 'staff' ? 'Напишите студенту — сообщение придёт в уведомления.' : 'Задайте вопрос — деканат ответит здесь.'}
          </p>
        )}
        {messages.map((message) => {
          const mine = message.author === scope;
          return (
            <div key={message.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cx(
                  'max-w-[85%] rounded-[12px] px-3 py-2',
                  mine ? 'rounded-br-[4px] bg-brand text-white' : 'rounded-bl-[4px] border border-line bg-surface-2 text-ink',
                )}
              >
                {!mine && <p className="text-[11px] font-semibold text-muted">{message.authorName}</p>}
                <p className="mt-0.5 text-[13px] leading-snug">{message.body}</p>
                <p className={cx('mt-1 text-[10.5px]', mine ? 'text-right text-white/75' : 'text-quiet')}>{message.createdAtLabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        noValidate
        className="space-y-2 border-t border-line pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <TextAreaField
          label="Сообщение по заявке"
          rows={compact ? 2 : 2}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          placeholder={scope === 'staff' ? 'Что уточнить или сообщить студенту' : 'Вопрос или уточнение по заявке'}
          maxLength={1000}
          valueLength={body.length}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={busy} iconLeft={<Send className="size-4" aria-hidden="true" />}>
            Отправить
          </Button>
        </div>
      </form>
    </div>
  );
}
