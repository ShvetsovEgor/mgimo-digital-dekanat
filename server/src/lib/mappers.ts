// Преобразование строк БД в схемы контракта API (единственное место маппинга).
import type { z } from 'zod';
import type { schemas } from '../contract.js';
import { dateTimeLabel, daysRelativeLabel, dayMonthLabel, relativeDateTimeLabel, shortDueLabel } from './format.js';
import { formatClock, parseLocal } from './time.js';
import { signDocumentToken } from './doc-sign.js';

// Типы ответов берём из zod-схем контракта — фронтенд ждёт именно их.
export type Profile = z.infer<typeof schemas.profileSchema>;
export type DeaneryContact = z.infer<typeof schemas.deaneryContactSchema>;
export type WeekEntry = z.infer<typeof schemas.weekEntrySchema>;
export type ScheduleChange = z.infer<typeof schemas.scheduleChangeSchema>;
export type TodayLecture = z.infer<typeof schemas.todayLectureSchema>;
export type ScheduleWeek = z.infer<typeof schemas.scheduleWeekSchema>;
export type ScheduleToday = z.infer<typeof schemas.scheduleTodaySchema>;
export type Discipline = z.infer<typeof schemas.disciplineSchema>;
export type RatingSummary = z.infer<typeof schemas.ratingSummarySchema>;
export type SessionExam = z.infer<typeof schemas.sessionExamSchema>;
export type TranscriptRow = z.infer<typeof schemas.transcriptRowSchema>;
export type AcademicRank = z.infer<typeof schemas.academicRankSchema>;
export type GradeScaleRow = z.infer<typeof schemas.gradeScaleRowSchema>;
export type RequestType = z.infer<typeof schemas.requestTypeSchema>;
export type Order = z.infer<typeof schemas.orderSchema>;
export type OrderHistory = z.infer<typeof schemas.requestHistorySchema>;
export type Notification = z.infer<typeof schemas.notificationSchema>;
export type Announcement = z.infer<typeof schemas.announcementSchema>;
export type Deadline = z.infer<typeof schemas.deadlineSchema>;
export type RequestStatus = z.infer<typeof schemas.requestStatusSchema>;
export type NotificationType = Notification['type'];
export type AnnouncementCategory = Announcement['category'];
export type EntryKind = WeekEntry['kind'];
export type ChangeKind = NonNullable<WeekEntry['change']>['kind'];

// ---------------------------------------------------------------------------
// Общие хелперы
// ---------------------------------------------------------------------------
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** «22 декабря» */
export function dateLabel(iso: string): string {
  return dayMonthLabel(parseLocal(iso));
}

