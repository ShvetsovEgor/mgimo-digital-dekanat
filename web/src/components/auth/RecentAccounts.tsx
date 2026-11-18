import { ArrowRight, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/Progress';
import type { MetaAccount } from '@/lib/types';

/** Два демо-аккаунта для жюри: студент и сотрудник деканата. */
const DEMO_LOGINS = ['a.ivanova', 'dekanat'];

interface RecentAccountsProps {
  loading: boolean;
  failed: boolean;
  accounts: MetaAccount[];
  onPick: (account: MetaAccount) => void;
  onRetry: () => void;
  busy: boolean;
  pendingLogin: string | null;
}

/**
 * «Вы вышли из аккаунтов» — компактный пункт внутри формы авторизации:
 * два последних демо-аккаунта (студент и деканат), вход в один клик.
 */
export function RecentAccounts({ loading, failed, accounts, onPick, onRetry, busy, pendingLogin }: RecentAccountsProps) {
  const shown = DEMO_LOGINS.map((login) => accounts.find((item) => item.login === login)).filter(
    (item): item is MetaAccount => Boolean(item),
  );

  return (
    <section aria-labelledby="recent-accounts" className="mt-4 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="recent-accounts" className="text-[12px] font-semibold text-ink">
          Вы вышли из аккаунтов
        </h2>
        <span className="text-[11px] text-quiet">быстрый вход для жюри</span>
      </div>

      {loading && (
        <div className="mt-2 space-y-1.5" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-[10px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      )}

      {failed && !loading && (
        <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-line px-2.5 py-1.5">
          <span className="text-[11.5px] text-muted">Список не загрузился — вход по логину работает.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 text-[11.5px] font-medium text-brand hover:underline"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Повторить
          </button>
        </div>
      )}

      {!loading && !failed && shown.length > 0 && (
        <ul className="mt-1 divide-y divide-line">
          {shown.map((account) => (
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
                  <span className="block truncate text-[12.5px] font-medium text-ink">{account.name}</span>
                  <span className="block truncate text-[11px] text-quiet">
                    {account.role === 'staff' ? 'деканат' : 'студент'} · {account.login}
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
