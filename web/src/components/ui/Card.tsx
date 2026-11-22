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
  id?: string;
}

/** Карточка кадра: белая, радиус 12, волосяная граница, без тени. */
export function Card({ children, padding = 'md', className, as = 'div', accent = null, interactive, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cx(
        'rounded-[12px] border border-line bg-surface',
        PADDING[padding],
        accent === 'warn' && 'accent-left-warn',
        accent === 'danger' && 'accent-left-danger',
        accent === 'info' && 'accent-left-info',
        accent === 'ok' && 'accent-left-ok',
        interactive && 'transition-colors duration-150 hover:bg-surface-hover',
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

/**
 * Строка над карточками: заголовок 14/600 слева, ссылка-действие справа.
 */
export function CardHeader({ title, count, action, icon, className, id }: CardHeaderProps) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 id={id} className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
        {icon && <span className="shrink-0 text-brand">{icon}</span>}
        <span className="truncate">{title}</span>
        {typeof count === 'number' && <span className="nums shrink-0 text-[12px] font-normal text-quiet">· {count}</span>}
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
  ghost: 'text-muted hover:bg-surface-hover hover:text-ink',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-hover',
  tonal: 'bg-surface-hover text-ink hover:bg-line',
};

export function IconButton({ label, children, variant = 'ghost', size = 'md', className, badge, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors duration-150',
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
          className="nums absolute top-1 right-1 grid min-w-[14px] place-items-center rounded-full bg-brand px-1 text-[10px] leading-[14px] font-semibold text-white"
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
