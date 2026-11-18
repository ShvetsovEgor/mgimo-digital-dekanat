import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Progress';
import { Logo } from '@/components/Logo';
import { useRole, useSession } from '@/lib/queries';
import { useEnsureTabSession, useUnauthorizedGuard } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

/** Экран ожидания проверки сессии — не «мигаем» формой входа. */
function Splash({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="flex flex-col items-center gap-5 text-center" role="status" aria-live="polite">
        <Logo size="lg" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-3.5 w-40" />
          <Skeleton className="mx-auto h-3 w-28" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

/** Защищённая зона: без сессии — на /login (с возвратом назад). */
export function RequireAuth() {
  const location = useLocation();
  const session = useSession();
  useUnauthorizedGuard();
  useEnsureTabSession();

  if (session.isLoading) return <Splash label="Проверяем сессию…" />;
  if (session.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="w-full max-w-md">
          <ErrorState error={session.error} onRetry={() => void session.refetch()} title="Не удалось проверить сессию" />
        </div>
      </div>
    );
  }
  if (!session.data?.authenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
}

/**
 * Зона только для студентов. Сотрудник попадает в /staff,
 * поэтому все страницы студента недоступны сотруднику осознанно.
 */
export function StudentOnly({ allow = ['student'] }: { allow?: UserRole[] }) {
  const { role, isLoading } = useRole();
  if (isLoading || role === 'unknown') return <Splash label="Определяем роль…" />;
  if (!allow.includes(role)) return <Navigate to={role === 'staff' ? '/staff' : '/'} replace />;
  return <Outlet />;
}

export function StaffOnly() {
  const { role, isLoading } = useRole();
  if (isLoading || role === 'unknown') return <Splash label="Определяем роль…" />;
  if (role !== 'staff') return <Navigate to="/" replace />;
  return <Outlet />;
}
