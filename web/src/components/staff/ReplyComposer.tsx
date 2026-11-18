import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { TextAreaField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf } from '@/lib/queries';
import type { StaffMessage } from '@/lib/types';

/** Ответ сотрудника на конкретный вопрос — последний неотвеченный в переписке. */
export function ReplyComposer({ message, onChange }: { message: StaffMessage | undefined; onChange: () => void }) {
  const toast = useToast();
  const client = useQueryClient();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!message) {
    return (
      <p className="border-t border-line px-4 py-3 text-[12px] text-muted">
        На все вопросы в этой переписке ответ дан. Новый вопрос появится здесь.
      </p>
    );
  }

  const send = async () => {
    if (reply.trim().length < 5) {
      setError('Ответ слишком короткий — напишите хотя бы предложение');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/staff/messages/${message.id}/reply`,
        { reply: reply.trim() },
        { mockRoute: mockRouteOf(`/staff/messages/${message.id}/reply`) },
      );
      setReply('');
      await client.invalidateQueries({ queryKey: ['staff'] });
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
    <form
      noValidate
      className="space-y-2 border-t border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <TextAreaField
        label={'Ответ на вопрос'}
        rows={2}
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
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={busy} iconLeft={<Send className="size-4" aria-hidden="true" />}>
          Отправить
        </Button>
      </div>
    </form>
  );
}
