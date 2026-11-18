// Типы API «Дедлайн · Цифровой деканат 2030».
// Ручная копия `server/src/contract.ts` — без рантайм-зависимости от zod в бандле.

// ---------------------------------------------------------------------------
// Конверт и ошибки
// ---------------------------------------------------------------------------
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: ApiFieldError[];
}

export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody };

// ---------------------------------------------------------------------------
// Авторизация и meta
// ---------------------------------------------------------------------------
export interface StudentRef {
  login: string;
  name: string;
  group: string;
}

export type UserRole = 'student' | 'staff';

export interface MetaAccount {
  login: string;
  password: string;
  name: string;
  role: UserRole;
  note: string;
}

export interface Meta {
  demo: boolean;
  appName: string;
  appSubtitle: string;
  contest: { name: string; year: number };
  university: string;
  disclaimer: string;
  accounts: MetaAccount[];
  today: string;
  /** Момент, к которому относятся демо-данные. */
  dataAsOf?: string | null;
  context?: SeedContext | null;
  /** true — демо-данные только что пересобраны сервером (все прежние сессии недействительны). */
  reset?: boolean;
  /** Публичные объявления деканатов для ленты на экране входа. */
  news?: NewsItem[];
}

export interface NewsItem {
  id: number;
  category: string;
  categoryLabel: string;
  title: string;
  body: string;
  relative: string;
  scope: string;
}

/** Снимки экранов на момент создания демо-данных («холодный старт» бесплатного хостинга). */
export interface SeedContext {
  seedAt: string;
  capturedAt: string;
  screens: { name: string; title: string }[];
}

export interface HealthInfo {
  status: 'ok';
  time: string;
}

export interface SessionUser {
  student: StudentRef;
}

// ---------------------------------------------------------------------------
// Профиль
// ---------------------------------------------------------------------------
export interface ProfileSecurity {
  twoFactor: boolean;
  lastPasswordChange: string;
  activeSessions: number;
}

export interface Profile {
  firstName: string;
  fullName: string;
  displayName: string;
  shortName: string;
  initials: string;
  course: number;
  courseOrdinal: string;
  group: string;
  subgroup: string | null;
  program: string;
  programCode: string;
  degree: string;
  studyForm: string;
  faculty: string;
  facultyShort: string;
  department: string;
  enrollmentYear: number;
  semesterLabel: string;
  recordBookMasked: string;
  email: string;
  phone: string | null;
  telegram: string | null;
  funded: 'budget' | 'contract';
  fundedLabel: string;
  scholarship: string | null;
  dorm: string | null;
  curator: string;
  verification: { level: number; label: string; note: string };
  security: ProfileSecurity;
}

export interface DeaneryContact {
  office: string;
  hours: string;
  secretary: string;
  dean: string;
  email: string;
  phone: string;
  building: string;
  responseTime: string;
}

export interface ProfileBundle {
  profile: Profile;
  deanery: DeaneryContact;
}

export interface ProfileUpdateInput {
  phone?: string;
  telegram?: string;
}

// ---------------------------------------------------------------------------
// Расписание
// ---------------------------------------------------------------------------
export type LessonKind = 'lecture' | 'seminar' | 'language' | 'physical' | 'consult' | 'exam';
export type ChangeKind = 'room' | 'cancelled' | 'moved' | 'added' | 'time';

export interface EntryChange {
  kind: ChangeKind;
  note: string;
  published: string;
  publishedBy: string;
}

export interface WeekEntry {
  id: number;
  date: string;
  movedTo: string | null;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  subject: string;
  subjectCode: string;
  kind: LessonKind;
  kindLabel: string;
  teacher: string;
  room: string;
  building: string;
  buildingShort: string;
  group: string;
  subgroup: string | null;
  change: EntryChange | null;
}

export interface ScheduleChange {
  entryId: number;
  kind: ChangeKind;
  kindLabel: string;
  subject: string;
  from: string;
  to: string | null;
  note: string;
  published: string;
  publishedBy: string;
  severity: 'info' | 'warning';
}

export interface WeekDay {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  monthLabel: string;
  isToday: boolean;
  isHoliday: boolean;
  entries: WeekEntry[];
}

export interface ScheduleWeek {
  weekStart: string;
  weekLabel: string;
  parity: 'odd' | 'even';
  parityLabel: string;
  days: WeekDay[];
  changes: ScheduleChange[];
}

export interface TodayLecture {
  entryId: number;
  subject: string;
  start: string;
  end: string;
  room: string;
  building: string;
  teacher: string;
  kindLabel: string;
  relative: string;
  isNow: boolean;
  status: 'upcoming' | 'now' | 'done';
}

export type TodayEntryStatus = 'upcoming' | 'now' | 'done' | 'cancelled' | 'moved_away';

export interface TodayEntry extends WeekEntry {
  status: TodayEntryStatus;
}

export interface ScheduleToday {
  dateLabel: string;
  weekParityLabel: string;
  universityDay: string;
  next: TodayLecture | null;
  now: string;
  total: number;
  done: number;
  finished: boolean;
  entries: TodayEntry[];
  changes: ScheduleChange[];
}

// ---------------------------------------------------------------------------
// Успеваемость
// ---------------------------------------------------------------------------
export interface ControlPoint {
  label: string;
  earned: number | null;
  max: number;
}

export interface Discipline {
  id: number;
  code: string;
  title: string;
  teacher: string;
  attestation: 'credit' | 'exam' | 'graded' | 'offset';
  attestationLabel: string;
  rating: number;
  threshold: number;
  toAuto: number | null;
  autoPossible: boolean;
  autoReached: boolean;
  controlPoints: ControlPoint[];
  examDate: string | null;
  examRoom: string | null;
  finalGrade: string | null;
  finalRating: number | null;
}

