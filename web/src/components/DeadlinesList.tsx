import { useState } from 'react';
import { CheckCircle2, Circle, Hourglass } from 'lucide-react';
import { Badge } from './ui/Badge';
import { ButtonLink } from './ui/Button';
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
}

/** Ближайшие дедлайны с чекбоксами «сделано» (оптимистично). */
export function DeadlinesList({ items, loading, limit }: DeadlinesListProps) {
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
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  const visible = limit ? source.slice(0, limit) : source;

  if (source.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-3 py-4 text-center">
        <p className="text-sm font-bold text-ink">Дедлайнов нет</p>
        <p className="mt-0.5 text-[13px] text-muted">Новых контрольных точек пока не публиковали.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {visible.map((item) => {
          const days = daysUntil(item.dueAt);
          const urgent = !item.done && days <= 1;
          return (
            <li key={item.id}>
              <div
                className={cx(
                  'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                  item.done ? 'border-line bg-surface-2' : urgent ? 'border-warn/40 bg-warn-soft/50' : 'border-line bg-surface',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle.mutate(item.id)}
                  disabled={pending === item.id}
                  aria-pressed={item.done}
                  aria-label={item.done ? `Снять отметку: ${item.title}` : `Отметить выполненным: ${item.title}`}
                  className="-m-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-line/40 disabled:opacity-60"
                >
                  {item.done ? (
                    <CheckCircle2 className="size-5 text-ok" aria-hidden="true" />
                  ) : (
                    <Circle className="size-5 text-muted" aria-hidden="true" />
                  )}
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={cx('text-[14px] leading-snug font-bold', item.done ? 'text-muted line-through' : 'text-ink')}>{item.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
                    <span className="sm:hidden">
                      <span className={urgent && !item.done ? 'font-semibold text-warn-ink' : ''}>{item.relative}</span>
                      {' · '}
                    </span>
                    <span className="hidden sm:inline">{item.course}</span>
                    <span className="hidden sm:inline" aria-hidden="true">·</span>
                    <span className="nums">{item.dueLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.points}</span>
                  </p>
                </div>
                <div className="hidden shrink-0 pt-0.5 sm:block">
                  {item.done ? (
                    <Badge tone="ok" size="sm" icon={<CheckCircle2 className="size-3" aria-hidden="true" />}>
                      сдано
                    </Badge>
                  ) : (
                    <Badge
                      tone={urgent ? 'warn' : days <= 5 ? 'gold' : 'neutral'}
                      size="sm"
                      icon={<Hourglass className="size-3" aria-hidden="true" />}
                    >
                      {item.relative}
                    </Badge>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {limit && source.length > limit && (
        <div className="mt-2 flex justify-end">
          <ButtonLink to="/notifications?tab=deadlines" variant="ghost" size="sm">
            Все дедлайны ({source.length})
          </ButtonLink>
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
