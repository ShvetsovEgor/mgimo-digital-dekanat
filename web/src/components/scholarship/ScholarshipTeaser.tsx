import { ArrowRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScholarship } from '@/lib/queries';
import { formatMonthly } from '@/lib/scholarship';
import type { ScholarshipBundle } from '@/lib/types';

/**
 * Карточка-ссылка «Калькулятор стипендии» для экрана «Учёба»:
 * показывает прогноз по баллам и, если он ниже назначенного, — на сколько.
 */
export function ScholarshipTeaser() {
  const query = useScholarship();
  if (query.isLoading || query.isError || !query.data) return null;
  const bundle: ScholarshipBundle = query.data;
  const { result, assigned, funded } = bundle;
  const lower = assigned !== null && result.amount < assigned.amount;

  return (
    <Link
      to="/scholarship"
      className="flex min-h-11 items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3 no-underline transition-colors hover:bg-surface-hover"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-surface-hover text-brand" aria-hidden="true">
        <Wallet className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">Калькулятор стипендии</span>
        <span className="mt-0.5 block text-[13px] text-muted">
          {funded === 'contract'
            ? 'На договорном месте стипендия не назначается'
            : lower
              ? `По баллам выходит ${formatMonthly(result.amount)} — ниже назначенной`
              : `По баллам этого семестра — ${formatMonthly(result.amount)}`}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-brand sm:flex">
        Разобрать
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
