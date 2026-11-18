import { CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/States';
import type { QuestionMessage } from '@/lib/types';

/** Свои вопросы и ответы деканата. */
export function MyQuestions({ items }: { items: QuestionMessage[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="Вопросов пока нет"
        description="Задайте вопрос — не нужно идти в деканат."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-[10px] border border-line px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-ink">{item.subject}</p>
            <Badge
              tone={item.status === 'answered' ? 'ok' : 'warn'}
              size="sm"
              icon={item.status === 'answered' ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <Clock className="size-3" aria-hidden="true" />}
            >
              {item.status === 'answered' ? 'ответ есть' : 'ждёт ответа'}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-muted">{item.body}</p>
          <p className="mt-1 text-[11px] text-muted">Отправлен {item.createdAtLabel}</p>
          {item.reply && (
            <div className="mt-2 rounded-[8px] bg-surface-hover px-2.5 py-2">
              <p className="text-[11px] font-semibold tracking-wide text-brand uppercase">Ответ деканата</p>
              <p className="mt-0.5 text-[13px] text-ink">{item.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
