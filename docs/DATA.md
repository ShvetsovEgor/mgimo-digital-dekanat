# DATA — модель данных, вымышленные данные и API-контракт

## Принципы
- **Только вымышленные данные.** Все ФИО, телефоны, e-mail, номера зачёток — придуманы.
- Ключи — целые автоинкременты. Никаких «красивых» ID, чтобы IDOR-попытки очевидно проваливались.
- Права проверяет сервер по `session.user_id`, а не по параметрам запроса.

## Таблицы (SQLite)
```
users(id, role CHECK in ('student','staff'), login UNIQUE, password_hash, failed_attempts, locked_until,
      must_change_password, theme, created_at)
sessions(id TEXT PK, user_id, created_at, expires_at, user_agent, ip_hash)
profiles(user_id PK, last_name, first_name, middle_name, faculty, department_id, program_code, program_name,
         study_form, course, group_code, subgroup, record_book, email, phone, enrollment_year, curator,
         is_state_funded, student_id_card(json), dorm, scholarship(json))
staff_profiles(user_id PK, full_name, position, department_id, email)
faculty/faculties(id, code, name, dean, secretary, office, building, phone, email)
staff(department_id -> faculties.id)
courses(id, code, title, teacher, credits)
enrollments(id, user_id, course_id, semester, attestation_type, auto_credit_threshold, control_points_json,
            final_rating, final_grade, final_ects, exam_date NULL, exam_room NULL, lecture_room, schedule_note,
            attendance)
past_results(id, user_id, semester, course_title, credits, rating, grade, ects)
academic_rank(user_id, semester, place_in_group, out_of_group, place_in_programme, out_of_programme, cohort_avg)
schedule_entries(id, department_id, group_code, subgroup NULL, weekday 1..6, start_min, end_min, kind,
                 course_code, title, teacher, room, building, week_type 'all'|'odd'|'even', date NULL,
                 exception_type NULL, original_date NULL, comment, published_by, published_at)
announcements(id, author_user_id, department_id NULL (NULL = всем), category, title, body, pinned, priority,
              created_at, published)
notifications(id, user_id, type, title, body, link, read, created_at, meta_json)
request_types(id, code, title, audience 'student'|'staff'|'all', category 'certificate'|'application'|'service',
              description, sla_days, price, icon, form_json, template)
requests(id, number UNIQUE, user_id, type_code, status 'pending'|'in_progress'|'ready'|'rejected'|'cancelled',
         payload_json, comment, reject_reason, created_at, updated_at, due_at, ready_at, processed_by, history_json)
messages(id, user_id, department_id, subject, body, reply, status 'new'|'answered', created_at, replied_at, replied_by)
jobs_queue(id, kind, payload_json, run_at, created_at)  -- имитация фонового ИИ-агента
audit_log(id, actor_user_id, actor_role, action, entity, entity_id, ip_hash, created_at)
verification(when opening /verify/:token — сверка HMAC)
```

| Роль | Логин | Кто |
|---|---|---|
| Студент 1 | `a.ivanova` | Анна Иванова, 2 курс, МО, «Дипломатия и политика зарубежных стран», группа МО-2-3, сильная успеваемость, 70%+ по 4 из 5 дисциплин, есть готовая справка |
| Студент 2 | `d.smirnov` | Дмитрий Смирнов, 2 курс, МО, та же программа, группа МО-2-7, рискует «автоматом», есть отклонённая заявка |
| Студент 3 | `m.karimova` | Мадина Каримова, 1 курс, МП, «Международное право», группа МП-1-2, много дедлайнов, нет оценок модуля |
| Сотрудник | `dekanat` | Ольга Николаевна Пахомова, специалист деканата МО |

Пароль хешируется bcrypt (cost 11) при seed. В исходном коде в seed лежит пароль **только** для этих публичных демо-аккаунтов.

## API (все JSON, префикс `/api`)
Авторизация: cookie сессии. Ответ: `{ok:true,data}` / `{ok:false,error:{code,message,fields?}}`.

### Публичные
- `GET /api/health` → `{status:'ok', time}`
- `GET /api/meta` → `{demo:true, appName, contest, university, demoAccounts:[...] (login,password,name), today}`
- `POST /api/auth/login` `{login,password}` → `{user}`; 401 `INVALID_CREDENTIALS`, 429 `TOO_MANY_ATTEMPTS`
- `POST /api/auth/logout` → 204
- `GET /api/auth/me` → `{user}` или 401 `UNAUTHENTICATED`
- `GET /api/verify/:token` → `{verified:boolean, number?, issuedAt?}` (без PII)

### Авторизованные (401 без сессии)
- `GET /api/me/profile` → профиль студента/сотрудника
- `PATCH /api/me` `{phone?, telegram?, notifyMode?}` → профиль
- `POST /api/me/password` `{current,next}` → 204; 400 `WEAK_PASSWORD`, 403 `WRONG_PASSWORD`
- `POST /api/me/logout-all` → 204
- `GET /api/schedule?week=0|-1|1&date=YYYY-MM-DD` → неделя: `[{date,weekday,isToday,entries:[...]}]` + `changes`
- `GET /api/schedule/today` → `{date, now, nextLecture, entries, changes}`
- `GET /api/schedule/entry/:id` → деталь (только расписание своей группы)
- `GET /api/progress` → сводка успеваемости (только своя)
- `GET /api/requests` → мои заявки
- `GET /api/requests/types` → каталог услуг
- `POST /api/requests` `{typeCode, payload}` → заявка
- `GET /api/requests/:id` → своя заявка (403/404 для чужой)
- `POST /api/requests/:id/cancel` → своя заявка в `pending`/`in_progress`
- `GET /api/requests/:id/document` → PDF (только владелец, только `ready`)
- `GET /api/notifications` → лента; `POST /api/notifications/read` `{ids?}`; `POST /api/notifications/:id/read`
- `GET /api/announcements` → объявления
- `GET /api/deadlines` → дедлайны с `done`
- `POST /api/deadlines/:id/toggle`
- `POST /api/messages` `{subject, body}` → вопрос деканату
- `GET /api/messages` → мои сообщения
- `GET /api/schedule/export.ics?week=0` → календарь

### Сотрудник (403 для студентов)
- `GET /api/staff/requests` → заявки моего деканата
- `PATCH /api/staff/requests/:id` `{status, comment?, rejectReason?}` → PATCH
- `GET /api/staff/messages`; `POST /api/staff/messages/:id/reply` `{reply}`
- `POST /api/staff/announcements` `{title, body, category, pinned, priority}`
- `GET /api/staff/stats` → счетчики

## Коды ошибок
`UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `TOO_MANY_ATTEMPTS`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`,
`REQUEST_NOT_READY`, `REQUEST_NOT_CANCELLABLE`, `WRONG_PASSWORD`, `WEAK_PASSWORD`, `RATE_LIMITED`.
