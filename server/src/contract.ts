import { z } from 'zod';

// ============================================================================
// Контракт API «Цифровой деканат 2030».
// Можно менять ТОЛЬКО добавляя новые сущности. Формат данных в списках
// возвращается как есть (data — массив, либо объект, если указано).
// ============================================================================

const studentRefSchema = z.object({
  login: z.string(),
  name: z.string(),
  group: z.string(),
});

/** Общий конверт ответа */
export const okEnvelope = <T extends z.ZodTypeAny>(data: T) => z.object({ ok: z.literal(true), data });

// ---------------------------------------------------------------------------
// 1. Профиль и авторизация
// ---------------------------------------------------------------------------
export const profileSchema = z.object({
  /** Имя для приветствия и аватара */
  firstName: z.string(), // «Анна»
  fullName: z.string(), // «Иванова Анна Сергеевна»
  displayName: z.string(), // «Анна Иванова»
  shortName: z.string(), // «А. С. Иванова»
  initials: z.string(), // «АИ»
  course: z.number(),
  courseOrdinal: z.string(), // «2-й курс»
  group: z.string(),
  subgroup: z.string().nullable(),
  program: z.string(), // «Дипломатия и политика зарубежных стран»
  programCode: z.string(), // «41.03.01»
  degree: z.string(), // «Бакалавриат»
  studyForm: z.string(), // «Очная форма»
  faculty: z.string(),
  facultyShort: z.string(),
  department: z.string(), // «Кафедра международных отношений» — вымышленная
  enrollmentYear: z.number(),
  semesterLabel: z.string(), // «1 семестр 2026/27»
  recordBookMasked: z.string(), // «****0481»
  email: z.string(),
  phone: z.string().nullable(),
  telegram: z.string().nullable(),
  funded: z.enum(['budget', 'contract']),
  fundedLabel: z.string(), // «Бюджетное место»
  scholarship: z.string().nullable(), // «Академическая — 3 500 ₽/мес»
  dorm: z.string().nullable(), // «Общежитие № 2, комн. 512»
  curator: z.string(), // «К. И. Лебедева»
  verification: z.object({
    level: z.number(), // 2
    label: z.string(), // «Подтверждён»
    note: z.string(), // «Личность подтверждена через Госуслуги · 2FA включена»
  }),
  security: z.object({
    twoFactor: z.boolean(),
    lastPasswordChange: z.string(), // «12 сентября»
    activeSessions: z.number(),
  }),
});

export const deaneryContactSchema = z.object({
  office: z.string(), // «Факультет МО, ауд. 214»
  hours: z.string(), // «пн–чт 10:00–17:00, пт 10:00–15:00»
  secretary: z.string(), // «О. Н. Пахомова»
  dean: z.string(), // «А. В. Мельников»
  email: z.string(),
  phone: z.string(),
  building: z.string(),
  responseTime: z.string(), // «обычно отвечаем в течение рабочего дня»
});

export const loginResultSchema = z.object({
  student: studentRefSchema, // {login, name, group}
  /** Токен сессии для этой вкладки (передаётся заголовком X-Tab-Session). */
  tabToken: z.string(),
});

export const updateProfileInputSchema = z.object({
  phone: z.string().trim().max(20).regex(/^[+0-9 ()-]*$/, 'Только цифры, +, пробелы и скобки').optional(),
  telegram: z.string().trim().max(64).regex(/^@?[A-Za-z0-9_]*$/, 'Только латиница, цифры и _').optional(),
});

export const passwordChangeInputSchema = z.object({
  current: z.string().min(1, 'Введите текущий пароль'),
  next: z
    .string()
    .min(8, 'Новый пароль — не меньше 8 символов')
    .max(128)
    .regex(/[A-Za-zА-Яа-я]/, 'Добавьте хотя бы одну букву')
    .regex(/[0-9]/, 'Добавьте хотя бы одну цифру'),
  confirm: z.string(),
});

/** Сессия вкладки: новый токен для уже вошедшего пользователя. */
export const tabSessionSchema = z.object({ tabToken: z.string() });

// ---------------------------------------------------------------------------
// 2. Расписание
// ---------------------------------------------------------------------------
export const weekEntrySchema = z.object({
  id: z.number(),
  /** дата по расписанию (YYYY-MM-DD) */
  date: z.string(),
  /** фактическая дата, если пару перенесли (иначе null) */
  movedTo: z.string().nullable(),
  start: z.string(), // «10:00»
  end: z.string(), // «11:30»
  startMin: z.number(), // 600
  endMin: z.number(), // 690
  subject: z.string(), // «История России»
  subjectCode: z.string(),
  kind: z.enum(['lecture', 'seminar', 'language', 'physical', 'consult', 'exam']),
  kindLabel: z.string(),
  teacher: z.string(),
  room: z.string(),
  building: z.string(),
  buildingShort: z.string(), // «К2»
  group: z.string(),
  subgroup: z.string().nullable(),
  change: z
    .object({
      kind: z.enum(['room', 'cancelled', 'moved', 'added', 'time']),
      note: z.string(), // «Аудитория изменена: 218 → 224»
      published: z.string(), // «вчера, 16:42»
      publishedBy: z.string(), // «Деканат МО»
    })
    .nullable(),
});

