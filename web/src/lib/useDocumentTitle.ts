import { useEffect } from 'react';

/** Заголовок вкладки: «Сегодня — Дедлайн» (для скринридеров и истории браузера). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
