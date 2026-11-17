# Задача агенту-бэкендеру: API «Цифровой деканат 2030»

Репозиторий: `mgimo_vibecoding` (корень). Сначала прочитай `AGENTS.md`, `docs/SPEC.md`,
`docs/SECURITY.md`, `docs/DATA.md`, `docs/agents/SEED-DATA.md` и `server/src/contract.ts`.
Работай только внутри `server/`. **Не меняй `web/`, `docs/`** и `server/src/contract.ts`
(кроме добавления новых, не оговорённых здесь сущностей).

## Уже готово (использовать, не переписывать)
- `server/src/config.ts` — env-конфиг (`DOC_VERIFY_SECRET`, `IP_SALT`, `PUBLIC_URL`, `DATA_DIR`, `DEMO_PASSWORD`),
  `publicBaseUrl(req)`, `demoPassword`.
- `server/src/db.ts` — схема SQLite (`SCHEMA`), `db`, `migrate()`, `isSeeded()`.
- `server/src/lib/time.ts` — локальное время (МСК), недели, учебные дни, `addWorkingMinutes`.
- `server/src/contract.ts` — **источник истины для ответов API**. Frontend уже написан под эти схемы.
  Типы: `import { schemas } from '../contract.js'` — валидируй ответы `schemas.X.parse(...)` (особенно
  `profile`, `scheduleWeek`, `scheduleToday`, `discipline`, `ratingSummary`, `sessionExam`, `transcriptRow`,
  `academicRank`, `gradeScaleRow`, `requestType`, `order`, `notification`, `announcement`, `deadline`).
- `server/package.json` — Express 5, better-sqlite3, bcryptjs, pdfkit, zod, tsx, TS 5.9; скрипты `dev`, `build`, `start`, `seed` (`src/seed/run.ts` — создать), `test` (`node --test --import tsx tests/*.test.ts`).

## Сделать

### 1. `server/tsconfig.json`
NodeNext + ES2022 + strict + outDir `dist`, rootDir `src`, types `["node"]`.

### 2. Хелперы
- `src/http.ts`: `ApiError(status, code, message, fields?)` (с `fields: Record<string,string>` для `VALIDATION`),
  `asyncRoute()`, `errorHandler`, `log` (метод, путь, статус, ms; без тела и PII), `notFoundHandler`.
- `src/lib/auth.ts`: bcrypt cost 11 (`BCRYPT_ROUNDS`), сессии: токен `crypto.randomBytes(32).toString('base64url')`,
  в БД `sessions.token_hash` = SHA-256, TTL 30 дней, продление при активности (если прошло > 1 ч), cookie из конфига
  (`httpOnly`, `secure: isProd`, `sameSite:'lax'`, `path:'/'`, `maxAge`). `ipHash(req)` = HMAC-SHA256(ip, ipSalt),
  ip из `req.ip` (trustProxy). Throttle: таблица `login_throttle`, ключ `login|ipHash` — 10 неудач за 15 мин →
  429 `TOO_MANY_ATTEMPTS` + `Retry-After`; блок 15 мин. `audit(actor, action, entity, entityId, ipHash)`.
  `rateLimit(key, limit, windowMs)` — простой in-memory лимитер для `/api/verify` и `/api/messages`.
- `src/middleware.ts`: `requireAuth`, `requireRole('staff')`, `csrfOriginCheck` (для не-GET, если есть `Origin`
  и host/порт другой → 403 `FORBIDDEN`; учитывай `x-forwarded-host`).
- `src/today.ts`: `getToday(req)` → `{ date:'YYYY-MM-DD', iso, weekday:1..7, weekParity:'odd'|'even', universityDay:{number,label} }`.
  `universityDay` = номер учебного дня от 1 сентября текущего учебного года (count only неделя? нет — все календарные дни,
  кроме воскресений и праздников: 1 и 8 января, 23 февраля, 8 марта, 1 и 9 мая, 12 июня, 4 ноября). До 1 сентября — предыдущий год.
  Переопределение даты: `?date=YYYY-MM-DD` (только чтение) и env `DEMO_TODAY` — чтобы жюри видело «живой» день.

