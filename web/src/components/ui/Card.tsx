import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

interface CardProps {
  children: ReactNode;
  padding?: CardPadding;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
  accent?: 'warn' | 'danger' | 'info' | 'ok' | null;
  interactive?: boolean;
  'aria-label'?: string;
}

export function Card({ children, padding = 'md', className, as = 'div', accent = null, interactive, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cx(
        'rounded-[16px] border border-line bg-surface shadow-soft',
        PADDING[padding],
        accent === 'warn' && 'accent-left-warn',
        accent === 'danger' && 'accent-left-danger',
        accent === 'info' && 'accent-left-info',
        accent === 'ok' && 'accent-left-ok',
        interactive && 'transition-shadow duration-150 hover:shadow-lift',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  count?: number;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  id?: string;
}

export function CardHeader({ title, count, action, icon, className, id }: CardHeaderProps) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 id={id} className="flex items-center gap-2 text-[16px] font-bold text-ink">
        {icon && <span className="text-brand-ink">{icon}</span>}
        {title}
        {typeof count === 'number' && (
          <span className="nums rounded-full bg-line/60 px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'outline' | 'tonal';
  size?: 'sm' | 'md';
  badge?: number;
}

const ICON_VARIANTS = {
  ghost: 'text-muted hover:bg-line/50 hover:text-ink',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
  tonal: 'bg-brand-soft text-brand-ink hover:brightness-95',
};

export function IconButton({ label, children, variant = 'ghost', size = 'md', className, badge, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors duration-150',
        size === 'md' ? 'size-11' : 'size-9',
        ICON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          aria-hidden="true"
          className="nums absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white"
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
