import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge } from './ui/Badge';
import { ActionLink } from './ui/ActionLink';
import { Skeleton } from './ui/Progress';
import { useDeadlines } from '@/lib/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { mockRouteOf, keys } from '@/lib/queries';
import { useToast } from './ui/Toast';
import { daysUntil } from '@/lib/format';
import { cx } from '@/lib/cx';
import type { DeadlineItem } from '@/lib/types';

interface DeadlinesListProps {
  items?: DeadlineItem[];
  loading?: boolean;
  limit?: number;
  /** На главной сданные задачи не показываем — они только шумят. */
  hideDone?: boolean;
}

/** Ближайшие дедлайны с чекбоксами «сделано» (оптимистично). */
export function DeadlinesList({ items, loading, limit, hideDone = false }: DeadlinesListProps) {
  const query = useDeadlines();
  const client = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<number | null>(null);

  const toggle = useMutation({
    mutationFn: (id: number) => api.post(`/deadlines/${id}/toggle`, undefined, { mockRoute: mockRouteOf(`/deadlines/${id}/toggle`) }),
    onMutate: async (id: number) => {
      setPending(id);
      await client.cancelQueries({ queryKey: keys.deadlines });
      const previous = client.getQueryData<DeadlineItem[]>(keys.deadlines);
      client.setQueryData<DeadlineItem[]>(keys.deadlines, (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) client.setQueryData(keys.deadlines, context.previous);
      toast.error(error instanceof Error ? error.message : 'Не получилось сохранить отметку');
    },
    onSettled: () => {
      setPending(null);
      void client.invalidateQueries({ queryKey: keys.deadlines });
    },
  });

  const source = items ?? query.data ?? [];

  if (loading || (query.isLoading && !items)) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-14 w-full rounded-[10px]" />
        <Skeleton className="h-14 w-full rounded-[10px]" />
      </div>
    );
  }

  const relevant = hideDone ? source.filter((item) => !item.done) : source;
  const visible = limit ? relevant.slice(0, limit) : relevant;

  if (relevant.length === 0) {
    return (
      <p className="py-2 text-[13px] text-muted">
        {source.length > 0 ? 'Всё сдано — новых дедлайнов нет.' : 'Новых контрольных точек пока не публиковали.'}
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {visible.map((item) => {
          const days = daysUntil(item.dueAt);
          const urgent = !item.done && days <= 1;
          return (
            <li key={item.id} className="flex items-center gap-2.5 py-1.5">
              <button
                type="button"
                onClick={() => toggle.mutate(item.id)}
                disabled={pending === item.id}
                aria-pressed={item.done}
                aria-label={item.done ? `Снять отметку: ${item.title}` : `Отметить выполненным: ${item.title}`}
                className="-ml-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-[8px] hover:bg-surface-hover disabled:opacity-60"
              >
                {item.done ? (
                  <CheckCircle2 className="size-[18px] text-ok" aria-hidden="true" />
                ) : (
                  <Circle className={urgent ? 'size-[18px] text-now' : 'size-[18px] text-quiet'} aria-hidden="true" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cx('line-clamp-2 text-[13px] leading-snug font-medium', item.done ? 'text-muted line-through' : 'text-ink')}>
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-quiet">
                  {item.course}
                  <span aria-hidden="true"> · </span>
                  <span>{item.points}</span>
                </p>
              </div>
              <Badge
                tone={item.done ? 'neutral' : urgent ? 'danger' : 'neutral'}
                size="sm"
                className="shrink-0 whitespace-nowrap self-start"
              >
                {item.relative}
              </Badge>
            </li>
          );
        })}
      </ul>
      {limit && relevant.length > limit && (
        <div className="mt-2 flex justify-end">
          <ActionLink to="/notifications?tab=deadlines">Все дедлайны ({relevant.length})</ActionLink>
        </div>
      )}
    </div>
  );
}

/** Компактный блок «Не опоздать» для главного экрана. */
export function DeadlinesWidget() {
  const query = useDeadlines();
  return (
    <DeadlinesList items={query.data} loading={query.isLoading} limit={3} />
  );
}
