import { Minus, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { cx } from '@/lib/cx';
import type { AcademicRank } from '@/lib/types';

/** Академический рейтинг и сравнение со средним по потоку. */
export function RankCard({ rank }: { rank: AcademicRank }) {
  const above = rank.myAvg >= rank.cohortAvg;
  const diff = Math.round(Math.abs(rank.myAvg - rank.cohortAvg));
  const trendPositive = rank.trend?.trim().startsWith('+');
  const TrendIcon = !rank.trend ? Minus : trendPositive ? TrendingUp : TrendingDown;

  return (
    <Card padding="md">
      <CardHeader title="Академический рейтинг" icon={<Trophy className="size-[18px]" aria-hidden="true" />} />
      <p className="text-[12px] text-muted">{rank.semester}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-[11px] font-bold tracking-wide text-muted uppercase">В группе</p>
          <p className="display-num mt-0.5 text-[26px] leading-none text-ink">
            {rank.placeGroup}
            <span className="text-[14px] font-semibold text-muted"> / {rank.outOfGroup}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">{rank.group}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-[11px] font-bold tracking-wide text-muted uppercase">На потоке</p>
          <p className="display-num mt-0.5 text-[26px] leading-none text-ink">
            {rank.placeProgram}
            <span className="text-[14px] font-semibold text-muted"> / {rank.outOfProgram}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">весь поток программы</p>
        </div>
      </div>

      {rank.trend && (
        <p
          className={cx(
            'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold',
            trendPositive ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink',
          )}
        >
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {rank.trend} к прошлому семестру
        </p>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-ink">Вы — {rank.myAvg}%</span>
          <span className="text-muted">средний по потоку — {rank.cohortAvg}%</span>
        </div>
        <Progress value={rank.myAvg} tone="brand" label="Мой средний рейтинг" />
        <Progress value={rank.cohortAvg} tone="ok" label="Средний рейтинг по потоку" size="sm" />
        <p className={cx('text-[13px] font-semibold', above ? 'text-ok-ink' : 'text-warn-ink')}>
          {above ? `На ${diff} п. выше среднего по потоку` : `На ${diff} п. ниже среднего по потоку`}
        </p>
      </div>
    </Card>
  );
}
