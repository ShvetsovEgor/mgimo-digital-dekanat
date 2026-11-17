// Скриншоты экранов демо-кабинета (мобильные 360 px + десктопные) → server/seed-context.
// Их показывает сервер на экране входа, если демо-БД ещё не создана («холодный старт» хостинга).
// Требует playwright-core и установленный Chrome (npm i -D playwright-core в корне — см. package.json).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const base = (process.argv[2] || 'http://127.0.0.1:8097').replace(/\/$/, '');
const out = process.argv[3] || path.join(process.cwd(), 'server', 'seed-context');
const password = process.env.DEMO_PASSWORD || 'DemoKonkurs2030';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
const errors = [];

function newContext(viewport, storageState) {
  return browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: viewport.width < 500, hasTouch: viewport.width < 500,
    locale: 'ru-RU', timezoneId: 'Europe/Moscow', storageState,
  });
}
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/40[13]/.test(m.text())) errors.push(`${who}: ${m.text()}`); });
};
async function shotMobile(page, route, name) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 360) problems.push(`${route}: horizontal ${sw}px`);
}

// 1. Экран входа (без «холодного старта», чтобы не было галереи снимков внутри снимка)
const loginCtx = await newContext({ width: 360, height: 740 });
const loginPage = await loginCtx.newPage();
watch(loginPage, 'login');
await loginPage.goto(base + '/login', { waitUntil: 'networkidle' });
await loginPage.waitForTimeout(500);
await loginPage.screenshot({ path: `${out}/login.png`, fullPage: true });
await loginCtx.close();

async function student(login) {
  const ctx = await newContext({ width: 360, height: 740 });
  const page = await ctx.newPage();
  watch(page, login);
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete=username], input[name=login]', login);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await page.waitForTimeout(600);
  return { ctx, page };
}

// 2. Основные экраны студента
const anna = await student('a.ivanova');
for (const [route, name] of [['/', 'today'], ['/schedule', 'schedule'], ['/progress', 'progress'], ['/requests', 'requests'], ['/requests/new', 'request-new'], ['/notifications', 'notifications'], ['/profile', 'profile']]) {
  await shotMobile(anna.page, route, name);
}
const orderId = await anna.page.evaluate(async () => {
  const r = await fetch('/api/requests', { credentials: 'same-origin' }).then((x) => x.json());
  return r.data.find((o) => o.status === 'ready')?.id ?? r.data[0]?.id;
});
if (orderId) await shotMobile(anna.page, `/requests/${orderId}`, 'request-detail');
const storage = await anna.ctx.storageState();
await anna.ctx.close();

// 3. Студент в зоне риска
const dmitry = await student('d.smirnov');
await shotMobile(dmitry.page, '/progress', 'progress-risk');
await shotMobile(dmitry.page, '/requests', 'requests-rejected');
await dmitry.ctx.close();

// 4. Кабинет деканата
const staff = await student('dekanat');
await shotMobile(staff.page, '/staff', 'staff');
await staff.ctx.close();

// 5. Десктоп
const desk = await newContext({ width: 1440, height: 900 }, storage);
const deskPage = await desk.newPage();
watch(deskPage, 'desktop');
for (const [route, name] of [['/', 'desktop-today'], ['/schedule', 'desktop-schedule'], ['/progress', 'desktop-progress'], ['/requests', 'desktop-requests']]) {
  await deskPage.goto(base + route, { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(600);
  await deskPage.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
await desk.close();
await browser.close();
const meta = { seedAt: new Date().toISOString(), capturedAt: new Date().toISOString() };
fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 2));
if (errors.length) console.log('ОШИБКИ СТРАНИЦ:\n' + errors.join('\n'));
if (problems.length) console.log('ПРОБЛЕМЫ РАСКЛАДКИ:\n' + problems.join('\n'));
console.log(`Готово: ${fs.readdirSync(out).filter((f) => f.endsWith('.png')).length} снимков → ${out}`);
process.exit(errors.length || problems.length ? 1 : 0);