export function clockLabel(iso: string): string {
  const d = parseLocal(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Номер зачётки маскируется: «****0481». */
export function maskRecordBook(recordBook: string): string {
  const digits = recordBook.replace(/\D/g, '');
  const tail = digits.slice(-4) || recordBook.slice(-4);
  return `****${tail}`;
}

/** «1 семестр 2026/27»: сентябрь–январь — 1 семестр, февраль–август — 2 семестр. */
export function semesterLabel(now: Date): string {
  const academicStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const term = now.getMonth() >= 8 || now.getMonth() === 0 ? 1 : 2;
  return `${term} семестр ${academicStart}/${String(academicStart + 1).slice(2)}`;
}

/** Учебный год «2026/27». */
export function academicYearLabel(now: Date): string {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Профиль и деканат
// ---------------------------------------------------------------------------
export interface ProfileRow {
  last_name: string;
  first_name: string;
  middle_name: string;
  faculty_short: string;
  faculty_full: string;
  program_code: string;
  program_name: string;
  study_form: string;
  course: number;
  group_code: string;
  subgroup: string | null;
  record_book: string;
  email: string;
  phone: string | null;
  telegram: string | null;
  enrollment_year: number;
  curator: string;
  funded: 'budget' | 'contract';
  scholarship_json: string | null;
  student_card_json: string | null;
}

export interface SecurityInfo {
  twoFactor: boolean;
  lastPasswordChange: string;
  activeSessions: number;
}

export interface FacultyRow {
  id: number;
  code: string;
  short_name: string;
  full_name: string;
  dean: string;
  office: string;
  building: string;
  phone: string;
  email: string;
  hours: string;
  secretary?: string;
}

const STUDY_FORM_LABELS: Record<string, string> = {
  full_time: 'Очная форма',
  part_time: 'Очно-заочная форма',
  evening: 'Вечерняя форма',
};

interface ScholarshipJson {
  title?: string;
  amount?: number;
}

interface StudentCardJson {
  dorm?: string | null;
  department?: string;
  verified?: boolean;
  verificationNote?: string;
}

export function toProfile(row: ProfileRow, security: SecurityInfo, now: Date): Profile {
  const card = parseJson<StudentCardJson>(row.student_card_json, {});
  const scholarship = parseJson<ScholarshipJson>(row.scholarship_json, {});
  const scholarshipLabel =
    scholarship.title && scholarship.amount != null
      ? `${scholarship.title} — ${scholarship.amount.toLocaleString('ru-RU')} ₽/мес`
      : scholarship.title ?? null;
  const middleInitial = row.middle_name ? `${row.middle_name.charAt(0)}. ` : '';
  return {
    firstName: row.first_name,
    fullName: `${row.last_name} ${row.first_name} ${row.middle_name}`.trim(),
    displayName: `${row.first_name} ${row.last_name}`,
    shortName: `${row.first_name.charAt(0)}. ${middleInitial}${row.last_name}`,
    initials: `${row.first_name.charAt(0)}${row.last_name.charAt(0)}`,
    course: row.course,
    courseOrdinal: `${row.course}-й курс`,
    group: row.group_code,
    subgroup: row.subgroup,
    program: row.program_name,
    programCode: row.program_code,
    degree: 'Бакалавриат',
    studyForm: STUDY_FORM_LABELS[row.study_form] ?? row.study_form,
    faculty: row.faculty_full,
    facultyShort: row.faculty_short,
    department: card.department ?? `Кафедра ${row.program_name.toLowerCase()}`,
    enrollmentYear: row.enrollment_year,
    semesterLabel: semesterLabel(now),
    recordBookMasked: maskRecordBook(row.record_book),
    email: row.email,
    phone: row.phone,
    telegram: row.telegram,
    funded: row.funded,
    fundedLabel: row.funded === 'budget' ? 'Бюджетное место' : 'Договорная основа',
    scholarship: scholarshipLabel,
    dorm: card.dorm ?? null,
    curator: row.curator,
    verification: {
      level: card.verified === false ? 1 : 2,
      label: card.verified === false ? 'Не подтверждён' : 'Подтверждён',
      note: card.verificationNote ?? 'Личность подтверждена через Госуслуги',
    },
    security,
  };
}

export function toDeanery(f: FacultyRow): DeaneryContact {
  return {
    office: `${f.short_name}, ${f.office}`,
    hours: f.hours,
    secretary: f.secretary ?? 'Секретариат деканата',
    dean: f.dean,
    email: f.email,
    phone: f.phone,
    building: f.building,
    responseTime: 'обычно отвечаем в течение рабочего дня',
  };
}

// ---------------------------------------------------------------------------
// Расписание
// ---------------------------------------------------------------------------
export const KIND_LABELS: Record<EntryKind, string> = {
  lecture: 'Лекция',
  seminar: 'Семинар',
  language: 'Языковая группа',
  physical: 'Физическая культура',
  consult: 'Консультация',
  exam: 'Экзамен',
};

export const CHANGE_LABELS: Record<ChangeKind, string> = {
  room: 'Аудитория изменена',
  cancelled: 'Отменено',
  moved: 'Перенос',
  added: 'Добавлено',
  time: 'Время изменено',
};

export interface EntryRow {
  id: number;
  group_code: string;
  subgroup: string | null;
  weekday: number;
  start_min: number;
  end_min: number;
  kind: EntryKind;
  course_code: string;
  title: string;
  teacher: string;
  room: string;
  building: string;
  week_type: 'all' | 'odd' | 'even';
  date: string | null;
  change_kind: ChangeKind | null;
  original_date: string | null;
  comment: string | null;
  published_by: string | null;
  published_at: string | null;
}

export interface ChangeMeta {
  note?: string;
  fromStartMin?: number;
  fromRoom?: string;
  publishedBy?: string;
}

/** «К1», «К2», «К3» — короткое имя корпуса для карточек. */
export function buildingShort(building: string): string {
  const m = /корп\.?\s*(\d)/i.exec(building);
  if (m) return `К${m[1]}`;
  return 'К1';
}

function clockMin(min: number): string {
  return formatClock(min);
}

export function changeMeta(row: EntryRow): ChangeMeta {
  return parseJson<ChangeMeta>(row.comment, {});
}

/** Подпись изменения: «Аудитория изменена: 218 → 224». */
export function changeNote(row: EntryRow): string {
  const meta = changeMeta(row);
  switch (row.change_kind) {
    case 'room':
      return `Аудитория изменена: ${meta.fromRoom ?? 'прежняя'} → ${row.room}`;
    case 'cancelled':
      return meta.note ?? 'Пара отменена деканатом';
    case 'moved':
      return (
        meta.note ??
        `Перенос${row.original_date ? ` с ${dateLabel(row.original_date)}` : ''}${meta.fromStartMin != null ? `, ${clockMin(meta.fromStartMin)}` : ''}`
      );
    case 'added':
      return meta.note ?? 'Добавлено в расписание';
    case 'time':
      return `Время изменено${meta.fromStartMin != null ? `: ${clockMin(meta.fromStartMin)} → ${clockMin(row.start_min)}` : ''}`;
    default:
      return 'Изменение в расписании';
  }
}

/** Метаданные изменения для карточки (кто и когда опубликовал). */
export function changeInfo(row: EntryRow, now: Date): NonNullable<WeekEntry['change']> | null {
  if (!row.change_kind) return null;
  const meta = changeMeta(row);
  return {
    kind: row.change_kind,
    note: changeNote(row),
    published: row.published_at ? relativeDateTimeLabel(row.published_at, now) : '—',
    publishedBy: meta.publishedBy ?? row.published_by ?? 'Деканат',
  };
}

/** Дата пары в конкретной неделе. */
export function entryDate(row: EntryRow, monday: Date): Date {
  const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  d.setDate(d.getDate() + (row.weekday - 1));
  return d;
}

export function toWeekEntry(row: EntryRow, weekDate: string, now: Date): WeekEntry {
  return {
    id: row.id,
    date: weekDate,
    movedTo: null,
    start: clockMin(row.start_min),
    end: clockMin(row.end_min),
    startMin: row.start_min,
    endMin: row.end_min,
    subject: row.title,
    subjectCode: row.course_code,
    kind: row.kind,
    kindLabel: KIND_LABELS[row.kind] ?? 'Занятие',
    teacher: row.teacher,
    room: row.room,
    building: row.building,
    buildingShort: buildingShort(row.building),
    group: row.group_code,
    subgroup: row.subgroup,
    change: changeInfo(row, now),
  };
}

// ---------------------------------------------------------------------------
// Успеваемость
// ---------------------------------------------------------------------------
export const ATTESTATION_LABELS: Record<Discipline['attestation'], string> = {
  credit: 'Зачёт',
  graded: 'Зачёт с оценкой',
  exam: 'Экзамен',
  offset: 'Зачёт',
};

export interface ControlPointInput {
  label: string;
  earned: number | null;
  max: number;
}

/** Контрольная точка хранится в БД как JSON: {label, earned, max}. */
export interface EnrollmentRow {
  user_id?: number;
  id: number;
  course_code: string;
  title: string;
  teacher: string;
  semester: string;
  attestation: 'credit' | 'graded' | 'exam';
  threshold: number;
  control_points_json: string;
  final_rating: number | null;
  final_grade: string | null;
  final_ects: string | null;
  exam_at: string | null;
  exam_room: string | null;
}

/** Сумма набранных баллов по контрольным точкам. */
export function earnedSum(points: ControlPointInput[]): number {
  return points.reduce((acc, p) => acc + (p.earned ?? 0), 0);
}

export function toDiscipline(row: EnrollmentRow): Discipline {
  const points = parseJson<ControlPointInput[]>(row.control_points_json, []);
  const rating = row.final_rating ?? Math.round(earnedSum(points));
  const autoReached = row.threshold > 0 && rating >= row.threshold;
  const toAuto = row.threshold > 0 && !autoReached ? Math.max(0, row.threshold - rating) : null;
  return {
    id: row.id,
    code: row.course_code,
    title: row.title,
    teacher: row.teacher,
    attestation: row.attestation,
    attestationLabel: ATTESTATION_LABELS[row.attestation],
    rating,
    threshold: row.threshold,
    toAuto,
    autoPossible: row.threshold > 0,
    autoReached,
    controlPoints: points.map((p) => ({ label: p.label, earned: p.earned, max: p.max })),
    examDate: row.exam_at ? dateLabel(row.exam_at) : null,
    examRoom: row.exam_room,
    finalGrade: row.final_grade,
    finalRating: row.final_rating,
  };
}

export function toSessionExam(row: EnrollmentRow): SessionExam {
  return {
    id: row.id,
    title: row.title,
    date: row.exam_at ? dateLabel(row.exam_at) : 'Дата не назначена',
    time: row.exam_at ? clockLabel(row.exam_at) : '—',
    room: row.exam_room ?? '—',
    teacher: row.teacher,
    form: row.attestation === 'exam' ? 'Экзамен' : row.attestation === 'graded' ? 'Зачёт с оценкой' : 'Зачёт',
    grade: row.final_grade,
    rating: row.final_rating,
  };
}

export function ratingSummary(rows: EnrollmentRow[], creditsEarnedYear: number, creditsPlanYear: number): RatingSummary {
  // В средний рейтинг идут только оцениваемые дисциплины (физкультура с порогом 0 не искажает средний балл).
  const rated = rows.map((r) => toDiscipline(r)).filter((d) => d.autoPossible && (d.rating > 0 || d.controlPoints.length > 0));
  const avg = rated.length ? rated.reduce((a, d) => a + d.rating, 0) / rated.length : 0;
  const avgRating = Math.round(avg * 10) / 10;
  const autoCount = rated.filter((d) => d.autoReached).length;
  const riskCount = rated.filter((d) => d.autoPossible && !d.autoReached && d.rating < d.threshold - 20).length;
  return {
    avgRating,
    avgLabel: `${Math.round(avgRating)}%`,
    autoCount,
    riskCount,
    creditsEarnedYear,
    creditsPlanYear,
  };
}

export interface PastRow {
  id: number;
  semester: string;
  course_title: string;
  credits: number;
  rating: number;
  grade: string;
  ects: string;
}

export function toTranscriptRow(row: PastRow): TranscriptRow {
  return {
    semester: row.semester,
    course: row.course_title,
    credits: row.credits,
    rating: row.rating,
    grade: row.grade,
    ects: row.ects,
  };
}

export interface RankRow {
  semester: string;
  place_group: number;
  group_size: number;
  place_program: number;
  program_size: number;
  cohort_avg: number;
  my_avg: number;
}

export function toAcademicRank(row: RankRow, groupCode: string): AcademicRank {
  return {
    semester: row.semester,
    placeGroup: row.place_group,
    group: groupCode,
    outOfGroup: row.group_size,
    placeProgram: row.place_program,
    outOfProgram: row.program_size,
    cohortAvg: row.cohort_avg,
    myAvg: row.my_avg,
    // Тренд позиции считается платформой по истории рейтинга; в демо-данных истории прошлых мест нет.
    trend: null,
  };
}

/** Шкала перевода баллов (регламент МГИМО для демо). */
export const GRADE_SCALE: GradeScaleRow[] = [
  { range: '90–100 %', five: 'Отлично', ects: 'A' },
  { range: '82–89 %', five: 'Отлично', ects: 'B' },
  { range: '75–81 %', five: 'Хорошо', ects: 'C' },
  { range: '67–74 %', five: 'Хорошо', ects: 'D' },
  { range: '60–66 %', five: 'Удовлетворительно', ects: 'E' },
  { range: '0–59 %', five: 'Неудовлетворительно', ects: 'F' },
];

export function gradeFromRating(rating: number): { grade: string; ects: string } {
  if (rating >= 90) return { grade: 'Отлично', ects: 'A' };
  if (rating >= 82) return { grade: 'Отлично', ects: 'B' };
  if (rating >= 75) return { grade: 'Хорошо', ects: 'C' };
  if (rating >= 67) return { grade: 'Хорошо', ects: 'D' };
  if (rating >= 60) return { grade: 'Удовлетворительно', ects: 'E' };
  return { grade: 'Неудовлетворительно', ects: 'F' };
}

// ---------------------------------------------------------------------------
// Заявки
// ---------------------------------------------------------------------------
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Ожидает проверки',
  in_progress: 'В работе',
  ready: 'Готово',
  rejected: 'Отклонено',
  cancelled: 'Отменено',
};

export const CATEGORY_LABELS: Record<'certificate' | 'application', string> = {
  certificate: 'Справка',
  application: 'Заявление',
};

export const TYPE_CATEGORY_LABELS: Record<'certificate' | 'application' | 'service', string> = {
  certificate: 'Справка',
  application: 'Заявление',
  service: 'Сервис',
};

export interface FormFieldJson {
  name: string;
  label: string;
  type: RequestType['fields'][number]['type'];
  required?: boolean;
  placeholder?: string | null;
  options?: Array<{ value: string; label: string }> | null;
  minLength?: number | null;
}

export interface RequestTypeRow {
  id: number;
  code: string;
  category: 'certificate' | 'application' | 'service';
  title: string;
  short: string;
  description: string;
  sla_label: string;
  sla_minutes: number;
  price: string;
  form_json: string;
  is_new: number;
}

interface FormJson {
  steps?: string[];
  fields?: FormFieldJson[];
}

/** Форма услуги: form_json = { steps: string[], fields: FormFieldJson[] }. */
export function formOf(formJson: string | null | undefined): { steps: string[]; fields: FormFieldJson[] } {
  const raw = parseJson<FormJson>(formJson, {});
  return { steps: Array.isArray(raw.steps) ? raw.steps : [], fields: Array.isArray(raw.fields) ? raw.fields : [] };
}

export function toRequestType(row: RequestTypeRow): RequestType & { slaMinutes: number } {
  const { fields, steps } = formOf(row.form_json);
  return {
    code: row.code,
    category: row.category === 'service' ? 'certificate' : row.category,
    categoryLabel: row.category === 'service' ? 'Сервис' : CATEGORY_LABELS[row.category],
    title: row.title,
    short: row.short,
    description: row.description,
    slaLabel: row.sla_label,
    price: row.price,
    isNew: row.is_new === 1,
    steps: steps.length ? steps : defaultSteps(row.category),
    fieldCount: fields.length,
    fields: fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      placeholder: f.placeholder ?? null,
      options: f.options ?? null,
      minLength: f.minLength ?? null,
    })),
    slaMinutes: row.sla_minutes,
  };
}

