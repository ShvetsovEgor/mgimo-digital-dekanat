import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Card';
import { cx } from '@/lib/cx';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom-sheet на мобильном, центрированный диалог на десктопе.
 * Focus-trap, Esc, aria-modal, возврат фокуса, блокировка скролла фона.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusable?.[0] ?? panel;
    window.setTimeout(() => first?.focus(), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (!firstItem || !lastItem) return;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="animate-overlay absolute inset-0 bg-[#1c1b23]/45 dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'animate-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface sm:rounded-[12px]',
          size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 pt-4 pb-3 sm:px-5">
          <div className="min-w-0">
            <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-[13px] text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Закрыть" onClick={onClose} variant="ghost" size="sm">
            <X className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-surface px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  );
}
