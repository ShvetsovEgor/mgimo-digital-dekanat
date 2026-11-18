import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface ProgressProps {
  value: number;
  max?: number;
  threshold?: number | null;
  tone?: 'brand' | 'ok' | 'warn' | 'danger';
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

const TONES = {
  brand: 'bg-brand',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

/** Полоса прогресса с маркером порога (например, 70% для «автомата»). */
export function Progress({ value, max = 100, threshold, tone = 'brand', label, size = 'md', className }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const thresholdPercent = threshold && threshold > 0 ? Math.max(0, Math.min(100, (threshold / safeMax) * 100)) : null;
  return (
    <div
      className={cx('relative w-full overflow-visible rounded-full bg-grid', size === 'md' ? 'h-1.5' : 'h-1', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500 ease-out', TONES[tone])}
        style={{ width: `${percent}%` }}
      />
      {thresholdPercent !== null && (
        <span
          className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-ink"
          style={{ left: `calc(${thresholdPercent}% - 1px)` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

interface RingProgressProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label: string;
  center: ReactNode;
  tone?: 'brand' | 'ok' | 'warn' | 'danger';
  className?: string;
}

const RING_COLORS = {
  brand: 'stroke-brand',
  ok: 'stroke-ok',
  warn: 'stroke-warn',
  danger: 'stroke-danger',
};

/** Кольцевой индикатор рейтинга. */
export function RingProgress({ value, max = 100, size = 120, stroke = 10, label, center, tone = 'brand', className }: RingProgressProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div
      className={cx('relative inline-grid shrink-0 place-items-center', className)}
      role="img"
      aria-label={`${label}: ${Math.round(value)} из ${max}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-grid" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
          className={cx('transition-[stroke-dashoffset] duration-700 ease-out', RING_COLORS[tone])}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cx('skeleton', className)} aria-hidden="true" />
      ))}
    </>
  );
}

/** Каркас загрузки карточки: заголовок + строки. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        {Array.from({ length: Math.max(0, lines - 1) }, (_, index) => (
          <Skeleton key={index} className={index % 2 === 0 ? 'h-3.5 w-11/12' : 'h-3.5 w-2/3'} />
        ))}
      </div>
    </div>
  );
}
