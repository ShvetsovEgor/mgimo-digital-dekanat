import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });

export const dbPath = config.dbFile || path.join(config.dataDir, 'deadline.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('student','staff')),
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  theme TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS faculties (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dean TEXT NOT NULL,
  office TEXT NOT NULL,
  building TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  hours TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES faculties(id),
  program_code TEXT NOT NULL,
  program_name TEXT NOT NULL,
  study_form TEXT NOT NULL,
  course INTEGER NOT NULL,
  group_code TEXT NOT NULL,
  subgroup TEXT,
  record_book TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  enrollment_year INTEGER NOT NULL,
  curator TEXT NOT NULL,
  funded TEXT NOT NULL CHECK (funded IN ('budget','contract')),
  scholarship_json TEXT,
  student_card_json TEXT,
  telegram TEXT,
  notify_mode TEXT NOT NULL DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS curator_contacts (
  department_id INTEGER PRIMARY KEY REFERENCES faculties(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES faculties(id),
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  teacher TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  semester TEXT NOT NULL,
  attestation TEXT NOT NULL CHECK (attestation IN ('credit','graded','exam')),
  threshold INTEGER NOT NULL DEFAULT 70,
  control_points_json TEXT NOT NULL,
  final_rating INTEGER,
  final_grade TEXT,
  final_ects TEXT,
  exam_at TEXT,
  exam_room TEXT,
  UNIQUE (user_id, course_id, semester)
);

CREATE TABLE IF NOT EXISTS past_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  course_title TEXT NOT NULL,
  credits INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  grade TEXT NOT NULL,
  ects TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS academic_rank (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  place_group INTEGER NOT NULL,
  group_size INTEGER NOT NULL,
  place_program INTEGER NOT NULL,
  program_size INTEGER NOT NULL,
  cohort_avg INTEGER NOT NULL,
  my_avg INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES faculties(id),
  group_code TEXT NOT NULL,
  subgroup TEXT,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  kind TEXT NOT NULL,
  course_code TEXT NOT NULL,
  title TEXT NOT NULL,
  teacher TEXT NOT NULL,
  room TEXT NOT NULL,
  building TEXT NOT NULL,
  week_type TEXT NOT NULL DEFAULT 'all' CHECK (week_type IN ('all','odd','even')),
  date TEXT,
  change_kind TEXT,
  original_date TEXT,
  comment TEXT,
  published_by TEXT,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_schedule_group ON schedule_entries(group_code, weekday);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_user_id INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES faculties(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS request_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  short TEXT NOT NULL,
  description TEXT NOT NULL,
  sla_label TEXT NOT NULL,
  sla_minutes INTEGER NOT NULL,
  price TEXT NOT NULL,
  form_json TEXT NOT NULL,
  is_new INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES faculties(id),
  type_code TEXT NOT NULL REFERENCES request_types(code),
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','ready','rejected','cancelled')),
  payload_json TEXT NOT NULL,
  comment TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  ready_at TEXT,
  processed_by TEXT,
  history_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_dept ON requests(department_id, status);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES faculties(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','answered')),
  reply TEXT,
  created_at TEXT NOT NULL,
  replied_at TEXT,
  replied_by TEXT
);

CREATE TABLE IF NOT EXISTS request_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('student','staff')),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_messages_request ON request_messages(request_id);

CREATE TABLE IF NOT EXISTS deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_code TEXT NOT NULL,
  course_code TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  due_at TEXT NOT NULL,
  points TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deadline_done (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline_id INTEGER NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  done_at TEXT NOT NULL,
  PRIMARY KEY (user_id, deadline_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notif_reads (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id INTEGER NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS login_throttle (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  first_at INTEGER NOT NULL,
  blocked_until INTEGER
);
`;

export function migrate() {
  db.exec(SCHEMA);
}

export function isSeeded(): boolean {
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  return row.c > 0;
}
