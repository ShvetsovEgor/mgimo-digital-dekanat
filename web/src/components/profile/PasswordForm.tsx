import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf } from '@/lib/queries';

interface PasswordFormProps {
  open: boolean;
  onClose: () => void;
}

/** Смена пароля: текущий + новый + подтверждение, правила сервера продублированы на клиенте. */
export function PasswordForm({ open, onClose }: PasswordFormProps) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
    setServerError(null);
  }, [open]);

  const submit = async () => {
    const found: typeof errors = {};
    if (!current) found.current = 'Введите текущий пароль';
    if (next.length < 8) found.next = 'Новый пароль — не меньше 8 символов';
    else if (!/[A-Za-zА-Яа-я]/.test(next)) found.next = 'Добавьте хотя бы одну букву';
    else if (!/[0-9]/.test(next)) found.next = 'Добавьте хотя бы одну цифру';
    else if (next === current) found.next = 'Пароль совпадает с текущим — выберите другой';
    if (confirm !== next) found.confirm = 'Пароли не совпадают — проверьте второй раз';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setServerError(null);
    try {
      await api.post('/me/password', { current, next, confirm }, { mockRoute: mockRouteOf('/me/password') });
      toast.success('Пароль обновлён — сессии на других устройствах завершены');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WRONG_PASSWORD') setErrors({ current: 'Текущий пароль не подошёл' });
      else setServerError(error instanceof ApiError ? error.message : 'Не получилось сменить пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Смена пароля"
      description="После смены пароля остальные устройства разлогинятся."
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button loading={busy} onClick={() => void submit()}>Сменить пароль</Button>
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
        <TextField label="Текущий пароль" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} required />
        <TextField
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
          hint="Не меньше 8 символов, буквы и цифры"
          required
        />
        <TextField label="Повторите новый пароль" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
        {serverError && <p role="alert" className="rounded-xl border border-danger/35 bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger-ink">{serverError}</p>}
      </form>
    </Sheet>
  );
}
