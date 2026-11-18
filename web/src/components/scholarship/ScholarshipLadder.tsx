import { Check, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/cx';
import { formatMonthly } from '@/lib/scholarship';
import type { ScholarshipResult, ScholarshipRules, ScholarshipTier } from '@/lib/types';

interface Step {
  tier: ScholarshipTier;
  title: string;
  threshold: number | null;
  amount: number;
  hint: string;
}

/** Лестница из трёх ступеней: текущая выделена акцентом, без плашки-меню. */
export function ScholarshipLadder({
  result,
  rules,
  funded,
}: {
  result: ScholarshipResult;
  rules: ScholarshipRules;
  funded: 'budget' | 'contract';
}) {
  const steps: Step[] = [
    { tier: 'none', title: 'Стипендии нет', threshold: null, amount: 0, hint: 'Хотя бы одна дисциплина ниже 70' },
    {
      tier: 'academic',
      title: 'Академическая',
      threshold: rules.academicMin,
      amount: rules.academicAmount,
      hint: `все дисциплины от ${rules.academicMin}`,
    },
    {
      tier: 'increased',
      title: 'Повышенная академическая',
      threshold: rules.increasedMin,
      amount: rules.increasedAmount,
      hint: `все дисциплины от ${rules.increasedMin}`,
    },
  ];
  const currentIndex = steps.findIndex((step) => step.tier === result.tier);

  return (
    <ol className="space-y-2">
      {steps.map((step, index) => {
        const current = index === currentIndex && funded === 'budget';
        const passed = funded === 'budget' && index < currentIndex;
        return (
          <li
            key={step.tier}
            aria-current={current ? 'step' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-[12px] border px-4 py-3',
              current ? 'border-brand bg-surface' : 'border-line bg-surface',
            )}
          >
            <span
              className={cx(
                'grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold',
                current
                  ? 'border-brand bg-brand text-white'
                  : passed
                    ? 'border-brand text-brand'
                    : 'border-line text-quiet',
              )}
              aria-hidden="true"
            >
              {passed ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('block text-sm font-semibold', current ? 'text-brand' : 'text-ink')}>{step.title}</span>
              <span className="block text-[12px] text-muted">
                {step.threshold === null ? step.hint : `порог ${step.threshold} · ${step.hint}`}
              </span>
            </span>
            <span className={cx('nums shrink-0 text-sm', current ? 'font-semibold text-brand' : 'text-muted')}>
              {step.amount > 0 ? formatMonthly(step.amount) : '0 ₽'}
            </span>
            {current && <ChevronRight className="size-4 shrink-0 text-brand" aria-hidden="true" />}
          </li>
        );
      })}
      {funded === 'contract' && (
        <li className="rounded-[12px] border border-line bg-surface px-4 py-3 text-[13px] text-muted">
          На договорном месте академическая стипендия не назначается — лестница показывает общий регламент.
        </li>
      )}
    </ol>
  );
}
