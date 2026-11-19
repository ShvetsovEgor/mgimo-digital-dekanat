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

## Домен бизнестарт.рф (VPS + nginx + TLS)

Домен `бизнестарт.рф` (`xn--80abmhe5axgjc.xn--p1ai`) резолвится в `46.21.245.192`, приложение там уже
запущено и отвечает по IP: `http://46.21.245.192/login`. Но nginx не знает этого домена: запрос с
`Host: xn--80abmhe5axgjc.xn--p1ai` получает 404, а по HTTPS отдаётся чужой сертификат
(`CN=rh-ru.i.tapclap.com`). Без TLS не работает и вход: в production cookie `__Host-dl_session`
требует `Secure`, поэтому браузер её не сохранит поверх http.

```bash
# 1. Приложение на 127.0.0.1:8080 с правильным PUBLIC_URL (нужен для QR в PDF и ссылок)
docker run -d --name dekanat -p 127.0.0.1:8080:8080 -v dekanat-data:/var/lib/deadline \
  -e NODE_ENV=production -e DEMO_AUTORESET=0 \
  -e PUBLIC_URL=https://xn--80abmhe5axgjc.xn--p1ai \
  -e DOC_VERIFY_SECRET=$(openssl rand -hex 32) -e DEMO_PASSWORD=DemoKonkurs2030 dekanat

# 2. Виртуальный хост (конфиг в deploy/nginx-businessstart.conf)
sudo cp deploy/nginx-businessstart.conf /etc/nginx/sites-available/businessstart.conf
sudo ln -sf /etc/nginx/sites-available/businessstart.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Сертификат Let's Encrypt (порт 80 уже проксирует certbot-челлендж)
sudo certbot --nginx -d xn--80abmhe5axgjc.xn--p1ai

# 4. Проверка
node scripts/doctor.mjs https://xn--80abmhe5axgjc.xn--p1ai
```

После выпуска сертификата `https://бизнестарт.рф/login` открывается без предупреждений, а вход работает:
cookie ставится с флагом `Secure` только по HTTPS.

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