export const scheduleChangeSchema = z.object({
  entryId: z.number(),
  kind: z.enum(['room', 'cancelled', 'moved', 'added', 'time']),
  kindLabel: z.string(), // «Перенос»
  subject: z.string(),
  from: z.string(), // «Ср, 13:30»
  to: z.string().nullable(), // «Пт, 9:00» или null
  note: z.string(),
  published: z.string(),
  publishedBy: z.string(),
  severity: z.enum(['info', 'warning']),
});

export const todayLectureSchema = z.object({
  entryId: z.number(),
  subject: z.string(),
  start: z.string(),
  end: z.string(),
  room: z.string(),
  building: z.string(),
  teacher: z.string(),
  kindLabel: z.string(),
  /** «через 1 ч 20 мин» | «сейчас идёт» | «до пары 45 мин» */
  relative: z.string(),
  isNow: z.boolean(),
  status: z.enum(['upcoming', 'now', 'done']),
});

export const scheduleWeekSchema = z.object({
  weekStart: z.string(), // понедельник YYYY-MM-DD
  weekLabel: z.string(), // «17–23 ноября»
  parity: z.enum(['odd', 'even']),
  parityLabel: z.string(), // «нечётная неделя»
  days: z.array(
    z.object({
      date: z.string(),
      weekdayLabel: z.string(), // «Пн»
      dayLabel: z.string(), // «17»
      monthLabel: z.string(), // «ноя»
      isToday: z.boolean(),
      isHoliday: z.boolean(),
      entries: z.array(weekEntrySchema),
    }),
  ),
  changes: z.array(scheduleChangeSchema),
});

export const scheduleTodaySchema = z.object({
  dateLabel: z.string(), // «понедельник, 17 ноября»
  weekParityLabel: z.string(),
  universityDay: z.string(), // «Учебный день 57»
  next: todayLectureSchema.nullable(),
  now: z.string(), // «HH:MM»
  total: z.number(),
  done: z.number(),
  finished: z.boolean(),
  entries: z.array(
    weekEntrySchema.extend({
      status: z.enum(['upcoming', 'now', 'done', 'cancelled', 'moved_away']),
    }),
  ),
  changes: z.array(scheduleChangeSchema),
});

// ---------------------------------------------------------------------------
// 3. Успеваемость
// ---------------------------------------------------------------------------
export const disciplineSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(), // «История России»
  teacher: z.string(),
  attestation: z.enum(['credit', 'exam', 'graded', 'offset']),
  attestationLabel: z.string(), // «Зачёт»
  /** накопительный рейтинг 0..100 */
  rating: z.number(),
  threshold: z.number(), // 70
  /** сколько баллов осталось до 70, null — неактуально (порог 0 или достигнут) */
  toAuto: z.number().nullable(),
  autoPossible: z.boolean(),
  autoReached: z.boolean(),
  controlPoints: z.array(
    z.object({ label: z.string(), earned: z.number().nullable(), max: z.number() }),
  ),
  examDate: z.string().nullable(), // «22 декабря»
  examRoom: z.string().nullable(),
  finalGrade: z.string().nullable(), // «5» | «Зачтено» ...
  finalRating: z.number().nullable(),
});

export const ratingSummarySchema = z.object({
  avgRating: z.number(), // 76.4
  avgLabel: z.string(), // «76%»
  autoCount: z.number(), // сколько дисциплин уже «в автомате»
  riskCount: z.number(),
  creditsEarnedYear: z.number(), // 28
  creditsPlanYear: z.number(), // 60
});

export const sessionExamSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.string(), // «22 декабря»
  time: z.string(), // «10:00»
  room: z.string(),
  teacher: z.string(),
  form: z.string(), // «Экзамен» | «Зачёт»
  grade: z.string().nullable(),
  rating: z.number().nullable(),
});

export const transcriptRowSchema = z.object({
  semester: z.string(), // «2 семестр»
  course: z.string(),
  credits: z.number(),
  rating: z.number(),
  grade: z.string(),
  ects: z.string(),
});

export const academicRankSchema = z.object({
  semester: z.string(), // «1 семестр 2026/27»
  placeGroup: z.number(),
  group: z.string(),
  outOfGroup: z.number(),
  placeProgram: z.number(),
  outOfProgram: z.number(),
  cohortAvg: z.number(),
  myAvg: z.number(),
  /** тренд относительно прошлого семестра: +12 позиций */
  trend: z.string().nullable(),
});

