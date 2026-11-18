# Задача агенту-фронтендеру: SPA «Дедлайн · Цифровой деканат 2030»

Репозиторий: `mgimo_vibecoding`, корень `/Users/egorshvetsov/PycharmProjects/mgimo_vibecoding`.
Работай ТОЛЬКО в `web/`. Читать: `AGENTS.md`, `docs/SPEC.md`, `docs/DESIGN.md`, `docs/SECURITY.md`, `docs/DATA.md`.

## Что строим
Мобильный-first одностраничный личный кабинет студента (и кабинет сотрудника деканата) на React 19 + TypeScript strict
+ Vite 7 + Tailwind CSS v4 + React Router 7 + TanStack Query 5 + Lucide (ISC). Все зависимости уже установлены
в корневом node_modules (npm workspaces). Сборка: `npm run build -w web` (из корня), dev: `npm run dev -w web` (proxy `/api` → :8099).
**Типографика:** Manrope (OFL) — подключить только latin + cyrillic сабсеты из Google Fonts через `<link>` в `index.html`
(преконнект), fallback `system-ui`. Никаких других шрифтов.

## Источник истины для API — `/server/src/contract.ts`
Backend (другой агент) уже пишет сервер строго под эти zod-схемы. **Не меняй** `server/`. Скопируй контракт в
`web/src/lib/contract.ts` (только типы: используй `z.infer<...>` из `zod` — zod v4 установлен в node_modules, добавь его
в `web/package.json` dependencies `"zod": "^4.1.5"` и выполни `export npm_config_cache=/Users/egorshvetsov/PycharmProjects/mgimo_vibecoding/.npm-cache && npm install` из корня,
чтобы npm связал зависимость; сам пакет уже в node_modules). Либо (предпочтительнее) — **извлеки типы вручную**
в `web/src/lib/types.ts` (интерфейсы по контракту: Profile, DeaneryContact, ScheduleWeek, ScheduleToday, Discipline,
RatingSummary, SessionExam, TranscriptRow, AcademicRank, GradeScaleRow, RequestType, Order, Notification, Announcement, DeadlineMessage)
и импортируй zod только для валидации входных данных, если нужно. Не тяните zod в бандл — проще ручные типы.

## Эндпоинты и конверт (важно!)
- Все ответы API: `{ ok: true, data: ... }` либо `{ ok: false, error: { code, message, fields? } }`. HTTP статусы
  используются (401, 403, 404, 409, 422, 429, 500). Fetch-обёртка `lib/api.ts`:
  - `credentials: 'same-origin'`, `Accept: application/json`; POST/PATCH — `Content-Type: application/json`;
  - при `401` → сброс кэша пользователя и редирект на `/login` (кроме самого `/auth/me`);
  - при `429` из ответа/заголовка `Retry-After` — человеческое сообщение; при 5xx — «Что-то пошло не так» + «Повторить»;
  - поддержи `AbortSignal`.
- Публичные:
  - `GET /api/health` → `{status:'ok', time}`
  - `GET /api/meta` → `{ demo:true, appName, appSubtitle, contest:{name, year}, university, disclaimer,
    accounts: [{ login, password, name, role, note }], today }`
  - `POST /api/auth/login` `{login, password}` → `data: { user: { student: { login, name, group } } }` (cookie сессии ставит сервер).
    Ошибки: 401 `INVALID_CREDENTIALS`, 429 `TOO_MANY_ATTEMPTS`, 422 `VALIDATION`
  - `POST /api/auth/logout` → 204
  - `GET /api/auth/me` → `{ user: { student } }` или 401
  - `GET /api/verify/:token` → `{ verified: boolean, number?: string, issuedAt?: string }`
