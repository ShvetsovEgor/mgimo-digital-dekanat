// «Холодный старт»: снимки экранов на момент, когда демо-данные были свежими.
// На бесплатном хостинге сервис засыпает и БД пересобирается — лента «Сегодня» тогда пустая.
// Здесь жюри видит, как кабинет выглядел сразу после создания демо-данных, и понимает,
// почему конкретные даты на снимке отличаются от сегодняшних.
import { useState } from 'react';
import { Image as ImageIcon, X, History, ChevronRight } from 'lucide-react';
import type { SeedContext as SeedContextData } from '@/lib/types';
import { Sheet } from '@/components/ui/Sheet';
import { cx } from '@/lib/cx';

function minutesAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

export function SeedContextCard({ context, dataAsOf }: { context: SeedContextData | null; dataAsOf: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!context || context.screens.length === 0) return null;
  const shots = context.screens.filter((s) => !s.name.startsWith('desktop'));
  const Order = ['today', 'schedule', 'progress', 'requests', 'notifications', 'profile', 'staff', 'login'];
  const screens = [...shots].sort((a, b) => Order.indexOf(a.name) - Order.indexOf(b.name));
  const initial = screens.find((s) => s.name === 'today') ?? screens[0];
  const current = screens.find((s) => s.name === open) ?? initial;

  return (
    <section
      aria-labelledby="seed-context-title"
      className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]"
    >
      <h2 id="seed-context-title" className="flex items-center gap-2 text-sm font-bold text-ink">
        <History className="size-4 text-brand" aria-hidden="true" />
        Как кабинет выглядел при старте
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        Демо-сервис засыпает без посетителей, а его база пересобирается. Чтобы вам было сразу видно, что умеет
        кабинет, сохранили снимки экранов<time className="sr-only" dateTime={context.capturedAt}> </time>
        {dataAsOf ? ` (данные от ${minutesAgo(dataAsOf)}; обновляются автоматически).` : '.'}
      </p>
      <button
        type="button"
        onClick={() => setOpen(initial?.name ?? null)}
        className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line bg-bg"
        aria-label={`Открыть снимки экранов: ${screens.map((s) => s.title).join(', ')}`}
      >
        {initial && (
          <img
            src={`/api/seed-context/${initial.name}.png`}
            alt={`Снимок экрана «${initial.title}» на момент создания демо-данных`}
            loading="lazy"
            className="max-h-[200px] w-full object-cover object-top"
          />
        )}
        <span className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 text-[12.5px] font-semibold text-brand-ink">
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="size-4" aria-hidden="true" />Смотреть {screens.length} экранов
          </span>
          <span className="hidden text-muted sm:inline">{screens.map((s) => s.title.split(' ')[0]).slice(0, 4).join(' · ')}…</span>
          <ChevronRight className="size-4 text-muted" aria-hidden="true" />
        </span>
      </button>

      <Sheet open={open !== null} onClose={() => setOpen(null)} title="Кабинет при старте">
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Экраны кабинета">
          {screens.map((screen) => (
            <button
              key={screen.name}
              type="button"
              role="tab"
              aria-selected={current?.name === screen.name}
              onClick={() => setOpen(screen.name)}
              className={cx(
                'min-h-[40px] shrink-0 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
                current?.name === screen.name
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-bg text-ink hover:border-brand/40',
              )}
            >
              {screen.title}
            </button>
          ))}
        </div>
        <div className="max-h-[62dvh] overflow-y-auto rounded-xl border border-line">
          {current && (
            <img
              src={`/api/seed-context/${current.name}.png`}
              alt={`Снимок экрана «${current.title}»`}
              className="w-full"
            />
          )}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-muted">
          <X className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Кнопки на снимке неактивны — откройте этот экран после входа. Закрыть — клавиша Esc.
        </p>
      </Sheet>
    </section>
  );
}
