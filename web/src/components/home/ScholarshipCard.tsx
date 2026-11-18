import { Wallet } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { useScholarship } from '@/lib/queries';
import { formatMonthly } from '@/lib/scholarship';

/**
 * «Стипендия» на главной: назначенная выплата и прогноз по баллам семестра — разные строки,
 * чтобы цифры не спорили с профилем.
 */
export function ScholarshipCard() {
  const query = useScholarship();
  if (query.isLoading || query.isError || !query.data) return null;
  const { funded, assigned, result } = query.data;
  const lower = assigned !== null && result.amount < assigned.amount;
  const shortfall = assigned ? assigned.amount - result.amount : 0;

  return (
    <Card padding="md">
      <CardHeader
        title="Стипендия"
        icon={<Wallet className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
        action={
          <ActionLink to="/scholarship" className="whitespace-nowrap">
            Калькулятор
          </ActionLink>
        }
      />
      <dl className="divide-y divide-line">
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="text-[13px] text-muted">Назначено</dt>
          <dd className="nums text-right text-sm font-semibold text-ink">
            {assigned ? formatMonthly(assigned.amount) : funded === 'contract' ? '—' : 'не назначена'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="text-[13px] text-muted">По баллам семестра</dt>
          <dd className="nums text-right text-sm font-semibold text-ink">{formatMonthly(result.amount)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-[12px] leading-snug text-muted">
        {funded === 'contract'
          ? 'На договорном месте академическая стипендия не назначается.'
          : result.amount === 0
            ? `По баллам стипендия пока не положена — до назначенной суммы ${shortfall.toLocaleString('ru-RU')} ₽.`
            : lower
              ? `По баллам выходит «${result.title}» — это на ${shortfall.toLocaleString('ru-RU')} ₽ меньше назначенной.`
              : result.tier === 'increased'
                ? 'Баллы держат повышенную — совпадает с назначенной суммой.'
                : 'Прогноз совпадает с назначенной суммой.'}
      </p>
    </Card>
  );
}
