import { useEffect, useRef, useState } from 'react';
import { Check, Languages, Moon, Monitor, Sun } from 'lucide-react';
import { cx } from '@/lib/cx';
import { getStoredTheme, listenSystemTheme, setStoredTheme, type ThemeMode } from '@/lib/theme';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Как в системе', icon: Monitor },
];

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

/** Язык интерфейса: русский выбран. Английский помечен «скоро» — перевода в прототипе нет. */
export function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-ink hover:bg-surface-hover"
      >
        <Languages className="size-[18px] text-quiet" strokeWidth={1.75} aria-hidden="true" />
        RU
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Язык интерфейса"
          className="animate-fade absolute right-0 z-50 mt-1 w-48 rounded-[12px] border border-line bg-surface p-1"
        >
          {LANGUAGES.map((language) => {
            const active = language.code === 'ru';
            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                disabled={!active}
                onClick={() => setOpen(false)}
                className={cx(
                  'flex min-h-10 w-full items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-sm',
                  active ? 'text-ink hover:bg-surface-hover' : 'cursor-not-allowed text-quiet',
                )}
              >
                {language.label}
                {active ? (
                  <Check className="size-4 text-brand" aria-hidden="true" />
                ) : (
                  <span className="text-[11px]">скоро</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Переключатель темы в шапке: иконка солнца/луны и меню из трёх вариантов. */
export function ThemeMenu() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => listenSystemTheme(() => setStoredTheme(getStoredTheme())), []);

  const current = THEMES.find((theme) => theme.value === mode) ?? THEMES[2]!;
  const CurrentIcon = current.value === 'dark' ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Тема интерфейса: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 cursor-pointer place-items-center rounded-[10px] text-ink hover:bg-surface-hover"
      >
        <CurrentIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Тема интерфейса"
          className="animate-fade absolute right-0 z-50 mt-1 w-52 rounded-[12px] border border-line bg-surface p-1"
        >
          {THEMES.map((theme) => {
            const Icon = theme.icon;
            const active = theme.value === mode;
            return (
              <button
                key={theme.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(theme.value);
                  setStoredTheme(theme.value);
                  setOpen(false);
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-sm text-ink hover:bg-surface-hover"
              >
                <Icon className="size-4 text-quiet" strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1">{theme.label}</span>
                {active && <Check className="size-4 text-brand" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
