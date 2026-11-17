import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, Copy, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { useDeadlines } from '@/lib/queries';
import { mockEnabled } from '@/lib/mode';
import { api } from '@/lib/http';

/** Панель для жюри в мок-режиме: онлайн/офлайн демо, прочитанные уведомления и т.п. */
export function DemoBar() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  const deadlines = useDeadlines();
  const [offlineAfter, setOfflineAfter] = useState(false);

  if (!mockEnabled()) return null;

  const toggleDemoDeadline = async () => {
    const first = deadlines.data?.[0];
    if (!first) {
      toast.error('Дедлайны ещё не загрузились — обновите страницу.');
      return;
    }
    try {
      await api.post('/deadlines/' + first.id + '/toggle', undefined, { mockRoute: `deadlines/${first.id}/toggle` });
      await client.invalidateQueries({ queryKey: ['deadlines'] });
      toast.success(first.done ? 'Дедлайн снова активен' : 'Дедлайн отмечен как выполненный');
    } catch {
      toast.error('Не получилось — повторите ещё раз');
    }
  };

  const setOffline = () => {
    if (!offlineAfter) {
      const original = window.fetch;
      window.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
      setOfflineAfter(true);
      (window as unknown as { __restoreFetch?: () => void }).__restoreFetch = () => {
        window.fetch = original;
      };
      void client.invalidateQueries();
      toast.show('Демо: «отключили» сервер — посмотрите, как выглядят ошибки', 'info');
    } else {
      (window as unknown as { __restoreFetch?: () => void }).__restoreFetch?.();
      setOfflineAfter(false);
      void client.invalidateQueries();
      toast.success('Связь восстановлена');
    }
  };

  return (
    <div className="mx-4 mb-4 rounded-[16px] border border-gold/40 bg-gold-soft/60 p-3 text-[13px] sm:mx-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-bold text-gold-ink">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Демо-режим
        </span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-gold-ink hover:bg-gold/15"
          aria-expanded={open}
        >
          {open ? 'Скрыть' : 'Что можно попробовать'}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-muted">
            Данные вымышлены, сервер не подключён. Ниже — шпаргалка по сценариям для жюри.
          </p>
          <ul className="space-y-1.5 text-ink">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden="true" />
              Закажите справку: «Заявки» → «Новая заявка» → выберите услугу и заполните форму.
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden="true" />
              Откройте готовую заявку № ЗВ-2030-000012 — PDF и QR-проверка.
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden="true" />
              Войдите как <b>dekanat</b> — кабинет сотрудника: обработка заявок и вопросов.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => void toggleDemoDeadline()} iconLeft={<RotateCcw className="size-3.5" aria-hidden="true" />}>
              Дедлайн: отметить / вернуть
            </Button>
            <Button
              size="sm"
              variant={offlineAfter ? 'tonal' : 'outline'}
              onClick={setOffline}
              iconLeft={<Lock className="size-3.5" aria-hidden="true" />}
            >
              {offlineAfter ? 'Вернуть связь' : 'Имитировать обрыв сети'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CopyButtonProps {
  value: string;
  label: string;
  successMessage?: string;
}

export function CopyButton({ value, label, successMessage }: CopyButtonProps) {
  const toast = useToast();
  return (
    <IconButton
      label={label}
      variant="ghost"
      size="sm"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => toast.success(successMessage ?? 'Скопировано'))
          .catch(() => toast.error('Браузер не дал доступ к буферу обмена'));
      }}
    >
      <Copy className="size-4" aria-hidden="true" />
    </IconButton>
  );
}
