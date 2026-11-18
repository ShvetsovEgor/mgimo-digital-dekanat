import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'tonal' | 'ghost' | 'danger' | 'gold' | 'outline';
type Size = 'sm' | 'md' | 'lg';

// По документации кнопки остаются только для форм: primary — заливка акцента,
// вторичная — белая с границей, опасная — «сейчас» #B71E20. tonal/ghost — текстовые действия.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-fill text-brand-on hover:bg-brand-strong active:bg-brand-strong',
  tonal: 'bg-surface-hover text-ink hover:bg-line active:bg-line',
  ghost: 'bg-transparent text-muted hover:bg-surface-hover hover:text-ink active:bg-line',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-hover active:bg-line',
  danger: 'bg-now text-white hover:bg-[#a11a1c] active:bg-[#8f1719]',
  gold: 'bg-ink text-white hover:bg-[#2b2933] active:bg-[#121116]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 min-h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 min-h-11 px-4 text-sm gap-2',
  lg: 'h-12 min-h-12 px-5 text-sm gap-2',
};

const BASE =
  'inline-flex cursor-pointer no-underline select-none items-center justify-center rounded-[10px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  as?: 'button';
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

interface ButtonLinkProps extends CommonProps {
  to: string;
  state?: unknown;
  'aria-label'?: string;
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  fullWidth,
  iconLeft,
  iconRight,
  className,
  children,
  state,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      state={state}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}

interface AnchorButtonProps {
  href: string;
  download?: boolean;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** Кнопка-ссылка на файл (PDF, .ics). */
export function AnchorButton({
  href,
  download,
  variant = 'primary',
  size = 'md',
  fullWidth,
  iconLeft,
  iconRight,
  className,
  children,
  onClick,
}: AnchorButtonProps) {
  return (
    <a
      href={href}
      download={download}
      onClick={onClick}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
    >
      {iconLeft}
      {children}
      {iconRight}
    </a>
  );
}
