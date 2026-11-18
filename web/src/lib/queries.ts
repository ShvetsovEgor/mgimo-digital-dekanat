// Хуки данных (TanStack Query): ключи, useRole, useUnread и мутации с тостами.

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { mockEnabled } from './mode';
import { fetchRole } from './auth';
import { api } from './http';
import type {
  Announcement,
  DeadlineItem,
  Meta,
  Notification,
  Order,
  ProfileBundle,
  ProgressBundle,
  RequestType,
  QuestionMessage,
  ScholarshipBundle,
  ScheduleToday,
  ScheduleWeek,
  StaffMessage,
  StaffOrder,
  StaffStats,
  UserRole,
  VerifyResult,
} from './types';

/** Путь API → маршрут мока (без префикса /api и query). */
export function mockRouteOf(path: string): string | undefined {
  if (!mockEnabled()) return undefined;
  return path.split('?')[0]?.replace(/^\//, '');
}

function apiGet<T>(path: string, signal?: AbortSignal, silent401 = false): Promise<T> {
  return api.get<T>(path, signal, { mockRoute: mockRouteOf(path), silent401 });
}

export const keys = {
  meta: ['meta'] as const,
  me: ['me'] as const,
  identity: ['identity'] as const,
  role: ['role'] as const,
  profile: ['profile'] as const,
  scholarship: ['scholarship'] as const,
  today: ['schedule', 'today'] as const,
  week: (offset: string) => ['schedule', 'week', offset] as const,
  progress: ['progress'] as const,
  deadlines: ['deadlines'] as const,
  requests: ['requests'] as const,
  request: (id: number) => ['requests', 'item', id] as const,
  requestTypes: ['request-types'] as const,
  notifications: ['notifications'] as const,
  announcements: ['announcements'] as const,
  messages: ['messages'] as const,
  staffStats: ['staff', 'stats'] as const,
  staffRequests: ['staff', 'requests'] as const,
  staffMessages: ['staff', 'messages'] as const,
  verify: (token: string) => ['verify', token] as const,
};

export function useMeta(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.meta,
    queryFn: ({ signal }) => apiGet<Meta>('/meta', signal, true),
    staleTime: 10 * 60_000,
    retry: 1,
    enabled: options.enabled ?? true,
  });
}

export interface SessionState {
  authenticated: boolean;
}

/** Сессия: /auth/me. Ошибка 401 — штатный ответ, не ошибка запроса. */
export function useSession() {
  return useQuery({
    queryKey: keys.me,
    // Отправная точка сессии проверяется всегда заново; дальше состояние держит кэш.
    staleTime: 0,
    queryFn: async ({ signal }): Promise<SessionState> => {
      try {
        await apiGet('/auth/me', signal, true);
        return { authenticated: true };
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 401) return { authenticated: false };
        throw error;
      }
    },
    retry: false,
    meta: { silent: true },
  });
}

/** Роль пользователя: успешный /staff/stats → сотрудник. Проверяется один раз за сессию. */
export function useRole(): { role: UserRole | 'unknown'; isStaff: boolean; isLoading: boolean } {
  const session = useSession();
  const query = useQuery({
    queryKey: keys.role,
    queryFn: ({ signal }) => fetchRole(signal),
    enabled: session.data?.authenticated === true,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { silent: true },
  });
  const role: UserRole | 'unknown' = session.data?.authenticated ? (query.data ?? 'unknown') : 'unknown';
  return { role, isStaff: role === 'staff', isLoading: session.isLoading || (session.data?.authenticated === true && query.isLoading) };
}

export function useProfile(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.profile,
    queryFn: ({ signal }) => apiGet<ProfileBundle>('/me/profile', signal),
    enabled: options.enabled ?? true,
  });
}

export function useScholarship() {
  return useQuery({
    queryKey: keys.scholarship,
    queryFn: ({ signal }) => apiGet<ScholarshipBundle>('/me/scholarship', signal),
    staleTime: 60_000,
  });
}

export function useToday() {
  return useQuery({
    queryKey: keys.today,
    queryFn: ({ signal }) => apiGet<ScheduleToday>('/schedule/today', signal),
    staleTime: 60_000,
  });
}

