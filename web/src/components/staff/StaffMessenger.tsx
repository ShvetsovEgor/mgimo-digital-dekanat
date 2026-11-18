import { useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar } from '../ui/Layout';
import { ReplyComposer } from './ReplyComposer';
import { cx } from '@/lib/cx';
import type { StaffMessage } from '@/lib/types';

export interface Chat {
  key: string;
  name: string;
  group: string;
  messages: StaffMessage[];
  unread: number;
  lastLabel: string;
  preview: string;
}

/** Склеиваем плоские вопросы в переписки по студенту: свежие — сверху. */
export function buildChats(messages: StaffMessage[]): Chat[] {
  const map = new Map<string, Chat>();
  for (const message of messages) {
    const key = `${message.student.name}|${message.student.group}`;
    const chat = map.get(key) ?? {
      key,
      name: message.student.name,
      group: message.student.group,
      messages: [],
      unread: 0,
      lastLabel: message.createdAtLabel,
      preview: '',
    };
    chat.messages.push(message);
    if (message.status === 'new') chat.unread += 1;
    map.set(key, chat);
  }
  for (const chat of map.values()) {
    chat.messages.sort((a, b) => a.id - b.id);
    const latest = chat.messages[chat.messages.length - 1];
    chat.preview = latest?.reply ? `Вы: ${latest.reply}` : (latest?.body ?? '');
    chat.lastLabel = latest?.repliedAtLabel ?? latest?.createdAtLabel ?? '';
    chat.unread = chat.messages.filter((message) => message.status === 'new').length;
  }
  // Порядок берём из ответа API: вопросы приходят от свежих к старым, значит первое появление чата — самое свежее.
  return [...map.values()];
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/** Мессенджер: слева переписки, справа история и поле ответа. */
export function StaffMessenger({
  messages,
  loading,
  error,
  onRetry,
  onChange,
}: {
  messages?: StaffMessage[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onChange: () => void;
}) {
  const chats = buildChats(messages ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const active = chats.find((chat) => chat.key === selected) ?? chats[0];
  const target = active ? [...active.messages].reverse().find((message) => message.status === 'new') : undefined;

  if (loading) {
    return <div className="rounded-[12px] border border-line bg-surface p-4 text-sm text-muted">Загружаем переписки…</div>;
  }
  if (error) {
    return (
      <div className="rounded-[12px] border border-line bg-surface p-4">
        <p className="text-sm text-ink">Вопросы не загрузились</p>
        <button type="button" onClick={onRetry} className="mt-2 cursor-pointer text-[13px] font-semibold text-brand hover:underline">
          Попробовать снова
        </button>
      </div>
    );
  }
  if (chats.length === 0) {
    return (
      <div className="rounded-[12px] border border-line bg-surface p-6 text-center">
        <MessageCircle className="mx-auto size-6 text-quiet" strokeWidth={1.75} aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-ink">Вопросов нет</p>
        <p className="mt-1 text-[13px] text-muted">Когда студент спросит что-то из кабинета, переписка появится здесь.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Список чатов */}
        <div className={cx('border-line lg:block lg:border-r', selected ? 'hidden' : 'block')}>
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <p className="text-sm font-semibold text-ink">Переписки</p>
            <span className="text-[12px] text-muted">{chats.length}</span>
          </div>
          <ul className="max-h-[420px] overflow-y-auto lg:h-[520px] lg:max-h-none">
            {chats.map((chat) => {
              const current = chat.key === active?.key;
              return (
                <li key={chat.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(chat.key)}
                    aria-current={current ? 'true' : undefined}
                    className={cx(
                      'flex w-full cursor-pointer items-start gap-2.5 border-b border-line px-3 py-2.5 text-left transition-colors',
                      current ? 'bg-surface-hover' : 'hover:bg-surface-hover/60',
                    )}
                  >
                    <Avatar initials={initialsOf(chat.name)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cx('truncate text-[13px]', chat.unread > 0 ? 'font-semibold text-ink' : 'font-medium text-ink')}>
                          {chat.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-quiet">{chat.lastLabel.split(',')[0]}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className="block min-w-0 flex-1 truncate text-[12px] text-muted">{chat.preview}</span>
                        {chat.unread > 0 && (
                          <span className="nums inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                            {chat.unread}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-quiet">{chat.group}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Переписка */}
        {active && (
          <div className={cx('flex-col lg:flex lg:h-[520px]', selected ? 'flex' : 'hidden')}>
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="К списку переписок"
                className="grid size-9 cursor-pointer place-items-center rounded-[8px] text-muted hover:bg-surface-hover lg:hidden"
              >
                <ArrowLeft className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <Avatar initials={initialsOf(active.name)} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{active.name}</p>
                <p className="truncate text-[11px] text-muted">{active.group}</p>
              </div>
              {target && <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">есть вопрос</span>}
            </div>

            <div className="max-h-[46vh] space-y-3 overflow-y-auto px-3 py-3 lg:max-h-none lg:flex-1">
              {active.messages.map((message) => (
                <div key={message.id} className="space-y-1.5">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-[12px] rounded-bl-[4px] border border-line bg-surface-2 px-3 py-2">
                      <p className="text-[13px] leading-snug text-ink">{message.body}</p>
                      <p className="mt-1 text-[10.5px] text-quiet">{message.createdAtLabel}</p>
                    </div>
                  </div>
                  {message.reply && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-brand px-3 py-2 text-white">
                        <p className="text-[13px] leading-snug">{message.reply}</p>
                        <p className="mt-1 text-right text-[10.5px] text-white/75">{message.repliedAtLabel ?? 'отправлено'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <ReplyComposer key={active.key} message={target} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
