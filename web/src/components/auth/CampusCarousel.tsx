import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/cx';
import { CAMPUS_POSTS, type CampusPost } from './campus-posts';

const AUTOPLAY_MS = 7000;

/**
 * Карусель постов «канала кампуса»: одна компактная карточка-виджет,
 * автопереключение раз в 7 с (не совпадает с 9-секундным фоном), пауза при наведении
 * и при нажатии на реакции. Высота карточки фиксирована, меняется только содержимое.
 */
export function CampusCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reacted, setReacted] = useState<Record<string, number[]>>({});
  const timer = useRef<number | null>(null);
  const total = CAMPUS_POSTS.length;
  const post = CAMPUS_POSTS[index] ?? CAMPUS_POSTS[0]!;

  const go = useCallback(
    (delta: number) => {
      setIndex((value) => (value + delta + total) % total);
      setPaused(true);
      window.setTimeout(() => setPaused(false), AUTOPLAY_MS);
    },
    [total],
  );

  useEffect(() => {
    if (paused) return;
    timer.current = window.setTimeout(() => setIndex((value) => (value + 1) % total), AUTOPLAY_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [paused, index, total]);

  const toggleReaction = (postId: string, reactionIndex: number) => {
    setPaused(true);
    window.setTimeout(() => setPaused(false), AUTOPLAY_MS);
    setReacted((prev) => {
      const current = prev[postId] ?? [];
      const next = current.includes(reactionIndex)
        ? current.filter((item) => item !== reactionIndex)
        : [...current, reactionIndex];
      return { ...prev, [postId]: next };
    });
  };

  return (
    <section
      aria-roledescription="карусель"
      aria-label="Канал кампуса: новости студенческой жизни"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cx(
        'relative w-full overflow-hidden rounded-[22px] border border-line bg-surface/95 p-4 shadow-[0_18px_40px_-24px_rgba(28,27,35,0.45)] backdrop-blur-md sm:p-5',
        className,
      )}
    >
      {/* тонкий прогресс сверху, как в сторис */}
      <div className="mb-3 flex gap-1" aria-hidden="true">
        {CAMPUS_POSTS.map((item, i) => (
          <span
            key={item.id}
            className={cx('h-0.5 flex-1 rounded-full transition-colors duration-300', i === index ? 'bg-brand' : 'bg-line')}
          />
        ))}
      </div>

      <article key={post.id} className="animate-post">
        <header className="flex items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-sidebar text-[11px] font-semibold text-ink"
            aria-hidden="true"
          >
            {post.channel
              .split(' ')
              .slice(0, 2)
              .map((word) => word.charAt(0))
              .join('')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">{post.channel}</span>
            <span className="block truncate text-[11px] text-quiet">
              {post.handle} · {post.time}
            </span>
          </span>
          <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line px-2 text-[11px] font-medium text-brand">
            {post.hashtag}
          </span>
        </header>

        <div className="mt-3 h-[210px] overflow-hidden rounded-[12px]">
          <img src={post.cover} alt={post.coverAlt} loading="lazy" className="size-full object-cover" />
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-[2.6em] text-[15px] leading-[1.3] font-semibold text-ink">{post.title}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[12.5px] leading-[1.35] text-muted">{post.text}</p>

        <footer className="mt-3 flex items-center justify-between gap-2">
          <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
            {post.reactions.map((reaction, i) => {
              const active = (reacted[post.id] ?? []).includes(i);
              return (
                <li key={reaction.label}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`${reaction.label}: ${reaction.count + (active ? 1 : 0)}`}
                    onClick={() => toggleReaction(post.id, i)}
                    className={cx(
                      'inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[12px] transition-colors',
                      active
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-surface text-ink hover:bg-surface-hover',
                    )}
                  >
                    <span aria-hidden="true">{reaction.emoji}</span>
                    <span className="nums">{reaction.count + (active ? 1 : 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="Предыдущий пост"
              onClick={() => go(-1)}
              className="grid size-8 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Следующий пост"
              onClick={() => go(1)}
              className="grid size-8 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </footer>
      </article>

      <span className="sr-only" aria-live="polite">
        Пост {index + 1} из {total}: {post.title}
      </span>
    </section>
  );
}

export type { CampusPost };
