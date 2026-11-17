// Скриншоты версии v1 → screenshots/v1 (мобильные 360 px), с подписями в captions.md.
// Запуск при работающем сервере: node scripts/screens-v1.mjs http://127.0.0.1:8099
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const base = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const out = 'screenshots/v1';
fs.mkdirSync(out, { recursive: true });
const PW = 'DemoKonkurs2030';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const captions = [];
async function ctxFor(vp, storage) {
  return b.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, isMobile: vp.width < 500, hasTouch: vp.width < 500, locale: 'ru-RU', timezoneId: 'Europe/Moscow', storageState: storage });
}
async function login(page, l) {
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[autocomplete=username]', l);
  await page.fill('input[type=password]', PW);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await page.waitForTimeout(900);
}
async function shot(page, name, caption, vp) {
  // невидимая метка версии в углу снимка
  await page.evaluate(() => {
    document.getElementById('v1-tag')?.remove();
    const el = document.createElement('div');
    el.id = 'v1-tag';
    el.textContent = 'v1';
    Object.assign(el.style, { position: 'fixed', right: '8px', bottom: '84px', zIndex: '99999', background: '#12245C', color: '#E2C05A', font: '700 11px/1 Manrope, sans-serif', padding: '4px 7px', borderRadius: '999px', letterSpacing: '.04em', opacity: '0.92', pointerEvents: 'none' });
    document.body.appendChild(el);
  });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  captions.push({ name, caption, width: vp.width });
  await page.evaluate(() => document.getElementById('v1-tag')?.remove());
}

// вход
const m0 = await ctxFor({ width: 360, height: 740 });
const lp = await m0.newPage();
await lp.goto(base + '/login', { waitUntil: 'domcontentloaded' }); await lp.waitForTimeout(2500);
await shot(lp, 'm01-login', 'Экран входа: логин/пароль, галерея «как кабинет выглядел при старте», демо-доступы в один тап', { width: 360 });
await m0.close();

// Анна — мобильный
const mA = await ctxFor({ width: 360, height: 740 });
const a = await mA.newPage();
await login(a, 'a.ivanova');
for (const [r, n, c] of [
  ['/', 'm02-today', '«Сегодня»: следующая пара, что требует внимания, быстрые действия, дедлайны, события'],
  ['/schedule', 'm03-schedule', 'Расписание «Сегодня»: лента дня и изменения на неделе'],
]) { await a.goto(base + r, { waitUntil: 'domcontentloaded' }); await a.waitForTimeout(1500); await shot(a, n, c, { width: 360 }); }
await a.getByRole('tab', { name: 'Неделя' }).first().click(); await a.waitForTimeout(900);
await shot(a, 'm04-schedule-week', 'Расписание «Неделя»: дни-чипы, пары выбранного дня, выделенные изменения', { width: 360 });
for (const [r, n, c] of [
  ['/progress', 'm05-progress', 'Учёба: средний рейтинг, «автоматы», место в группе, дисциплины с порогом 70 %'],
  ['/requests', 'm06-requests', 'Мои заявки: статусы, прогноз готовности, готовая справка с PDF'],
  ['/requests/new', 'm07-new-request', 'Новая заявка: каталог услуг с сроком и стоимостью'],
  ['/notifications', 'm08-notifications', 'Уведомления деканата, объявления, дедлайны'],
  ['/profile', 'm09-profile', 'Профиль: данные студента, деканат, безопасность'],
]) { await a.goto(base + r, { waitUntil: 'domcontentloaded' }); await a.waitForTimeout(1500); await shot(a, n, c, { width: 360 }); }
// форма заявки
await a.goto(base + '/requests/new', { waitUntil: 'domcontentloaded' }); await a.waitForTimeout(1200);
await a.locator('article', { hasText: 'Справка об обучении' }).getByRole('button', { name: 'Выбрать' }).first().click();
await a.waitForTimeout(1000);
await shot(a, 'm10-request-form', 'Форма заявки на справку: поля с подсказками и валидация', { width: 360 });
const orderId = await a.evaluate(async () => {
  const r = await fetch('/api/requests', { credentials: 'same-origin' }).then((x) => x.json());
  return r.data.find((o) => o.status === 'ready')?.id ?? null;
});
if (orderId) {
  await a.goto(base + `/requests/${orderId}`, { waitUntil: 'domcontentloaded' }); await a.waitForTimeout(1500);
  await shot(a, 'm11-request-ready', 'Карточка готовой справки: таймлайн статуса, поля, кнопка скачать PDF', { width: 360 });
}
const storage = await mA.storageState();
await mA.close();

// Дмитрий — в зоне риска
const mD = await ctxFor({ width: 360, height: 740 });
const d = await mD.newPage(); await login(d, 'd.smirnov');
await d.goto(base + '/progress', { waitUntil: 'domcontentloaded' }); await d.waitForTimeout(1500);
await shot(d, 'm12-smirnov-progress', 'Дмитрий Смирнов: другая группа МО-2-7, дисциплины в зоне риска — видна разница данных', { width: 360 });
await d.goto(base + '/requests', { waitUntil: 'domcontentloaded' }); await d.waitForTimeout(1500);
await shot(d, 'm13-smirnov-requests', 'Дмитрий Смирнов: отклонённая заявка с причиной отказа', { width: 360 });
await mD.close();

// Мадина
const mM = await ctxFor({ width: 360, height: 740 });
const m = await mM.newPage(); await login(m, 'm.karimova');
await m.goto(base + '/', { waitUntil: 'domcontentloaded' }); await m.waitForTimeout(1500);
await shot(m, 'm14-karimova-today', 'Мадина Каримова, 1 курс МП: своё расписание и дедлайны', { width: 360 });
await mM.close();

// Деканат
const mS = await ctxFor({ width: 360, height: 740 });
const s = await mS.newPage(); await login(s, 'dekanat');
await s.goto(base + '/staff', { waitUntil: 'domcontentloaded' }); await s.waitForTimeout(1500);
await shot(s, 'm15-staff', 'Кабинет сотрудника деканата: заявки, вопросы студентов, объявления', { width: 360 });
await mS.close();

// Подписи
const lines = ['# Скриншоты v1 — «Дедлайн · Цифровой деканат 2030»', '', `Сняты автоматически ${new Date().toLocaleDateString('ru-RU')} в браузере Chrome (Playwright), живой прототип на 360 px (мобильный) и 1440 px (десктоп). Метка «v1» в правом нижнем углу — версия сборки.`, '', '| Файл | Подпись | Ширина |', '|---|---|---|', ...captions.map((c) => `| [${c.name}.png](${c.name}.png) | ${c.caption} | ${c.width} px |`), ''];
fs.writeFileSync(`${out}/captions.md`, lines.join('\n'));
await b.close();
console.log(`saved ${captions.length} screenshots → ${out}`);