### 3. Роуты `/api/*`
Контракт и коды ошибок — в `docs/DATA.md`. Ответы: `{ok:true,data}` / `{ok:false,error:{code,message,fields?}}`.
Список роутов и возвращаемые типы:
- публичные: `GET /health` → `{status:'ok',time}`; `GET /api/meta` → `{demo:true, appName:'Дедлайн', appSubtitle,
  contest:{name, year}, university, disclaimer, accounts:[{login,password,name,role,note}], today}`;
  `POST /api/auth/login` `{login,password}` → `schemas.loginResultSchema` + ставит cookie (401 `INVALID_CREDENTIALS`
  одинаково для неверного логина и пароля; 429 `TOO_MANY_ATTEMPTS`); `POST /api/auth/logout` → 204;
  `GET /api/auth/me` → loginResult или 401 `UNAUTHENTICATED`; `GET /api/verify/:token` → `{verified, number?, issuedAt?}`.
- авторизованные (студент): `GET /api/me/profile` → profile + `{deanery: deaneryContactSchema}` (добавь в profile контракт
  нельзя — отдай `{ profile, deanery }`), `PATCH /api/me/profile` (`updateProfileInputSchema`) → `{profile, deanery}`,
  `POST /api/me/password` → 204 (403 `WRONG_PASSWORD`, 400 `VALIDATION`, 400 `PASSWORD_MISMATCH`),
  `POST /api/me/logout-all` → 204, `POST /api/me/2fa` `{enabled:boolean}` → `{profile, deanery}`.
  `GET /api/schedule/today?date=` → `schemas.scheduleTodaySchema`; `GET /api/schedule/week?date=` → `schemas.scheduleWeekSchema`;
  `GET /api/schedule/export.ics?date=` → ICS-файл (RFC 5545, CRLF, TZ Europe/Moscow, только свои пары, UID = id).
  `GET /api/progress` → `{ summary: ratingSummarySchema, disciplines: disciplineSchema[], session: sessionExamSchema[],
  past: transcriptRowSchema[], rank: academicRankSchema, scale: gradeScaleRowSchema[] }`.
  `GET /api/deadlines` → `deadlineSchema[]`; `POST /api/deadlines/:id/toggle` → `deadlineSchema[]`.
  `GET /api/requests/types` → `requestTypeSchema[]`; `GET /api/requests` → `orderSchema[]` (новые сверху);
  `POST /api/requests` `{typeCode, values: Record<string,name>}` → `orderSchema` (201);
  `GET /api/requests/:id` → `orderSchema`; `POST /api/requests/:id/cancel` → `orderSchema`;
  `GET /api/requests/:id/document` → PDF (только владелец и только `ready`, иначе 409 `REQUEST_NOT_READY`).
  `GET /api/notifications` → `notificationSchema[]` (новые сверху); `POST /api/notifications/:id/read` → 204;
  `POST /api/notifications/read-all` → 204.
  `GET /api/announcements` → `announcementSchema[]`; `POST /api/messages` `{subject, body}` → 201; `GET /api/messages` → свои.
- сотрудник (`requireRole('staff')`, иначе 403 `FORBIDDEN`): `GET /api/staff/stats`; `GET /api/staff/requests?status=`
  → `(orderSchema & {student:{name, group, login}})[]`; `PATCH /api/staff/requests/:id` `{status, comment?, rejectReason?}`
  → обновлённая заявка; `GET /api/staff/messages` → `{id, subject, body, student:{name,group}, createdAtLabel, status, reply}[]`;
  `POST /api/staff/messages/:id/reply` `{reply}`; `POST /api/staff/announcements` `{title, body, category, pinned, forAll?}`.