- Авторизованные (студент):
  - `GET /api/me/profile` → `{ profile: Profile, deanery: DeaneryContact }`; `PATCH /api/me/profile` `{phone?, telegram?}` → `{ profile, deanery }`
  - `POST /api/me/password` `{current, next, confirm}` → 204 | 403 `WRONG_PASSWORD` | 422 `VALIDATION` | 400 `PASSWORD_MISMATCH`
  - `POST /api/me/logout-all` → 204
  - `POST /api/me/2fa` `{enabled:boolean}` → `{ profile, deanery }`
  - `GET /api/schedule/today?date=` → ScheduleToday; `GET /api/schedule/week?date=` → ScheduleWeek;
    `GET /api/schedule/export.ics?date=` → файл (скачивание, `Content-Disposition`)
  - `GET /api/progress` → `{ summary: RatingSummary, disciplines: Discipline[], session: SessionExam[],
    past: TranscriptRow[], rank: AcademicRank, scale: GradeScaleRow[] }`
  - `GET /api/deadlines` → DeadlineMessage[]; `POST /api/deadlines/:id/toggle` → DeadlineMessage[]
  - `GET /api/requests/types` → RequestType[]; `GET /api/requests` → Order[];
    `POST /api/requests` `{typeCode, values: Record<string,string|boolean>}` → Order (201);
    `GET /api/requests/:id` → Order; `POST /api/requests/:id/cancel` → Order;
    `GET /api/requests/:id/document` → PDF (только ready; 409 `REQUEST_NOT_READY`)
  - `GET /api/notifications` → Notification[]; `POST /api/notifications/:id/read` → 204; `POST /api/notifications/read-all` → 204
  - `GET /api/announcements` → Announcement[]; `POST /api/messages` `{subject, body}` → 201; `GET /api/messages` → свои
- Сотрудник: `GET /api/staff/stats` (`{new, inProgress, overdue, newMessages, readyToday}`), `GET /api/staff/requests?status=` →
  `(Order & {student:{name, group, login}})[]`, `PATCH /api/staff/requests/:id` `{status, comment?, rejectReason?}` → обновлённая заявка,
  `GET /api/staff/messages` → `{id, subject, body, student:{name,group}, createdAtLabel, status, reply}[]`,
  `POST /api/staff/messages/:id/reply` `{reply}`, `POST /api/staff/announcements` `{title, body, category, pinned, forAll?}`.
- Роль пользователя определяет сервер: если `/api/staff/*` отвечает 403 → у пользователя нет доступа к кабинету сотрудника
  (показывать только студенческие пункты меню; секретарь работает на `/staff`). Для проверки роли используй
  успешный `GET /api/staff/stats` — сделай хук `useRole()` = 'staff' если `/api/staff/stats` ответил 200,
  иначе 'student' (React Query, `retry:false`, `staleTime: Infinity`). Секретарь после входа сразу попадает на `/staff`.
  Для студента в меню — 5 пунктов; для сотрудника — «Заявки», «Вопросы», «Объявления».

## Типовая информация о данных
Смотри `server/src/contract.ts` (поля и комментарии-примеры) и `docs/agents/SEED-DATA.md` (какие данные придут:
Анна Иванова — сильная успеваемость, Дмитрий Смирнов — в зоне риска и с отклонённой заявкой, Мадина Каримова — 1 курс,
есть мгновенная выписка; сотрудник — Пахомова). Все ID — числа.

## Маршруты (Router, lazy-загрузка страниц)
- `/login` — экран входа (не в layout)
- `/` — «Сегодня» (лента дня)
- `/schedule` — расписание (Сегодня | Неделя) — сегмент-переключатель, неделя с переключением ←/→
- `/progress` — успеваемость
- `/requests` — Заявки: вкладки «Активные» / «История», кнопка «Новая заявка» открывает каталог услуг (/requests/new)
- `/requests/new` — каталог + выбор услуги + форма (можно как отдельные `/requests/new/:typeCode`, но лучше одна страница с шагами: каталог → форма → подтверждение)
- `/requests/:id` — карточка заявки: статус-таймлайн, поля, кнопка «Скачать PDF» если ready, «Отменить» если canCancel
- `/notifications` — лента: вкладки «Уведомления» / «Объявления деканата» / «Дедлайны» + кнопка «Новый вопрос в деканат»
- `/profile` — профиль студента + контакты деканата + безопасность (смена пароля, 2FA-тумблер-прототип, выход со всех устройств)
- `/staff` — кабинет сотрудника (заявки, вопросы, объявления, статистика)
- `/verify/:token` — публичная страница проверки документа (без layout, но с логотипом)
- 404 — «Страница не найдена»
Все страницы (кроме `/login`, `/verify`) — под AuthLayout (сайдбар на ≥1024px, нижняя таб-навигация на мобильном:
Сегодня, Расписание, Учёба, Заявки, Ещё/Профиль; бейдж непрочитанных на «Ещё» или колокольчик в шапке).
Колокольчик в шапке на всех экранах: shows unread count → `/notifications`.