function defaultSteps(category: RequestTypeRow['category']): string[] {
  return category === 'application'
    ? ['Заполните заявление', 'Деканат проверит данные', 'Подпишите готовый документ']
    : ['Заполните заявление', 'Деканат подготовит документ', 'Скачайте PDF и покажите по месту требования'];
}

export interface RequestRow {
  id: number;
  number: string;
  user_id: number;
  department_id: number;
  type_code: string;
  type_title: string;
  category: 'certificate' | 'application' | 'service';
  status: RequestStatus;
  payload_json: string;
  comment: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  due_at: string;
  ready_at: string | null;
  processed_by: string | null;
  history_json: string;
}

export interface OrderInputContext {
  now: Date;
  formFields: FormFieldJson[];
}

/** Человекочитаемые поля заявки по схеме формы. */
export function orderFields(row: RequestRow, fields: FormFieldJson[]): Array<{ label: string; value: string }> {
  const values = parseJson<Record<string, unknown>>(row.payload_json, {});
  const out: Array<{ label: string; value: string }> = [];
  for (const f of fields) {
    const raw = values[f.name];
    if (raw === undefined || raw === null || raw === '') continue;
    let value: string;
    if (f.options && f.options.length) {
      const opt = f.options.find((o) => o.value === String(raw));
      value = opt ? opt.label : String(raw);
    } else if (typeof raw === 'boolean') {
      value = raw ? 'Да' : 'Нет';
    } else {
      value = String(raw);
    }
    out.push({ label: f.label, value });
  }
  return out;
}

