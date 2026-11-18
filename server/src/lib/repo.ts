// Слой доступа к данным: запросы с обязательной проверкой владельца (user_id)
// и факультета (department_id). Всё «чужое» для API выглядит как отсутствующее.
import { db } from '../db.js';
import { countActiveSessions } from './auth.js';
import { toLocalIso } from './time.js';
import type {
  AnnouncementRow,
  DeadlineRow,
  EnrollmentRow,
  EntryRow,
  FacultyRow,
  NotificationRow,
  NotificationType,
  PastRow,
  ProfileRow,
  RankRow,
  RequestRow,
  RequestTypeRow,
} from './mappers.js';

// ---------------------------------------------------------------------------
// Пользователь и профиль
// ---------------------------------------------------------------------------
export interface UserRow {
  id: number;
  role: 'student' | 'staff';
  login: string;
  password_hash: string;
}

export function findUserByLogin(login: string): UserRow | undefined {
  return db.prepare('SELECT id, role, login, password_hash FROM users WHERE login = ?').get(login) as
    | UserRow
    | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT id, role, login, password_hash FROM users WHERE id = ?').get(id) as
    | UserRow
    | undefined;
}

/** Профиль именно текущего пользователя (ownership по сессии, а не по параметру). */
export function getProfileRow(userId: number): ProfileRow | undefined {
  return db
    .prepare(
      `SELECT p.last_name, p.first_name, p.middle_name, f.short_name AS faculty_short,
              f.full_name AS faculty_full, p.program_code, p.program_name, p.study_form,
              p.course, p.group_code, p.subgroup, p.record_book, p.email, p.phone, p.telegram,
              p.enrollment_year, p.curator, p.funded, p.scholarship_json, p.student_card_json
       FROM profiles p JOIN faculties f ON f.id = p.department_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as ProfileRow | undefined;
}

export interface StaffProfileRow {
  user_id: number;
  full_name: string;
  position: string;
  department_id: number;
  email: string;
}

export function getStaffProfile(userId: number): StaffProfileRow | undefined {
  return db
    .prepare('SELECT user_id, full_name, position, department_id, email FROM staff_profiles WHERE user_id = ?')
    .get(userId) as StaffProfileRow | undefined;
}

/** Факультет студента (по профилю) — важен для scope объявлений и заявок. */
export function departmentIdOfStudent(userId: number): number | null {
  const row = db.prepare('SELECT department_id FROM profiles WHERE user_id = ?').get(userId) as
    | { department_id: number }
    | undefined;
  return row?.department_id ?? null;
}

export function getFaculty(id: number): FacultyRow | undefined {
  const row = db
    .prepare(
      `SELECT id, code, short_name, full_name, dean, office, building, phone, email, hours,
              (SELECT full_name FROM staff_profiles WHERE department_id = faculties.id ORDER BY user_id LIMIT 1) AS secretary
       FROM faculties WHERE id = ?`,
    )
    .get(id) as (FacultyRow & { secretary: string | null }) | undefined;
  if (!row) return undefined;
  return { ...row, secretary: row.secretary ? shortStaffName(row.secretary) : undefined };
}

export function getFacultyByCode(code: string): FacultyRow | undefined {
  const row = db.prepare('SELECT id FROM faculties WHERE code = ?').get(code) as { id: number } | undefined;
  return row ? getFaculty(row.id) : undefined;
}

/** «Ольга Николаевна Пахомова» → «О. Н. Пахомова». */
export function shortStaffName(fullName: string): string {
  const [last, first, middle] = fullName.split(/\s+/);
  if (!last || !first) return fullName;
  return `${first.charAt(0)}. ${middle ? middle.charAt(0) + '. ' : ''}${last}`;
}

export function securityInfo(userId: number, twoFactor: boolean): {
  twoFactor: boolean;
  lastPasswordChange: string;
  activeSessions: number;
} {
  const row = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId) as
    | { created_at: string }
    | undefined;
  return {
    twoFactor,
    // Пути смены пароля не храним в БД (схема неизменяема) — показываем дату создания аккаунта.
    lastPasswordChange: row?.created_at ?? '—',
    activeSessions: countActiveSessions(userId),
  };
}

export function updateProfileContact(
  userId: number,
  patch: { phone?: string; telegram?: string },
): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.phone !== undefined) {
    sets.push('phone = ?');
    values.push(patch.phone || null);
  }
  if (patch.telegram !== undefined) {
    sets.push('telegram = ?');
    values.push(patch.telegram || null);
  }
  if (!sets.length) return;
  values.push(userId);
  db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`).run(...values);
}

