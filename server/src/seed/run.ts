// Запуск seed: delete-all + вставка демо-данных. Идемпотентно (можно запускать многократно).
import fs from 'node:fs';
import path from 'node:path';
import { db, migrate } from '../db.js';
import { log } from '../http.js';
import { seedAll } from './data.js';

export function runSeed(now: Date = new Date()): void {
  migrate();
  seedAll(db, now);
  // Метки «холодного старта»: когда пересобраны демо-данные и к какому моменту относится лента.
  db.exec(`CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const stamp = (key: string, value: string) =>
    db.prepare('INSERT INTO seed_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  stamp('initialized_at', now.toISOString());
  stamp('last_seed_at', now.toISOString());
  // Снимки «холодного старта» фиксируют промежуток времени, к которому относятся демо-данные.
  const dir = path.join(import.meta.dirname, '..', '..', 'seed-context');
  const captured = fs.existsSync(path.join(dir, 'meta.json'))
    ? (JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) as { capturedAt: string }).capturedAt
    : now.toISOString();
  stamp('context_seed_at', captured);
  stamp('context_captured_at', captured);
  stamp(
    'context_screens',
    JSON.stringify(
      fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')) : [],
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  runSeed();
  log('info', 'seed', { msg: 'done', ms: Date.now() - t0 });
}
