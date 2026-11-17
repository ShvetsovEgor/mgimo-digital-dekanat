// Демо-данные для мок-режима (без бэкенда). Все ФИО, телефоны и номера вымышлены.
// Профиль — «Анна Иванова» из SEED-DATA, остальные аккаунты — минимальный набор для кабинета сотрудника.

import type {
  Announcement,
  DeadlineItem,
  DeaneryContact,
  Meta,
  Profile,
  QuestionMessage,
  StaffMessage,
  StaffOrder,
  StaffStats,
} from '../types';

export const MOCK_META: Meta = {
  demo: true,
  appName: 'Дедлайн',
  appSubtitle: 'Цифровой деканат 2030',
  contest: { name: 'Кибербезопасность и ИИ в высшей школе', year: 2026 },
  university: 'МГИМО',
  disclaimer:
    'Концепт для конкурса VK Education. Неофициальный сервис МГИМО, не подключён к системам университета. Все данные вымышлены.',
  accounts: [
    {
      login: 'a.ivanova',
      password: 'DemoKonkurs2030',
      name: 'Анна Иванова',
      role: 'student',
      note: '2 курс, МО · сильная успеваемость, готовая справка',
    },
    {
      login: 'd.smirnov',
      password: 'DemoKonkurs2030',
      name: 'Дмитрий Смирнов',
      role: 'student',
      note: '2 курс, МО · риск «автомата», отклонённая заявка',
    },
    {
      login: 'm.karimova',
      password: 'DemoKonkurs2030',
      name: 'Мадина Каримова',
      role: 'student',
      note: '1 курс, МП · много дедлайнов, модуль ещё не сдан',
    },
    {
      login: 'dekanat',
      password: 'DemoKonkurs2030',
      name: 'Ольга Пахомова',
      role: 'staff',
      note: 'Специалист деканата МО · кабинет сотрудника',
    },
  ],
  today: '2026-11-17',
};

export const MOCK_PROFILE: Profile = {
  firstName: 'Анна',
  fullName: 'Иванова Анна Сергеевна',
  displayName: 'Анна Иванова',
  shortName: 'А. С. Иванова',
  initials: 'АИ',
  course: 2,
  courseOrdinal: '2-й курс',
  group: 'МО-2-3',
  subgroup: 'А',
  program: 'Дипломатия и политика зарубежных стран',
  programCode: '41.03.01',
  degree: 'Бакалавриат',
  studyForm: 'Очная форма',
  faculty: 'Факультет международных отношений',
  facultyShort: 'МО',
  department: 'Кафедра международных отношений',
  enrollmentYear: 2025,
  semesterLabel: '3 семестр 2026/27',
  recordBookMasked: '****0481',
  email: 'a.ivanova@student.deadline.demo',
  phone: '+7 (900) 000-00-01',
  telegram: '@a_ivanova_demo',
  funded: 'budget',
  fundedLabel: 'Бюджетное место',
  scholarship: 'Повышенная академическая — 6 000 ₽/мес',
  dorm: 'Общежитие № 2, комн. 512',
  curator: 'К. И. Лебедева',
  verification: {
    level: 2,
    label: 'Подтверждён',
    note: 'Личность подтверждена через Госуслуги · 2FA включена',
  },
  security: { twoFactor: true, lastPasswordChange: '12 сентября', activeSessions: 2 },
};

export const MOCK_DEANERY: DeaneryContact = {
  office: 'Факультет МО, ауд. 214',
  hours: 'пн–чт 10:00–17:00, пт 10:00–15:00',
  secretary: 'О. Н. Пахомова',
  dean: 'А. В. Мельников',
  email: 'dekanat-mo@deadline.demo',
  phone: '+7 (495) 000-00-01',
  building: 'пр. Вернадского, 76',
  responseTime: 'обычно отвечаем в течение рабочего дня',
};

const d = (daysAhead: number, hour = 18): string => {
  const today = new Date();
  today.setHours(hour, 0, 0, 0);
  today.setDate(today.getDate() + daysAhead);
  return today.toISOString();
};