/** Двухфакторная аутентификация хранится в заметке профиля (демо). */
export function setTwoFactor(userId: number, enabled: boolean): void {
  const row = db.prepare('SELECT notify_mode, student_card_json FROM profiles WHERE user_id = ?').get(userId) as
    | { notify_mode: string; student_card_json: string | null }
    | undefined;
  if (!row) return;
  let card: Record<string, unknown> = {};
  try {
    card = row.student_card_json ? (JSON.parse(row.student_card_json) as Record<string, unknown>) : {};
  } catch {
    card = {};
  }
  card.twoFactor = enabled;
  db.prepare('UPDATE profiles SET student_card_json = ? WHERE user_id = ?').run(JSON.stringify(card), userId);
}

export function isTwoFactor(userId: number): boolean {
  const row = db.prepare('SELECT student_card_json FROM profiles WHERE user_id = ?').get(userId) as
    | { student_card_json: string | null }
    | undefined;
  if (!row?.student_card_json) return false;
  try {
    return (JSON.parse(row.student_card_json) as { twoFactor?: boolean }).twoFactor === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Расписание
// ---------------------------------------------------------------------------
/** Расписание группы: все пары группы и подгруппы (NULL = вся группа). */
export function scheduleForGroup(groupCode: string): EntryRow[] {
  return db
    .prepare(
      `SELECT id, group_code, subgroup, weekday, start_min, end_min, kind, course_code, title, teacher,
              room, building, week_type, date, change_kind, original_date, comment, published_by, published_at
       FROM schedule_entries WHERE group_code = ? ORDER BY weekday, start_min, id`,
    )
    .all(groupCode) as EntryRow[];
}

export interface FacultyInfo {
  short_name: string;
  full_name: string;
}

export function studentGroup(userId: number): { group: string; subgroup: string | null } | undefined {
  const row = db.prepare('SELECT group_code, subgroup FROM profiles WHERE user_id = ?').get(userId) as
    | { group_code: string; subgroup: string | null }
    | undefined;
  return row ? { group: row.group_code, subgroup: row.subgroup } : undefined;
}

// ---------------------------------------------------------------------------
// Успеваемость
// ---------------------------------------------------------------------------
export function enrollments(userId: number): EnrollmentRow[] {
  return db
    .prepare(
      `SELECT e.id, c.code AS course_code, c.title, c.teacher, e.semester, e.attestation, e.threshold,
              e.control_points_json, e.final_rating, e.final_grade, e.final_ects, e.exam_at, e.exam_room
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? ORDER BY e.id`,
    )
    .all(userId) as EnrollmentRow[];
}

export function pastResults(userId: number): PastRow[] {
  return db
    .prepare(
      `SELECT id, semester, course_title, credits, rating, grade, ects
       FROM past_results WHERE user_id = ? ORDER BY id`,
    )
    .all(userId) as PastRow[];
}

export function academicRankRow(userId: number): RankRow | undefined {
  return db
    .prepare(
      `SELECT semester, place_group, group_size, place_program, program_size, cohort_avg, my_avg
       FROM academic_rank WHERE user_id = ?`,
    )
    .get(userId) as RankRow | undefined;
}

/** План кредитов на учебный год (регламент бакалавриата — 60). */
export const CREDITS_PLAN_YEAR = 60;

/** Зачёты (кредиты) по всем пройденным дисциплинам без «неудовлетворительно». */
export function creditsEarned(userId: number): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(credits), 0) AS c FROM past_results WHERE user_id = ? AND grade <> ?')
    .get(userId, 'Неудовлетворительно') as { c: number };
  return row.c;
}

// ---------------------------------------------------------------------------
// Заявки
// ---------------------------------------------------------------------------
export interface RequestTypeFullRow extends RequestTypeRow {
  sla_minutes: number;
}

export function requestTypes(): RequestTypeFullRow[] {
  return db
    .prepare(
      `SELECT id, code, category, title, short, description, sla_label, sla_minutes, price, form_json, is_new
       FROM request_types ORDER BY id`,
    )
    .all() as RequestTypeFullRow[];
}

export function requestTypeByCode(code: string): RequestTypeFullRow | undefined {
  return db
    .prepare(
      `SELECT id, code, category, title, short, description, sla_label, sla_minutes, price, form_json, is_new
       FROM request_types WHERE code = ?`,
    )
    .get(code) as RequestTypeFullRow | undefined;
}

const REQUEST_SELECT = `SELECT r.id, r.number, r.user_id, r.department_id, r.type_code,
       t.title AS type_title, t.category, t.form_json AS type_form_json,
       r.status, r.payload_json, r.comment, r.reject_reason, r.created_at, r.updated_at,
       r.due_at, r.ready_at, r.processed_by, r.history_json
  FROM requests r JOIN request_types t ON t.code = r.type_code`;

