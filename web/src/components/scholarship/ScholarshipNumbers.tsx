import { Minus } from 'lucide-react';
import { cx } from '@/lib/cx';
import { formatMonthly } from '@/lib/scholarship';
import type { ScholarshipResult, ScholarshipRules } from '@/lib/types';

/** Две цифры рядом: что назначено сейчас и что выходит по баллам семестра. */
export function ScholarshipNumbers({
  assigned,
  forecast,
  rules,
}: {
  assigned: { title: string; amount: number } | null;
  forecast: ScholarshipResult;
  rules: ScholarshipRules;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-[12px] border border-line bg-surface p-3.5">
        <p className="text-[12px] text-quiet">Сейчас назначено</p>
        {assigned ? (
          <>
            <p className="nums mt-1 text-2xl font-semibold text-ink">{formatMonthly(assigned.amount)}</p>
            <p className="mt-1 text-[13px] text-muted">{assigned.title}</p>
          </>
        ) : (
          <>
            <p className="nums mt-1 flex items-center gap-1 text-2xl font-semibold text-quiet">
              <Minus className="size-5" aria-hidden="true" />0 ₽/мес
            </p>
            <p className="mt-1 text-[13px] text-muted">Стипендия не назначена</p>
          </>
        )}
      </div>
      <div className={cx('rounded-[12px] border bg-surface p-3.5', forecast.amount > 0 ? 'border-brand' : 'border-line')}>
        <p className="text-[12px] text-quiet">По баллам этого семестра</p>
        <p className={cx('nums mt-1 text-2xl font-semibold', forecast.amount > 0 ? 'text-brand' : 'text-ink')}>
          {formatMonthly(forecast.amount)}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {forecast.title} · порог {forecast.amount > 0 ? rules.increasedMin : rules.academicMin}
        </p>
      </div>
    </div>
  );
}