export interface RatingSummary {
  avgRating: number;
  avgLabel: string;
  autoCount: number;
  riskCount: number;
  creditsEarnedYear: number;
  creditsPlanYear: number;
}

export interface SessionExam {
  id: number;
  title: string;
  date: string;
  time: string;
  room: string;
  teacher: string;
  form: string;
  grade: string | null;
  rating: number | null;
}

export interface TranscriptRow {
  semester: string;
  course: string;
  credits: number;
  rating: number;
  grade: string;
  ects: string;
}

export interface AcademicRank {
  semester: string;
  placeGroup: number;
  group: string;
  outOfGroup: number;
  placeProgram: number;
  outOfProgram: number;
  cohortAvg: number;
  myAvg: number;
  trend: string | null;
}

export interface GradeScaleRow {
  range: string;
  five: string;
  ects: string;
}

export interface ProgressBundle {
  summary: RatingSummary;
  disciplines: Discipline[];
  session: SessionExam[];
  past: TranscriptRow[];
  rank: AcademicRank;
  scale: GradeScaleRow[];
}

// ---------------------------------------------------------------------------
// Заявки
// ---------------------------------------------------------------------------
export type RequestCategory = 'certificate' | 'application' | 'service';
export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'radio' | 'checkbox';

export interface FieldOption {
  value: string;
  label: string;
}

export interface RequestField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string | null;
  options: FieldOption[] | null;
  minLength: number | null;
}

export interface RequestType {
  code: string;
  category: RequestCategory;
  categoryLabel: string;
  title: string;
  short: string;
  description: string;
  slaLabel: string;
  price: string;
  isNew: boolean;
  steps: string[];
  fieldCount: number;
  fields: RequestField[];
}

export type RequestStatus = 'pending' | 'in_progress' | 'ready' | 'rejected' | 'cancelled';

export interface RequestTimelineStep {
  label: string;
  at: string;
  by: string | null;
  done: boolean;
  current: boolean;
}

export interface RequestFieldValue {
  label: string;
  value: string;
}

export interface Order {
  id: number;
  number: string;
  typeCode: string;
  typeTitle: string;
  category: RequestCategory;
  status: RequestStatus;
  statusLabel: string;
  statusNote: string | null;
  createdAt: string;
  createdAtLabel: string;
  dueAt: string;
  dueLabel: string;
  readyAtLabel: string | null;
  isOverdue: boolean;
  canCancel: boolean;
  canDownload: boolean;
  fields: RequestFieldValue[];
  rejectReason: string | null;
  history: RequestTimelineStep[];
}

export type RequestValue = string | boolean;
export type RequestValues = Record<string, RequestValue>;

export interface CreateRequestInput {
  typeCode: string;
  values: RequestValues;
}

// ---------------------------------------------------------------------------
// Уведомления, объявления, дедлайны, сообщения
// ---------------------------------------------------------------------------
export type NotificationType = 'schedule' | 'grade' | 'request' | 'announcement' | 'deadline' | 'message' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  createdAtLabel: string;
  relative: string;
  read: boolean;
}

export type AnnouncementCategory = 'study' | 'session' | 'documents' | 'life' | 'important';

export interface Announcement {
  id: number;
  category: AnnouncementCategory;
  categoryLabel: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  createdAtLabel: string;
  scope: string;
}

export interface DeadlineItem {
  id: number;
  title: string;
  course: string;
  dueAt: string;
  dueLabel: string;
  relative: string;
  points: string;
  done: boolean;
}

export interface QuestionMessage {
  id: number;
  subject: string;
  body: string;
  createdAtLabel: string;
  status: 'new' | 'answered';
  reply: string | null;
}

// ---------------------------------------------------------------------------
// Кабинет сотрудника
// ---------------------------------------------------------------------------
export interface StaffStats {
  new: number;
  inProgress: number;
  overdue: number;
  newMessages: number;
  readyToday: number;
}

export interface StaffOrder extends Order {
  student: { name: string; group: string; login: string };
}

export interface StaffMessage {
  id: number;
  subject: string;
  body: string;
  student: { name: string; group: string };
  createdAtLabel: string;
  status: 'new' | 'answered';
  reply: string | null;
}

export interface StaffRequestUpdate {
  status: RequestStatus;
  comment?: string;
  rejectReason?: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  forAll?: boolean;
}

// ---------------------------------------------------------------------------
// Проверка документа
// ---------------------------------------------------------------------------
export interface VerifyResult {
  verified: boolean;
  number?: string;
  issuedAt?: string;
}

// --- Калькулятор академической стипендии -----------------------------------
export type ScholarshipTier = 'none' | 'academic' | 'increased';

export interface ScholarshipRules {
  academicMin: number;
  increasedMin: number;
  academicAmount: number;
  increasedAmount: number;
  disclaimer: string;
}

export interface ScholarshipGap {
  id: number;
  title: string;
  rating: number;
  need: number;
  delta: number;
}

export interface ScholarshipResult {
  tier: ScholarshipTier;
  title: string;
  amount: number;
  gaps: ScholarshipGap[];
}

export interface ScholarshipDiscipline {
  id: number;
  title: string;
  rating: number;
}

export interface ScholarshipBundle {
  funded: 'budget' | 'contract';
  assigned: { title: string; amount: number } | null;
  rules: ScholarshipRules;
  disciplines: ScholarshipDiscipline[];
  result: ScholarshipResult;
}
