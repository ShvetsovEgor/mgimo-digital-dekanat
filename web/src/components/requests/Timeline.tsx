import { Check } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { RequestTimelineStep } from '@/lib/types';

/** Вертикальный таймлайн «подана → в работе → готово» с прогнозом. */
export function Timeline({ steps }: { steps: RequestTimelineStep[] }) {
  if (steps.length === 0) return <p className="text-[13px] text-muted">История пока пуста.</p>;
  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={`${step.label}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute top-6 bottom-0 left-[11px] w-px bg-line" aria-hidden="true" />}
            <span
              className={cx(
                'relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                step.done ? 'bg-ok text-white' : step.current ? 'bg-brand-soft text-brand-ink ring-2 ring-brand/40' : 'bg-line text-muted',
              )}
              aria-hidden="true"
            >
              {step.done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cx('text-[14px] font-semibold', step.done || step.current ? 'text-ink' : 'text-muted')}>
                {step.label}
                {step.current && <span className="sr-only"> — текущий этап</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span className="nums">{step.at}</span>
                {step.by && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{step.by}</span>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
