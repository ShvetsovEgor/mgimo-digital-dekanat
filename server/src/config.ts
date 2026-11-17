import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');

// .env (простой парсер, без зависимостей). В проде переменные задаются платформой.
function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile(path.join(root, '.env'));

const isProd = process.env.NODE_ENV === 'production';

function requiredSecret(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length >= 16) return v;
  if (isProd) throw new Error(`[config] Missing required secret ${name} (set it in the environment)`);
  return crypto.createHash('sha256').update(`dev-only:${name}:${devFallback}`).digest('hex');
}

export const config = {
  isProd,
  root,
  port: Number(process.env.PORT ?? 8080),
  dataDir: process.env.DATA_DIR ?? path.join(root, 'data'),
  /** Отдельное имя файла БД (тесты) — приоритетнее каталога данных. */
  dbFile: process.env.DB_FILE ?? '',
  webDist: path.join(root, 'web', 'dist'),
  sessionCookie: isProd ? '__Host-dl_session' : 'dl_session',
  sessionTtlDays: 30,
  docSecret: requiredSecret('DOC_VERIFY_SECRET', 'docs'),
  ipSalt: process.env.IP_SALT ?? requiredSecret('DOC_VERIFY_SECRET', 'docs') + ':ip',
  trustProxy: process.env.TRUST_PROXY !== '0',
  publicUrl: process.env.PUBLIC_URL ?? '',
  demoPassword: process.env.DEMO_PASSWORD ?? 'DemoKonkurs2030',
  allowDevLogin: !isProd && process.env.ALLOW_DEV_LOGIN === '1',
};

export function publicBaseUrl(req: { protocol: string; get(name: string): string | undefined }): string {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '');
  const proto = (req.get('x-forwarded-proto')?.split(',')[0] || req.protocol || 'http').trim();
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost';
  return `${proto}://${host}`;
}
