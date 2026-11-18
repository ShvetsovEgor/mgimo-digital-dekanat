// Обёртка над fetch для API «Дедлайн».
// Конверт `{ok:true,data}` / `{ok:false,error}`; понятные русские ошибки; 401 → /login.

import type { ApiEnvelope, ApiErrorBody } from './types';
import { getTabSession } from './tab-session';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOO_MANY_ATTEMPTS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'REQUEST_NOT_READY'
  | 'REQUEST_NOT_CANCELLABLE'
  | 'WRONG_PASSWORD'
  | 'WEAK_PASSWORD'
  | 'PASSWORD_MISMATCH'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'SERVER'
  | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields: ApiErrorBody['fields'];
  readonly retryAfter: number | null;

  constructor(status: number, code: ApiErrorCode, message: string, retryAfter: number | null = null, fields?: ApiErrorBody['fields']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.fields = fields;
  }

  /** Поле формы → сообщение (для подсветки ошибок валидации от сервера). */
  get fieldMessages(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const item of this.fields ?? []) out[item.field] = item.message;
    return out;
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK';
  }
}

/** Регистрируется в api/index, чтобы при 401 сбросить состояние пользователя. */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Сессия истекла. Войдите снова — это быстро.',
  INVALID_CREDENTIALS: 'Неверный логин или пароль. Проверьте раскладку и повторите.',
  TOO_MANY_ATTEMPTS: 'Слишком много попыток входа. Подождите 15 минут или войдите с другого устройства.',
  FORBIDDEN: 'Нет доступа к этим данным.',
  NOT_FOUND: 'Не нашли запрошенные данные — возможно, их уже удалили.',
  VALIDATION: 'Проверьте заполненные поля.',
  REQUEST_NOT_READY: 'Документ ещё не готов — загляните позже.',
  REQUEST_NOT_CANCELLABLE: 'Эту заявку уже нельзя отменить: она в работе у деканата.',
  WRONG_PASSWORD: 'Текущий пароль не подошёл. Попробуйте ещё раз.',
  WEAK_PASSWORD: 'Пароль слишком простой — добавьте буквы и цифры.',
  PASSWORD_MISMATCH: 'Пароли не совпадают — проверьте второй раз.',
  RATE_LIMITED: 'Слишком много запросов подряд. Сделайте паузу на минуту.',
  NETWORK: 'Нет связи с сервером. Проверьте интернет и повторите.',
  SERVER: 'Что-то пошло не так на сервере. Повторите — обычно помогает.',
};

export function readableMessage(status: number, body: ApiErrorBody | null): string {
  if (status === 429) {
    if (body?.code === 'TOO_MANY_ATTEMPTS') return MESSAGES.TOO_MANY_ATTEMPTS ?? '';
    return MESSAGES.RATE_LIMITED ?? '';
  }
  if (body?.code && body.code in MESSAGES) {
    // Сообщение сервера важнее общего — оно точнее.
    return body.message || MESSAGES[body.code] || '';
  }
  if (status >= 500) return MESSAGES.SERVER ?? '';
  return body?.message || MESSAGES.SERVER || '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** не редиректить на /login при 401 (используется в /auth/me и /staff/stats) */
  silent401?: boolean;
  headers?: Record<string, string>;
  /** мок-режим: имя обработчика вместо сетевого запроса */
  mockRoute?: string;
}

interface RequestResult<T> {
  data: T;
  response: Response;
}

function parseRetryAfter(response: Response): number | null {
  const raw = response.headers.get('Retry-After');
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, Math.round((date - Date.now()) / 1000));
  return null;
}

async function readJson(payload: Response): Promise<unknown> {
  const text = await payload.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isErrorBody(value: unknown): value is { error: ApiErrorBody } {
  if (typeof value !== 'object' || value === null) return false;
  const maybe = (value as { error?: unknown }).error;
  return typeof maybe === 'object' && maybe !== null && typeof (maybe as ApiErrorBody).code === 'string';
}

function isOkEnvelope(value: unknown): value is { ok: true; data: unknown } {
  return typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === true;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<RequestResult<T>> {
  if (options.mockRoute) {
    const { mockRequest } = await import('./mock');
    const data = await mockRequest<T>(options.mockRoute, options.method ?? 'GET', options.body);
    return { data, response: new Response(null, { status: 204 }) };
  }
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  // Сессия этой вкладки: сервер предпочитает заголовок cookie, поэтому аккаунты не мешают друг другу.
  const tabToken = getTabSession();
  if (tabToken) headers['X-Tab-Session'] = tabToken;
  if (method !== 'GET') headers['Content-Type'] = 'application/json';

  // Свой таймаут: на бесплатном хостинге сервис «просыпается» долго, но не бесконечно —
  // через 45 с показываем понятную ошибку с «Повторить» вместо вечного скелетона.
  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort('timeout'), 45_000);
  const onAbort = () => timeout.abort('cancel');
  options.signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers,
      signal: options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    if (timeout.signal.aborted) throw new ApiError(0, 'NETWORK', 'Сервер долго не отвечает. Проверьте связь и попробуйте снова.');
    throw new ApiError(0, 'NETWORK', MESSAGES.NETWORK ?? '');
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }

  if (response.status === 204) return { data: undefined as T, response };

  const payload = await readJson(response).catch(() => null);

  if (!response.ok) {
    const body = isErrorBody(payload) ? payload.error : null;
    if (response.status === 401 && !options.silent401) unauthorizedHandler?.();
    const status = response.status;
      const code: ApiErrorCode = body?.code ?? 'SERVER';
    const fallback = status === 404 ? MESSAGES.NOT_FOUND : status === 403 ? MESSAGES.FORBIDDEN : MESSAGES.SERVER;
    throw new ApiError(status, code, readableMessage(status, body) || fallback || '', parseRetryAfter(response), body?.fields);
  }

  if (!isOkEnvelope(payload)) {
    throw new ApiError(response.status, 'SERVER', MESSAGES.SERVER ?? '');
  }
  return { data: payload.data as T, response };
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal, opts: Omit<RequestOptions, 'method' | 'body' | 'signal'> = {}) =>
    request<T>(path, { ...opts, signal }).then((r) => r.data),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }).then((r) => r.data),
};

export type { RequestOptions };
export type { ApiEnvelope };
