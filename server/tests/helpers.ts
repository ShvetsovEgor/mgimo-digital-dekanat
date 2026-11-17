// Общая обвязка тестов: изолированная БД в os.tmpdir(), seed, сервер на случайном порту,
// HTTP-клиент с cookies. Каждый тестовый файл — отдельный процесс node --test.
import { before, after } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  text: string;
}

export interface Expected<T> {
  status?: number;
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string> };
}

/** Настройка окружения до динамического импорта модулей сервера (config читается при импорте). */
export function prepareEnv(): { dataDir: string } {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadline-test-'));
  process.env.DATA_DIR = dataDir;
  delete process.env.DB_FILE;
  process.env.DEMO_TODAY = '2026-11-17'; // «живой» день демо для стабильных тестов
  process.env.NODE_ENV = 'test';
  process.env.DOC_VERIFY_SECRET = 'test-doc-secret-0123456789';
  process.env.IP_SALT = 'test-ip-salt';
  process.env.TRUST_PROXY = '0';
  process.env.PUBLIC_URL = 'http://127.0.0.1:3000';
  delete process.env.DEMO_PASSWORD;
  return { dataDir };
}

export async function startTestServer(): Promise<TestServer> {
  const { createApp } = await import('../src/app.js');
  const app = createApp({ seedOnEmpty: true });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** HTTP-клиент с cookie-jar (аналог браузера). */
export class Client {
  private cookies = new Map<string, string>();
  readonly origin: string | null;

  constructor(
    readonly baseUrl: string,
    origin: string | null = null,
  ) {
    this.origin = origin;
  }

  get cookieHeader(): string | null {
    if (this.cookies.size === 0) return null;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async request<T = unknown>(
    method: string,
    pathname: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.origin) headers['Origin'] = this.origin;
    const cookie = this.cookieHeader;
    if (cookie) headers['Cookie'] = cookie;
    const res = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(raw)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let parsed: unknown = text;
    if ((res.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }
    return { status: res.status, headers: res.headers, body: parsed as T, text };
  }

  get<T = unknown>(pathname: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', pathname, undefined, headers);
  }

  post<T = unknown>(pathname: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', pathname, body ?? {}, headers);
  }

  patch<T = unknown>(pathname: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', pathname, body ?? {});
  }

  async login(login: string, password = 'DemoKonkurs2030'): Promise<ApiResponse> {
    return this.post('/api/auth/login', { login, password });
  }
}

/** Утверждение: успешный ответ, данные соответствуют ожиданиям. */
export function expectOk<T>(res: ApiResponse, status = 200): T {
  if (res.status !== status) {
    throw new Error(`Ожидался статус ${status}, получен ${res.status}: ${res.text.slice(0, 300)}`);
  }
  const body = res.body as { ok: boolean; data: T };
  if (!body || body.ok !== true) throw new Error(`Ожидался ok:true, получено: ${res.text.slice(0, 300)}`);
  return body.data;
}

/** Утверждение: ошибка с ожидаемым статусом и кодом. */
export function expectError(res: ApiResponse, status: number, code: string): void {
  if (res.status !== status) {
    throw new Error(`Ожидался статус ${status}, получен ${res.status}: ${res.text.slice(0, 300)}`);
  }
  const body = res.body as { ok: boolean; error?: { code: string; message: string } };
  if (!body || body.ok !== false || !body.error) {
    throw new Error(`Ожидался конверт ошибки, получено: ${res.text.slice(0, 300)}`);
  }
  if (body.error.code !== code) {
    throw new Error(`Ожидался код ${code}, получен ${body.error.code}: ${body.error.message}`);
  }
}

/** Общий хуки для файла тестов: поднимает сервер один раз на файл. */
export function useServer(): { api: (origin?: string | null) => Client; server: () => TestServer } {
  let server: TestServer;
  before(async () => {
    prepareEnv();
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
    const { db } = await import('../src/db.js');
    if (db.open) db.close();
  });
  return {
    api: (origin: string | null = null) => new Client(server.baseUrl, origin),
    server: () => server,
  };
}
