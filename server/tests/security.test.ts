// Тесты безопасности: IDOR, ownership, RBAC, поддельные cookie, throttle, CSRF, заголовки, хранение паролей.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, expectError, expectOk, useServer } from './helpers.js';

const { api, server } = useServer();

async function anna(): Promise<Client> {
  const c = api();
  expectOk(await c.login('a.ivanova'));
  return c;
}
async function smirnov(): Promise<Client> {
  const c = api();
  expectOk(await c.login('d.smirnov'));
  return c;
}
async function staff(): Promise<Client> {
  const c = api();
  expectOk(await c.login('dekanat'));
  return c;
}

/** ID самой заявки студента по login (по списку своих заявок). */
async function ownRequestIds(client: Client): Promise<number[]> {
  const list = expectOk<Array<{ id: number }>>(await client.get('/api/requests'));
  return list.map((r) => r.id);
}

test('без сессии все приватные маршруты отвечают 401', async () => {
  const client = api();
  const paths = [
    '/api/me/profile',
    '/api/schedule/today',
    '/api/schedule/week',
    '/api/schedule/export.ics',
    '/api/progress',
    '/api/deadlines',
    '/api/notifications',
    '/api/announcements',
    '/api/requests',
    '/api/requests/types',
    '/api/requests/1',
    '/api/requests/1/document',
    '/api/messages',
    '/api/staff/requests',
    '/api/staff/stats',
  ];
  for (const p of paths) {
    const res = await client.get(p);
    assert.equal(res.status, 401, `${p} должен требовать вход`);
  }
});

test('поддельная / чужоформатная cookie → 401', async () => {
  for (const token of ['dl_session=forged-token', 'dl_session=', 'dl_session=' + 'a'.repeat(43)]) {
    const res = await fetch(`${server().baseUrl}/api/me/profile`, { headers: { Cookie: token } });
    assert.equal(res.status, 401, token);
  }
});

test('IDOR: чужая заявка и чужой документ → 404 (не 403, не раскрываем существование)', async () => {
  const annaIds = await ownRequestIds(await anna());
  const smirnovIds = await ownRequestIds(await smirnov());
  assert.ok(annaIds.length > 0 && smirnovIds.length > 0);
  assert.equal(annaIds.filter((id) => smirnovIds.includes(id)).length, 0);

  const annaClient = await anna();
  const smirnovClient = await smirnov();
  for (const id of smirnovIds) {
    expectError(await annaClient.get(`/api/requests/${id}`), 404, 'NOT_FOUND');
    expectError(await annaClient.get(`/api/requests/${id}/document`), 404, 'NOT_FOUND');
    expectError(await annaClient.post(`/api/requests/${id}/cancel`), 404, 'NOT_FOUND');
  }
  for (const id of annaIds) {
    expectError(await smirnovClient.get(`/api/requests/${id}/document`), 404, 'NOT_FOUND');
  }
});

test('чат по заявке: чужой студент не читает и не пишет, сотрудник — только свой факультет', async () => {
  const annaClient = await anna();
  const annaIds = await ownRequestIds(annaClient);
  const smirnovClient = await smirnov();
  const target = annaIds[0]!;

  // Владелец пишет и читает свою переписку.
  expectOk(await annaClient.post(`/api/requests/${target}/messages`, { body: 'Тестовое сообщение в чат заявки' }), 201);
  const thread = expectOk<Array<{ author: string; body: string }>>(await annaClient.get(`/api/requests/${target}/messages`));
  assert.ok(thread.some((m) => m.body.includes('Тестовое сообщение')));
  assert.equal(thread.at(-1)?.author, 'student');

  // Чужой студент получает 404 и прочитать, и отправить.
  expectError(await smirnovClient.get(`/api/requests/${target}/messages`), 404, 'NOT_FOUND');
  expectError(await smirnovClient.post(`/api/requests/${target}/messages`, { body: 'Чужое сообщение' }), 404, 'NOT_FOUND');

  // Сотрудник своего факультета видит переписку и отвечает.
  const staffClient = await staff();
  const staffThread = expectOk<Array<{ author: string }>>(await staffClient.get(`/api/staff/requests/${target}/messages`));
  assert.ok(staffThread.length > 0);
  expectOk(await staffClient.post(`/api/staff/requests/${target}/messages`, { body: 'Ответ деканата из теста' }), 201);
  const after = expectOk<Array<{ author: string; body: string }>>(await annaClient.get(`/api/requests/${target}/messages`));
  assert.equal(after.at(-1)?.author, 'staff');
  assert.ok(after.at(-1)?.body.includes('Ответ деканата'));
});

