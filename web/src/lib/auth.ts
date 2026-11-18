// Аутентификация: вход/выход, обработка 401 (сброс кэша и переход на /login).

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler, api, type ApiError } from './http';
import { keys, resetUserCache, mockRouteOf, type SessionState } from './queries';
import { getTabSession, setTabSession } from './tab-session';
import type { UserRole } from './types';

export type { UserRole };

interface LoginResponse {
  student: { login: string; name: string; group: string };
  /** Токен этой вкладки: храним в sessionStorage, шлём заголовком X-Tab-Session. */
  tabToken: string;
}

/**
 * Новая вкладка наследует cookie, но не имеет своего токена. Просим сервер выдать отдельную
 * сессию вкладки: так «Выйти» в одной вкладке не завершает сессию в соседней.
 */
export function useEnsureTabSession(): void {
  useEffect(() => {
    if (getTabSession()) return;
    let cancelled = false;
    void (async () => {
      const authenticated = await window
        .fetch('/api/auth/me', { credentials: 'same-origin' })
        .then((r) => r.ok)
        .catch(() => false);
      if (!authenticated || cancelled) return;
      try {
        const result = await api.post<{ tabToken: string }>('/auth/tab');
        if (!cancelled && result?.tabToken) setTabSession(result.tabToken);
      } catch {
        /* останется cookie-сессия */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

/** Подключает глобальный обработчик 401 к роутеру и кэшу. Вызывается один раз в App. */
export function useUnauthorizedGuard(): void {
  const navigate = useNavigate();
  const client = useQueryClient();
  setUnauthorizedHandler(() => {
    resetUserCache(client);
    const here = `${window.location.pathname}${window.location.search}`;
    if (!here.startsWith('/login')) navigate('/login', { replace: true, state: { from: here, expired: true } });
  });
}

export interface LoginResult {
  role: UserRole;
}

/** Проверка роли запросом /staff/stats: 200 → сотрудник, 403 → студент. */
export async function fetchRole(signal?: AbortSignal): Promise<UserRole> {
  try {
    await api.get('/staff/stats', signal, { mockRoute: mockRouteOf('/staff/stats'), silent401: true });
    return 'staff';
  } catch (error) {
    if ((error as ApiError).status === 403) return 'student';
    throw error;
  }
}

/** Вход: ставит cookie на сервере; роль узнаём по доступности кабинета сотрудника. */
export function useLogin(): (login: string, password: string) => Promise<LoginResult> {
  const client = useQueryClient();
  return useCallback(
    async (login: string, password: string) => {
      client.clear();
      const response = await api.post<LoginResponse>(
        '/auth/login',
        { login, password },
        { mockRoute: mockRouteOf('/auth/login') },
      );
      // Своя сессия на вкладку: соседняя вкладка может быть под другим аккаунтом.
      setTabSession(response.tabToken ?? null);
      client.setQueryData(keys.me, { authenticated: true } satisfies SessionState);
      await client.invalidateQueries({ queryKey: keys.me, refetchType: 'none' });
      const role = await client.fetchQuery({
        queryKey: keys.role,
        staleTime: 0,
        queryFn: ({ signal }) => fetchRole(signal),
      });
      return { role };
    },
    [client],
  );
}

export function useLogout(): (options?: { allDevices?: boolean }) => Promise<void> {
  const client = useQueryClient();
  return useCallback(
    async (options) => {
      try {
        if (options?.allDevices) {
          await api.post('/me/logout-all', undefined, { mockRoute: mockRouteOf('/me/logout-all') });
        }
        await api.post('/auth/logout', undefined, { mockRoute: mockRouteOf('/auth/logout') });
        setTabSession(null);
      } catch {
        /* даже если сервер недоступен — локально выходим */
      }
      resetUserCache(client);
    },
    [client],
  );
}
