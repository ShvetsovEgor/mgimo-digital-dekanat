import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { ApiError, api } from '@/lib/http';
import { keys, mockRouteOf } from '@/lib/queries';
import type { AnnouncementCategory } from '@/lib/types';

const CATEGORIES: { value: AnnouncementCategory; label: string }[] = [
  { value: 'study', label: 'Учёба' },
  { value: 'session', label: 'Сессия' },
  { value: 'documents', label: 'Документы' },
  { value: 'life', label: 'Жизнь кампуса' },
  { value: 'important', label: 'Важно' },
];

interface AnnouncementComposerProps {
  onPublished: () => void;
}

/** Публикация объявления деканата: заголовок, текст, категория, закрепление, охват. */
export function AnnouncementComposer({ onPublished }: AnnouncementComposerProps) {
  const toast = useToast();
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('study');
  const [pinned, setPinned] = useState(false);
  const [forAll, setForAll] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    const next: { title?: string; body?: string } = {};
    if (title.trim().length < 3) next.title = 'Заголовок — хотя бы 3 символа';
    if (body.trim().length < 10) next.body = 'Текст объявления — хотя бы 10 символов';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await api.post(
        '/staff/announcements',
        { title: title.trim(), body: body.trim(), category, pinned, forAll },
        { mockRoute: mockRouteOf('/staff/announcements') },
      );
      await client.invalidateQueries({ queryKey: keys.announcements });
      toast.success('Объявление опубликовано — студенты увидят его в уведомлениях');
      setTitle('');
      setBody('');
      setPinned(false);
      onPublished();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось опубликовать');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md">
      <CardHeader title="Новое объявление" icon={<Megaphone className="size-[18px]" aria-hidden="true" />} />
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void publish();
        }}
      >
        <TextField
          label="Заголовок"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
          required
          maxLength={120}
          valueLength={title.length}
          placeholder="Например: зачётная неделя 21–26 декабря"
        />
        <TextAreaField
          label="Текст"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={errors.body}
          required
          rows={5}
          maxLength={1200}
          valueLength={body.length}
          placeholder="Что нужно знать студентам: даты, аудитории, что сделать"
        />
        <SelectField
          label="Категория"
          value={category}
          onChange={(event) => setCategory(event.target.value as AnnouncementCategory)}
          options={CATEGORIES}
        />
        <div className="space-y-1">
          <CheckboxField label="Закрепить вверху" checked={pinned} onChange={setPinned} hint="Закреплённое объявление всегда первое" />
          <CheckboxField label="Для всех студентов" checked={forAll} onChange={setForAll} hint="В противном случае — только для факультета МО" />
        </div>
        <Button type="submit" loading={busy} iconLeft={<Send className="size-4" aria-hidden="true" />}>
          Опубликовать
        </Button>
      </form>
    </Card>
  );
}
