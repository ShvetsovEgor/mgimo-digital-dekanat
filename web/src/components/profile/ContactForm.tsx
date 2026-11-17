import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { keys, mockRouteOf } from '@/lib/queries';
import type { ProfileBundle } from '@/lib/types';

/** Редактирование телефона и Telegram (единственные изменяемые поля профиля). */
export function ContactForm({ data }: { data: ProfileBundle }) {
  const toast = useToast();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(data.profile.phone ?? '');
  const [telegram, setTelegram] = useState(data.profile.telegram ?? '');
  const [errors, setErrors] = useState<{ phone?: string; telegram?: string }>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const found: typeof errors = {};
    if (phone && !/^[+0-9 ()-]+$/.test(phone)) found.phone = 'Только цифры, +, пробелы и скобки';
    if (telegram && !/^@?[A-Za-z0-9_]+$/.test(telegram)) found.telegram = 'Только латиница, цифры и _';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const next = await api.patch<ProfileBundle>(
        '/me/profile',
        { phone: phone.trim(), telegram: telegram.trim() },
        { mockRoute: mockRouteOf('/me/profile') },
      );
      client.setQueryData(keys.profile, next);
      toast.success('Контакты сохранены');
      setEditing(false);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        const map: typeof errors = {};
        for (const item of error.fields) map[item.field as 'phone' | 'telegram'] = item.message;
        setErrors(map);
      } else {
        toast.error(error instanceof ApiError ? error.message : 'Не получилось сохранить');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md">
      <CardHeader
        title="Контакты"
        action={
          !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} iconLeft={<Pencil className="size-3.5" aria-hidden="true" />}>
              Изменить
            </Button>
          )
        }
      />
      {editing ? (
        <form
          noValidate
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <TextField
            label="Телефон"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={errors.phone}
            placeholder="+7 (900) 000-00-00"
            inputMode="tel"
            autoComplete="tel"
          />
          <TextField
            label="Telegram"
            value={telegram}
            onChange={(event) => setTelegram(event.target.value)}
            error={errors.telegram}
            placeholder="@username"
            hint="Нужен, чтобы деканат мог быстро уточнить вопрос"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy}>Сохранить</Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setErrors({});
                setPhone(data.profile.phone ?? '');
                setTelegram(data.profile.telegram ?? '');
              }}
            >
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-[13px] text-muted">
          Телефон и Telegram нужны только деканату: для ответа на вопросы и уточнений по заявкам. Остальные данные профиля
          меняет только деканат.
        </p>
      )}
    </Card>
  );
}