test('PDF готовой заявки доступен только владельцу', async () => {
  const annaClient = await anna();
  const ready = expectOk<Array<{ id: number; status: string }>>(await annaClient.get('/api/requests')).find(
    (r) => r.status === 'ready',
  );
  assert.ok(ready, 'у Анны должна быть готовая заявка');
  const ok = await annaClient.get(`/api/requests/${ready.id}/document`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'application/pdf');
  assert.ok(ok.text.startsWith('%PDF'), 'PDF должен начинаться с %PDF');
  assert.match(ok.headers.get('content-disposition') ?? '', /^attachment; filename\*=UTF-8''/);
  assert.equal(ok.headers.get('cache-control'), 'private, no-store');

  // Чужой студент получает 404.
  expectError(await (await smirnov()).get(`/api/requests/${ready.id}/document`), 404, 'NOT_FOUND');
  // Сотрудник — тоже не владелец: скоуп сотрудника отдельный, PDF через staff API не отдаётся.
  const staffRes = await (await staff()).get(`/api/requests/${ready.id}/document`);
  assert.equal(staffRes.status, 404);
});

test('неготовая заявка: документ → 409 REQUEST_NOT_READY', async () => {
  const client = await anna();
  const pending = expectOk<Array<{ id: number; status: string }>>(await client.get('/api/requests')).find(
    (r) => r.status === 'pending' || r.status === 'in_progress',
  );
  assert.ok(pending);
  expectError(await client.get(`/api/requests/${pending.id}/document`), 409, 'REQUEST_NOT_READY');
});

test('IDOR на уведомления: отметка чужого уведомления → 404', async () => {
  const smirnovClient = await smirnov();
  const theirs = expectOk<Array<{ id: number }>>(await smirnovClient.get('/api/notifications'));
  const annaClient = await anna();
  for (const n of theirs.slice(0, 3)) {
    expectError(await annaClient.post(`/api/notifications/${n.id}/read`), 404, 'NOT_FOUND');
  }
});

test('IDOR на дедлайны: дедлайн чужой группы → 404', async () => {
  // Дедлайны Михаила/Мадины для Анны не видны и не переключаются.
  const smirnovDeadlines = expectOk<Array<{ id: number }>>(await (await smirnov()).get('/api/deadlines'));
  const annaClient = await anna();
  const annaIds = expectOk<Array<{ id: number }>>(await annaClient.get('/api/deadlines')).map((d) => d.id);
  const foreign = smirnovDeadlines.map((d) => d.id).find((id) => !annaIds.includes(id));
  assert.ok(foreign, 'ожидался дедлайн другой группы');
  expectError(await annaClient.post(`/api/deadlines/${foreign}/toggle`), 404, 'NOT_FOUND');
});

test('расписание только своей группы', async () => {
  const annaToday = expectOk<{ entries: Array<{ group: string }> }>(await (await anna()).get('/api/schedule/today'));
  assert.ok(annaToday.entries.every((e) => e.group === 'МО-2-3'));
  const madina = api();
  expectOk(await madina.login('m.karimova'));
  const madinaToday = expectOk<{ entries: Array<{ group: string }> }>(await madina.get('/api/schedule/today'));
  assert.ok(madinaToday.entries.every((e) => e.group === 'МП-1-2'));
  const smirnovToday = expectOk<{ entries: Array<{ group: string }> }>(await (await smirnov()).get('/api/schedule/today'));
  assert.ok(smirnovToday.entries.every((e) => e.group === 'МО-2-7'));
});

test('RBAC: студент не попадает в кабинет сотрудника → 403 FORBIDDEN', async () => {
  const student = await anna();
  expectError(await student.get('/api/staff/requests'), 403, 'FORBIDDEN');
  expectError(await student.get('/api/staff/stats'), 403, 'FORBIDDEN');
  expectError(await student.get('/api/staff/messages'), 403, 'FORBIDDEN');
  expectError(await student.patch('/api/staff/requests/1', { status: 'ready' }), 403, 'FORBIDDEN');
  expectError(await student.post('/api/staff/announcements', { title: 'Взлом', body: 'Взлом деканата', category: 'important', pinned: false }), 403, 'FORBIDDEN');
});

