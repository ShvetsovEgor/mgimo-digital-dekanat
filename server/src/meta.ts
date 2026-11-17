// Метаданные демо-стенда: конкурс, вуз, дилер-аккаунты для жюри (пароль публичный, см. docs/DATA.md).
import { config } from './config.js';
import { db } from './db.js';
import { getToday, type TodayResult } from './today.js';

export const APP_NAME = 'Дедлайн';
export const APP_SUBTITLE = 'Цифровой деканат 2030';
export const CONTEST = { name: 'Кибербезопасность и ИИ в высшей школе — 2026', year: 2026 };
export const UNIVERSITY = 'МГИМО МИД России (концепт, неофициальный сервис)';
export const DISCLAIMER =
  'Демонстрационный прототип для конкурса VK Education. Не является официальным сервисом университета, ' +
  'не подключён к системам вуза. Все ФИО, номера и контакты вымышлены.';

export interface DemoAccount {
  login: string;
  password: string;
  name: string;
  role: 'student' | 'staff';
  note: string;
}

const ACCOUNT_NOTES: Record<string, { role: 'student' | 'staff'; note: string }> = {
  'a.ivanova': { role: 'student', note: '2 курс, МО-2-3 — сильная успеваемость, 4 «автомата»' },
  'd.smirnov': { role: 'student', note: '2 курс, МО-2-7 — рискует «автоматом», есть отклонённая заявка' },
  'm.karimova': { role: 'student', note: '1 курс, МП-1-2 — много дедлайнов, модульные оценки ещё не выставлены' },
  dekanat: { role: 'staff', note: 'Специалист деканата МО — заявки, объявления, ответы' },
};

/** Аккаунты берутся из БД (кто реально существует в демо-базе), пароль — демо-пароль из env. */
export function demoAccounts(): DemoAccount[] {
  const rows = db
    .prepare(
      `SELECT u.login, COALESCE(p.last_name || ' ' || p.first_name, s.full_name) AS name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN staff_profiles s ON s.user_id = u.id
       ORDER BY u.id`,
    )
    .all() as Array<{ login: string; name: string | null }>;
  return rows.map((r) => {
    const meta = ACCOUNT_NOTES[r.login] ?? { role: 'student' as const, note: 'Демонстрационный аккаунт' };
    return {
      login: r.login,
      password: config.demoPassword,
      name: r.name ?? r.login,
      role: meta.role,
      note: meta.note,
    };
  });
}

export interface MetaResponse {
  demo: true;
  appName: string;
  appSubtitle: string;
  contest: { name: string; year: number };
  university: string;
  disclaimer: string;
  accounts: DemoAccount[];
  today: TodayResult;
}

export function buildMeta(today: TodayResult): MetaResponse {
  return {
    demo: true,
    appName: APP_NAME,
    appSubtitle: APP_SUBTITLE,
    contest: CONTEST,
    university: UNIVERSITY,
    disclaimer: DISCLAIMER,
    accounts: demoAccounts(),
    today,
  };
}

export function currentToday(): TodayResult {
  return getToday();
}
