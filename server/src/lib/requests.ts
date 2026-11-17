// Заявки: создание, отмена, смена статуса, история и уведомления студенту.
import { db } from '../db.js';
import { ApiError } from '../http.js';
import { addNotification, nextRequestNumber, requestByIdForUser, requestTypeByCode, requestTypes } from './repo.js';
import type { FormFieldJson, Order, OrderHistory, RequestStatus } from './mappers.js';
import {
  ORDER_STEPS,
  buildHistory,
  parseJson,
  toOrder,
  toRequestType,
} from './mappers.js';
import { addWorkingMinutes, toLocalIso } from './time.js';

/** Все даты — локальные ISO-строки МСК (TZ процесса — Europe/Moscow, см. lib/time.ts). */
export function nowIso(now: Date): string {
  return toLocalIso(now);
}

/** Срок выполнения с учётом только рабочих дней (пн–пт, 09:00–18:00). */
export function dueFor(now: Date, slaMinutes: number): string {
  if (slaMinutes <= 0) return nowIso(now);
  return toLocalIso(addWorkingMinutes(now, slaMinutes));
}

export interface CreateRequestInput {
  userId: number;
  departmentId: number;
  typeCode: string;
  rawValues: unknown;
  now: Date;
}

export interface CreatedRequest {
  id: number;
  number: string;
  status: RequestStatus;
}

/** Валидация значений формы по форме типа заявки (динамические поля из request_types.form_json). */
export function validateValues(fields: FormFieldJson[], raw: unknown): Record<string, string | boolean> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ApiError(400, 'VALIDATION', 'Проверьте правильность заполнения полей', {
      values: 'Некорректные значения формы',
    });
  }
  const input = raw as Record<string, unknown>;
  const known = new Set(fields.map((f) => f.name));
  for (const key of Object.keys(input)) {
    if (!known.has(key)) {
      throw new ApiError(400, 'VALIDATION', 'Проверьте правильность заполнения полей', {
        [key]: 'Неизвестное поле формы',
      });
    }
  }
  const out: Record<string, string | boolean> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = input[field.name];
    if (field.type === 'checkbox') {
      const bool = value === true || value === 'true';
      if (field.required && !bool) errors[field.name] = `Отметьте «${field.label}»`;
      out[field.name] = bool;
      continue;
    }
    const str = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
    if (!str) {
      if (field.required) errors[field.name] = `Укажите: ${field.label}`;
      continue;
    }
    if (str.length > 2000) {
      errors[field.name] = 'Слишком длинное значение (максимум 2000 символов)';
      continue;
    }
    if (field.options && field.options.length > 0) {
      if (!field.options.some((o) => o.value === str)) {
        errors[field.name] = `Выберите значение из списка: ${field.label}`;
        continue;
      }
    }
    if (field.minLength != null && str.length < field.minLength) {
      errors[field.name] = `Не короче ${field.minLength} символов`;
      continue;
    }
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      errors[field.name] = 'Укажите дату в формате ГГГГ-ММ-ДД';
      continue;
    }
    out[field.name] = str;
  }
  if (Object.keys(errors).length) {
    throw new ApiError(400, 'VALIDATION', 'Проверьте правильность заполнения полей', errors);
  }
  return out;
}

export function typeFields(formJson: string): FormFieldJson[] {
  return parseJson<FormFieldJson[]>(formJson, []);
}

