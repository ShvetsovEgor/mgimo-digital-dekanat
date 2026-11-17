import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from '@/lib/cx';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-ok" aria-hidden="true" />,
  error: <AlertTriangle className="size-5 text-danger" aria-hidden="true" />,
  info: <Info className="size-5 text-info" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      counter.current += 1;
      const id = counter.current;
      setItems((prev) => [...prev.slice(-2), { id, tone, message }]);
      const timer = window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4200);
      timers.current.push(timer);
    },
    [dismiss],
  );

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message: string) => show(message, 'success'),
      error: (message: string) => show(message, 'error'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:pr-6"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px) + 72px)' }}
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border bg-surface px-3.5 py-3 shadow-lift sm:w-auto sm:min-w-[280px]',
              item.tone === 'error' ? 'border-danger/40' : item.tone === 'success' ? 'border-ok/35' : 'border-line',
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[item.tone]}</span>
            <p className="flex-1 text-sm font-medium text-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Закрыть уведомление"
              className="-mt-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-line/50"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast требует ToastProvider');
  return ctx;
}
