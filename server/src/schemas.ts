// Схемы валидации входных данных API (zod). Строки триммируются, всё лишнее отсекается.
import { z } from 'zod';

export const loginInput = z.object({
  login: z
    .string({ error: 'Введите логин' })
    .trim()
    .min(1, 'Введите логин')
    .max(64, 'Логин слишком длинный')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Логин — латиница, цифры, точка, дефис и подчёркивание'),
  password: z.string({ error: 'Введите пароль' }).min(1, 'Введите пароль').max(200, 'Пароль слишком длинный'),
});

export const dateQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
    .optional(),
});

export const weekQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
    .optional(),
  week: z.enum(['-1', '0', '1']).optional(),
});

export const profilePatchInput = z
  .object({
    phone: z
      .string()
      .trim()
      .max(20, 'Телефон — не длиннее 20 символов')
      .regex(/^[+0-9 ()-]*$/, 'Только цифры, +, пробелы, скобки и дефис')
      .optional(),
    telegram: z
      .string()
      .trim()
      .max(64, 'Ник — не длиннее 64 символов')
      .regex(/^@?[A-Za-z0-9_]*$/, 'Только латиница, цифры и _')
      .optional(),
    notifyMode: z.enum(['all', 'important', 'none']).optional(),
  })
  .strict();

export const passwordChangeInput = z.object({
  current: z.string().min(1, 'Введите текущий пароль').max(200),
  next: z
    .string()
    .min(8, 'Новый пароль — не меньше 8 символов')
    .max(128, 'Новый пароль — не длиннее 128 символов')
    .regex(/[A-Za-zА-Яа-яЁё]/, 'Добавьте хотя бы одну букву')
    .regex(/[0-9]/, 'Добавьте хотя бы одну цифру'),
  confirm: z.string().max(128).optional(),
});

export const twoFactorInput = z.object({
  enabled: z.boolean({ error: 'Укажите enabled: true/false' }),
});

export const createRequestInput = z.object({
  typeCode: z.string().trim().min(1, 'Выберите услугу').max(64),
  values: z.record(z.string().max(64), z.unknown()).default({}),
});

export const staffStatusInput = z
  .object({
    status: z.enum(['pending', 'in_progress', 'ready', 'rejected'], {
      error: 'Недопустимый статус заявки',
    }),
    comment: z.string().trim().max(1000, 'Комментарий — не длиннее 1000 символов').optional(),
    rejectReason: z.string().trim().max(500, 'Причина — не длиннее 500 символов').optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === 'rejected' && !val.rejectReason) {
      ctx.addIssue({ code: 'custom', path: ['rejectReason'], message: 'Укажите причину отклонения' });
    }
  });

export const staffRequestsQuery = z.object({
  status: z.enum(['pending', 'in_progress', 'ready', 'rejected', 'cancelled', 'all']).optional(),
});

export const messageInput = z.object({
  subject: z.string().trim().min(3, 'Тема — не короче 3 символов').max(120, 'Тема — не длиннее 120 символов'),
  body: z.string().trim().min(10, 'Сообщение — не короче 10 символов').max(2000, 'Сообщение — не длиннее 2000 символов'),
});

export const replyInput = z.object({
  reply: z.string().trim().min(2, 'Ответ — не короче 2 символов').max(2000, 'Ответ — не длиннее 2000 символов'),
});

export const announcementInput = z.object({
  title: z.string().trim().min(3, 'Заголовок — не короче 3 символов').max(160, 'Заголовок — не длиннее 160 символов'),
  body: z.string().trim().min(10, 'Текст — не короче 10 символов').max(4000, 'Текст — не длиннее 4000 символов'),
  category: z.enum(['study', 'session', 'documents', 'life', 'important']).default('important'),
  pinned: z.boolean().default(false),
  forAll: z.boolean().default(false),
});

export const idParam = z.object({
  id: z.coerce.number({ error: 'Некорректный идентификатор' }).int().positive('Некорректный идентификатор').max(1e9),
});

export const tokenParam = z.object({
  token: z.string().min(8, 'Некорректный токен').max(1024, 'Некорректный токен'),
});
