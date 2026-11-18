import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/cx';

interface AccordionItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'neutral' | 'warn' | 'danger' | 'ok';
}

/** Пункт аккордеона: заголовок-кнопка 56 px+, содержимое с анимацией раскрытия. */
export function AccordionItem({ title, subtitle, meta, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cx('overflow-hidden rounded-[12px] border border-line bg-surface transition-colors duration-150')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-button`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{title}</div>
          {subtitle && <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div>}
        </div>
        {meta && <div className="shrink-0 text-right">{meta}</div>}
        <ChevronDown
          className={cx('size-4 shrink-0 text-quiet transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        hidden={!open}
        className="border-t border-line px-4 py-4"
      >
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-4">
      {back && <div className="mb-2">{back}</div>}
      {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-quiet uppercase">{eyebrow}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-[62ch] text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

interface AvatarProps {
  initials: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Аватар кадра: инициалы на колонке #F3F1F4, 40 px в профиле и 32 px в шапке.
const AVATAR_SIZES = { sm: 'size-8 text-[11px]', md: 'size-10 text-[13px]', lg: 'size-12 text-sm' } as const;

export function Avatar({ initials, name, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center rounded-full border border-line bg-sidebar font-semibold text-ink',
        AVATAR_SIZES[size],
        className,
      )}
      role={name ? 'img' : undefined}
      aria-label={name ? `Аватар: ${name}` : undefined}
      aria-hidden={name ? undefined : true}
    >
      {initials}
    </span>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionTitle({ children, action, className }: SectionTitleProps) {
  return (
    <div className={cx('mb-2 flex items-baseline justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'brand';
}

const STAT_TONES = {
  neutral: 'text-ink',
  ok: 'text-ink',
  warn: 'text-ink',
  danger: 'text-danger',
  brand: 'text-brand',
};

export function Stat({ label, value, hint, tone = 'neutral' }: StatProps) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-quiet">{label}</p>
      <p className={cx('display-num mt-0.5 text-xl leading-tight', STAT_TONES[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

interface DefinitionListProps {
  items: ReadonlyArray<{ label: string; value: ReactNode }>;
  className?: string;
  columns?: 1 | 2;
}

export function DefinitionList({ items, className, columns = 1 }: DefinitionListProps) {
  return (
    <dl className={cx('grid gap-x-6 gap-y-3', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-quiet">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
