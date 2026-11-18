import { useEffect, useState } from 'react';
import { cx } from '@/lib/cx';

/**
 * Медленно меняющиеся фоны экрана входа: три кадра кампуса (сгенерированы ИИ для концепта),
 * кроссфейд раз в 9 секунд. При `prefers-reduced-motion` кадр не меняется.
 */
const SLIDES = ['/backdrops/campus-path.jpg', '/backdrops/campus-hall.jpg', '/backdrops/campus-yard.jpg'];
const INTERVAL_MS = 9000;

export function LoginBackdrop() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchPriority={i === 0 ? 'high' : 'low'}
          onError={() => setPaused(true)}
          className={cx(
            'absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out',
            i === index && !paused ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      {/* Мягкая вуаль: слева текст читается, справа фото остаётся заметным */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/80 to-bg/35 lg:from-bg/90 lg:via-bg/60 lg:to-bg/10" />
      <div className="absolute inset-0 bg-bg/50 lg:bg-transparent" />
      {/* Тёмная тема: кадр приглушается, чтобы карточка оставалась главным объектом */}
      <div className="absolute inset-0 hidden bg-bg/55 dark:block" />
    </div>
  );
}
