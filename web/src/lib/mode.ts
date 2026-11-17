// Режим работы: проверка мок-режима. По умолчанию — реальный API.

const MOCK_FLAG_KEY = 'deadline:mock';

/** Включён ли мок: VITE_USE_MOCK=1 при сборке/деве или ?mock=1 в адресе (запоминается). */
export function mockEnabled(): boolean {
  const envFlag = import.meta.env.VITE_USE_MOCK;
  if (envFlag === '1' || envFlag === 'true') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('mock');
    if (param === '1' || param === 'true') {
      sessionStorage.setItem(MOCK_FLAG_KEY, '1');
      return true;
    }
    if (param === '0' || param === 'false') {
      sessionStorage.removeItem(MOCK_FLAG_KEY);
      return false;
    }
    return sessionStorage.getItem(MOCK_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Сборка целиком «демонстрационная» (мок вшит при сборке). */
export const buildUsesMock = import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true';