/** Создание заявки: номер ЗВ-2030-000123, SLA, история, уведомление. */
export const createRequest = db.transaction((input: CreateRequestInput): CreatedRequest => {
  const type = requestTypeByCode(input.typeCode);
  if (!type) {
    throw new ApiError(400, 'VALIDATION', 'Неизвестный тип заявки', { typeCode: 'Такой услуги нет в каталоге' });
  }
  const fields = typeFields(type.form_json);
  const values = validateValues(fields, input.rawValues);
  const instant = type.sla_minutes <= 0;
  const iso = nowIso(input.now);
  const number = nextRequestNumber();
  const status: RequestStatus = instant ? 'ready' : 'pending';
  const history: OrderHistory[] = instant
    ? [
        { label: ORDER_STEPS[0], at: iso, by: 'Студент', done: true, current: false },
        { label: ORDER_STEPS[1], at: iso, by: 'Деканат, автоматически', done: true, current: false },
        { label: ORDER_STEPS[2], at: iso, by: 'Деканат, автоматически', done: true, current: false },
      ]
    : buildHistory(0, iso, 'Студент');
  const due = dueFor(input.now, type.sla_minutes);
  const info = db
    .prepare(
      `INSERT INTO requests (number, user_id, department_id, type_code, status, payload_json, comment,
                             reject_reason, created_at, updated_at, due_at, ready_at, processed_by, history_json)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      number,
      input.userId,
      input.departmentId,
      type.code,
      status,
      JSON.stringify(values),
      iso,
      iso,
      due,
      instant ? iso : null,
      instant ? 'Автоматически' : null,
      JSON.stringify(history),
    );
  const id = Number(info.lastInsertRowid);
  if (instant) {
    addNotification(
      input.userId,
      'request',
      `Документ готов: ${type.title}`,
      `Заявка ${number} выполнена автоматически. PDF можно скачать в разделе «Заявки».`,
      `/requests?open=${id}`,
      iso,
    );
  } else {
    addNotification(
      input.userId,
      'request',
      `Заявка ${number} принята`,
      `${type.title}. Ожидает проверки в деканате. Ориентировочный срок: ${type.sla_label}.`,
      `/requests?open=${id}`,
      iso,
    );
  }
  return { id, number, status };
});

export function orderForUser(id: number, userId: number, now: Date): Order {
  const row = requestByIdForUser(id, userId);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена');
  return toOrder(row, { now, formFields: parseJson<FormFieldJson[]>(row.type_form_json, []) });
}

export function requestTypeTitle(code: string): string {
  const t = requestTypes().find((x) => x.code === code);
  return t ? toRequestType(t).title : 'Заявка';
}

export interface StatusChange {
  status: RequestStatus;
  comment?: string | null;
  rejectReason?: string | null;
  by: string;
  now: Date;
}

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['in_progress', 'ready', 'rejected'],
  in_progress: ['ready', 'rejected'],
  ready: [],
  rejected: ['in_progress'],
  cancelled: [],
};

/** Смена статуса сотрудником: только своего факультета, только допустимые переходы. */
export const updateRequestStatus = db.transaction((id: number, departmentId: number, change: StatusChange): void => {
  const row = db
    .prepare('SELECT status, history_json, user_id, type_code, number FROM requests WHERE id = ? AND department_id = ?')
    .get(id, departmentId) as
    | { status: RequestStatus; history_json: string; user_id: number; type_code: string; number: string }
    | undefined;
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена');
  if (!ALLOWED_TRANSITIONS[row.status].includes(change.status)) {
    throw new ApiError(409, 'REQUEST_NOT_CANCELLABLE', 'Такой переход статуса невозможен');
  }
  if (change.status === 'rejected' && !change.rejectReason?.trim()) {
    throw new ApiError(400, 'VALIDATION', 'Укажите причину отклонения', {
      rejectReason: 'Причина отклонения обязательна',
    });
  }
  const iso = nowIso(change.now);
  const history = parseJson<OrderHistory[]>(row.history_json, []);
  let nextHistory: OrderHistory[];
  if (change.status === 'in_progress') {
    nextHistory = buildHistory(1, iso, change.by);
  } else if (change.status === 'ready') {
    for (const step of history) {
      if (step.label !== ORDER_STEPS[2]) {
        step.done = true;
        step.current = false;
        if (step.at === '—') {
          step.at = iso;
          step.by = change.by;
        }
      }
    }
    nextHistory = history.map((h) => (h.label === ORDER_STEPS[2] ? { ...h, at: iso, by: change.by, done: true, current: true } : h));
  } else {
    // rejected — история остаётся, текущий шаг помечается пройденным
    nextHistory = history.map((h) => (h.current ? { ...h, at: iso, by: change.by, done: true, current: false } : h));
  }
  db.prepare(
    `UPDATE requests SET status = ?, comment = ?, reject_reason = ?, updated_at = ?, ready_at = ?,
            processed_by = ?, history_json = ? WHERE id = ?`,
  ).run(
    change.status,
    change.comment ?? null,
    change.rejectReason ?? null,
    iso,
    change.status === 'ready' ? iso : null,
    change.by,
    JSON.stringify(nextHistory),
    id,
  );

  const typeTitle = requestTypeTitle(row.type_code);
  const map: Record<string, { title: string; body: string }> = {
    in_progress: {
      title: `Заявка ${row.number} в работе`,
      body: `${typeTitle}: деканат приступил к обработке.`,
    },
    ready: {
      title: `Заявка ${row.number} готова`,
      body: `${typeTitle}. Документ можно скачать в PDF.`,
    },
    rejected: {
      title: `Заявка ${row.number} отклонена`,
      body: `Причина: ${change.rejectReason ?? 'не указана'}.`,
    },
  };
  const message = map[change.status];
  if (message) addNotification(row.user_id, 'request', message.title, message.body, `/requests?open=${id}`, iso);
});
