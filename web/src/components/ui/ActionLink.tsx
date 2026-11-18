import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

const BASE =
  'inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-medium text-brand no-underline transition-colors hover:text-brand-strong hover:underline hover:underline-offset-2';

/**
 * Ссылка-действие кадра: акцент, 14/500, без подчёркивания, подчёркивание только по наведению.
 * Стрелка: назад — слева, вглубь и внешние переходы — справа.
 */
export function ActionLink({
  to,
  children,
  back,
  external,
  className,
  onClick,
}: {
  to: string;
  children: ReactNode;
  back?: boolean;
  external?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={cx(BASE, className)}>
        {children}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link to={to} className={cx(BASE, className)} onClick={onClick}>
      {back && <ArrowLeft className="size-4" aria-hidden="true" />}
      {children}
      {!back && <ArrowRight className="size-4" aria-hidden="true" />}
    </Link>
  );
}

/** Текстовая кнопка действия (без ссылки): «Показать все», «Прочитать всё». */
export function ActionButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(BASE, 'disabled:opacity-60', className)}>
      {children}
    </button>
  );
}