export type RequestFullRow = RequestRow & { type_form_json: string };

export function requestByIdForUser(id: number, userId: number): RequestFullRow | undefined {
  return db.prepare(`${REQUEST_SELECT} WHERE r.id = ? AND r.user_id = ?`).get(id, userId) as
    | RequestFullRow
    | undefined;
}

export function requestsForUser(userId: number): RequestFullRow[] {
  return db
    .prepare(
      `${REQUEST_SELECT} WHERE r.user_id = ? ORDER BY CASE r.status WHEN 'ready' THEN 0 WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END, r.created_at DESC, r.id DESC`,
    )
    .all(userId) as RequestFullRow[];
}

/** Следующий номер серии 000123. Вызывать внутри транзакции создания заявки. */
export function nextRequestNumber(): string {
  const row = db.prepare('SELECT COUNT(*) AS c FROM requests').get() as { c: number };
  return `ЗВ-2030-${String(row.c + 1).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Уведомления
// ---------------------------------------------------------------------------
export function notificationsFor(userId: number): NotificationRow[] {
  return db
    .prepare(
      // Прочтение хранится отдельно (notif_reads): демо-сид пересобирает ленту при каждом деплое,
      // а отметки жюри «прочитано» и уже просмотренные записи остаются прочитанными.
      `SELECT n.id, n.type, n.title, n.body, n.link,
              CASE WHEN n.read = 1 OR EXISTS (
                SELECT 1 FROM notif_reads r WHERE r.user_id = n.user_id AND r.notification_id = n.id
              ) THEN 1 ELSE 0 END AS read,
              n.created_at
       FROM notifications n
       WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC`,
    )
    .all(userId) as NotificationRow[];
}

export function addNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  link: string | null,
  createdAt: string,
): void {
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, link, read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
  ).run(userId, type, title, body, link, createdAt);
}

// ---------------------------------------------------------------------------
// Объявления
// ---------------------------------------------------------------------------
/** Объявления: общие (department_id IS NULL) + своего факультета. */
export function announcementsFor(departmentId: number | null): AnnouncementRow[] {
  return db
    .prepare(
      `SELECT a.id, a.category, a.title, a.body, a.pinned, a.created_at, a.department_id,
              f.short_name AS faculty_short
       FROM announcements a LEFT JOIN faculties f ON f.id = a.department_id
       WHERE a.department_id IS NULL OR a.department_id = ?
       ORDER BY a.pinned DESC, a.created_at DESC, a.id DESC`,
    )
    .all(departmentId ?? -1) as AnnouncementRow[];
}

// ---------------------------------------------------------------------------
// Дедлайны
// ---------------------------------------------------------------------------
export function deadlinesFor(userId: number, groupCode: string): DeadlineRow[] {
  return db
    .prepare(
      `SELECT d.id, d.title, c.title AS course_title, d.due_at, d.points,
              (SELECT 1 FROM deadline_done dd WHERE dd.deadline_id = d.id AND dd.user_id = ?) AS done
       FROM deadlines d LEFT JOIN courses c ON c.code = d.course_code
       WHERE d.group_code = ?
       ORDER BY d.due_at, d.id`,
    )
    .all(userId, groupCode) as DeadlineRow[];
}

export function deadlineExistsForGroup(deadlineId: number, groupCode: string): boolean {
  return Boolean(
    db.prepare('SELECT 1 FROM deadlines WHERE id = ? AND group_code = ?').get(deadlineId, groupCode),
  );
}

// ---------------------------------------------------------------------------
// Сообщения деканату
// ---------------------------------------------------------------------------
export interface MessageRow {
  id: number;
  user_id: number;
  department_id: number;
  subject: string;
  body: string;
  status: 'new' | 'answered';
  reply: string | null;
  created_at: string;
  replied_at: string | null;
  replied_by: string | null;
}

export function messagesForUser(userId: number): MessageRow[] {
  return db
    .prepare(
      `SELECT id, user_id, department_id, subject, body, status, reply, created_at, replied_at, replied_by
       FROM messages WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    )
    .all(userId) as MessageRow[];
}


// ---------------------------------------------------------------------------
// Сообщения: сотрудники
// ---------------------------------------------------------------------------
export interface StaffMessageRow extends MessageRow {
  student_name: string;
  group_code: string;
}

