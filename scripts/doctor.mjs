// Диагностика живого прототипа: доступность, вход, ключевые API, PDF, проверка подделки документа, cookie.
// Запуск: node scripts/doctor.mjs https://<адрес-прототипа>
const base = (process.argv[2] ?? 'http://127.0.0.1:8099').replace(/\/$/, '');
let failed = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failed += 1;
};

const health = await fetch(`${base}/api/health`);
ok('GET /api/health', health.ok, String(health.status));
const metaRes = await fetch(`${base}/api/meta`);
const meta = (await metaRes.json()).data;
ok('GET /api/meta', metaRes.ok && meta.demo === true && meta.accounts.length >= 4, `${meta.accounts?.length ?? 0} аккаунта`);
ok('дисклеймер «неофициальный сервис»', /не является официальн|неофициальн/i.test(meta.disclaimer ?? ''));

const cookieJar = new Map();
function saveCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    cookieJar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
const cookieHeader = () => [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ');
async function call(path, init = {}) {
  const res = await fetch(base + path, {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
  });
  saveCookies(res);
  return res;
}

// 1. Вход студента
const login = await call('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ login: 'a.ivanova', password: meta.accounts[0].password }),
});
ok('вход a.ivanova', login.status === 200);
const setCookie = login.headers.getSetCookie?.() ?? [];
ok('cookie сессии HttpOnly', setCookie.some((c) => /httponly/i.test(c)));
ok('cookie сессии Secure (https)', base.startsWith('https://') ? setCookie.some((c) => /secure/i.test(c)) : true);

// 2. Чтение
for (const path of ['/api/me/profile', '/api/schedule/today', '/api/schedule/week', '/api/progress', '/api/requests', '/api/notifications', '/api/announcements', '/api/deadlines']) {
  const res = await call(path);
  ok(`GET ${path}`, res.status === 200, String(res.status));
}
const orders = (await (await call('/api/requests')).json()).data;
const ready = orders.find((o) => o.status === 'ready');
ok('есть готовая заявка у Анны', Boolean(ready), ready?.number);

// 3. PDF и подпись
if (ready) {
  const pdf = await call(`/api/requests/${ready.id}/document`);
  const buf = Buffer.from(await pdf.arrayBuffer());
  ok('PDF справки скачивается', pdf.status === 200 && buf.subarray(0, 5).toString() === '%PDF-', `${buf.length} байт`);
}

// 4. Чужой доступ
const other = await fetch(`${base}/api/requests/1`);
ok('без сессии /api/requests/1 → 401', other.status === 401, String(other.status));
const forget = [...cookieJar.keys()];
cookieJar.clear();
const noAuth = await call('/api/progress');
ok('без cookie /api/progress → 401', noAuth.status === 401, String(noAuth.status));

// 5. Вторая учётка: не видит заявки первой
const login2 = await call('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ login: 'd.smirnov', password: meta.accounts[1].password }),
});
ok('вход d.smirnov', login2.status === 200);
if (ready) {
  const foreign = await call(`/api/requests/${ready.id}`);
  ok('чужая заявка → 404', foreign.status === 404, String(foreign.status));
  const foreignDoc = await call(`/api/requests/${ready.id}/document`);
  ok('чужой PDF → 404', foreignDoc.status === 404, String(foreignDoc.status));
}
const staff = await call('/api/staff/stats');
ok('студент → /api/staff/* 403', staff.status === 403, String(staff.status));

// 6. Проверка подделки QR
const verify = await call('/api/verify/AAAA.BBBB');
ok('поддельная подпись документа отклонена', verify.status === 200 ? (await verify.json()).data.verified === false : verify.status === 404, String(verify.status));

console.log(failed === 0 ? '\nВСЁ В ПОРЯДКЕ' : `\nПРОБЛЕМ: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
