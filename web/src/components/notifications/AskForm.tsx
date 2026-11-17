import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { TextAreaField, TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { keys, mockRouteOf } from '@/lib/queries';

interface AskFormProps {
  open: boolean;
  onClose: () => void;
}

/** «Быстрый вопрос деканату»: тема + вопрос → ответ придёт в уведомления. */
export function AskForm({ open, onClose }: AskFormProps) {
  const toast = useToast();
  const client = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setBody('');
    setErrors({});
    setServerError(null);
  }, [open]);

  const submit = async () => {
    const next: { subject?: string; body?: string } = {};
    if (subject.trim().length < 3) next.subject = 'Напишите тему — хотя бы 3 символа';
    if (body.trim().length < 10) next.body = 'Опишите вопрос подробнее — от 10 символов';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setServerError(null);
    try {
      await api.post(
        '/messages',
        { subject: subject.trim(), body: body.trim() },
        { mockRoute: mockRouteOf('/messages') },
      );
      await client.invalidateQueries({ queryKey: keys.messages });
      toast.success('Вопрос отправлен — ответ придёт в уведомления');
      onClose();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Не получилось отправить. Повторите.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Вопрос деканату"
      description="Ответит специалист деканата — обычно в течение рабочего дня."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            Отправить вопрос
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="Тема"
          placeholder="Например: когда будет готова справка"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          error={errors.subject}
          required
          maxLength={120}
          valueLength={subject.length}
        />
        <TextAreaField
          label="Вопрос"
          placeholder="Опишите ситуацию — приложить документы можно будет в ответе"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={errors.body}
          required
          rows={5}
          maxLength={800}
          valueLength={body.length}
        />
        <p className="text-[12px] text-muted">Не пишите пароль от кабинета — деканату он не нужен.</p>
        {serverError && (
          <p role="alert" className="rounded-xl border border-danger/35 bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger-ink">
            {serverError}
          </p>
        )}
      </form>
    </Sheet>
  );
}
