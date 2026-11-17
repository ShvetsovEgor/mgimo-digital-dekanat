import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Progress';
import { ApiError } from '@/lib/http';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, secondary, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface/60 px-5 text-center ${compact ? 'py-6' : 'py-10'}`}
    >
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink" aria-hidden="true">
        {icon ?? <Inbox className="size-6" />}
      </span>
      <p className="max-w-[34ch] text-[15px] font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-[42ch] text-sm text-muted">{description}</p>}
      {(action || secondary) && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action ?? secondary}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

function describe(error: unknown): { title: string; message: string; offline: boolean } {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK') {
      return { title: 'Нет связи с сервером', message: 'Проверьте интернет — кабинет попробует ещё раз.', offline: true };
    }
    if (error.code === 'NOT_FOUND' || error.status === 404) {
      return { title: 'Не нашли эти данные', message: error.message, offline: false };
    }
    return { title: 'Не получилось загрузить', message: error.message, offline: false };
  }
  if (error instanceof Error && error.message) {
    return { title: 'Не получилось загрузить', message: error.message, offline: false };
  }
  return { title: 'Не получилось загрузить', message: 'Что-то пошло не так. Попробуйте ещё раз.', offline: false };
}

export function ErrorState({ error, onRetry, title, compact }: ErrorStateProps) {
  const info = describe(error);
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-[16px] border border-line bg-surface px-5 text-center ${compact ? 'py-6' : 'py-10'}`}
    >
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-ink" aria-hidden="true">
        {info.offline ? <WifiOff className="size-6" /> : <AlertTriangle className="size-6" />}
      </span>
      <p className="text-[15px] font-bold text-ink">{title ?? info.title}</p>
      <p className="mt-1 max-w-[42ch] text-sm text-muted">{info.message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          iconLeft={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Повторить
        </Button>
      )}
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
  lines?: number;
}

/** Список скелетонов для карточек. */
export function ListSkeleton({ count = 3, lines = 3 }: ListSkeletonProps) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загружаем данные…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-[16px] border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {Array.from({ length: Math.max(0, lines - 1) }, (__, lineIndex) => (
            <Skeleton key={lineIndex} className={`mb-2 h-3 ${lineIndex % 2 === 0 ? 'w-11/12' : 'w-3/5'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
