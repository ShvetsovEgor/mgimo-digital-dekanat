// HTTP-примитивы: ошибки, обёртка async-роутов, обработчик ошибок, логирование.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOO_MANY_ATTEMPTS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'REQUEST_NOT_READY'
  | 'REQUEST_NOT_CANCELLABLE'
  | 'WRONG_PASSWORD'
  | 'PASSWORD_MISMATCH'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMITED'
  | 'INTERNAL';

/** Доменная ошибка API. Наружу отдаётся как {ok:false,error:{code,message,fields?}}. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Ошибка валидации из ZodError → 400 VALIDATION с полями формы. */
export function validationError(err: ZodError): ApiError {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return new ApiError(400, 'VALIDATION', 'Проверьте правильность заполнения полей', fields);
}

/** Обёртка для асинхронных обработчиков: ошибки уходят в errorHandler. */
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Успешный ответ: {ok:true,data}. */
export function sendOk(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ ok: true, data });
}

// ---------------------------------------------------------------------------
// Логирование без PII: метод, путь (без query), статус, время.
// ---------------------------------------------------------------------------
const startedAt = new WeakMap<Response, number>();

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  startedAt.set(res, Date.now());
  res.on('finish', () => {
    const ms = Date.now() - (startedAt.get(res) ?? Date.now());
    log('info', 'http', {
      method: req.method,
      path: req.path, // путь без query — query может содержать параметры, но не PII тела
      status: res.statusCode,
      ms,
    });
  });
  next();
}

export type LogLevel = 'info' | 'warn' | 'error';

/** Структурный лог в stdout/stderr. Никогда не передавайте сюда ФИО, пароли, e-mail. */
export function log(level: LogLevel, scope: string, data: Record<string, unknown>): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, scope, ...data });
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

// 404 для неизвестных путей
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Маршрут ${req.method} ${req.path} не найден`));
};

// Централизованный обработчик ошибок — единственное место формирования ошибок API.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiErr: ApiError;
  if (err instanceof ApiError) {
    apiErr = err;
  } else if (err instanceof ZodError) {
    apiErr = validationError(err);
  } else if (isBodyParseError(err)) {
    apiErr = new ApiError(400, 'VALIDATION', 'Некорректный JSON в теле запроса');
  } else if (isPayloadTooLarge(err)) {
    apiErr = new ApiError(413, 'VALIDATION', 'Слишком большой запрос (максимум 64 КБ)');
  } else {
    // Внутренние ошибки не раскрываем клиенту; stack — только в серверный лог и без PII.
    log('error', 'unhandled', {
      method: req.method,
      path: req.path,
      message: err instanceof Error ? err.message : 'unknown',
    });
    apiErr = new ApiError(500, 'INTERNAL', 'Внутренняя ошибка сервера');
  }
  if (res.headersSent) {
    res.end();
    return;
  }
  const retryAfter = (err as { retryAfter?: number }).retryAfter;
  if (typeof retryAfter === 'number' && retryAfter > 0) res.setHeader('Retry-After', String(retryAfter));
  const body: { ok: false; error: { code: string; message: string; fields?: Record<string, string> } } = {
    ok: false,
    error: { code: apiErr.code, message: apiErr.message },
  };
  if (apiErr.fields) body.error.fields = apiErr.fields;
  res.status(apiErr.status).json(body);
}

function isBodyParseError(err: unknown): boolean {
  return isErrWith(err, 'type') && (err as { type: string }).type === 'entity.parse.failed';
}

function isPayloadTooLarge(err: unknown): boolean {
  return isErrWith(err, 'type') && (err as { type: string }).type === 'entity.too.large';
}

function isErrWith(err: unknown, key: string): boolean {
  return typeof err === 'object' && err !== null && key in err;
}