/** Неделя расписания по смещению от текущей: 0 — эта неделя, −1 — прошлая. */
export function useWeek(offset = 0) {
  const suffix = offset === 0 ? '' : `?week=${offset}`;
  return useQuery({
    queryKey: keys.week(String(offset)),
    queryFn: ({ signal }) => apiGet<ScheduleWeek>(`/schedule/week${suffix}`, signal),
    staleTime: 5 * 60_000,
  });
}

export function useProgress() {
  return useQuery({
    queryKey: keys.progress,
    queryFn: ({ signal }) => apiGet<ProgressBundle>('/progress', signal),
    staleTime: 5 * 60_000,
  });
}

export function useDeadlines() {
  return useQuery({
    queryKey: keys.deadlines,
    queryFn: ({ signal }) => apiGet<DeadlineItem[]>('/deadlines', signal),
  });
}

export function useRequests() {
  return useQuery({
    queryKey: keys.requests,
    queryFn: ({ signal }) => apiGet<Order[]>('/requests', signal),
  });
}

export function useRequest(id: number) {
  return useQuery({
    queryKey: keys.request(id),
    queryFn: ({ signal }) => apiGet<Order>(`/requests/${id}`, signal),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useRequestTypes() {
  return useQuery({
    queryKey: keys.requestTypes,
    queryFn: ({ signal }) => apiGet<RequestType[]>('/requests/types', signal),
    staleTime: Infinity,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: ({ signal }) => apiGet<Notification[]>('/notifications', signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return useMemo(() => (data ?? []).filter((item) => !item.read).length, [data]);
}

export function useAnnouncements() {
  return useQuery({
    queryKey: keys.announcements,
    queryFn: ({ signal }) => apiGet<Announcement[]>('/announcements', signal),
    staleTime: 5 * 60_000,
  });
}

export function useMessages() {
  return useQuery({
    queryKey: keys.messages,
    queryFn: ({ signal }) => apiGet<QuestionMessage[]>('/messages', signal),
  });
}

export function useStaffStats(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.staffStats,
    queryFn: ({ signal }) => apiGet<StaffStats>('/staff/stats', signal),
    refetchInterval: 60_000,
    enabled: options.enabled ?? true,
  });
}

/** Кто вошёл: ФИО и подпись для шапки. Работает и для студента, и для сотрудника деканата. */
export function useIdentity() {
  return useQuery({
    queryKey: keys.identity,
    queryFn: ({ signal }) => apiGet<{ student: { login: string; name: string; group: string } }>('/auth/me', signal),
    staleTime: 5 * 60_000,
  });
}

export function useStaffRequests(status: string | null) {
  const query = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: [...keys.staffRequests, status ?? 'all'],
    queryFn: ({ signal }) => apiGet<StaffOrder[]>(`/staff/requests${query}`, signal),
  });
}

export function useStaffMessages() {
  return useQuery({
    queryKey: keys.staffMessages,
    queryFn: ({ signal }) => apiGet<StaffMessage[]>('/staff/messages', signal),
  });
}

export function useVerify(token: string) {
  return useQuery({
    queryKey: keys.verify(token),
    queryFn: ({ signal }) => apiGet<VerifyResult>(`/verify/${encodeURIComponent(token)}`, signal, true),
    retry: false,
  });
}

export function useMutate<TBody, TResult>(
  path: string,
  method: 'POST' | 'PATCH' = 'POST',
): (body?: TBody) => Promise<TResult> {
  return useCallback(
    (body?: TBody) =>
      (method === 'POST'
        ? api.post<TResult>(path, body, { mockRoute: mockRouteOf(path) })
        : api.patch<TResult>(path, body, { mockRoute: mockRouteOf(path) })),
    [path, method],
  );
}

export function resetUserCache(client: QueryClient): void {
  for (const key of [keys.me, keys.role, keys.profile, keys.notifications, keys.staffStats]) {
    client.removeQueries({ queryKey: key });
  }
  client.clear();
}

/** Тикающий «сейчас» — раз в минуту, для обратного отсчёта. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Медиа-запрос (используется для «на мобильном - иначе» в раскладках). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
