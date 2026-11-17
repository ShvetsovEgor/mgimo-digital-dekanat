// Тесты аутентификации: вход/выход, cookie-флаги, одинаковые ошибки, смена пароля, «выйти везде».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, expectError, expectOk, useServer } from './helpers.js';

const { api } = useServer();

test('health и meta доступны без входа', async () => {
  const client = api();
  const health = expectOk<{ status: string; time: string }>(await client.get('/api/health'));
  assert.equal(health.status, 'ok');
  const meta = expectOk<{
    demo: boolean;
    appName: string;
    accounts: Array<{ login: string; password: string; name: string; role: string; note: string }>;
    today: { date: string };
  }>(await client.get('/api/meta'));
  assert.equal(meta.demo, true);
  assert.equal(meta.appName, 'Дедлайн');
  const logins = meta.accounts.map((a) => a.login).sort();
  assert.deepEqual(logins, ['a.ivanova', 'd.smirnov', 'dekanat', 'm.karimova']);
  // Пароль в meta — только демо-пароль, он публичный по условиям конкурса.
  assert.ok(meta.accounts.every((a) => a.password === 'DemoKonkurs2030'));
  assert.equal(meta.today.date, '2026-11-17');
});

test('вход: cookie HttpOnly, SameSite=Lax, Path=/ и HttpOnly в ответе', async () => {
  const client = api();
  const res = await client.login('a.ivanova');
  const data = expectOk<{ student: { login: string; name: string; group: string } }>(res);
  assert.equal(data.student.login, 'a.ivanova');
  assert.equal(data.student.group, 'МО-2-3');
  const setCookie = res.headers.getSetCookie().join(';');
  assert.match(setCookie, /dl_session=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\//);
  assert.match(setCookie, /Max-Age=2592000/);
  // В dev cookie без Secure (иначе браузер не пришлёт её по http в демо).
  assert.doesNotMatch(setCookie, /Secure/);

  const me = expectOk<{ student: { login: string } }>(await client.get('/api/auth/me'));
  assert.equal(me.student.login, 'a.ivanova');
});

test('неверный пароль и несуществующий логин дают одинаковый ответ 401', async () => {
  const wrongPassword = await api().login('d.smirnov', 'not-the-password');
  const unknownLogin = await api().login('nobody.here', 'not-the-password');
  expectError(wrongPassword, 401, 'INVALID_CREDENTIALS');
  expectError(unknownLogin, 401, 'INVALID_CREDENTIALS');
  assert.equal(
    (unknownLogin.body as { error: { message: string } }).error.message,
    (wrongPassword.body as { error: { message: string } }).error.message,
  );
  // Ответ не раскрывает, существует ли аккаунт.
  assert.doesNotMatch(unknownLogin.text, /nobody\.here|не найден пользователь/i);
});

test('пустые поля входа → 400 VALIDATION с ошибками полей', async () => {
  const res = await api().post('/api/auth/login', { login: '', password: '' });
  expectError(res, 400, 'VALIDATION');
  const fields = (res.body as { error: { fields: Record<string, string> } }).error.fields;
  assert.ok(fields.login);
  assert.ok(fields.password);
});

test('/api/auth/me без cookie → 401 UNAUTHENTICATED', async () => {
  expectError(await api().get('/api/auth/me'), 401, 'UNAUTHENTICATED');
});

test('выход отзывает сессию и cookie', async () => {
  const client = api();
  await client.login('m.karimova');
  expectOk(await client.get('/api/auth/me'));
  const token = client.cookieHeader;
  const logout = await client.post('/api/auth/logout');
  assert.equal(logout.status, 204);
  // Старая cookie больше не работает.
  const replay = new Client(client.baseUrl);
  (replay as unknown as { cookies: Map<string, string> }).cookies.set('dl_session', token!.split('=')[1]);
  expectError(await replay.get('/api/auth/me'), 401, 'UNAUTHENTICATED');
  expectError(await client.get('/api/auth/me'), 401, 'UNAUTHENTICATED');
});

test('смена пароля: неверный текущий → 403, слабый → 400, успех отзывает другие сессии', async () => {
  const first = api();
  const second = api();
  await first.login('d.smirnov');
  await second.login('d.smirnov');

  expectError(await first.post('/api/me/password', { current: 'wrong-pass-1', next: 'NewPassw0rd', confirm: 'NewPassw0rd' }), 403, 'WRONG_PASSWORD');
  expectError(await first.post('/api/me/password', { current: 'DemoKonkurs2030', next: 'short', confirm: 'short' }), 400, 'VALIDATION');
  expectError(
    await first.post('/api/me/password', { current: 'DemoKonkurs2030', next: 'StrongPassw0rd', confirm: 'OtherPassw0rd' }),
    400,
    'PASSWORD_MISMATCH',
  );
  const res = await first.post('/api/me/password', {
    current: 'DemoKonkurs2030',
    next: 'NovyiParol2030',
    confirm: 'NovyiParol2030',
  });
  assert.equal(res.status, 204);

  // Текущая сессия жива, вторая — отозвана.
  expectOk(await first.get('/api/auth/me'));
  expectError(await second.get('/api/auth/me'), 401, 'UNAUTHENTICATED');

  // Вход с новым паролем работает, со старым — нет.
  expectOk(await api().login('d.smirnov', 'NovyiParol2030'));
  expectError(await api().login('d.smirnov', 'DemoKonkurs2030'), 401, 'INVALID_CREDENTIALS');

  // Любой слабый пароль по смене отклоняется (проверяется сервером, не только клиентом).
  expectError(
    await first.post('/api/me/password', { current: 'NovyiParol2030', next: 'aaaaaaaaa1', confirm: 'aaaaaaaaa1' }),
    400,
    'WEAK_PASSWORD',
  );

  // Возвращаем демо-пароль, чтобы другие тесты файла не зависели от порядка.
  assert.equal(
    (await first.post('/api/me/password', { current: 'NovyiParol2030', next: 'DemoKonkurs2030', confirm: 'DemoKonkurs2030' })).status,
    204,
  );
});

test('«Выйти на всех устройствах» отзывает все сессии', async () => {
  const a = api();
  const b = api();
  await a.login('a.ivanova');
  await b.login('a.ivanova');
  assert.equal((await a.post('/api/me/logout-all')).status, 204);
  expectError(await a.get('/api/auth/me'), 401, 'UNAUTHENTICATED');
  expectError(await b.get('/api/auth/me'), 401, 'UNAUTHENTICATED');
});

test('удаление сессий не влияет на другие аккаунты (изоляция)', async () => {
  const anna = api();
  const madina = api();
  await anna.login('a.ivanova');
  await madina.login('m.karimova');
  await anna.post('/api/me/logout-all');
  expectOk(await madina.get('/api/auth/me'));
});
