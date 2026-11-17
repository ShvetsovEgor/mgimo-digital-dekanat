import { useParams } from 'react-router-dom';
import { BadgeCheck, CalendarClock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Progress';
import { ErrorState } from '@/components/ui/States';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useVerify } from '@/lib/queries';

/** Публичная проверка документа по QR: без логина, без персональных данных. */
export default function VerifyPage() {
  const { token = '' } = useParams();
  const query = useVerify(token);

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[480px]">
        <Logo size="md" className="mb-8" />
        <Card padding="lg" className="text-center">
          <h1 className="sr-only">Проверка подлинности документа</h1>
          {query.isLoading && (
            <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
              <span className="sr-only">Проверяем подпись документа…</span>
            </div>
          )}
          {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Проверка недоступна" compact />}
          {query.data && (
            <div className="animate-fade">
              <span
                className={`mx-auto grid size-[72px] place-items-center rounded-full ${
                  query.data.verified ? 'bg-ok-soft text-ok-ink' : 'bg-danger-soft text-danger-ink'
                }`}
                aria-hidden="true"
              >
                {query.data.verified ? <ShieldCheck className="size-9" /> : <ShieldAlert className="size-9" />}
              </span>
              <p className={`mt-4 text-[22px] font-extrabold ${query.data.verified ? 'text-ok-ink' : 'text-danger-ink'}`}>
                {query.data.verified ? 'Документ подлинный' : 'Документ не подтверждён'}
              </p>
              <p className="mx-auto mt-2 max-w-[40ch] text-sm text-muted">
                {query.data.verified
                  ? 'Цифровая подпись документа совпадает с записью в кабинете «Дедлайн». Персональные данные не показываем — так работает проверка.'
                  : 'Подпись не совпала: документ мог быть изменён или ссылка некорректна. Обратитесь в деканат.'}
              </p>

              {query.data.verified && (
                <dl className="mt-6 space-y-3 rounded-xl border border-line bg-surface-2 p-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-medium text-muted">Номер документа</dt>
                    <dd className="nums flex items-center gap-1.5 text-sm font-bold text-ink">
                      <BadgeCheck className="size-4 text-ok" aria-hidden="true" />
                      {query.data.number ?? '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-medium text-muted">Дата подписания</dt>
                    <dd className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <CalendarClock className="size-4 text-muted" aria-hidden="true" />
                      {query.data.issuedAt ?? '—'}
                    </dd>
                  </div>
                </dl>
              )}
              <p className="mt-5 text-xs text-muted">
                Номер токена: <span className="font-mono break-all">{token.slice(0, 24)}…</span>
              </p>
            </div>
          )}
        </Card>

        <div className="mt-6 space-y-3">
          <ThemeSwitcher />
          <p className="text-[11px] leading-relaxed text-muted">
            «Дедлайн» — концепт для конкурса VK Education. Неофициальный сервис МГИМО, не подключён к системам
            университета. Данные вымышлены. Подпись документа — HMAC-SHA-256, проверка не раскрывает персональные данные.
          </p>
        </div>
      </div>
    </div>
  );
}