export const gradeScaleRowSchema = z.object({
  range: z.string(), // «90–100 %»
  five: z.string(), // «Отлично»
  ects: z.string(), // «A»
});

// ---------------------------------------------------------------------------
// 4. Заявки
// ---------------------------------------------------------------------------
export const requestTypeSchema = z.object({
  code: z.string(),
  category: z.enum(['certificate', 'application']),
  categoryLabel: z.string(),
  title: z.string(),
  short: z.string(),
  description: z.string(),
  slaLabel: z.string(), // «1 рабочий день»
  price: z.string(), // «Бесплатно»
  isNew: z.boolean(),
  steps: z.array(z.string()),
  /** Сколько строк формы (после разворачивания options) — используется фронтом для компактных карточек */
  fieldCount: z.number(),
  fields: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'textarea', 'select', 'date', 'radio', 'checkbox']),
      required: z.boolean(),
      placeholder: z.string().nullable(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).nullable(),
      minLength: z.number().nullable(),
    }),
  ),
});

export const requestStatusSchema = z.enum(['pending', 'in_progress', 'ready', 'rejected', 'cancelled']);

export const requestHistorySchema = z.object({
  label: z.string(),
  at: z.string(), // «17 ноя, 10:42»
  by: z.string().nullable(),
  done: z.boolean(),
  current: z.boolean(),
});

export const orderSchema = z.object({
  id: z.number(),
  number: z.string(), // «ЗВ-2030-000012»
  typeCode: z.string(),
  typeTitle: z.string(),
  category: z.enum(['certificate', 'application', 'service']),
  status: requestStatusSchema,
  statusLabel: z.string(),
  statusNote: z.string().nullable(),
  createdAt: z.string(),
  createdAtLabel: z.string(),
  dueAt: z.string(),
  dueLabel: z.string(),
  readyAtLabel: z.string().nullable(),
  isOverdue: z.boolean(),
  canCancel: z.boolean(),
  canDownload: z.boolean(),
  fields: z.array(z.object({ label: z.string(), value: z.string() })),
  rejectReason: z.string().nullable(),
  history: z.array(requestHistorySchema),
});

export const notificationSchema = z.object({
  id: z.number(),
  type: z.enum(['schedule', 'grade', 'request', 'announcement', 'deadline', 'message', 'info']),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(), // «/schedule», «/requests?open=12»
  createdAt: z.string(),
  createdAtLabel: z.string(),
  relative: z.string(),
  read: z.boolean(),
});

export const announcementSchema = z.object({
  id: z.number(),
  category: z.enum(['study', 'session', 'documents', 'life', 'important']),
  categoryLabel: z.string(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.string(),
  createdAtLabel: z.string(),
  scope: z.string(),
});

export const deadlineSchema = z.object({
  id: z.number(),
  title: z.string(),
  course: z.string(),
  dueAt: z.string(),
  dueLabel: z.string(),
  relative: z.string(),
  points: z.string(),
  done: z.boolean(),
});

// ---------------------------------------------------------------------------
// 4a. Калькулятор стипендии
// ---------------------------------------------------------------------------
export const scholarshipSchema = z.object({
  funded: z.enum(['budget', 'contract']),
  /** Назначенная стипендия из профиля — отдельный факт, может не совпасть с прогнозом. */
  assigned: z.object({ title: z.string(), amount: z.number() }).nullable(),
  rules: z.object({
    academicMin: z.number(),
    increasedMin: z.number(),
    academicAmount: z.number(),
    increasedAmount: z.number(),
    disclaimer: z.string(),
  }),
  /** Текущие дисциплины семестра: только балл, без контрольных точек. */
  disciplines: z.array(z.object({ id: z.number(), title: z.string(), rating: z.number() })),
  result: z.object({
    tier: z.enum(['none', 'academic', 'increased']),
    title: z.string(),
    amount: z.number(),
    gaps: z.array(
      z.object({ id: z.number(), title: z.string(), rating: z.number(), need: z.number(), delta: z.number() }),
    ),
  }),
});

// ---------------------------------------------------------------------------
// 5. Экспорт схем
// ---------------------------------------------------------------------------
export const schemas = {
  profileSchema,
  deaneryContactSchema,
  loginResultSchema,
  tabSessionSchema,
  updateProfileInputSchema,
  passwordChangeInputSchema,
  weekEntrySchema,
  scheduleChangeSchema,
  todayLectureSchema,
  scheduleWeekSchema,
  scheduleTodaySchema,
  disciplineSchema,
  ratingSummarySchema,
  sessionExamSchema,
  transcriptRowSchema,
  academicRankSchema,
  gradeScaleRowSchema,
  requestTypeSchema,
  requestStatusSchema,
  requestHistorySchema,
  orderSchema,
  notificationSchema,
  announcementSchema,
  deadlineSchema,
  scholarshipSchema,
};