test('сотрудник обрабатывает только заявки своего факультета', async () => {
  const staffClient = await staff();
  const list = expectOk<Array<{ id: number; student: { login: string } }>>(await staffClient.get('/api/staff/requests'));
  // Все заявки в списке — студентов факультета МО (Анна и Дмитрий).
  assert.ok(list.every((r) => ['a.ivanova', 'd.smirnov'].includes(r.student.login)));
  // Заявка Мадины (МП) для сотрудника МО не существует.
  const madinaIds = await ownRequestIds(
    await (async () => {
      const c = api();
      expectOk(await c.login('m.karimova'));
      return c;
    })(),
  );
  for (const id of madinaIds) {
    expectError(await staffClient.patch(`/api/staff/requests/${id}`, { status: 'ready' }), 404, 'NOT_FOUND');
  }
});

test('пароли не хранятся открытым текстом (bcrypt cost 11) и не попадают в ответы', async () => {
  const { db } = await import('../src/db.js');
  const rows = db.prepare('SELECT login, password_hash FROM users').all() as Array<{
    login: string;
    password_hash: string;
  }>;
  assert.ok(rows.length >= 4);
  for (const row of rows) {
    assert.match(row.password_hash, /^\$2[aby]\$11\$/, `cost 11: ${row.login}`);
    assert.ok(!row.password_hash.includes('DemoKonkurs2030'));
  }
  const loginRes = await api().login('a.ivanova');
  assert.ok(!loginRes.text.includes('DemoKonkurs2030'));
  assert.ok(!loginRes.text.includes('$2b$'));
  assert.ok(!loginRes.text.includes('password'));
  const me = await (await anna()).get('/api/me/profile');
  assert.ok(!me.text.includes('DemoKonkurs2030'));
});

test('список учётных данных в meta не содержит хешей', async () => {
  const meta = await api().get('/api/meta');
  assert.ok(!meta.text.includes('$2b$'));
  assert.ok(!meta.text.includes('password_hash'));
});

