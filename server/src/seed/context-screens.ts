// Снимки экранов «холодного старта»: PNG лежат рядом с исходниками (server/seed-context),
// а промежуток времени, к которому относится лента «Сегодня», хранится в seed_meta.
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';

export interface SeedContext {
  seedAt: string; // к какому моменту относятся демо-данные
  capturedAt: string; // когда сняты снимки
  screens: { name: string; title: string }[];
}

const TITLES: Record<string, string> = {
  login: 'Вход в кабинет',
  today: 'Лента «Сегодня»',
  schedule: 'Расписание недели',
  progress: 'Успеваемость',
  requests: 'Мои заявки',
  'request-new': 'Новая заявка',
  profile: 'Профиль студента',
  notifications: 'Уведомления',
  staff: 'Кабинет деканата',
};

export function contextDir(): string {
  return path.join(import.meta.dirname, '..', '..', 'seed-context');
}

export function seedContextScreens(): void {
  const dir = contextDir();
  if (!fs.existsSync(dir)) return;
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, ''));
  if (!names.length) {
    return;
  }
  const meta = fs.existsSync(path.join(dir, 'meta.json'))
    ? (JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) as { seedAt: string; capturedAt: string })
    : { seedAt: new Date().toISOString(), capturedAt: new Date().toISOString() };
  db.exec(`CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const put = db.prepare(
    `INSERT INTO seed_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  put.run('context_seed_at', meta.seedAt);
  put.run('context_captured_at', meta.capturedAt);
  put.run('context_screens', JSON.stringify(names));
}

export function readSeedContext(): SeedContext | null {
  try {
    const get = (key: string) => (db.prepare('SELECT value FROM seed_meta WHERE key = ?').get(key) as { value: string } | undefined)?.value;
    const raw = get('context_screens');
    if (!raw) return null;
    const names = JSON.parse(raw) as string[];
    return {
      seedAt: get('context_seed_at') ?? '',
      capturedAt: get('context_captured_at') ?? '',
      screens: names.map((n) => ({ name: n, title: TITLES[n] ?? n })),
    };
  } catch {
    return null;
  }
}
