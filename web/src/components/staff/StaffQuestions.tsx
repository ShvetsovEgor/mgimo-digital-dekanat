import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { TextAreaField } from '../ui/Field';
import { EmptyState, ErrorState, ListSkeleton } from '../ui/States';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf } from '@/lib/queries';
import type { StaffMessage } from '@/lib/types';

interface StaffQuestionsProps {
  messages?: StaffMessage[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onChange: () => void;
}

/** Вопросы студентов: ответ пишется прямо в карточке. */
export function StaffQuestions({ messages, loading, error, onRetry, onChange }: StaffQuestionsProps) {
  return (
    <Card padding="md">
      <CardHeader
        title="Вопросы студентов"
        icon={<MessageCircle className="size-[18px]" aria-hidden="true" />}
        count={messages?.length}
        action={<span className="text-[12px] text-muted">{messages?.filter((item) => item.status === 'new').length ?? 0} новых</span>}
      />
      {loading && <ListSkeleton count={2} lines={2} />}
      {error !== null && error !== undefined && <ErrorState error={error} onRetry={onRetry} title="Вопросы не загрузились" compact />}
      {messages && messages.length === 0 && (
        <EmptyState title="Вопросов нет" description="Когда студент спросит что-то из кабинета, вопрос появится здесь." />
      )}
      {messages && messages.length > 0 && (
        <ul className="space-y-2">
          {messages.map((message) => (
            <li key={message.id}>
              <QuestionRow message={message} onChange={onChange} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function QuestionRow({ message, onChange }: { message: StaffMessage; onChange: () => void }) {
  const toast = useToast();
  const client = useQueryClient();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (reply.trim().length < 5) {
      setError('Ответ слишком короткий — напишите хотя бы предложение');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/staff/messages/${message.id}/reply`, { reply: reply.trim() }, { mockRoute: mockRouteOf(`/staff/messages/${message.id}/reply`) });
      await client.invalidateQueries({ queryKey: ['staff'] });
      setReply('');
      toast.success('Ответ отправлен — студент увидит его в уведомлениях');
      onChange();
    } catch (caught) {
      const text = caught instanceof ApiError ? caught.message : 'Не получилось отправить ответ';
      setError(text);
      toast.error(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-ink">{message.subject}</p>
          <p className="text-[12px] text-muted">
            {message.student.name} · {message.student.group} · {message.createdAtLabel}
          </p>
        </div>
        <Badge tone={message.status === 'answered' ? 'ok' : 'warn'} size="sm">
          {message.status === 'answered' ? 'ответ есть' : 'новый'}
        </Badge>
      </div>
      <p className="mt-1.5 text-[13px] text-ink/85">{message.body}</p>
      {message.reply ? (
        <div className="mt-2 rounded-lg bg-brand-soft px-2.5 py-2">
          <p className="text-[11px] font-bold tracking-wide text-brand-ink uppercase">Ваш ответ</p>
          <p className="mt-0.5 text-[13px] text-ink">{message.reply}</p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <TextAreaField
            label="Ответ студенту"
            rows={3}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            placeholder="Коротко и понятно: что и когда будет сделано"
            maxLength={600}
            valueLength={reply.length}
          />
          <Button size="sm" loading={busy} onClick={() => void send()} iconLeft={<Send className="size-4" aria-hidden="true" />}>
            Ответить
          </Button>
        </div>
      )}
    </div>
  );
}