export const MOCK_DEADLINES: DeadlineItem[] = [
  {
    id: 1,
    title: 'Тест по экономической теории',
    course: 'Экономическая теория',
    dueAt: d(3),
    dueLabel: '20 ноября, 18:00',
    relative: 'через 3 дня',
    points: '35 баллов',
    done: false,
  },
  {
    id: 2,
    title: 'Эссе «Globalisation and identity»',
    course: 'Иностранный язык (английский)',
    dueAt: d(5),
    dueLabel: '22 ноября, 23:59',
    relative: 'через 5 дней',
    points: '20 баллов',
    done: false,
  },
  {
    id: 3,
    title: 'Реферат по «Введению в МО»',
    course: 'Введение в международные отношения',
    dueAt: d(-2),
    dueLabel: '15 ноября, 18:00',
    relative: 'сдан',
    points: '20 баллов',
    done: true,
  },
];

export const MOCK_NOTIFICATIONS: { id: number; type: string; title: string; body: string; link: string | null; isoOffsetMin: number; read: boolean }[] = [
  {
    id: 1,
    type: 'schedule',
    title: 'Перенос пары по английскому',
    body: 'Среда, 12:20 → пятница, 09:00, ауд. 512. Передал деканат МО.',
    link: '/schedule',
    isoOffsetMin: -25,
    read: false,
  },
  {
    id: 2,
    type: 'grade',
    title: 'Новая оценка: «Введение в международные отношения»',
    body: 'Семинары — 34 из 40. Накопительный рейтинг вырос до 86%.',
    link: '/progress',
    isoOffsetMin: -180,
    read: false,
  },
  {
    id: 3,
    type: 'request',
    title: 'Справка об обучении готова',
    body: '№ ЗВ-2030-000012 · PDF уже можно скачать в кабинете.',
    link: '/requests/12',
    isoOffsetMin: -1500,
    read: false,
  },
  {
    id: 4,
    type: 'announcement',
    title: 'Объявление деканата МО',
    body: 'Зачётная неделя — с 21 по 26 декабря. Графики консультаций в закреплённом объявлении.',
    link: '/notifications?tab=announcements',
    isoOffsetMin: -2900,
    read: true,
  },
  {
    id: 5,
    type: 'message',
    title: 'Вопрос от куратора',
    body: 'К. И. Лебедева напоминает о дедлайне эссе по английскому.',
    link: '/notifications',
    isoOffsetMin: -4300,
    read: true,
  },
  {
    id: 6,
    type: 'deadline',
    title: 'Дедлайн через 3 дня',
    body: 'Тест по экономической теории — 20 ноября, 18:00.',
    link: '/notifications?tab=deadlines',
    isoOffsetMin: -5000,
    read: true,
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    category: 'session',
    categoryLabel: 'Сессия',
    title: 'Зачётная неделя: 21–26 декабря',
    body: 'График консультаций и аудитории появятся здесь за неделю. Зачёт-автомат по дисциплинам, где рейтинг ≥ 70%, — автоматически, обращаться не нужно.',
    pinned: true,
    createdAt: d(-2),
    createdAtLabel: '15 ноя',
    scope: 'Для факультета МО',
  },
  {
    id: 2,
    category: 'documents',
    categoryLabel: 'Документы',
    title: 'Справки на зачётную неделю — заранее',
    body: 'Срок подготовки справки об обучении — 1 рабочий день. Заказывайте через кабинет: в деканат приходите только для получения бумажной копии.',
    pinned: false,
    createdAt: d(-4),
    createdAtLabel: '13 ноя',
    scope: 'Для всех студентов',
  },
  {
    id: 3,
    category: 'life',
    categoryLabel: 'Жизнь кампуса',
    title: 'Студенческий форум «Диалог»',
    body: 'Регистрация до 25 ноября. Участие бесплатное, вопросы — в чат группы.',
    pinned: false,
    createdAt: d(-6),
    createdAtLabel: '11 ноя',
    scope: 'Для всех студентов',
  },
];

