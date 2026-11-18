import { Sparkles } from 'lucide-react';
import type { NewsItem } from '@/lib/types';
import { cx } from '@/lib/cx';

/**
 * Новости деканата на экране входа — маленькие баннеры в духе постов соцсетей:
 * автор, категория и время сверху, заголовок и две строки текста ниже.
 * Источник — публичные объявления из /api/meta (без персональных данных).
 */
export function NewsFeed({ news, limit = 4, compact }: { news: NewsItem[]; limit?: number; compact?: boolean }) {
  const items = news.slice(0, limit);
  if (items.length === 0) return null;
  return (
    <section aria-label="Новости деканата" className="w-full">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        Студенческая жизнь
      </p>
      <ul className={cx('space-y-2.5', compact && 'space-y-2')}>
        {items.map((item) => (
          <li key={item.id}>
            <article
              className={cx(
                'rounded-[18px] border border-line bg-surface/90 backdrop-blur-md',
                compact ? 'px-3.5 py-3' : 'px-4 py-3.5',
              )}
            >
              <header className="flex items-center gap-2">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-sidebar text-[10px] font-semibold text-ink"
                  aria-hidden="true"
                >
                  {item.scope.startsWith('Деканат') ? 'ДК' : 'ВС'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink">
                    {item.scope.startsWith('Деканат') ? item.scope : 'Деканат · все факультеты'}
                  </span>
                  <span className="block text-[11px] text-quiet">
                    {item.categoryLabel} · {item.relative}
                  </span>
                </span>
              </header>
              <p className={cx('mt-1.5 text-[13px] leading-snug font-semibold text-ink', compact ? 'line-clamp-2' : 'line-clamp-2')}>
                {item.title}
              </p>
              <p className={cx('mt-0.5 text-[12px] leading-snug text-muted', compact ? 'line-clamp-2' : 'line-clamp-3')}>
                {item.body}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
