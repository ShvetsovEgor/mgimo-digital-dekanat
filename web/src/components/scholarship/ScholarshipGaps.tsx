import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import type { ScholarshipResult } from '@/lib/types';

/** «Что поднять»: чего и сколько не хватает до ближайшего уровня. */
export function ScholarshipGaps({ result, funded }: { result: ScholarshipResult; funded: 'budget' | 'contract' }) {
  if (funded === 'contract') {
    return (
      <EmptyState
        title="Повышать нечего"
        description="Академическая стипендия на договорном месте не назначается, поэтому баллы на неё не влияют."
      />
    );
  }
  if (result.gaps.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-[12px] border border-line bg-surface px-4 py-3 text-sm text-ink">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
        {result.amount > 0 ? 'Этого уровня баллы уже достигают.' : 'Нет дисциплин, которые мешают стипендии.'}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line rounded-[12px] border border-line bg-surface">
      {result.gaps.map((gap) => (
        <li key={gap.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">{gap.title}</span>
            <span className="mt-0.5 block text-[13px] text-muted">
              <span className="nums">{gap.rating}</span> из <span className="nums">{gap.need}</span>, не хватает{' '}
              <span className="nums font-semibold text-ink">{gap.delta}</span>
            </span>
          </span>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand">
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            <span className="nums">+{gap.delta}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