export const MOCK_QUESTIONS: QuestionMessage[] = [
  {
    id: 1,
    subject: 'Возможна ли пересдача экзамена по «Введению в МО»',
    body: 'Добрый день! Если не смогу прийти в день экзамена по уважительной причине, как оформляется пересдача?',
    createdAtLabel: '10 ноя',
    status: 'answered',
    reply:
      'Здравствуйте, Анна! По уважительной причине оформляется индивидуальный график через деканат. Принесите заявление и документ, подтверждающий причину, — оформим в течение 2 рабочих дней.',
  },
  {
    id: 2,
    subject: 'Где забрать готовую справку об обучении',
    body: 'Справка № ЗВ-2030-000012 готова. Нужно ли приходить лично?',
    createdAtLabel: '9 ноя',
    status: 'new',
    reply: null,
  },
];

export const MOCK_STAFF_STATS: StaffStats = { new: 3, inProgress: 2, overdue: 1, newMessages: 1, readyToday: 2 };

export const MOCK_STAFF_MESSAGES: StaffMessage[] = [
  {
    id: 1,
    subject: 'Где забрать готовую справку об обучении',
    body: 'Справка № ЗВ-2030-000012 готова. Нужно ли приходить лично?',
    student: { name: 'Анна Иванова', group: 'МО-2-3' },
    createdAtLabel: '9 ноя, 14:12',
    status: 'new',
    reply: null,
  },
  {
    id: 2,
    subject: 'Возможна ли пересдача экзамена',
    body: 'Если не смогу прийти в день экзамена по уважительной причине, как оформляется пересдача?',
    student: { name: 'Дмитрий Смирнов', group: 'МО-2-7' },
    createdAtLabel: '10 ноя, 09:40',
    status: 'answered',
    reply: 'По уважительной причине оформляется индивидуальный график через деканат.',
  },
];

const staffOrderBase = {
  createdAt: d(-2),
  createdAtLabel: '15 ноя',
  dueAt: d(1),
  dueLabel: '18 ноя',
  readyAtLabel: null,
  isOverdue: false,
  fields: [] as { label: string; value: string }[],
  history: [] as StaffOrder['history'],
  rejectReason: null,
  statusNote: null,
};

export const MOCK_STAFF_ORDERS: StaffOrder[] = [
  {
    ...staffOrderBase,
    id: 21,
    number: 'ЗВ-2030-000021',
    typeCode: 'certificate-study',
    typeTitle: 'Справка об обучении',
    category: 'certificate',
    status: 'pending',
    statusLabel: 'Ожидает проверки',
    canCancel: false,
    canDownload: false,
    student: { name: 'Анна Иванова', group: 'МО-2-3', login: 'a.ivanova' },
  },
  {
    ...staffOrderBase,
    id: 22,
    number: 'ЗВ-2030-000022',
    typeCode: 'retake',
    typeTitle: 'Пересдача по дисциплине',
    category: 'application',
    status: 'pending',
    statusLabel: 'Ожидает проверки',
    canCancel: false,
    canDownload: false,
    student: { name: 'Дмитрий Смирнов', group: 'МО-2-7', login: 'd.smirnov' },
  },
  {
    ...staffOrderBase,
    id: 23,
    number: 'ЗВ-2030-000023',
    typeCode: 'certificate-scholarship',
    typeTitle: 'Справка о стипендии',
    category: 'certificate',
    status: 'in_progress',
    statusLabel: 'В работе',
    canCancel: false,
    canDownload: false,
    dueAt: d(-1),
    dueLabel: '16 ноя',
    isOverdue: true,
    student: { name: 'Анна Иванова', group: 'МО-2-3', login: 'a.ivanova' },
  },
  {
    ...staffOrderBase,
    id: 24,
    number: 'ЗВ-2030-000024',
    typeCode: 'certificate-visa',
    typeTitle: 'Справка-вызов для визы',
    category: 'certificate',
    status: 'in_progress',
    statusLabel: 'В работе',
    canCancel: false,
    canDownload: false,
    student: { name: 'Дмитрий Смирнов', group: 'МО-2-7', login: 'd.smirnov' },
  },
  {
    ...staffOrderBase,
    id: 25,
    number: 'ЗВ-2030-000025',
    typeCode: 'certificate-study',
    typeTitle: 'Справка об обучении',
    category: 'certificate',
    status: 'ready',
    statusLabel: 'Готово',
    canCancel: false,
    canDownload: true,
    readyAtLabel: '16 ноя',
    student: { name: 'Анна Иванова', group: 'МО-2-3', login: 'a.ivanova' },
  },
];
