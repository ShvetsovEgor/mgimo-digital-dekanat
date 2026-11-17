// Запуск seed: delete-all + вставка демо-данных. Идемпотентно (можно запускать многократно).
import { db, migrate } from '../db.js';
import { log } from '../http.js';
import { seedAll } from './data.js';

export function runSeed(now: Date = new Date()): void {
  migrate();
  seedAll(db, now);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  runSeed();
  log('info', 'seed', { msg: 'done', ms: Date.now() - t0 });
}
