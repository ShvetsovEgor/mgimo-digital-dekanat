import { AlertTriangle, ArrowRight, KeyRound, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/Progress';
import type { MetaAccount } from '@/lib/types';

interface DemoAccountsCardProps {
  loading: boolean;
  failed: boolean;
  accounts: MetaAccount[];
  onPick: (account: MetaAccount) => void;
  onRetry: () => void;
  busy: boolean;
  pendingLogin: string | null;
}

/**
 * Отдельная карточка «Демо-доступы для жюри»: компактный список аккаунтов из /api/meta
 * и вход в один клик — подставить логин с паролем и сразу отправить форму.
 */
export function DemoAccountsCard({ loading, failed, accounts, onPick, onRetry, busy, pendingLogin }: DemoAccountsCardProps) {
  return (
    <section
      aria-labelledby="demo-accounts"
      className="rounded-[22px] border border-line bg-surface p-5"
    >
      <h2 id="demo-accounts" className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <KeyRound className="size-4 text-brand" strokeWidth={1.75} aria-hidden="true" />
        Демо-доступы для жюри
      </h2>
      <p className="mt-0.5 text-[11.5px] text-quiet">Один клик — вход под аккаунтом, пароль вводить не нужно.</p>

      {loading && (
        <div className="mt-3 space-y-2" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-[10px]" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
      )}

      {failed && !loading && (
        <div role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <AlertTriangle className="size-3.5 shrink-0 text-quiet" strokeWidth={1.75} aria-hidden="true" />
            Список не загрузился — форма входа работает.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 text-[12px] font-medium text-brand hover:underline"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Повторить
          </button>
        </div>
      )}

      {!loading && !failed && (
        <ul className="mt-2 divide-y divide-line">
          {accounts.map((account) => (
            <li key={account.login}>
              <button
                type="button"
                onClick={() => onPick(account)}
                disabled={busy}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-wait disabled:opacity-70"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-sidebar text-[10px] font-semibold text-ink"
                  aria-hidden="true"
                >
                  {account.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="truncate text-[13px] font-medium text-ink">{account.name}</span>
                    <span className="text-[11px] text-quiet">{account.role === 'staff' ? 'деканат' : 'студент'}</span>
                  </span>
                  <span className="block truncate font-mono text-[10.5px] text-quiet">
                    {account.login} / {account.password}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand">
                  {pendingLogin === account.login ? 'Входим…' : 'Войти'}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