/** Новые вопросы студентов своего факультета (последние 50). */
export function messagesForDepartment(departmentId: number): StaffMessageRow[] {
  return db
    .prepare(
      `SELECT m.id, m.user_id, m.department_id, m.subject, m.body, m.status, m.reply, m.created_at,
              m.replied_at, m.replied_by,
              (p.last_name || ' ' || p.first_name) AS student_name, p.group_code
       FROM messages m JOIN profiles p ON p.user_id = m.user_id
       WHERE m.department_id = ?
       ORDER BY m.created_at DESC, m.id DESC LIMIT 50`,
    )
    .all(departmentId) as StaffMessageRow[];
}

/** Ответ сотрудника: только на сообщение своего факультета (иначе 0 изменений). */
export function replyToMessage(
  id: number,
  departmentId: number,
  reply: string,
  by: string,
  iso: string,
): number {
  const info = db
    .prepare(
      `UPDATE messages SET reply = ?, replied_at = ?, replied_by = ?, status = 'answered'
       WHERE id = ? AND department_id = ?`,
    )
    .run(reply, iso, by, id, departmentId);
  return info.changes;
}


/** Заявки факультета для кабинета сотрудника. */
export function requestsForDepartment(departmentId: number, status?: string): RequestFullRow[] {
  const where = status && status !== 'all' ? 'AND r.status = ?' : '';
  const params: unknown[] = [departmentId];
  if (where) params.push(status);
  return db
    .prepare(`${REQUEST_SELECT} WHERE r.department_id = ? ${where} ORDER BY r.created_at DESC, r.id DESC`)
    .all(...params) as RequestFullRow[];
}

export function requestByIdForDepartment(id: number, departmentId: number): RequestFullRow | undefined {
  return db.prepare(`${REQUEST_SELECT} WHERE r.id = ? AND r.department_id = ?`).get(id, departmentId) as
    | RequestFullRow
    | undefined;
}

export function studentRefById(userId: number): { name: string; group: string; login: string } | undefined {
  const row = db
    .prepare(
      `SELECT p.last_name, p.first_name, p.group_code, u.login
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    )
    .get(userId) as { last_name: string; first_name: string; group_code: string; login: string } | undefined;
  if (!row) return undefined;
  return { name: `${row.last_name} ${row.first_name}`, group: row.group_code, login: row.login };
}

/** Студенты факультета — для рассылки объявления и статистики. */
export function studentsOfDepartment(departmentId: number): Array<{ user_id: number; login: string; name: string; group_code: string }> {
  return db
    .prepare(
      `SELECT p.user_id, u.login, (p.last_name || ' ' || p.first_name) AS name, p.group_code
       FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.department_id = ? ORDER BY p.group_code, p.last_name`,
    )
    .all(departmentId) as Array<{ user_id: number; login: string; name: string; group_code: string }>;
}

export function departmentStats(departmentId: number, now: Date): Record<string, number> {
  const count = (sql: string, ...extra: unknown[]): number =>
    (db.prepare(sql).get(departmentId, ...extra) as { c: number }).c;
  const today = toLocalIso(now).slice(0, 10);
  return {
    new: count("SELECT COUNT(*) AS c FROM requests WHERE department_id = ? AND status = 'pending'"),
    inProgress: count("SELECT COUNT(*) AS c FROM requests WHERE department_id = ? AND status = 'in_progress'"),
    overdue: count(
      "SELECT COUNT(*) AS c FROM requests WHERE department_id = ? AND status IN ('pending','in_progress') AND due_at < ?",
      toLocalIso(now),
    ),
    readyToday: count(
      "SELECT COUNT(*) AS c FROM requests WHERE department_id = ? AND status = 'ready' AND substr(ready_at, 1, 10) = ?",
      today,
    ),
    newMessages: count("SELECT COUNT(*) AS c FROM messages WHERE department_id = ? AND status = 'new'"),
  };
}

export function insertAnnouncement(input: {
  authorUserId: number;
  departmentId: number | null;
  category: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}): number {
  const info = db
    .prepare(
      `INSERT INTO announcements (author_user_id, department_id, category, title, body, pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.authorUserId,
      input.departmentId,
      input.category,
      input.title,
      input.body,
      input.pinned ? 1 : 0,
      input.createdAt,
    );
  return Number(info.lastInsertRowid);
}

export function announcementById(id: number): AnnouncementRow | undefined {
  return db
    .prepare(
      `SELECT a.id, a.category, a.title, a.body, a.pinned, a.created_at, a.department_id,
              f.short_name AS faculty_short
       FROM announcements a LEFT JOIN faculties f ON f.id = a.department_id WHERE a.id = ?`,
    )
    .get(id) as AnnouncementRow | undefined;
}
