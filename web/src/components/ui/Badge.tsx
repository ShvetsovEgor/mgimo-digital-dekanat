import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'brand' | 'gold';

// Бейдж кадра — короткий факт: акцентная заливка либо нейтральная. Оттенков вне палитры нет.
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-hover text-muted',
  ok: 'bg-brand text-white',
  warn: 'bg-surface-hover text-muted',
  danger: 'bg-now text-white',
  info: 'bg-surface-hover text-muted',
  brand: 'bg-brand text-white',
  gold: 'bg-surface-hover text-muted',
};

// sm — бейдж кадра: высота 16, капитель 10/700, паддинг 0 6px.
const SIZES = {
  sm: 'h-4 text-[10px] leading-none font-semibold tracking-[0.02em] uppercase px-1.5 gap-1',
  md: 'h-[22px] text-[11px] font-semibold px-2 gap-1',
} as const;

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
}

/** Статус-бейдж: «Готово», «В работе», «Отклонена». */
export function Badge({ children, tone = 'neutral', size = 'sm', icon, dot, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center whitespace-nowrap rounded-full',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  as?: 'button' | 'span';
  'aria-pressed'?: boolean;
}

/** Чип-фильтр или малая метка (радиус 999). */
export function Chip({ children, selected = false, onClick, icon, className, as = 'button', ...rest }: ChipProps) {
  const cls = cx(
    'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150',
    selected ? 'border-brand text-brand' : 'border-line bg-surface text-muted hover:bg-surface-hover',
    className,
  );
  if (as === 'span') return <span className={cls}>{children}</span>;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={rest['aria-pressed'] ?? selected}>
      {icon}
      {children}
    </button>
  );
}

interface DotProps {
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}

export function Dot({ tone = 'ok', className, pulse }: DotProps) {
  const colors: Record<Tone, string> = {
    neutral: 'bg-quiet',
    ok: 'bg-brand',
    warn: 'bg-quiet',
    danger: 'bg-now',
    info: 'bg-quiet',
    brand: 'bg-brand',
    gold: 'bg-quiet',
  };
  return (
    <span className={cx('relative inline-flex size-2 shrink-0', className)} aria-hidden="true">
      {pulse && <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', colors[tone])} />}
      <span className={cx('relative inline-flex size-2 rounded-full', colors[tone])} />
    </span>
  );
}
