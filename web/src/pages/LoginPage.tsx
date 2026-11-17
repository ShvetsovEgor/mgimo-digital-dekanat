import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Eye, EyeOff, GraduationCap, KeyRound, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Progress';
import { Logo } from '@/components/Logo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useToast } from '@/components/ui/Toast';
import { useLogin } from '@/lib/auth';
import { ApiError } from '@/lib/http';
import { mockEnabled } from '@/lib/mode';
import { useMeta, useSession } from '@/lib/queries';
import type { MetaAccount } from '@/lib/types';

interface LocationState {
  from?: string;
  expired?: boolean;
}

export default function LoginPage() {
  const session = useSession();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  if (session.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <Logo size="lg" />
      </div>
    );
  }
  if (session.data?.authenticated) {
    return <Navigate to={state.from && state.from !== '/login' ? state.from : '/'} replace />;
  }

  return <LoginScreen from={state.from} expired={state.expired} />;
}

function LoginScreen({ from, expired }: { from?: string; expired?: boolean }) {
  const meta = useMeta();
  const login = useLogin();
  const toast = useToast();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ login?: string; password?: string }>({});
  const [slowHint, setSlowHint] = useState(false);

  useEffect(() => {
    if (!busy) {
      setSlowHint(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowHint(true), 3500);
    return () => window.clearTimeout(timer);
  }, [busy]);

  const submit = async (loginName: string, pass: string) => {
    setError(null);
    setFieldError({});
    const nextErrors: { login?: string; password?: string } = {};
    if (!loginName.trim()) nextErrors.login = 'Введите логин';
    if (!pass) nextErrors.password = 'Введите пароль';
    if (Object.keys(nextErrors).length > 0) {
      setFieldError(nextErrors);
      return;
    }
    setBusy(true);
    try {
      const result = await login(loginName.trim(), pass);
      setBusy(false);
      setPendingAccount(null);
      toast.success(result.role === 'staff' ? 'Вы вошли как сотрудник деканата' : 'Добро пожаловать!');
      if (result.role === 'staff') navigate('/staff', { replace: true });
      else navigate(from && from !== '/login' && !from.startsWith('/verify') ? from : '/', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        const sessionAfterError = await window.fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.ok).catch(() => false);
        if (sessionAfterError) {
          setBusy(false);
          setPendingAccount(null);
          navigate('/');
          return;
        }
      }
      const apiError = caught instanceof ApiError ? caught : null;
      const message = apiError?.message ?? 'Не получилось войти. Попробуйте ещё раз.';
      setError(message);
      if (apiError?.code === 'INVALID_CREDENTIALS') setFieldError({ password: 'Проверьте логин и пароль' });
    } finally {
      setBusy(false);
      setPendingAccount(null);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit(loginValue, password);
  };

  const useAccount = (account: MetaAccount) => {
    setLoginValue(account.login);
    setPassword(account.password);
    setError(null);
    setPendingAccount(account.login);
    void submit(account.login, account.password);
  };

  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-strong p-10 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full border border-gold/30 bg-gold/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 size-[380px] rounded-full border border-white/10"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-[14px] bg-white/10 ring-1 ring-gold/40">
            <GraduationCap className="size-6 text-gold" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-extrabold">Дедлайн</span>
            <span className="block text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
              цифровой деканат 2030
            </span>
          </span>
        </div>
        <div className="relative mt-auto max-w-[30ch]">
          <h1 className="text-[34px] leading-[1.12] font-extrabold tracking-tight">
            Расписание, рейтинг и справки — <span className="text-gold">в одном месте</span>
          </h1>
          <p className="mt-4 text-[15px] text-white/75">
            Неопределённость «успею ли на автомат?» превращается в понятные ответы: сколько баллов осталось, когда
            будет справка и что изменилось в расписании.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/85">
            {[
              'Прогноз «автомата» по регламенту МГИМО',
              'Заявки и справки с прогнозом готовности',
              'Изменения в расписании с авторами правки',
            ].map((text) => (
              <li key={text} className="flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0 text-gold" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-8 text-xs text-white/55">
          Концепт для конкурса VK Education. Неофициальный сервис МГИМО, все данные вымышлены.
        </p>
      </aside>

      <div className="flex flex-col px-4 pt-8 pb-6 sm:px-8 lg:justify-center">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <Logo size="md" />
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
              концепт
            </span>
          </div>

          <h2 className="text-[26px] leading-tight font-extrabold tracking-tight text-ink">Вход в кабинет</h2>
          <p className="mt-1 text-sm text-muted">Логин и пароль выдаёт деканат. У демо-аккаунтов — общий пароль.</p>

          {expired && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-warn/35 bg-warn-soft px-3 py-2.5 text-[13px] font-medium text-warn-ink"
            >
              Сессия истекла. Войдите снова — данные останутся на месте.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-danger/35 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-ink"
            >
              {error}
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <TextField
              label="Логин"
              name="login"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              placeholder="например, a.ivanova"
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              error={fieldError.login}
              trailing={<UserRound className="mr-3 size-[18px] text-muted" aria-hidden="true" />}
            />
            <TextField
              label="Пароль"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Введите пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldError.password}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={showPassword}
                  className="mr-0.5 grid size-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-line/50"
                >
                  {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
                </button>
              }
            />
            <Button type="submit" size="lg" fullWidth loading={busy && !pendingAccount} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
              Войти
            </Button>
            {slowHint && (
              <p className="text-center text-[13px] text-muted" role="status">
                Сервер отвечает дольше обычного — не обновляйте страницу.
              </p>
            )}
          </form>

          <DemoAccounts
            loading={meta.isLoading}
            accounts={meta.data?.accounts ?? []}
            failed={meta.isError}
            onPick={useAccount}
            busy={busy}
            pendingLogin={pendingAccount}
          />

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Пароль передаётся только серверу и хранится в виде хеша. Сессия — в защищённой cookie, недоступной
            JavaScript.
            {mockEnabled() && ' Демо-режим без сервера: данные хранятся в браузере.'}
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[420px] space-y-3">
          <ThemeSwitcher />
          <p className="text-[11px] leading-relaxed text-muted">
            Концепт для конкурса VK Education «Кибербезопасность и ИИ в высшей школе — 2026». Неофициальный сервис
            МГИМО, не подключён к системам университета. Все данные вымышлены.
          </p>
        </div>
      </div>
    </div>
  );
}

interface DemoAccountsProps {
  loading: boolean;
  failed: boolean;
  accounts: MetaAccount[];
  onPick: (account: MetaAccount) => void;
  busy: boolean;
  pendingLogin: string | null;
}

function DemoAccounts({ loading, failed, accounts, onPick, busy, pendingLogin }: DemoAccountsProps) {
  return (
    <section
      aria-labelledby="demo-accounts"
      className="mt-6 rounded-[18px] border border-gold/40 bg-gold-soft/50 p-3.5"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-gold-ink" aria-hidden="true" />
        <h2 id="demo-accounts" className="text-sm font-bold text-gold-ink">
          Демо-доступы для жюри
        </h2>
      </div>
      <p className="mt-1 text-[13px] text-ink/75">Нажмите — и войдём под этот аккаунт сразу, без ввода пароля.</p>

      {loading && (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}
      {failed && (
        <p className="mt-3 text-[13px] font-medium text-warn-ink">
          Не удалось получить список демо-аккаунтов. Введите логин вручную.
        </p>
      )}
      {!loading && !failed && (
        <ul className="mt-3 space-y-2">
          {accounts.map((account) => (
            <li key={account.login}>
              <button
                type="button"
                onClick={() => onPick(account)}
                disabled={busy}
                className="flex w-full min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/50 disabled:cursor-wait disabled:opacity-70"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white"
                  aria-hidden="true"
                >
                  {account.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{account.name}</span>
                    <span className="rounded-full bg-line/60 px-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">
                      {account.role === 'staff' ? 'деканат' : 'студент'}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">{account.note}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink/70">
                    {account.login} / {account.password}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-brand-ink">
                  {pendingLogin === account.login ? 'Входим…' : 'Войти как'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
        <CalendarDays className="size-3.5" aria-hidden="true" />
        Данные вымышлены. Прототип не связан с системами университета.
      </p>
    </section>
  );
}