test('CSRF: не-GET с чужим Origin → 403 FORBIDDEN', async () => {
  // Отдельный клиент с тем же Origin, что и сервер (логин проходит).
  const own = api(server().baseUrl);
  expectOk(await own.login('a.ivanova'));
  // Вредоносный сайт: кука та же, но Origin другой.
  const evilCookie = own.cookieHeader!;
  const evil = async (path: string, body: unknown) =>
    fetch(`${server().baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'Sec-Fetch-Site': 'same-site',
        Cookie: evilCookie,
      },
      body: JSON.stringify(body),
    });
  const r1 = await evil('/api/notifications/read-all', {});
  assert.equal(r1.status, 403);
  assert.equal(((await r1.json()) as { error: { code: string } }).error.code, 'FORBIDDEN');
  const r2 = await evil('/api/messages', { subject: 'Привет', body: 'Длинное сообщение для теста' });
  assert.equal(r2.status, 403);
  // Свой Origin (тот же host:port) — проходит.
  const res = await own.post('/api/auth/logout');
  assert.equal(res.status, 204);
});

test('CSRF: Sec-Fetch-Site: cross-site → 403', async () => {
  const client = await anna();
  expectError(
    await client.post('/api/me/2fa', { enabled: true }, { 'Sec-Fetch-Site': 'cross-site' }),
    403,
    'FORBIDDEN',
  );
});

test('заголовки безопасности на каждом ответе', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.ok(res.headers.get('permissions-policy'));
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('throttle: 10 неудач за 15 минут → 429 TOO_MANY_ATTEMPTS с Retry-After, блокирует и верный пароль', async () => {
  // Отдельный ключ: неверный пароль к существующему аккаунту.
  const attacker = api();
  for (let i = 0; i < 10; i += 1) {
    const res = await attacker.login('m.karimova', `wrong-password-${i}`);
    expectError(res, 401, 'INVALID_CREDENTIALS');
  }
  const blocked = await attacker.login('m.karimova', 'DemoKonkurs2030');
  expectError(blocked, 429, 'TOO_MANY_ATTEMPTS');
  const retryAfter = Number(blocked.headers.get('retry-after') ?? '0');
  assert.ok(retryAfter > 0 && retryAfter <= 15 * 60, `Retry-After=${retryAfter}`);
  // Другие аккаунты с того же IP не страдают.
  expectOk(await api().login('a.ivanova'));
});

test('healthz отвечает ok', async () => {
  const res = await fetch(`${server().baseUrl}/healthz`);
  assert.equal(res.status, 200);
});

test('неизвестный /api-маршрут → 404 NOT_FOUND в конверте ошибки', async () => {
  const client = await anna();
  expectError(await client.get('/api/does-not-exist'), 404, 'NOT_FOUND');
  expectError(await api().get('/api/does-not-exist'), 404, 'NOT_FOUND');
});

test('большой JSON отклоняется (лимит 64 КБ)', async () => {
  const client = await anna();
  const big = { subject: 'Тест', body: 'x'.repeat(70_000) };
  const res = await client.post('/api/messages', big);
  assert.equal(res.status, 413);
});

test('валидация: неизвестный тип заявки и неверные поля → 400 с fields', async () => {
  const client = await anna();
  const unknown = await client.post('/api/requests', { typeCode: 'no-such-type', values: {} });
  expectError(unknown, 400, 'VALIDATION');
  const invalid = await client.post('/api/requests', {
    typeCode: 'academic-leave',
    values: { reason: 'hack', period: '1y', comment: 'слишком коротко' },
  });
  expectError(invalid, 400, 'VALIDATION');
  const fields = (invalid.body as { error: { fields: Record<string, string> } }).error.fields;
  assert.ok(fields.reason);
  assert.ok(fields.comment);
});

test('XSS-полезная нагрузка сохраняется как данные, а не разметка', async () => {
  const client = await anna();
  const payload = '<script>alert(1)</script>';
  const res = await client.post('/api/messages', { subject: 'Вопрос ' + payload, body: 'Проверка экранирования <img src=x onerror=alert(1)>' });
  const created = expectOk<{ id: number }>(res, 201);
  assert.ok(created.id > 0);
  const list = expectOk<Array<{ subject: string; body: string }>>(await client.get('/api/messages'));
  const mine = list.find((m) => m.subject.includes('<script>'));
  assert.ok(mine, 'сообщение сохранено как есть (JSON-экран — ответственность React)');
  const res2 = await client.get('/api/messages');
  assert.match(res2.headers.get('content-type') ?? '', /application\/json/);
});

test('переопределение даты только для чтения: POST ?date → 403', async () => {
  const client = await anna();
  expectError(
    await client.post('/api/requests?date=2026-12-01', { typeCode: 'grade-transcript', values: { semesters: 'all' } }),
    403,
    'FORBIDDEN',
  );
});

test('две вкладки: разные аккаунты одновременно, каждая со своим X-Tab-Session', async () => {
  // Вкладка A входит как Анна, вкладка B — как Дмитрий; cookie у браузера общая.
  const tabA = api();
  const tabB = api();
  const a = expectOk<{ tabToken: string }>(await tabA.login('a.ivanova'));
  const b = expectOk<{ tabToken: string }>(await tabB.login('d.smirnov'));
  assert.ok(a.tabToken && b.tabToken);
  const dmitryOrders = expectOk<{ id: number; student?: unknown }[]>(
    await tabB.get('/api/requests', { 'X-Tab-Session': b.tabToken }),
  );
  const dmitryOrderId = dmitryOrders[0]?.id;
  assert.notEqual(a.tabToken, b.tabToken);

  const profileA = expectOk<{ profile: { group: string } }>(
    await tabA.get('/api/me/profile', { 'X-Tab-Session': a.tabToken }),
  );
  const profileB = expectOk<{ profile: { group: string } }>(
    await tabB.get('/api/me/profile', { 'X-Tab-Session': b.tabToken }),
  );
  assert.equal(profileA.profile.group, 'МО-2-3');
  assert.equal(profileB.profile.group, 'МО-2-7');
  assert.ok(dmitryOrderId);

  // Заявка Дмитрия недоступна под токеном Анны: владелец проверяется по сессии вкладки.
  const foreign = await tabA.get(`/api/requests/${dmitryOrderId}`, { 'X-Tab-Session': a.tabToken });
  expectError(foreign, 404, 'NOT_FOUND');
});

test('выход во вкладке B не отзывает сессию вкладки A', async () => {
  const tabA = api();
  const tabB = api();
  const a = expectOk<{ tabToken: string }>(await tabA.login('a.ivanova'));
  const b = expectOk<{ tabToken: string }>(await tabB.login('d.smirnov'));

  const logout = await tabB.post('/api/auth/logout', undefined, { 'X-Tab-Session': b.tabToken });
  assert.equal(logout.status, 204);
  expectError(await tabB.get('/api/me/profile', { 'X-Tab-Session': b.tabToken }), 401, 'UNAUTHENTICATED');
  expectOk(await tabA.get('/api/me/profile', { 'X-Tab-Session': a.tabToken }));
});