/** Сообщение переписки по заявке: без персональных данных, только роль и текст. */
export function toRequestMessage(row: {
  id: number;
  author_role: 'student' | 'staff';
  body: string;
  created_at: string;
  author_name: string | null;
}): { id: number; author: 'student' | 'staff'; authorName: string; body: string; createdAtLabel: string } {
  return {
    id: row.id,
    author: row.author_role,
    authorName: row.author_name ?? (row.author_role === 'staff' ? 'Деканат' : 'Студент'),
    body: row.body,
    createdAtLabel: dateTimeLabel(row.created_at),
  };
}

export function toOrder(row: RequestRow, ctx: OrderInputContext): Order {
  const history = parseJson<OrderHistory[]>(row.history_json, []);
  const ready = row.status === 'ready';
  const canCancel = row.status === 'pending' || row.status === 'in_progress';
  const overdue =
    !ready &&
    (row.status === 'pending' || row.status === 'in_progress') &&
    parseLocal(row.due_at).getTime() < ctx.now.getTime();
  return {
    id: row.id,
    number: row.number,
    typeCode: row.type_code,
    typeTitle: row.type_title,
    category: row.category,
    status: row.status,
    statusLabel: REQUEST_STATUS_LABELS[row.status],
    statusNote: row.status === 'rejected' ? row.reject_reason : row.comment,
    createdAt: row.created_at,
    createdAtLabel: dateTimeLabel(row.created_at),
    dueAt: row.due_at,
    dueLabel: shortDueLabel(row.due_at),
    readyAtLabel: ready && row.ready_at ? dateTimeLabel(row.ready_at) : null,
    isOverdue: overdue,
    canCancel,
    canDownload: ready,
    verifyToken: ready ? signDocumentToken(row.number, Math.floor(parseLocal(row.ready_at ?? row.created_at).getTime() / 1000)) : null,
    fields: orderFields(row, ctx.formFields),
    rejectReason: row.reject_reason,
    history,
  };
}

