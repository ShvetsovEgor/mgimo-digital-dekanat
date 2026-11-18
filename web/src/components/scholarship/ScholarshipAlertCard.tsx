import { Wallet } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { useScholarship } from '@/lib/queries';
import { formatMonthly } from '@/lib/scholarship';

/**
 * Карточка на главной появляется только когда прогноз по баллам ниже назначенной
 * стипендии или равен нулю при бюджете — то есть когда студенту есть что «разобрать».
 */
export function ScholarshipAlertCard() {
  const query = useScholarship();
  if (query.isLoading || query.isError || !query.data) return null;
  const { funded, assigned, result } = query.data;

  const budgetAtRisk = funded === 'budget' && result.amount === 0;
  const belowAssigned = assigned !== null && result.amount < assigned.amount;
  if (!budgetAtRisk && !belowAssigned) return null;

  const shortfall = assigned ? assigned.amount - result.amount : 0;
  const firstGap = result.gaps[0];

  return (
    <Card>
      <CardHeader
        title="Стипендия по текущим баллам"
        icon={<Wallet className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
        action={<ActionLink to="/scholarship">Разобрать по предметам</ActionLink>}
      />
      <p className="text-sm text-ink">
        {result.title}: <span className="nums font-semibold">{formatMonthly(result.amount)}</span>
        {shortfall > 0 && (
          <>
            {' '}
            — на <span className="nums font-semibold">{shortfall.toLocaleString('ru-RU')} ₽</span> меньше назначенной
          </>
        )}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {firstGap ? (
          <>
            Ближе всех к цели «{firstGap.title}»: <span className="nums">{firstGap.rating}</span> из{' '}
            <span className="nums">{firstGap.need}</span>, не хватает <span className="nums">{firstGap.delta}</span>.
          </>
        ) : (
          'Все дисциплины ниже порога — начните с предмета с самым низким баллом.'
        )}
      </p>
    </Card>
  );
}
