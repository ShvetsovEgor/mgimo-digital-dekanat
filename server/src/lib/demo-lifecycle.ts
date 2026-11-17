// «Холодный старт» демо-концепта.
//
// Бесплатные хостинги (Render Free) останавливают приложение после 15 минут бездействия и
// пересоздают файловую систему при старте — демо-БД снова становится «пустой» и наполняется сидом.
// Чтобы жюри в любой момент видело осмысленную ленту «Сегодня», сервер:
//   1) фиксирует момент первой инициализации демо-БД (seed_meta.initialized_at);
//   2) если с этого момента прошло больше DEMO_RESET_HOURS (по умолчанию 20 ч), при следующем
//      запросе к /api/meta (экран входа) пересобирает демо-данные и уведомляет открытую вкладку;
//   3) до первого seed (например, на Docker + томе — данных ещё нет) показывает «снимок экрана
//      на момент холодного старта» из server/seed-context (если он есть), без персональных данных.
//
// Важно: чужой сессии это не касается — пересоздаются только демо-данные с известными логинами,
// после чего каждая открытая вкладка просто выходит на экран входа.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { db } from '../db.js';
import { log } from '../http.js';
import { runSeed } from '../seed/run.js';
import { seedContextScreens } from '../seed/context-screens.js';

const RESET_HOURS = Number(process.env.DEMO_RESET_HOURS ?? 20);
const DEVICE_ID = 'demo-server';

function ensureMetaTable(): void {
  db.exec(`CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
}

export function getSeedMeta(key: string): string | null {
  ensureMetaTable();
  const row = db.prepare('SELECT value FROM seed_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSeedMeta(key: string, value: string): void {
  ensureMetaTable();
  db.prepare(
    `INSERT INTO seed_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

/** Подхватывает метки времени, записанные seed-скриптом. */
export function syncSeedContext(): void {
  try {
    seedContextScreens();
  } catch (err) {
    log('warn', 'demo', { msg: 'seed context failed', error: err instanceof Error ? err.message : 'unknown' });
  }
}

/** Снимки экранов «холодного старта» (PNG), отдаются публично, но без персональных данных сверх демо-аккаунтов. */
export function contextScreens(): { name: string; file: string }[] {
  const dir = path.join(config.root, 'server', 'seed-context');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => ({ name: f.replace(/\.png$/, ''), file: path.join(dir, f) }));
}

let resetTimer: NodeJS.Timeout | null = null;
// Не чаще одной пересборки за 10 минут: каждый пересозданный запрос к /api/meta иначе запускает seed («холодный старт»).
let lastResetAt = 0;
const RESET_COOLDOWN_MS = 10 * 60_000;

/** Планирует пересборку демо-данных, когда истечёт «срок жизни» текущей демо-БД. */
export function scheduleDemoReset(): void {
  if (resetTimer) clearTimeout(resetTimer);
  const initialized = getSeedMeta('initialized_at') ?? getSeedMeta('last_seed_at');
  if (!initialized) return;
  const ageMs = Date.now() - new Date(initialized).getTime();
  const leftMs = RESET_HOURS * 3_600_000 - ageMs;
  if (leftMs <= 0) {
    // Пересборка только после следующего «пробуждения» (запрос к /api/meta), а не сразу при старте,
    // чтобы при старте ещё не показывать ленту «из будущего».
    return;
  }
  resetTimer = setTimeout(() => resetDemoNow('expired'), Math.min(leftMs, 2 ** 31 - 1));
  resetTimer.unref();
}

function resetDemoNow(reason: string): void {
  try {
    runSeed();
    log('info', 'demo', { msg: 'demo data rebuilt', reason });
  } catch (err) {
    log('error', 'demo', { msg: 'demo reset failed', error: err instanceof Error ? err.message : 'unknown' });
  }
}

/** Вызывается из GET /api/meta (экран входа): если срок жизни демо-данных истёк — пересобираем. */
export function maybeResetExpiredDemo(): boolean {
  const initialized = getSeedMeta('initialized_at') ?? getSeedMeta('last_seed_at');
  if (!initialized) return false;
  const ageMs = Date.now() - new Date(initialized).getTime();
  if (ageMs < RESET_HOURS * 3_600_000) return false;
  if (Date.now() - lastResetAt < RESET_COOLDOWN_MS) return false;
  lastResetAt = Date.now();
  resetDemoNow('expired');
  scheduleDemoReset();
  return true;
}

export function startDemoLifecycle(): void {
  ensureMetaTable();
  if (config.isProd && process.env.DEMO_AUTORESET === '0') return;
  scheduleDemoReset();
}

export const DEMO_DEVICE_ID = DEVICE_ID;
export const DEMO_RESET_HOURS = RESET_HOURS;