## Ключевые сценарии (должны работать идеально)
1. **Вход**: поля логин/пароль, show/hide пароль, «Войти», ошибки, Enter, загрузка, блок «Демо-доступы для жюри»
   (из `/api/meta.accounts`: кнопка «Войти как» — подставляет данные и входит в один тап; показывать логин и пароль текстом).
   На экране входа — логотип, дисклеймер «Концепт для конкурса VK Education. Неофициальный сервис МГИМО. Все данные вымышлены.»
2. **Сегодня**: приветствие по времени суток с именем, карточка «Следующая пара» с обратным отсчётом (человекопонятно,
   обновляется раз в минуту), проблемы дня («2 изменения в расписании» → /schedule, «Дедлайн через 2 дня»),
   4 плитки-быстрые действия (Заказать справку, Расписание, Мои оценки, Нужна помощь), блок «Сегодня в расписании»,
   «Не опоздать» — следующие дедлайны с чекбоксами (`/api/deadlines`), последние уведомления (2–3).
3. **Расписание**: «Сегодня» — таймлайн пар (время, аудитория/корпус, преподаватель, тип, статус «идёт сейчас»,
   плашка изменения), пустое состояние «Сегодня занятий нет — свободный день 🎉» (без emoji — используй иконку),
   карточки «Изменения на неделе». «Неделя» — на мобильном: горизонтальные чипы дней + список выбранного дня;
   на десктопе: сетка 7 колонок (или список по дням, но лучше сетка). Пара с `change` — визуально выделена
   (полоса слева: warning/amber для room/time, danger для cancelled, info для added/moved). Кнопка «В календарь (.ics)».
4. **Успеваемость**: сводка (средний рейтинг кольцом, «автоматов: N из M», риски), аккордеон дисциплин:
   рейтинг-бар с маркером 70%, текст «До автомата — 13 баллов из 43 оставшихся», контрольные точки (earned/max),
   «Экзамен 22 декабря · ауд. 101», финальная оценка если есть. Вкладки: «Дисциплины», «Сессия», «Рейтинг», «Оценки» (прошлые).
   Шкала оценок — info-панель/аккордеон «Как читать рейтинг». Проактивно: баннер вверху «2 дисциплины под угрозой — подробнее».
5. **Заявки**: список с бейджами статусов и контекстной строкой («Готово · 16 ноя», «Прогноз: 19 ноя»,
   «Отклонена: причина»). Создание: каталог карточек (категории Сертификаты/Заявления/Справки), по клику — форма,
   поля из `fields` (text/textarea/select/date/radio/checkbox, minLength, required), валидация на клиенте с понятными ошибками,
   «Проверить» → экран подтверждения (обзор значений) → «Подать заявку» → успех: номер, прогноз, кнопки «Открыть заявку», «В мои заявки».
   Карточка: таймлайн истории, поля (label/value), PDF, отмена с подтверждением (диалог), причина отказа.
6. **Уведомления**: список с иконками по типу, непрочитанные — акцентная линия/фон, «Прочитать всё»,
   вкладки: Уведомления / Объявления деканата (карточки с категорией и scope) / Дедлайны (чекбоксы) и «Новый вопрос в деканат»
   (кнопка открывает Sheet с формой «Тема» и «Вопрос» → POST /api/messages → тост, после ответа сотрудника студент увидит
   ответ в уведомлениях; на экране профиля или уведомлений покажи список своих вопросов/ответов из `GET /api/messages`).
7. **Профиль**: аватар-инициалы, ФИО, факультет/направление/курс/группа, зачётка (маскированная), бюджет/стипендия, общежитие,
   контакты; секция «Деканат» (аудитория, часы, ФИО секретаря/декана, e-mail, телефон, кнопка «Задать вопрос»);
   «Безопасность»: смена пароля (форма с ошибками), 2FA toggle (POST /api/me/2fa), «Выйти на всех устройствах», «Выйти»;
   редактирование телефона и Telegram (PATCH /api/me/profile); переключатель темы (светлая/тёмная/системная) — хранить в localStorage
   + `<html data-theme>`, не нужно серверу.