/** Штатная история заявки: «Подана» → «На проверке в деканате» → «Готово». */
export const ORDER_STEPS = ['Подана', 'На проверке в деканате', 'Готово'] as const;

export function buildHistory(
  stepIndex: number,
  at: string,
  by: string | null,
  labels: string[] = [...ORDER_STEPS],
): OrderHistory[] {
  return labels.map((label, i) => ({
    label,
    at: i < stepIndex ? dateTimeLabel(at) : '—',
    by: i < stepIndex ? by : null,
    done: i < stepIndex,
    current: i === stepIndex,
  }));
}

// ---------------------------------------------------------------------------
// Уведомления / объявления / дедлайны
// ---------------------------------------------------------------------------
export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: number;
  created_at: string;
}

const NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'schedule',
  'grade',
  'request',
  'announcement',
  'deadline',
  'message',
  'info',
]);

export function toNotification(row: NotificationRow, now: Date): Notification {
  const type = NOTIFICATION_TYPES.has(row.type) ? (row.type as NotificationType) : 'info';
  return {
    id: row.id,
    type,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.created_at,
    createdAtLabel: dateTimeLabel(row.created_at),
    relative: relativeDateTimeLabel(row.created_at, now),
    read: row.read === 1,
  };
}

export const ANNOUNCEMENT_CATEGORIES: Record<AnnouncementCategory, string> = {
  study: 'Учёба',
  session: 'Сессия',
  documents: 'Документы',
  life: 'Жизнь факультета',
  important: 'Важно',
};

export interface AnnouncementRow {
  id: number;
  category: string;
  title: string;
  body: string;
  pinned: number;
  created_at: string;
  department_id: number | null;
  faculty_short: string | null;
}

export function toAnnouncement(row: AnnouncementRow, now: Date): Announcement {
  const category = (row.category in ANNOUNCEMENT_CATEGORIES
    ? row.category
    : 'important') as AnnouncementCategory;
  return {
    id: row.id,
    category,
    categoryLabel: ANNOUNCEMENT_CATEGORIES[category],
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    createdAtLabel: dateTimeLabel(row.created_at),
    scope: row.department_id === null ? 'Всем студентам' : `Факультет ${row.faculty_short ?? ''}`.trim(),
  };
}

export interface DeadlineRow {
  id: number;
  title: string;
  course_title: string;
  due_at: string;
  points: string;
  done: number | null;
}

export function toDeadline(row: DeadlineRow, now: Date): Deadline {
  return {
    id: row.id,
    title: row.title,
    course: row.course_title,
    dueAt: row.due_at,
    dueLabel: daysRelativeLabel(row.due_at, now),
    relative: daysRelativeLabel(row.due_at, now),
    points: row.points,
    done: row.done === 1,
  };
}
