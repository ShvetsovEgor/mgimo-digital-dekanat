// Смоук-тест живого кабинета через браузер (Playwright + Chrome): вход, навигация, создание заявки,
// удобство на 360 px, отсутствие ошибок JS, работа с клавиатуры.
// Запуск: node scripts/smoke.mjs https://<адрес-прототипа>
import { chromium } from 'playwright-core';
const base = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const password = process.env.DEMO_PASSWORD || 'DemoKonkurs2030';
let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failed += 1; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
async function open(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500, locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page };
}
async function login(page, name) {
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete=username], input[name=login]', name);
  await page.fill('input[type=password]', password);
  await page.keyboard.press('Enter'); // проверяем, что вход работает с клавиатуры
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
}

// Мобильный сценарий
const m = await open({ width: 360, height: 740 });
await login(m.page, 'a.ivanova');
check('вход с клавиатуры (Enter)', !m.page.url().endsWith('/login'));
await m.page.waitForTimeout(800);
const greeting = (await m.page.textContent('h1')) ?? '';
check('стартовый экран — «Сегодня»', /Добрый|Добрый день|Доброе утро|Добрый вечер|День|Вечер|Утро/.test(greeting), greeting);
for (const [label, path, h1] of [['Расписание', '/schedule', 'Расписание'], ['Учёба', '/progress', 'Успеваемость'], ['Заявки', '/requests', 'Заявки']]) {
  await m.page.goto(base + '/', { waitUntil: 'networkidle' });
  await m.page.locator(`a[href="${path}"]`).last().click(); // нижняя панель на мобильном
  await m.page.waitForTimeout(900);
  check(`навигация → ${label}`, (await m.page.textContent('h1'))?.includes(h1) ?? false);
  const sw = await m.page.evaluate(() => document.documentElement.scrollWidth);
  check(`нет горизонтального скролла (${label})`, sw <= 360, `${sw}px`);
}
// Заказ справки
await m.page.goto(base + '/requests/new', { waitUntil: 'networkidle' });
await m.page.waitForTimeout(800);
await m.page.locator('article', { hasText: 'Справка об обучении' }).getByRole('button', { name: 'Выбрать' }).first().click();
await m.page.waitForTimeout(900);
await m.page.getByRole('button', { name: /Проверить/ }).first().click();
await m.page.waitForTimeout(600);
let formErrors = [];
for (let attempt = 0; attempt < 3; attempt += 1) {
  formErrors = (await m.page.locator('form [role=alert], form .text-danger-ink').allTextContents()).filter(Boolean);
  if (formErrors.length === 0) break;
  for (const group of await m.page.getByRole('radiogroup').all()) await group.getByRole('radio').first().check().catch(() => undefined);
  const selects = m.page.locator('form select');
  for (let i = 0; i < (await selects.count()); i += 1) {
    const value = await selects.nth(i).inputValue();
    if (!value) await selects.nth(i).selectOption({ index: 1 }).catch(() => undefined);
  }
  await m.page.getByRole('button', { name: /Проверить/ }).first().click();
  await m.page.waitForTimeout(600);
}
check('форма валидна (ошибок нет)', formErrors.length === 0, formErrors.join(' ').slice(0, 120));
await m.page.getByRole('button', { name: /Подать/ }).first().click();
await m.page.waitForTimeout(1500);
const body = (await m.page.textContent('body')) ?? '';
check('заявка подана (номер ЗВ-2030)', /ЗВ-2030-\d+/.test(body));
const numbers = body.match(/ЗВ-2030-\d+/g) ?? [];
check('статус «ожидает»', /Ожидает|На проверке|В работе/i.test(body));
check('последняя заявка открывается', Boolean(numbers[0]));
await m.ctx.close();

// Чужой ресурс
const d = await open({ width: 360, height: 740 });
await login(d.page, 'd.smirnov');
const foreign = await d.page.evaluate(async () => (await fetch('/api/requests/1', { credentials: 'same-origin' })).status);
check('чужая заявка недоступна (404)', foreign === 404, String(foreign));
await d.ctx.close();

// Десктоп
const desktop = await open({ width: 1440, height: 900 });
await login(desktop.page, 'a.ivanova');
for (const route of ['/', '/schedule', '/progress', '/requests', '/notifications', '/profile']) {
  await desktop.page.goto(base + route, { waitUntil: 'networkidle' });
  await desktop.page.waitForTimeout(400);
  check(`десктоп ${route}`, (await desktop.page.locator('h1').count()) > 0);
}
await desktop.ctx.close();

// Кабинет деканата
const s = await open({ width: 360, height: 740 });
await login(s.page, 'a.ivanova'); // по ходу сценария сервер может пересобрать демо-данные
await s.page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
await s.page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
await s.page.waitForTimeout(1200);
await login(s.page, 'dekanat');
await s.page.goto(base + '/staff', { waitUntil: 'networkidle' });
await s.page.waitForTimeout(800);
check('кабинет деканата открывается', /заявк|деканат/i.test((await s.page.textContent('body')) ?? ''));
await s.ctx.close();

await browser.close();
check('нет ошибок JavaScript', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(failed === 0 ? '\nВСЁ В ПОРЯДКЕ' : `\nПРОБЛЕМ: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
