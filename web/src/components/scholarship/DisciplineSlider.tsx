import { useId } from 'react';
import { cx } from '@/lib/cx';
import type { ScholarshipDiscipline } from '@/lib/types';

/**
 * Дисциплина с ползунком 0…100 и полем числа: оба меняют черновик локально.
 * Подпись связана с ползунком и полем, значение озвучивается скринридером.
 */
export function DisciplineSlider({
  discipline,
  value,
  onChange,
}: {
  discipline: ScholarshipDiscipline;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const clamp = (next: number) => Math.min(100, Math.max(0, Math.round(Number.isFinite(next) ? next : 0)));

  return (
    <li className="rounded-[12px] border border-line bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label id={labelId} htmlFor={`${id}-range`} className="min-w-0 text-sm font-medium text-ink">
          {discipline.title}
        </label>
        <span className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            aria-label={`${discipline.title}: балл, 0–100`}
            value={value}
            onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
            className="nums h-11 w-16 rounded-[10px] border border-line bg-surface px-2 text-right text-sm text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          />
          <span className="text-[12px] text-quiet">из 100</span>
        </span>
      </div>
      <input
        id={`${id}-range`}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-labelledby={labelId}
        aria-valuetext={`${value} из 100`}
        onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
        className="mt-2 h-11 w-full cursor-pointer accent-[var(--color-brand)]"
      />
      <div className={cx('flex justify-between text-[11px] text-quiet')} aria-hidden="true">
        <span>0</span>
        <span>70 — академическая</span>
        <span>90 — повышенная</span>
      </div>
    </li>
  );
}
