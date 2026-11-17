# Деплой прототипа

Прототип — один Node.js-сервис (Express 5 + SQLite + статика SPA). Подходит любой хостинг с Docker
или Node 20+ и постоянным диском.

## Render (используется для конкурса)
- Blueprint `render.yaml` в корне: сервис `mgimo-digital-dekanat`, план `free`, регион `frankfurt`, Docker.
- Переменные окружения (задаются в панели, не в коде):
  `DOC_VERIFY_SECRET` (генерируется), `DEMO_PASSWORD=DemoKonkurs2030`, `PUBLIC_URL=<адрес сервиса>`,
  `DEMO_AUTORESET=1`.
- Бесплатный план засыпает через ~15 минут бездействия, а файловая система пересоздаётся.
  Поэтому сервер при старте наполняет демо-базу (сид) и через `DEMO_RESET_HOURS` (20 ч) пересобирает её,
  а на экране входа показывает снимки экранов «как кабинет выглядел при старте».
  Первый запрос после сна может идти 30–60 секунд.

## Docker локально / VPS
```bash
docker build -t dekanat .
docker run -p 8080:8080 -v dekanat-data:/var/lib/deadline \
  -e NODE_ENV=production -e PUBLIC_URL=http://localhost:8080 \
  -e DOC_VERIFY_SECRET=$(openssl rand -hex 32) dekanat
```
На VPS с постоянным диском данные сохраняются; тогда авто-пересборку можно отключить: `DEMO_AUTORESET=0`.

## Проверка после деплоя
```bash
node scripts/doctor.mjs https://<адрес>
```
Скрипт проверяет health, метаданные, вход всех аккаунтов, ключевые API, PDF-справку, отказ в доступе
к чужим данным (401/403/404) и отклонение поддельной подписи документа.

## Масштабирование под много пользователей
SQLite держит тысячи читателей; для вуза с сотнями тысяч студентов слой доступа к данным (`server/src/db.ts`,
`server/src/lib/repo.ts`) меняется на PostgreSQL, сессии — в общий Redis. Схема без SQLite-специфичных
конструкций, кроме `AUTOINCREMENT`.
