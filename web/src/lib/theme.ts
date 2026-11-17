// Тема: светлая / тёмная / системная. Значение хранится в localStorage,
// применяется атрибутом data-theme на <html> (скрипт в index.html ставит его до первой отрисовки).

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'deadline:theme';
const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (MODES as readonly string[]).includes(raw)) return raw as ThemeMode;
  } catch {
    /* приватный режим браузера */
  }
  return 'system';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolved;
  updateThemeMeta(resolved);
}

/** Цвет адресной строки мобильного браузера под выбранную тему. */
export function updateThemeMeta(resolved: 'light' | 'dark'): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = resolved === 'dark' ? '#0B1120' : '#F6F5F1';
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* игнорируем */
  }
  applyTheme(mode);
}

/** Подписка на смену системной темы — для режима «системная». */
export function listenSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!media) return () => undefined;
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
