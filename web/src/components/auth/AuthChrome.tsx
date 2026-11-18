import { useEffect, useRef, useState } from 'react';
import { Check, Globe, Moon, Sun } from 'lucide-react';
import { cx } from '@/lib/cx';
import { getStoredTheme, setStoredTheme, type ThemeMode } from '@/lib/theme';

const OUTLINE =
  'inline-flex cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface/70 text-ink transition-colors hover:bg-surface-hover';

/** Компактная кнопка темы 36×36 (зона нажатия 44×44): светлая ↔ тёмная. */
export function CompactThemeButton() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  const dark =
    mode === 'dark' ||
    (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      type="button"
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={() => {
        const next: ThemeMode = dark ? 'light' : 'dark';
        setMode(next);
        setStoredTheme(next);
      }}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[12px] transition-colors hover:bg-surface-hover"
    >
      <span className={cx(OUTLINE, 'size-9')} aria-hidden="true">
        {dark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
      </span>
    </button>
  );
}

/** Компактная кнопка языка: глобус + RU, меню с пометкой «скоро» у английского. */
export function CompactLanguageButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Язык интерфейса: русский"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 cursor-pointer place-items-center rounded-[12px] px-0.5 transition-colors hover:bg-surface-hover"
      >
        <span className={cx(OUTLINE, 'h-9 gap-1.5 px-2.5 text-[13px] font-medium')} aria-hidden="true">
          <Globe className="size-4 text-muted" strokeWidth={1.75} />
          RU
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Язык интерфейса"
          className="animate-fade absolute right-0 z-50 mt-1 w-44 rounded-[12px] border border-line bg-surface p-1"
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-sm text-ink hover:bg-surface-hover"
          >
            Русский
            <Check className="size-4 text-brand" aria-hidden="true" />
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={false}
            disabled
            className="flex min-h-10 w-full cursor-not-allowed items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-sm text-quiet"
          >
            English
            <span className="text-[11px]">скоро</span>
          </button>
        </div>
      )}
    </div>
  );
}