Правила: **ownership** на сервере (`WHERE id=? AND user_id=?`), чужое → 404 `NOT_FOUND`; заявки сотрудника — только
своего факультета; при создании заявки `due_at` = `addWorkingMinutes(now, sla_minutes)`; тип `grade-transcript`
(sla_minutes = 0) сразу `ready` и сразу PDF; уведомление студенту о каждой заявке и смене статуса; история заявки в
`history_json` (шаги: «Подана», «На проверке в деканате», «Готово»; у готовой/отклонённой — все пройдены/текущий актуальный).
Счётчик-нетто статусов: `pending`→`in_progress`→`ready`|`rejected`, отмена только из `pending`/`in_progress`.

### 4. PDF (`src/documents.ts`, pdfkit + QR)
Кириллический шрифт обязательно: положи `server/assets/fonts/DejaVuSans.ttf` и `DejaVuSans-Bold.ttf`
(DejaVu — свободная лицензия; если нет — скачай с https://github.com/dejavu-fonts/dejavu-fonts или
https://sourceforge.net/projects/dejavu/ и положи в репозиторий вместе с `LICENSE`).
QR-код — `qrcode` npm-пакет (MIT) `toBuffer` или чистый TS-энкодер; ссылка `${publicBaseUrl(req)}/verify/<token>`.
Три шаблона: справка (шапка «Цифровой деканат 2030 · демонстрационный документ», реквизиты вымышленного вуза, номер,
ФИО, факультет, направление, курс, группа, назначение, подпись «Декан А. В. Мельников», QR + «Проверить подлинность»),
электронное заявление «Директору-декану … от студента …», выписка из зачётной книжки (таблица из `past_results`).
На каждой странице крупная плашка «ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ · не является официальным документом».
Отдавать `application/pdf`, `Content-Disposition: attachment; filename*=UTF-8''...`, `Cache-Control: private, no-store`.

### 5. Seed (`src/seed/run.ts`, `src/seed/data.ts`) — по `docs/agents/SEED-DATA.md`
Пошагово: удалить все данные, вставить факультеты (MO, MP, MEO, MB, MIEP, MG, SGIA — названия из файла),
пользователей (3 студента + 1 сотрудник, пароль `config.demoPassword`, bcrypt 11), профили, дисциплины, оценки,
прошлые семестры, рейтинг, расписание (для групп МО-2-3, МО-2-7, МП-1-2 — **даты привязать к текущей неделе**,
чтобы «сегодня» всегда было расписание), объявления, дедлайны, уведомления, заявки (со статусами из файла),
сообщения. Idempotent: `npm run seed -w server` можно запускать много раз. Завершение < 5 c.
Даты в БД — локальные ISO-строки (МСК) через хелперы `lib/time.ts`.

### 6. `src/app.ts` + `src/index.ts`
`createApp()` (для тестов) и `start()`: trust proxy, security headers (`X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'`
— но в dev CSP не ставить, чтобы Vite HMR работал), `express.json({limit:'64kb'})`, роуты, `/healthz`.
Статика `config.webDist`, SPA fallback `index.html` для не-`/api` и не-`/healthz` путей, hashed assets — immutable,
`index.html` — `no-cache`. При старте `migrate()`; если БД пустая и `SEED_ON_EMPTY !== '0'` — запустить seed.
SIGTERM/SIGINT — корректное завершение; периодическая очистка просроченных сессий (раз в час).

### 7. Тесты (`server/tests/`, `node --test`)
`auth.test.ts`, `security.test.ts` (IDOR по заявкам и документам → 404/403; без cookie → 401; поддельная cookie → 401;
пароль не хранится открытым текстом; throttle 429), `flow.test.ts` (заявка → pending → сотрудник меняет статус →
ready → PDF начинается с `%PDF`), `contract.test.ts` (ответы проходят `schemas`). БД — во временном файле
(`DATA_DIR`/`DB_FILE` в `os.tmpdir()`), сервер на случайном порту через `app.listen(0)`.

### 8. Проверка перед сдачей
`npm run build -w server` без ошибок; `cd server && npm test` зелёный; `npm run seed -w server`;
`PORT=8099 node server/dist/index.js` → `curl localhost:8099/api/health` = ok.

В финальном ответе: что сделано, файлы, тесты, известные ограничения. Не выходи за пределы `server/`.
