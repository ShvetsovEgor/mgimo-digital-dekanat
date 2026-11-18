import { useEffect, useState } from 'react';
import { cx } from '@/lib/cx';

/**
 * Медленно меняющиеся фоны экрана входа: три кадра кампуса (сгенерированы ИИ для концепта),
 * кроссфейд раз в 9 секунд. При `prefers-reduced-motion` кадр не меняется.
 */
// Первым — кадр без вывесок, чтобы первый экран не читался как «чужой вуз»
const SLIDES = ['/backdrops/campus-yard.jpg', '/backdrops/campus-hall.jpg', '/backdrops/campus-path.jpg'];
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
      {/* Лёгкая вуаль только у левого края — фото остаётся почти в полную силу */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/20 to-transparent" />
      <div className="absolute inset-0 bg-bg/30 lg:hidden" />
      {/* Тёмная тема: кадр чуть приглушается, но остаётся читаемым фоном */}
      <div className="absolute inset-0 hidden bg-bg/30 dark:block" />
    </div>
  );
}
