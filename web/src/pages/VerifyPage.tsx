import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarClock, QrCode, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Progress';
import { ErrorState } from '@/components/ui/States';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useMeta, useVerify } from '@/lib/queries';

/** «16 ноября 2026, 12:10» — дата подписания по-человечески. */
function formatIssued(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Достаём токен из полной ссылки QR или из ручного ввода. */
function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const marker = '/verify/';
  const at = trimmed.indexOf(marker);
  return at >= 0 ? trimmed.slice(at + marker.length).split(/[?#]/)[0] ?? '' : trimmed;
}

/** Публичная проверка документа по QR: без логина, без персональных данных. */
export default function VerifyPage() {
  const { token } = useParams();
  if (!token) return <VerifyLanding />;
  return <VerifyResult token={token} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[480px]">
        <Logo size="md" className="mb-8" />
        {children}
        <div className="mt-6 space-y-3">
          <ThemeSwitcher />
          <p className="text-[11px] leading-relaxed text-muted">
            Подпись документа — HMAC-SHA-256, проверка не раскрывает персональные данные.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Экран без токена: как это работает и ручная проверка по ссылке из QR. */
function VerifyLanding() {
  const meta = useMeta();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const demo = meta.data?.demoDocument;

  return (
    <Shell>
      <Card padding="lg">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-hover text-brand" aria-hidden="true">
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Проверка подлинности документа</h1>
            <p className="text-[13px] text-muted">Работает без входа в кабинет</p>
          </div>
        </div>

        <ol className="mt-4 space-y-2 text-[13px] text-muted">
          <li className="flex gap-2">
            <QrCode className="mt-0.5 size-4 shrink-0 text-quiet" strokeWidth={1.75} aria-hidden="true" />
            Отсканируйте QR-код в PDF-справке или скопируйте ссылку под ним.
          </li>
          <li className="flex gap-2">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-quiet" strokeWidth={1.75} aria-hidden="true" />
            Страница покажет только номер и дату — персональных данных в проверке нет.
          </li>
        </ol>

        <form
          className="mt-5 space-y-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const token = extractToken(value);
            if (!token) {
              setError('Вставьте ссылку или токен из QR');
              return;
            }
            setError(null);
            navigate(`/verify/${encodeURIComponent(token)}`);
          }}
        >
          <TextField
            label="Ссылка или токен"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            error={error ?? undefined}
            placeholder="http://…/verify/eyJuIjoi…"
            hint="Можно вставить ссылку целиком — токен найдём сами"
          />
          <Button type="submit" fullWidth>
            Проверить документ
          </Button>
        </form>

        {demo && (
          <p className="mt-3 text-[12px] text-muted">
            Пример:{' '}
            <button
              type="button"
              onClick={() => navigate(`/verify/${demo.token}`)}
              className="cursor-pointer font-medium text-brand hover:underline"
            >
              подлинная справка {demo.number}
            </button>
          </p>
        )}
      </Card>
    </Shell>
  );
}

function VerifyResult({ token }: { token: string }) {
  const query = useVerify(token);
  const navigate = useNavigate();

  return (
    <Shell>
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
              className={`mx-auto grid size-[72px] place-items-center rounded-full bg-surface-hover ${
                query.data.verified ? 'text-ink' : 'text-danger'
              }`}
              aria-hidden="true"
            >
              {query.data.verified ? <ShieldCheck className="size-9" /> : <ShieldAlert className="size-9" />}
            </span>
            <p className={`mt-4 text-[22px] font-semibold ${query.data.verified ? 'text-ink' : 'text-danger'}`}>
              {query.data.verified ? 'Документ подлинный' : 'Документ не подтверждён'}
            </p>
            <p className="mx-auto mt-2 max-w-[40ch] text-sm text-muted">
              {query.data.verified
                ? 'Цифровая подпись совпадает с записью в кабинете «Дедлайн». Персональные данные не показываем — так работает проверка.'
                : 'Подпись не совпала: документ могли изменить или ссылка повреждена. Обратитесь в деканат.'}
            </p>

            {query.data.verified && (
              <dl className="mt-6 space-y-3 rounded-[10px] border border-line bg-surface-2 p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium text-muted">Номер документа</dt>
                  <dd className="nums flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <BadgeCheck className="size-4 text-ok" aria-hidden="true" />
                    {query.data.number ?? '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium text-muted">Дата подписания</dt>
                  <dd className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <CalendarClock className="size-4 text-muted" aria-hidden="true" />
                    {formatIssued(query.data.issuedAt)}
                  </dd>
                </div>
              </dl>
            )}

            <button
              type="button"
              onClick={() => navigate('/verify')}
              className="mt-5 cursor-pointer text-[12px] font-medium text-brand hover:underline"
            >
              Проверить другой документ
            </button>
          </div>
        )}
      </Card>
    </Shell>
  );
}
