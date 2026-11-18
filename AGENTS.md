# AGENTS.md — правила работы ИИ-ассистентов над проектом «Дедлайн · Цифровой деканат 2030»

Этот файл читают **все** ИИ-агенты (ассистент в чате, субагенты, облачные агенты) перед началом работы.
Порядок чтения: этот файл → `docs/SPEC.md` → `docs/DESIGN.md` (для UI) → `docs/DATA.md` (для данных) →
`docs/SECURITY.md` → брифы `docs/agents/*.md`.

## 1. Что мы строим

Рабочий прототип личного кабинета студента МГИМО («Дедлайн», цифровой деканат 2030) для конкурса
«Кибербезопасность и ИИ в высшей школе — 2026» (VK Education).

- Это **концепт для конкурса**, НЕ официальный сервис университета и НЕ подключён к его системам.
- Только вымышленные данные. Никаких реальных ФИО, номеров зачёток, телефонов, e-mail реальных людей.
- Логотип университета не используется — только собственный знак «Дедлайн» (`web/src/components/Logo.tsx`).
- Язык интерфейса и комментариев — русский. Код — TypeScript strict.

## 2. Стек

| Слой | Технологии |
|---|---|
| Backend | Node.js 20+, Express 5, TypeScript, better-sqlite3, zod, pdfkit, qrcode, node:crypto |
| Frontend | Vite, React 19, TypeScript strict, React Router 7, TanStack Query, Tailwind CSS v4, Lucide |
| Шрифты | Manrope (OFL, Google Fonts) |
| Документы | PDF на сервере, QR со ссылкой на проверку (HMAC-SHA256) |
| Монолит | `server` раздаёт `/api` и собранный фронт `web/dist` |

## 3. Структура

```
server/        Express API, RBAC, SQLite, seed, PDF; src/contract.ts — контракт ответов
web/           SPA (React); components/ui — дизайн-система
docs/          SPEC, DESIGN, DATA, SECURITY, PROCESS_LOG, agents/ (брифы), research/ (источники)
scripts/       smoke.mjs, doctor.mjs, seed-with-screenshots.sh
deploy/        инструкции; render.yaml, Dockerfile
```

## 4. Требования (definition of done)

1. Работает ядро: вход/профиль, расписание (сегодня/неделя/изменения), успеваемость (оценки, зачёты, сессия,
   рейтинг), заявки и справки (заказ, статус, PDF), уведомления.
2. Mobile-first: 360 px, тач-цели ≥ 44 px, без горизонтального скролла.
3. Безопасность: bcrypt (cost ≥ 11), серверные сессии (в БД — SHA-256 токена), cookie HttpOnly/SameSite,
   проверка владельца на сервере для **каждого** ресурса, throttle входа, CSP, Origin-check.
   Секреты — только из окружения (`docs/SECURITY.md`), в репозиторий не попадают.
4. Пустые состояния, ошибки и загрузка проработаны на каждом экране.
5. Доступность: контраст AA, focus-visible, aria-label, клавиатура, prefers-reduced-motion.
6. Лицензии: MIT/ISC/Apache/OFL.

## 5. Стиль

- API: `{ok:true,data}` / `{ok:false,error:{code,message,fields?}}`; ошибки только через `ApiError`.
- zod-валидация входов и выходов; без `any` без причины; PII не логируется.
- Компоненты React ≤ 250 строк; логика — в `lib/`.
- UI только по `docs/DESIGN.md`: светлый холст `#F7F6F8`, колонка `#F3F1F4`, акцент `#9154EB`, плоские карточки без тени, пастель только в расписании. Индиго и золото не использовать.

## 6. Проверка и отчёт

`npm run build`, `npm test -w server`, `node scripts/smoke.mjs <url>`, `node scripts/doctor.mjs <url>`.
После задачи — короткое резюме: что сделано, файлы, как проверить, известные ограничения.
