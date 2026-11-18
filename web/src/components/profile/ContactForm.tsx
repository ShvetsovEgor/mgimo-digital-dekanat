import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { keys, mockRouteOf } from '@/lib/queries';
import type { ProfileBundle } from '@/lib/types';

/**
 * Редактирование телефона и Telegram в отдельном окне: карточка «Контакты» больше не нужна,
 * сами значения показаны в профиле. Пояснение, зачем нужны контакты, живёт только здесь.
 */
export function ContactEditorSheet({
  data,
  open,
  onClose,
}: {
  data: ProfileBundle;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [phone, setPhone] = useState(data.profile.phone ?? '');
  const [telegram, setTelegram] = useState(data.profile.telegram ?? '');
  const [errors, setErrors] = useState<{ phone?: string; telegram?: string }>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPhone(data.profile.phone ?? '');
    setTelegram(data.profile.telegram ?? '');
    setErrors({});
  };

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
      onClose();
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
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Контакты"
      description="Телефон и Telegram видит только деканат: для ответа на вопросы и уточнений по заявкам. Остальные данные профиля меняет деканат."
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Отмена
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      }
    >
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
        />
      </form>
    </Sheet>
  );
}
