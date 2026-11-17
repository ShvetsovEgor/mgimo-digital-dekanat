import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth, StaffOnly, StudentOnly } from './layouts/guards';
import { Logo } from './components/Logo';
import { ButtonLink } from './components/ui/Button';
import { ErrorState } from './components/ui/States';
import './styles.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const TodayPage = lazy(() => import('./pages/TodayPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const NewRequestPage = lazy(() => import('./pages/NewRequestPage'));
const RequestDetailPage = lazy(() => import('./pages/RequestDetailPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="space-y-3 py-6" role="status" aria-live="polite">
      <div className="skeleton h-7 w-2/5" />
      <div className="skeleton h-24 w-full rounded-[16px]" />
      <div className="skeleton h-24 w-full rounded-[16px]" />
      <div className="skeleton h-24 w-full rounded-[16px]" />
      <span className="sr-only">Загружаем раздел…</span>
    </div>
  );
}

function SuspensePage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function RouteError({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <ErrorState error={error} onRetry={retry ?? (() => window.location.reload())} title="Раздел не загрузился" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspensePage>
        <LoginPage />
      </SuspensePage>
    ),
    errorElement: (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="w-full max-w-md">
          <Logo size="lg" className="mb-6 justify-center" />
          <RouteError error={new Error('Страница входа не открылась. Перезагрузите её.')} retry={() => window.location.reload()} />
        </div>
      </div>
    ),
  },
  {
    path: '/verify/:token',
    element: (
      <SuspensePage>
        <VerifyPage />
      </SuspensePage>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <StudentOnly allow={['student', 'staff']} />,
        children: [
          {
            element: (
              <AppLayout>
                <RouteScrollReset />
              </AppLayout>
            ),
            errorElement: <RouteError error={new Error('Не удалось показать раздел кабинета.')} />,
            children: [
              {
                element: <StudentOnly />,
                errorElement: <RouteError error={new Error('Не удалось показать раздел.')} />,
                children: [
                  { index: true, element: <SuspensePage><TodayPage /></SuspensePage> },
                  { path: 'schedule', element: <SuspensePage><SchedulePage /></SuspensePage> },
                  { path: 'progress', element: <SuspensePage><ProgressPage /></SuspensePage> },
                  { path: 'requests', element: <SuspensePage><RequestsPage /></SuspensePage> },
                  { path: 'requests/new', element: <SuspensePage><NewRequestPage /></SuspensePage> },
                  { path: 'requests/:id', element: <SuspensePage><RequestDetailPage /></SuspensePage> },
                  { path: 'notifications', element: <SuspensePage><NotificationsPage /></SuspensePage> },
                ],
              },
              {
                path: 'staff',
                errorElement: <RouteError error={new Error('Кабинет сотрудника не загрузился.')} />,
                element: <StaffOnly />,
                children: [
                  {
                    index: true,
                    element: (
                      <SuspensePage>
                        <StaffPage />
                      </SuspensePage>
                    ),
                  },
                ],
              },
              { path: 'profile', element: <SuspensePage><ProfilePage /></SuspensePage> },
              {
                path: '*',
                element: (
                  <SuspensePage>
                    <NotFoundPage />
                  </SuspensePage>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="text-center">
          <Logo size="lg" className="mb-6 justify-center" />
          <h1 className="text-2xl font-extrabold text-ink">Страница не найдена</h1>
          <p className="mt-1 text-sm text-muted">Возможно, ссылка устарела.</p>
          <ButtonLink to="/login" className="mt-4">
            Ко входу
          </ButtonLink>
        </div>
      </div>
    ),
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

/** Сброс скролла наверх при смене раздела (внутри контекста роутера). */
let lastPath = '';
function RouteScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (lastPath === pathname) return;
    lastPath = pathname;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
