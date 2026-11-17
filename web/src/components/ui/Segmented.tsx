import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  badge?: number;
}

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/** Двух–трёхпозиционный переключатель с ролью tablist (стрелки клавиатуры). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = true,
  className,
}: SegmentedProps<T>) {
  const id = useId();
  const index = options.findIndex((option) => option.value === value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    document.getElementById(`${id}-${next.value}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        'inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1',
        fullWidth && 'w-full',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-150',
              size === 'md' ? 'min-h-9 px-3 text-sm' : 'min-h-8 px-2.5 text-[13px]',
              selected ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
            {typeof option.badge === 'number' && option.badge > 0 && (
              <span
                className={cx(
                  'nums rounded-full px-1.5 text-[11px] font-bold',
                  selected ? 'bg-brand text-white' : 'bg-line text-muted',
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabsProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Горизонтальные вкладки-подчёркивания (для разделов страницы). */
export function Tabs<T extends string>({ options, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx('no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              'relative shrink-0 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150',
              selected ? 'text-brand-ink' : 'text-muted hover:text-ink',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {option.label}
              {typeof option.badge === 'number' && option.badge > 0 && (
                <span className="nums rounded-full bg-line/70 px-1.5 text-[11px] font-bold text-muted">{option.badge}</span>
              )}
            </span>
            {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
