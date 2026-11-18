// Сессия вкладки: свой токен на каждую вкладку, чтобы два аккаунта не конфликтовали.
// Основной носитель на сервере — HttpOnly cookie; заголовок нужен только для мультивкладочности.
const KEY = 'dl.tab-session';

export function getTabSession(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setTabSession(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(KEY, token);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* приватный режим: останется cookie */
  }
}

/**
 * Скачивание файла с сессией вкладки: обычная ссылка отправила бы cookie другого аккаунта,
 * поэтому качаем через fetch с заголовком и отдаём пользователю blob.
 */
export async function downloadWithSession(url: string, fallbackName: string): Promise<void> {
  const token = getTabSession();
  const response = await fetch(url, { credentials: 'same-origin', headers: token ? { 'X-Tab-Session': token } : {} });
  if (!response.ok) throw new Error(`Не удалось скачать файл (${response.status})`);
  const disposition = response.headers.get('content-disposition') ?? '';
  const utfName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plainName = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  const name = utfName ? decodeURIComponent(utfName) : (plainName ?? fallbackName);
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
}
