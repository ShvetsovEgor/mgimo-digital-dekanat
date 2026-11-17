import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'brand' | 'gold';

const TONES: Record<Tone, string> = {
  neutral: 'bg-line/55 text-ink/75 ring-line-strong/50',
  ok: 'bg-ok-soft text-ok-ink ring-ok/25',
  warn: 'bg-warn-soft text-warn-ink ring-warn/25',
  danger: 'bg-danger-soft text-danger-ink ring-danger/25',
  info: 'bg-info-soft text-info-ink ring-info/25',
  brand: 'bg-brand-soft text-brand-ink ring-brand/25',
  gold: 'bg-gold-soft text-gold-ink ring-gold/35',
};

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
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
export function Badge({ children, tone = 'neutral', size = 'md', icon, dot, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset',
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
    'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
    selected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
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
    neutral: 'bg-muted',
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    info: 'bg-info',
    brand: 'bg-brand',
    gold: 'bg-gold',
  };
  return (
    <span className={cx('relative inline-flex size-2 shrink-0', className)} aria-hidden="true">
      {pulse && <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', colors[tone])} />}
      <span className={cx('relative inline-flex size-2 rounded-full', colors[tone])} />
    </span>
  );
}
