import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { TextField } from '@/components/ui/Field';
import { Logo, LogoMark } from '@/components/Logo';

import { useToast } from '@/components/ui/Toast';
import { useLogin } from '@/lib/auth';
import { ApiError } from '@/lib/http';
import { mockEnabled } from '@/lib/mode';
import { keys, resetUserCache, useMeta, useSession } from '@/lib/queries';
import { getTabSession } from '@/lib/tab-session';
import { api } from '@/lib/http';
import { useQueryClient } from '@tanstack/react-query';
import { CompactLanguageButton, CompactThemeButton } from '@/components/auth/AuthChrome';
import { DemoAccountsCard } from '@/components/auth/DemoAccountsCard';
import { LoginBackdrop } from '@/components/auth/LoginBackdrop';
import type { Meta, MetaAccount } from '@/lib/types';

interface LocationState {
  from?: string;
  expired?: boolean;
}

/**
 * «Оставаться в системе»: помним только логин на этом устройстве, чтобы не вводить его каждый раз.
 * Пароль не сохраняем, срок сессии и cookie не меняем — это правило из docs/SECURITY.md.
 */
const REMEMBERED_LOGIN_KEY = 'dl.remembered-login';

function getRememberedLogin(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberLogin(login: string | null): void {
  try {
    if (login) window.localStorage.setItem(REMEMBERED_LOGIN_KEY, login);
    else window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    /* приватный режим — просто не запомним */
  }
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
  // Вкладка со своей сессией просто возвращается в кабинет. Вкладка без токена
  // (например, только что открытая) может войти другим аккаунтом, не трогая соседние.
  if (session.data?.authenticated && getTabSession()) {
    return <Navigate to={state.from && state.from !== '/login' ? state.from : '/'} replace />;
  }

  return (
    <LoginScreen
      from={state.from}
      expired={state.expired}
      signedInElsewhere={session.data?.authenticated === true}
    />
  );
}

function LoginScreen({
  from,
  expired,
  signedInElsewhere,
}: {
  from?: string;
  expired?: boolean;
  signedInElsewhere?: boolean;
}) {

  const login = useLogin();
  const toast = useToast();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState(() => getRememberedLogin());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ login?: string; password?: string }>({});
  const [slowHint, setSlowHint] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(() => Boolean(getRememberedLogin()));
  const meta = useMeta({ enabled: !resetting });
  const queryClient = useQueryClient();
  // «Холодный старт»: сервер мог пересобрать демо-данные (reset: true) — все прежние сессии недействительны.
  useEffect(() => {
    // Пересборка — событие одной загрузки: в кэше метка больше не нужна, иначе повторный вход
    // снова вызвал бы выход после успешного логина.
    if (!meta.data?.reset) return;
    setResetting(true);
    void api
      .post('/auth/logout')
      .catch(() => undefined)
      .finally(() => {
        resetUserCache(queryClient);
        queryClient.removeQueries({ queryKey: keys.meta });
        void queryClient.fetchQuery({ queryKey: keys.meta, staleTime: 0, queryFn: () => api.get<Meta>('/meta') }).catch(() => undefined);
        setResetting(false);
      });
  }, [meta.data?.reset, queryClient]);

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
      rememberLogin(staySignedIn ? loginName.trim() : null);
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
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <LoginBackdrop />
      <div className="relative grid min-h-dvh lg:grid-cols-[1.02fr_1fr]">
        {/* Левая колонка: рассказ о кабинете поверх сменяющегося фона */}
        <aside className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
          <Logo size="md" withSubtitle />
          <div className="max-w-[36ch] rounded-[28px] border border-line bg-surface/80 p-7 backdrop-blur-md">
            <p className="text-[26px] leading-[1.2] font-semibold tracking-[-0.02em] text-ink">
              Расписание, рейтинг и справки <span className="text-brand">в одном месте</span>
            </p>
            <p className="mt-3 text-sm text-muted">
              «Успею ли на автомат?» превращается в понятный ответ: сколько баллов осталось, когда будет справка и что
              изменилось в расписании.
            </p>
            <ul className="mt-5 space-y-2 text-[13px] text-muted">
              {[
                'Прогноз «автомата» по регламенту МГИМО',
                'Заявки и справки с прогнозом готовности',
                'Изменения в расписании с авторами правки',
              ].map((text) => (
                <li key={text} className="flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Правая колонка: виджет авторизации и демо-доступы */}
        <div className="flex flex-col justify-center bg-bg/85 px-4 py-4 backdrop-blur-md sm:px-8 lg:bg-bg lg:py-6 lg:backdrop-blur-none">
          <div className="mx-auto w-full max-w-[440px] space-y-4">
            <section
              aria-labelledby="auth-title"
              className="rounded-[26px] border border-line bg-surface p-6 sm:p-7 lg:p-8"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <LogoMark size={38} className="text-brand" />
                  <span className="flex flex-col leading-[1.15]">
                    <span className="text-[13px] font-semibold tracking-[0.12em] text-ink uppercase">Дедлайн</span>
                    <span className="text-[10px] font-medium tracking-[0.1em] whitespace-nowrap text-quiet uppercase">
                      цифровой деканат
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <CompactThemeButton />
                  <CompactLanguageButton />
                </span>
              </div>

              <div className="mt-7 mb-6 sm:mt-8">
                <h1 id="auth-title" className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                  Авторизация
                </h1>
                <p className="mt-1 text-[13px] text-muted">
                  студенческий портал <span className="font-medium text-brand">deadline.university</span>
                </p>
              </div>

              {signedInElsewhere && (
                <p role="status" className="mb-4 rounded-[12px] border border-line bg-surface-hover px-3 py-2.5 text-[13px] text-muted">
                  В другой вкладке этого браузера кабинет уже открыт. Можно войти здесь другим аккаунтом — та вкладка
                  останется под своим.{' '}
                  <Link to={from && from !== '/login' ? from : '/'} className="font-medium text-brand hover:underline">
                    Продолжить в кабинете
                  </Link>
                </p>
              )}
              {expired && (
                <p role="status" className="mb-4 rounded-[12px] border border-line bg-surface-hover px-3 py-2.5 text-[13px] font-medium text-ink">
                  Сессия истекла. Войдите снова — данные останутся на месте.
                </p>
              )}
              {error && (
                <p role="alert" className="mb-4 rounded-[12px] border border-line bg-surface-hover px-3 py-2.5 text-[13px] font-semibold text-danger">
                  {error}
                </p>
              )}

              <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
                  leading={<UserRound className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
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
                  leading={<Lock className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      aria-pressed={showPassword}
                      className="mr-0.5 grid size-10 cursor-pointer place-items-center rounded-[8px] text-muted hover:bg-surface-hover"
                    >
                      {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
                    </button>
                  }
                />

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] text-muted">
                    <input
                      type="checkbox"
                      checked={staySignedIn}
                      onChange={(event) => setStaySignedIn(event.target.checked)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    Оставаться в системе
                  </label>
                  <span className="hidden text-[11px] text-quiet sm:inline">пароль не сохраняем</span>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 inline-flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-brand-fill px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-wait disabled:opacity-75"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-white/20" aria-hidden="true">
                    {busy && !pendingAccount ? <Spinner /> : <ArrowRight className="size-3.5" />}
                  </span>
                  Войти
                </button>

                {slowHint && (
                  <p className="text-center text-[13px] text-muted" role="status">
                    Сервер отвечает дольше обычного — не обновляйте страницу.
                  </p>
                )}
              </form>

              <p className="mt-4 flex items-start gap-2 text-[11px] leading-snug text-quiet">
                <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                Пароль хранится только в виде хеша, сессия — в защищённой cookie.
                {mockEnabled() ? ' Демо-режим без сервера.' : ''}
              </p>
            </section>

            <DemoAccountsCard
              loading={meta.isLoading}
              failed={meta.isError}
              accounts={meta.data?.accounts ?? []}
              onPick={useAccount}
              onRetry={() => void meta.refetch()}
              busy={busy}
              pendingLogin={pendingAccount}
            />

            <p className="px-1 text-[11px] text-quiet">Учебный проект · не официальный сервис университета</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