8. **Кабинет сотрудника** `/staff`: дашборд-статистика, таблица/карточки заявок с фильтром по статусу,
   открыть заявку → панель с данными студента → «Взять в работу» / «Готово» / «Отклонить» (с обязательной причиной),
   вопросы студентов (ответить), опубликовать объявление (форма: заголовок, текст, категория, закрепить, для всех/только свой факультет).

## UI-требования
- Дизайн — по `docs/DESIGN.md`: холст `#F7F6F8`, колонка `#F3F1F4`, акцент `#9154EB`, карточки белые с радиусом 12 и границей `#E6E3E8` без тени, пастель только у блоков расписания, цифры tabular-nums. Индиго и золото не использовать. Тёмная тема — из тех же ролей, см. DESIGN.md.
- Tailwind v4: `@import "tailwindcss";` + `@theme` с токенами из `docs/DESIGN.md` (brand, surface, ink, muted, quiet, line, sidebar, now, event-*),
  тёмная тема через `@custom-variant dark` или `data-theme="dark"` — выбери и реализуй аккуратно БЕЗ мерцания:
  скрипт в `index.html` до загрузки приложения ставит `data-theme` из localStorage/`prefers-color-scheme`.
- Компоненты `components/ui`: Button, IconButton, Card, Badge, Chip, Segmented, Tabs, Field (label/hint/error, textarea, select),
  Sheet (bottom sheet на мобильном, центрированный диалог на десктопе; focus-trap, Esc, aria-modal, возврат фокуса),
  Progress (с маркером порога), RingProgress, Skeleton, EmptyState (иконка, текст, действие), ErrorState (с «Повторить»),
  Toast (aria-live="polite"), Avatar, PageHeader, Toggle, Accordion, StickyHeader.
- Загрузка — skeletons, а не спиннеры на весь экран. Ошибки — с кнопкой повтора. Пустые состояния — с CTA.
- Доступность: `aria-label` на иконочных кнопках, focus-visible ring, семантика (main/nav/h1), контраст AA,
  `prefers-reduced-motion` отключает анимации, таб-цели ≥ 44 px, никакого горизонтального скролла на 360 px.
- Логотип: SVG-компонент `components/Logo.tsx` — собственный знак «Дедлайн»: конверт, круг акцента `#9154EB`,
  текст «Дедлайн» и подпись «цифровой деканат 2030». Чужие знаки (в том числе `inh` и логотипы университетов) не копировать.
- В футере/виджете «О проекте»: «Концепт для конкурса VK Education “Кибербезопасность и ИИ в высшей школе — 2026”.
  Неофициальный сервис МГИМО, не подключён к системам университета. Все данные вымышлены.» + ссылка `/login` если не авторизован.
- Числа и даты — по-русски, «1 234 ₽», «17 ноября», склонение («3 дня», «1 день», «2 часа»).

## Мок-режим для разработки без бэкенда
Сделай `web/src/lib/mock.ts` + `VITE_USE_MOCK=1` (или `?mock=1` в URL): фикстуры в духе SEED-DATA,
чтобы страницы можно было разработать и снять скриншоты до готовности API. Это также удобно жюри, но в прод-сборке
по умолчанию mock выключен.

## Проверка
`npm run build -w web` — ноль ошибок TypeScript и предупреждений сборки; `npx vite preview` (из web/, порт 4173) —
страницы открываются. Проверь на 360×640 и 1440×900 без горизонтальных скроллов. Если есть возможность снять
скриншоты (например, `npx playwright` недоступен — тогда это делаю я), сними хотя бы в мок-режиме и сохрани в `web/.preview/`
(исключи из git не нужно — они не попадут в прод). Не трогай `server/` и `docs/`.

В конце верни отчёт: что реализовано по страницам, какие компоненты, какие места упрощены, как включить мок-режим,
и список любых рисов, где ты не уверен в совместимости с API.
