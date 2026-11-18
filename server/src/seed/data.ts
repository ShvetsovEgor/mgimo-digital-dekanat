// Seed-данные «Дедлайн»: факультеты, аккаунты, профили, курсы и оценки, прошлые семестры,
// расписание, объявления, дедлайны, заявки, сообщения, уведомления.
// Все ФИО, номера зачёток, телефоны и e-mail — вымышленные. Даты расписания привязаны
// к текущей неделе, чтобы «сегодня» всегда было расписание.
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type BetterSqlite3 from 'better-sqlite3';
import { BCRYPT_ROUNDS } from '../lib/auth.js';
import { addDays, parseLocal, startOfWeek, toDateString, toLocalIso } from '../lib/time.js';
import { dateTimeLabel } from '../lib/format.js';

type DB = BetterSqlite3.Database;
type SqlParams = Record<string, string | number | null>;

// ---------------------------------------------------------------------------
// Справочники
// ---------------------------------------------------------------------------
export interface FacultySeed {
  id: number;
  code: string;
  short_name: string;
  full_name: string;
  dean: string;
  office: string;
  building: string;
  phone: string;
  email: string;
  hours: string;
}

const HOURS = 'пн–чт 10:00–17:00, пт 10:00–15:00';

export const FACULTIES: FacultySeed[] = [
  {
    id: 1,
    code: 'MO',
    short_name: 'Международные отношения',
    full_name: 'Факультет международных отношений',
    dean: 'А. В. Мельников',
    office: 'ауд. 214',
    building: 'пр. Вернадского, 76',
    phone: '+7 (495) 000-00-01',
    email: 'dekanat-mo@deadline.demo',
    hours: HOURS,
  },
  {
    id: 2,
    code: 'MP',
    short_name: 'Международное право',
    full_name: 'Международно-правовой факультет',
    dean: 'И. С. Верещагина',
    office: 'ауд. 305',
    building: 'пр. Вернадского, 76, корп. 2',
    phone: '+7 (495) 000-00-02',
    email: 'dekanat-mp@deadline.demo',
    hours: HOURS,
  },
  {
    id: 3,
    code: 'MEO',
    short_name: 'Международные экономические отношения',
    full_name: 'Факультет международных экономических отношений',
    dean: 'П. А. Румянцев',
    office: 'ауд. 118',
    building: 'пр. Вернадского, 76',
    phone: '+7 (495) 000-00-03',
    email: 'dekanat-meo@deadline.demo',
    hours: HOURS,
  },
  {
    id: 4,
    code: 'MB',
    short_name: 'Международный бизнес',
    full_name: 'Факультет международного бизнеса',
    dean: 'Е. Р. Соловьёва',
    office: 'ауд. 402',
    building: 'пр. Вернадского, 76, корп. 2',
    phone: '+7 (495) 000-00-04',
    email: 'dekanat-mb@deadline.demo',
    hours: HOURS,
  },
  {
    id: 5,
    code: 'MIEP',
    short_name: 'Международные экономические процессы',
    full_name: 'Международный институт энергетической политики и дипломатии',
    dean: 'В. Т. Астахов',
    office: 'ауд. 207',
    building: 'пр. Вернадского, 76',
    phone: '+7 (495) 000-00-05',
    email: 'dekanat-miep@deadline.demo',
    hours: HOURS,
  },
  {
    id: 6,
    code: 'MG',
    short_name: 'Международная журналистика',
    full_name: 'Факультет международной журналистики',
    dean: 'Н. Б. Лаврова',
    office: 'ауд. 311',
    building: 'пр. Вернадского, 76, корп. 3',
    phone: '+7 (495) 000-00-06',
    email: 'dekanat-mg@deadline.demo',
    hours: HOURS,
  },
  {
    id: 7,
    code: 'SGIA',
    short_name: 'Управление и политика',
    full_name: 'Школа государственного управления и международных отношений',
    dean: 'С. Д. Говоров',
    office: 'ауд. 520',
    building: 'пр. Вернадского, 76, корп. 2',
    phone: '+7 (495) 000-00-07',
    email: 'dekanat-sgia@deadline.demo',
    hours: HOURS,
  },
];

interface StudentSeed {
  login: string;
  lastName: string;
  firstName: string;
  middleName: string;
  departmentId: number;
  programCode: string;
  programName: string;
  group: string;
  subgroup: string;
  course: number;
  recordBook: string;
  funded: 'budget' | 'contract';
  scholarship: { title: string; amount: number } | null;
  dorm: string | null;
  curator: string;
  courseName: string;
  department: string;
  twoFactor: boolean;
}

const STUDENTS: Record<'ivanova' | 'smirnov' | 'karimova', StudentSeed> = {
  ivanova: {
    login: 'a.ivanova',
    lastName: 'Иванова',
    firstName: 'Анна',
    middleName: 'Сергеевна',
    departmentId: 1,
    programCode: '41.03.01',
    programName: 'Дипломатия и политика зарубежных стран',
    group: 'МО-2-3',
    subgroup: 'А',
    course: 2,
    recordBook: 'МО-24-04821',
    funded: 'budget',
    scholarship: { title: 'Повышенная академическая', amount: 3500 },
    dorm: 'Общежитие № 2, комн. 512',
    curator: 'К. И. Лебедева',
    courseName: 'Зарубежное регионоведение',
    department: 'Кафедра международных отношений',
    twoFactor: true,
  },
  smirnov: {
    login: 'd.smirnov',
    lastName: 'Смирнов',
    firstName: 'Дмитрий',
    middleName: 'Павлович',
    departmentId: 1,
    programCode: '41.03.01',
    programName: 'Дипломатия и политика зарубежных стран',
    group: 'МО-2-7',
    subgroup: 'Б',
    course: 2,
    recordBook: 'МО-24-05107',
    funded: 'contract',
    scholarship: null,
    dorm: null,
    curator: 'К. И. Лебедева',
    courseName: 'Зарубежное регионоведение',
    department: 'Кафедра международных отношений',
    twoFactor: false,
  },
  karimova: {
    login: 'm.karimova',
    lastName: 'Каримова',
    firstName: 'Мадина',
    middleName: 'Ринатовна',
    departmentId: 2,
    programCode: '40.03.01',
    programName: 'Международное право',
    group: 'МП-1-2',
    subgroup: 'А',
    course: 1,
    recordBook: 'МП-25-01192',
    funded: 'budget',
    scholarship: { title: 'Академическая', amount: 2500 },
    dorm: 'Общежитие № 1, комн. 208',
    curator: 'Д. А. Ершов',
    courseName: 'Юриспруденция',
    department: 'Кафедра международного права',
    twoFactor: false,
  },
};

export function demoHash(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

// ---------------------------------------------------------------------------
// Вспомогательные типы
// ---------------------------------------------------------------------------
interface ControlPoint {
  label: string;
  earned: number | null;
  max: number;
}

interface DisciplineSeed {
  code: string;
  title: string;
  teacher: string;
  attestation: 'credit' | 'graded' | 'exam';
  threshold: number;
  points: ControlPoint[];
  examDateOffset: number | null;
  examTime?: string;
  examRoom: string;
  finalRating?: number | null;
  finalGrade?: string | null;
  finalEcts?: string | null;
}

interface ScheduleSeed {
  weekday: number;
  startMin: number;
  endMin: number;
  kind: 'lecture' | 'seminar' | 'language' | 'physical' | 'consult' | 'exam';
  courseCode: string;
  title: string;
  teacher: string;
  room: string;
  building: string;
  subgroup?: string | null;
  weekType?: 'all' | 'odd' | 'even';
  changeKind?: 'room' | 'cancelled' | 'moved' | 'added' | 'time';
  originalDate?: 'today' | null;
  comment?: { note?: string; fromRoom?: string; fromStartMin?: number; publishedBy?: string };
}

// ---------------------------------------------------------------------------
// Успеваемость: 3 семестр (осень 2026)
// ---------------------------------------------------------------------------
const DISCIPLINES: Record<'ivanova' | 'smirnov' | 'karimova', DisciplineSeed[]> = {
  ivanova: [
    {
      code: 'HIST-RU',
      title: 'История России',
      teacher: 'доц. В. М. Громов',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 9, max: 10 },
        { label: 'Эссе «Петровские реформы»', earned: 17, max: 20 },
        { label: 'Семинары', earned: 16, max: 20 },
        { label: 'Тест', earned: null, max: 30 },
        { label: 'Экзамен-коллоквиум', earned: null, max: 20 },
      ],
      examDateOffset: 35,
      examRoom: '224',
    },
    {
      code: 'ECON-TH',
      title: 'Экономическая теория',
      teacher: 'ст. преп. Е. А. Корнилова',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 9, max: 10 },
        { label: 'Кейс', earned: 21, max: 25 },
        { label: 'Тест', earned: 27, max: 35 },
        { label: 'Зачётная работа', earned: null, max: 30 },
      ],
      examDateOffset: 35,
      examRoom: '210',
    },
    {
      code: 'ENG',
      title: 'Иностранный язык (английский)',
      teacher: 'преп. M. Harris',
      attestation: 'graded',
      threshold: 70,
      points: [
        { label: 'Лексико-грамматический тест', earned: 18, max: 20 },
        { label: 'Аудирование', earned: 16, max: 20 },
        { label: 'Эссе', earned: 17, max: 20 },
        { label: 'Устная часть', earned: null, max: 40 },
      ],
      examDateOffset: 28,
      examRoom: '512',
    },
    {
      code: 'INTRO-IR',
      title: 'Введение в международные отношения',
      teacher: 'проф. Л. Г. Симонова',
      attestation: 'exam',
      threshold: 70,
      points: [
        { label: 'Коллоквиум', earned: 18, max: 20 },
        { label: 'Реферат', earned: 17, max: 20 },
        { label: 'Тест', earned: 17, max: 20 },
        { label: 'Семинары', earned: 34, max: 40 },
      ],
      examDateOffset: 38,
      examTime: '10:00',
      examRoom: '101',
    },
    {
      code: 'PHYS-ED',
      title: 'Физическая культура',
      teacher: 'преп. И. С. Гришин',
      attestation: 'credit',
      threshold: 60,
      points: [{ label: 'Посещаемость и нормативы', earned: 90, max: 100 }],
      examDateOffset: 30,
      examRoom: 'Спортзал',
      finalRating: 90,
      finalGrade: 'Зачтено',
      finalEcts: 'Зачтено',
    },
  ],
  smirnov: [
    {
      code: 'HIST-RU',
      title: 'История России',
      teacher: 'доц. В. М. Громов',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 8, max: 10 },
        { label: 'Эссе «Петровские реформы»', earned: 12, max: 20 },
        { label: 'Семинары', earned: 11, max: 20 },
        { label: 'Тест', earned: 27, max: 30 },
        { label: 'Экзамен-коллоквиум', earned: null, max: 20 },
      ],
      examDateOffset: 35,
      examRoom: '226',
    },
    {
      code: 'ECON-TH',
      title: 'Экономическая теория',
      teacher: 'доц. О. П. Ветрова',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 7, max: 10 },
        { label: 'Кейс', earned: 14, max: 25 },
        { label: 'Тест', earned: 12, max: 35 },
        { label: 'Зачётная работа', earned: null, max: 30 },
      ],
      examDateOffset: 35,
      examRoom: '212',
    },
    {
      code: 'ENG',
      title: 'Иностранный язык (английский)',
      teacher: 'преп. S. Whitaker',
      attestation: 'graded',
      threshold: 70,
      points: [
        { label: 'Лексико-грамматический тест', earned: 20, max: 20 },
        { label: 'Аудирование', earned: 15, max: 20 },
        { label: 'Эссе', earned: 17, max: 20 },
        { label: 'Устная часть', earned: null, max: 40 },
      ],
      examDateOffset: 28,
      examRoom: '514',
    },
    {
      code: 'INTRO-IR',
      title: 'Введение в международные отношения',
      teacher: 'проф. Л. Г. Симонова',
      attestation: 'exam',
      threshold: 70,
      points: [
        { label: 'Коллоквиум', earned: 14, max: 20 },
        { label: 'Реферат', earned: 16, max: 20 },
        { label: 'Тест', earned: 11, max: 20 },
        { label: 'Семинары', earned: 29, max: 40 },
      ],
      examDateOffset: 38,
      examTime: '10:00',
      examRoom: '101',
    },
    {
      code: 'PHYS-ED',
      title: 'Физическая культура',
      teacher: 'преп. И. С. Гришин',
      attestation: 'credit',
      threshold: 60,
      points: [{ label: 'Посещаемость и нормативы', earned: 88, max: 100 }],
      examDateOffset: 30,
      examRoom: 'Спортзал',
      finalRating: 88,
      finalGrade: 'Зачтено',
      finalEcts: 'Зачтено',
    },
  ],
  karimova: [
    {
      code: 'TGP',
      title: 'Теория государства и права',
      teacher: 'доц. А. В. Худяков',
      attestation: 'exam',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 8, max: 10 },
        { label: 'Контрольная работа', earned: null, max: 25 },
        { label: 'Семинары', earned: null, max: 25 },
        { label: 'Экзамен', earned: null, max: 40 },
      ],
      examDateOffset: 33,
      examTime: '09:00',
      examRoom: '318',
    },
    {
      code: 'IGPR',
      title: 'История государства и права России',
      teacher: 'ст. преп. М. С. Аверин',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 9, max: 10 },
        { label: 'Реферат', earned: null, max: 30 },
        { label: 'Диктант по терминам', earned: null, max: 20 },
      ],
      examDateOffset: 40,
      examRoom: '214',
    },
    {
      code: 'CONST-LAW',
      title: 'Конституционное право России и зарубежных стран',
      teacher: 'доц. Н. П. Заславская',
      attestation: 'exam',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 8, max: 10 },
        { label: 'Доклад', earned: null, max: 30 },
        { label: 'Экзамен', earned: null, max: 60 },
      ],
      examDateOffset: 42,
      examTime: '10:00',
      examRoom: '302',
    },
    {
      code: 'LATIN',
      title: 'Латинский язык',
      teacher: 'преп. Э. Ю. Марченко',
      attestation: 'credit',
      threshold: 70,
      points: [
        { label: 'Посещаемость', earned: 8, max: 10 },
        { label: 'Контрольный перевод', earned: null, max: 30 },
        { label: 'Реферат', earned: null, max: 30 },
      ],
      examDateOffset: 45,
      examRoom: '404',
    },
    {
      code: 'PHYS-ED',
      title: 'Физическая культура',
      teacher: 'преп. И. С. Гришин',
      attestation: 'credit',
      threshold: 60,
      points: [{ label: 'Посещаемость и нормативы', earned: 85, max: 100 }],
      examDateOffset: 30,
      examRoom: 'Спортзал',
      finalRating: 85,
      finalGrade: 'Зачтено',
      finalEcts: 'Зачтено',
    },
  ],
};

// ---------------------------------------------------------------------------
// Расписание: текущая неделя (Пн–Пт). Изменения привязаны к «сегодня».
// ---------------------------------------------------------------------------
const SCHEDULE: Record<'ivanova' | 'smirnov' | 'karimova', ScheduleSeed[]> = {
  ivanova: [
    { weekday: 1, startMin: 540, endMin: 630, kind: 'lecture', courseCode: 'HIST-RU', title: 'История России', teacher: 'доц. В. М. Громов', room: '224', building: 'пр. Вернадского, 76' },
    { weekday: 1, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'ст. преп. Е. А. Корнилова', room: '318', building: 'пр. Вернадского, 76', subgroup: 'А' },
    { weekday: 1, startMin: 810, endMin: 900, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. M. Harris', room: '512', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 2, startMin: 530, endMin: 620, kind: 'lecture', courseCode: 'INTRO-IR', title: 'Введение в международные отношения', teacher: 'проф. Л. Г. Симонова', room: '101', building: 'пр. Вернадского, 76' },
    {
      weekday: 2, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'HIST-RU', title: 'История России', teacher: 'доц. В. М. Громов', room: '224', building: 'пр. Вернадского, 76',
      changeKind: 'room', comment: { note: 'Аудитория изменена: 218 → 224', fromRoom: '218', publishedBy: 'Деканат МО' },
    },
    { weekday: 3, startMin: 540, endMin: 630, kind: 'lecture', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'доц. А. Н. Тарасов', room: '210', building: 'пр. Вернадского, 76' },
    {
      weekday: 3, startMin: 740, endMin: 830, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. M. Harris', room: '512', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'А',
      changeKind: 'cancelled', comment: { note: 'Преподаватель на конференции — пара отменена', publishedBy: 'Деканат МО' },
    },
    { weekday: 3, startMin: 910, endMin: 1000, kind: 'physical', courseCode: 'PHYS-ED', title: 'Физическая культура', teacher: 'преп. И. С. Гришин', room: 'Спортзал', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 4, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'INTRO-IR', title: 'Введение в международные отношения', teacher: 'проф. Л. Г. Симонова', room: '307', building: 'пр. Вернадского, 76' },
    {
      weekday: 4, startMin: 810, endMin: 900, kind: 'consult', courseCode: 'HIST-RU', title: 'История России', teacher: 'доц. В. М. Громов', room: '218', building: 'пр. Вернадского, 76',
      changeKind: 'added', comment: { note: 'Добавлена консультация перед зачётной неделей', publishedBy: 'Деканат МО' },
    },
    {
      weekday: 5, startMin: 540, endMin: 630, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. M. Harris', room: '512', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'А',
      changeKind: 'moved', originalDate: 'today', comment: { note: 'Перенос со среды: преподаватель на конференции', fromStartMin: 740, publishedBy: 'Деканат МО' },
    },
    { weekday: 5, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'ст. преп. Е. А. Корнилова', room: '318', building: 'пр. Вернадского, 76' },
  ],
  smirnov: [
    { weekday: 1, startMin: 530, endMin: 620, kind: 'lecture', courseCode: 'HIST-RU', title: 'История России', teacher: 'доц. В. М. Громов', room: '224', building: 'пр. Вернадского, 76' },
    { weekday: 1, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'доц. О. П. Ветрова', room: '212', building: 'пр. Вернадского, 76', subgroup: 'Б' },
    { weekday: 1, startMin: 810, endMin: 900, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. S. Whitaker', room: '514', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 2, startMin: 540, endMin: 630, kind: 'lecture', courseCode: 'INTRO-IR', title: 'Введение в международные отношения', teacher: 'проф. Л. Г. Симонова', room: '101', building: 'пр. Вернадского, 76' },
    { weekday: 2, startMin: 740, endMin: 830, kind: 'seminar', courseCode: 'INTRO-IR', title: 'Введение в международные отношения', teacher: 'проф. Л. Г. Симонова', room: '309', building: 'пр. Вернадского, 76' },
    {
      weekday: 3, startMin: 530, endMin: 620, kind: 'lecture', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'доц. А. Н. Тарасов', room: '210', building: 'пр. Вернадского, 76',
      changeKind: 'time', comment: { note: 'Время изменено: 09:00 → 08:50', fromStartMin: 540, publishedBy: 'Деканат МО' },
    },
    { weekday: 3, startMin: 740, endMin: 830, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. S. Whitaker', room: '514', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'Б' },
    { weekday: 3, startMin: 910, endMin: 1000, kind: 'physical', courseCode: 'PHYS-ED', title: 'Физическая культура', teacher: 'преп. И. С. Гришин', room: 'Спортзал', building: 'пр. Вернадского, 76, корп. 2' },
    {
      weekday: 4, startMin: 540, endMin: 630, kind: 'seminar', courseCode: 'ECON-TH', title: 'Экономическая теория', teacher: 'доц. О. П. Ветрова', room: '212', building: 'пр. Вернадского, 76', subgroup: 'Б',
      changeKind: 'room', comment: { note: 'Аудитория изменена: 220 → 212', fromRoom: '220', publishedBy: 'Деканат МО' },
    },
    { weekday: 4, startMin: 740, endMin: 830, kind: 'seminar', courseCode: 'HIST-RU', title: 'История России', teacher: 'доц. В. М. Громов', room: '226', building: 'пр. Вернадского, 76' },
    {
      weekday: 5, startMin: 540, endMin: 630, kind: 'consult', courseCode: 'INTRO-IR', title: 'Введение в международные отношения', teacher: 'проф. Л. Г. Симонова', room: '309', building: 'пр. Вернадского, 76',
      changeKind: 'added', comment: { note: 'Добавлена консультация перед экзаменом', publishedBy: 'Деканат МО' },
    },
    {
      weekday: 5, startMin: 740, endMin: 830, kind: 'language', courseCode: 'ENG', title: 'Иностранный язык (английский)', teacher: 'преп. S. Whitaker', room: '514', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'Б',
      changeKind: 'cancelled', comment: { note: 'Пара отменена: группа уехала на выездное занятие', publishedBy: 'Деканат МО' },
    },
  ],
  karimova: [
    { weekday: 1, startMin: 540, endMin: 630, kind: 'lecture', courseCode: 'TGP', title: 'Теория государства и права', teacher: 'доц. А. В. Худяков', room: '318', building: 'пр. Вернадского, 76, корп. 2' },
    {
      weekday: 1, startMin: 645, endMin: 735, kind: 'language', courseCode: 'LATIN', title: 'Латинский язык', teacher: 'преп. Э. Ю. Марченко', room: '404', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'А',
      changeKind: 'room', comment: { note: 'Аудитория изменена: 406 → 404', fromRoom: '406', publishedBy: 'Деканат МП' },
    },
    { weekday: 1, startMin: 810, endMin: 900, kind: 'seminar', courseCode: 'IGPR', title: 'История государства и права России', teacher: 'ст. преп. М. С. Аверин', room: '214', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 2, startMin: 530, endMin: 620, kind: 'lecture', courseCode: 'CONST-LAW', title: 'Конституционное право России и зарубежных стран', teacher: 'доц. Н. П. Заславская', room: '302', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 2, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'TGP', title: 'Теория государства и права', teacher: 'доц. А. В. Худяков', room: '318', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 3, startMin: 540, endMin: 630, kind: 'seminar', courseCode: 'CONST-LAW', title: 'Конституционное право России и зарубежных стран', teacher: 'доц. Н. П. Заславская', room: '302', building: 'пр. Вернадского, 76, корп. 2' },
    {
      weekday: 3, startMin: 740, endMin: 830, kind: 'lecture', courseCode: 'IGPR', title: 'История государства и права России', teacher: 'ст. преп. М. С. Аверин', room: '214', building: 'пр. Вернадского, 76, корп. 2',
      changeKind: 'cancelled', comment: { note: 'Лекция перенесена на пятницу', publishedBy: 'Деканат МП' },
    },
    { weekday: 3, startMin: 910, endMin: 1000, kind: 'physical', courseCode: 'PHYS-ED', title: 'Физическая культура', teacher: 'преп. И. С. Гришин', room: 'Спортзал', building: 'пр. Вернадского, 76, корп. 2' },
    { weekday: 4, startMin: 645, endMin: 735, kind: 'language', courseCode: 'LATIN', title: 'Латинский язык', teacher: 'преп. Э. Ю. Марченко', room: '404', building: 'пр. Вернадского, 76, корп. 2', subgroup: 'А' },
    {
      weekday: 4, startMin: 810, endMin: 900, kind: 'consult', courseCode: 'CONST-LAW', title: 'Конституционное право России и зарубежных стран', teacher: 'доц. Н. П. Заславская', room: '302', building: 'пр. Вернадского, 76, корп. 2',
      changeKind: 'added', comment: { note: 'Добавлена консультация перед контрольной', publishedBy: 'Деканат МП' },
    },
    {
      weekday: 5, startMin: 540, endMin: 630, kind: 'lecture', courseCode: 'IGPR', title: 'История государства и права России', teacher: 'ст. преп. М. С. Аверин', room: '214', building: 'пр. Вернадского, 76, корп. 2',
      changeKind: 'moved', originalDate: 'today', comment: { note: 'Перенос со среды: перенесена лекция', fromStartMin: 740, publishedBy: 'Деканат МП' },
    },
    { weekday: 5, startMin: 645, endMin: 735, kind: 'seminar', courseCode: 'LATIN', title: 'Латинский язык', teacher: 'преп. Э. Ю. Марченко', room: '404', building: 'пр. Вернадского, 76, корп. 2' },
  ],
};

// ---------------------------------------------------------------------------
// Прошлые семестры
// ---------------------------------------------------------------------------
interface PastSeed {
  semesterSort: number;
  semester: string;
  title: string;
  credits: number;
  rating: number;
  grade: string;
  ects: string;
}

function gradeFor(rating: number): { grade: string; ects: string } {
  if (rating >= 90) return { grade: 'Отлично', ects: 'A' };
  if (rating >= 82) return { grade: 'Отлично', ects: 'B' };
  if (rating >= 75) return { grade: 'Хорошо', ects: 'C' };
  if (rating >= 67) return { grade: 'Хорошо', ects: 'D' };
  if (rating >= 60) return { grade: 'Удовлетворительно', ects: 'E' };
  return { grade: 'Неудовлетворительно', ects: 'F' };
}

const PAST: Record<'ivanova' | 'smirnov' | 'karimova', PastSeed[]> = {
  ivanova: [
    { semesterSort: 1, semester: '1 семестр', title: 'История России', credits: 4, rating: 92, ...gradeFor(92) },
    { semesterSort: 1, semester: '1 семестр', title: 'Экономическая теория', credits: 4, rating: 84, ...gradeFor(84) },
    { semesterSort: 1, semester: '1 семестр', title: 'Иностранный язык (английский)', credits: 6, rating: 78, ...gradeFor(78) },
    { semesterSort: 1, semester: '1 семестр', title: 'Введение в специальность', credits: 3, rating: 88, ...gradeFor(88) },
    { semesterSort: 1, semester: '1 семестр', title: 'Философия', credits: 3, rating: 76, ...gradeFor(76) },
    { semesterSort: 1, semester: '1 семестр', title: 'Физическая культура', credits: 2, rating: 97, grade: 'Зачтено', ects: 'Зачтено' },
    { semesterSort: 2, semester: '2 семестр', title: 'История России', credits: 4, rating: 96, ...gradeFor(96) },
    { semesterSort: 2, semester: '2 семестр', title: 'Экономическая теория', credits: 4, rating: 85, ...gradeFor(85) },
    { semesterSort: 2, semester: '2 семестр', title: 'Иностранный язык (английский)', credits: 6, rating: 81, ...gradeFor(81) },
    { semesterSort: 2, semester: '2 семестр', title: 'Политология', credits: 3, rating: 79, ...gradeFor(79) },
    { semesterSort: 2, semester: '2 семестр', title: 'Правоведение', credits: 2, rating: 75, ...gradeFor(75) },
    { semesterSort: 2, semester: '2 семестр', title: 'Физическая культура', credits: 2, rating: 98, grade: 'Зачтено', ects: 'Зачтено' },
  ],
  smirnov: [
    { semesterSort: 1, semester: '1 семестр', title: 'История России', credits: 4, rating: 71, ...gradeFor(71) },
    { semesterSort: 1, semester: '1 семестр', title: 'Экономическая теория', credits: 4, rating: 64, ...gradeFor(64) },
    { semesterSort: 1, semester: '1 семестр', title: 'Иностранный язык (английский)', credits: 6, rating: 73, ...gradeFor(73) },
    { semesterSort: 1, semester: '1 семестр', title: 'Философия', credits: 3, rating: 61, ...gradeFor(61) },
    { semesterSort: 1, semester: '1 семестр', title: 'Физическая культура', credits: 2, rating: 86, grade: 'Зачтено', ects: 'Зачтено' },
    { semesterSort: 2, semester: '2 семестр', title: 'История России', credits: 4, rating: 68, ...gradeFor(68) },
    { semesterSort: 2, semester: '2 семестр', title: 'Политология', credits: 3, rating: 72, ...gradeFor(72) },
    { semesterSort: 2, semester: '2 семестр', title: 'Правоведение', credits: 2, rating: 60, ...gradeFor(60) },
    { semesterSort: 2, semester: '2 семестр', title: 'Физическая культура', credits: 2, rating: 80, grade: 'Зачтено', ects: 'Зачтено' },
  ],
  karimova: [],
};

// ---------------------------------------------------------------------------
// Рейтинг (академический)
// ---------------------------------------------------------------------------
const RANK = {
  ivanova: { semester: '2 семестр 2025/26', placeGroup: 3, groupSize: 25, placeProgram: 41, programSize: 320, cohortAvg: 76, myAvg: 84, trend: '▲ 2 позиции за семестр' },
  smirnov: { semester: '2 семестр 2025/26', placeGroup: 19, groupSize: 24, placeProgram: 251, programSize: 320, cohortAvg: 76, myAvg: 69, trend: '▼ 4 позиции за семестр' },
  // Первокурсники ещё не участвуют в рейтинге — показатели нулевые.
} as const;

// ---------------------------------------------------------------------------
// Каталог услуг
// ---------------------------------------------------------------------------
interface RequestTypeSeed {
  code: string;
  category: 'certificate' | 'application' | 'service';
  title: string;
  short: string;
  description: string;
  slaLabel: string;
  slaMinutes: number;
  price: string;
  isNew: boolean;
  steps: string[];
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'date' | 'radio' | 'checkbox';
    required: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    minLength?: number;
  }>;
}

export const REQUEST_TYPES: RequestTypeSeed[] = [
  {
    code: 'certificate-study',
    category: 'certificate',
    title: 'Справка об обучении',
    short: 'Подтверждает, что вы учитесь',
    description: 'Подтверждает, что вы учитесь: для военкомата, банка, работодателя. Выдаётся на бланке с QR-кодом.',
    slaLabel: '1 рабочий день',
    slaMinutes: 480,
    price: 'Бесплатно',
    isNew: false,
    steps: ['Выберите получателя справки', 'Деканат подготовит документ за 1 рабочий день', 'Скачайте PDF с QR-кодом'],
    fields: [
      {
        name: 'recipient',
        label: 'Кому предоставляется',
        type: 'select',
        required: true,
        options: [
          { value: 'military', label: 'Военный комиссариат' },
          { value: 'general', label: 'По месту требования' },
          { value: 'bank', label: 'Банк' },
          { value: 'other', label: 'Другое' },
        ],
      },
      {
        name: 'copies',
        label: 'Количество копий',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: '1 копия' },
          { value: '2', label: '2 копии' },
          { value: '3', label: '3 копии' },
        ],
      },
      { name: 'note', label: 'Примечание', type: 'textarea', required: false, placeholder: 'Необязательно' },
    ],
  },
  {
    code: 'certificate-scholarship',
    category: 'certificate',
    title: 'Справка о стипендии',
    short: 'Размер и период стипендии',
    description: 'Подтверждает факт и размер стипендии за выбранный период: для соцзащиты и банка.',
    slaLabel: '2 рабочих дня',
    slaMinutes: 960,
    price: 'Бесплатно',
    isNew: false,
    steps: ['Выберите период', 'Деканат подготовит справку', 'Скачайте PDF'],
    fields: [
      {
        name: 'period',
        label: 'Период',
        type: 'select',
        required: true,
        options: [
          { value: 'last-month', label: 'За последний месяц' },
          { value: 'semester', label: 'За семестр' },
        ],
      },
      {
        name: 'recipient',
        label: 'Кому предоставляется',
        type: 'select',
        required: true,
        options: [
          { value: 'social', label: 'Орган социальной защиты' },
          { value: 'bank', label: 'Банк' },
          { value: 'general', label: 'По месту требования' },
        ],
      },
    ],
  },
  {
    code: 'certificate-visa',
    category: 'certificate',
    title: 'Справка-вызов для визы / поездки',
    short: 'Для посольств и визовых центров',
    description: 'Подтверждение статуса студента для получения визы: указываются страна, посольство и даты поездки.',
    slaLabel: '3 рабочих дня',
    slaMinutes: 1440,
    price: 'Бесплатно',
    isNew: false,
    steps: ['Укажите страну и посольство', 'Деканат оформит справку-вызов', 'Скачайте PDF и распечатайте'],
    fields: [
      { name: 'country', label: 'Страна', type: 'text', required: true, placeholder: 'Например, Франция' },
      { name: 'embassy', label: 'Посольство / визовый центр', type: 'text', required: true, placeholder: 'Например, Посольство Франции в Москве' },
      { name: 'dates', label: 'Даты поездки', type: 'text', required: true, placeholder: '10.03.2027 – 20.03.2027' },
    ],
  },
  {
    code: 'academic-leave',
    category: 'application',
    title: 'Академический отпуск',
    short: 'По состоянию здоровья или обстоятельствам',
    description: 'Заявление на академический отпуск. Решение принимает деканат после проверки документов.',
    slaLabel: 'до 3 рабочих дней',
    slaMinutes: 1440,
    price: 'Бесплатно',
    isNew: false,
    steps: ['Заполните заявление', 'Приложите подтверждающие документы в деканате', 'Дождитесь решения'],
    fields: [
      {
        name: 'reason',
        label: 'Причина',
        type: 'radio',
        required: true,
        options: [
          { value: 'health', label: 'Состояние здоровья' },
          { value: 'family', label: 'Семейные обстоятельства' },
          { value: 'other', label: 'Другое' },
        ],
      },
      {
        name: 'period',
        label: 'Срок',
        type: 'select',
        required: true,
        options: [
          { value: '1y', label: '1 год' },
          { value: '2y', label: '2 года' },
        ],
      },
      { name: 'comment', label: 'Комментарий', type: 'textarea', required: true, minLength: 20, placeholder: 'Не короче 20 символов' },
    ],
  },
  {
    code: 'individual-plan',
    category: 'application',
    title: 'Индивидуальный учебный план',
    short: 'Свой график изучения дисциплин',
    description: 'Заявление на индивидуальный учебный план: позволяет перестроить порядок изучения дисциплин.',
    slaLabel: 'до 5 рабочих дней',
    slaMinutes: 2400,
    price: 'Бесплатно',
    isNew: false,
    steps: ['Опишите причину', 'Согласуйте с преподавателями', 'Деканат утвердит план'],
    fields: [
      {
        name: 'course',
        label: 'Дисциплина',
        type: 'select',
        required: true,
        options: [],
      },
      { name: 'reason', label: 'Причина', type: 'textarea', required: true, minLength: 10 },
      { name: 'teacherOk', label: 'Согласовано с преподавателями', type: 'checkbox', required: true },
    ],
  },
  {
    code: 'retake',
    category: 'application',
    title: 'Пересдача по дисциплине',
    short: 'Запись на пересдачу',
    description: 'Заявление на пересдачу зачёта или экзамена после зачётной недели.',
    slaLabel: 'до 2 дней',
    slaMinutes: 960,
    price: 'Бесплатно',
    isNew: true,
    steps: ['Выберите дисциплину', 'Деканат назначит дату', 'Явитесь на пересдачу'],
    fields: [
      { name: 'courseCode', label: 'Дисциплина', type: 'select', required: true, options: [] },
      { name: 'reason', label: 'Причина', type: 'textarea', required: true, minLength: 10 },
    ],
  },
  {
    code: 'grade-transcript',
    category: 'service',
    title: 'Выписка из зачётной книжки',
    short: 'PDF со всеми оценками — мгновенно',
    description: 'Справка об успеваемости с оценками по всем пройденным дисциплинам. Формируется автоматически и сразу доступна в PDF.',
    slaLabel: 'мгновенно',
    slaMinutes: 0,
    price: 'Бесплатно',
    isNew: true,
    steps: ['Нажмите «Оформить»', 'Документ сформируется автоматически', 'Скачайте PDF'],
    fields: [
      {
        name: 'semesters',
        label: 'Период',
        type: 'select',
        required: true,
        options: [
          { value: 'all', label: 'Все семестры' },
          { value: 'current', label: 'Только текущий' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Основная функция seed
// ---------------------------------------------------------------------------
interface RequestSeed {
  student: 'ivanova' | 'smirnov' | 'karimova';
  typeCode: string;
  values: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'ready' | 'rejected';
  createdDaysAgo: number;
  createdHour: number;
  dueDaysAgo: number;
  rejectReason?: string;
  comment?: string;
  number?: string;
}

const REQUESTS: RequestSeed[] = [
  { student: 'ivanova', typeCode: 'certificate-study', values: { recipient: 'military', copies: '2', note: 'Для военкомата, приложить к личному делу' }, status: 'ready', createdDaysAgo: 3, createdHour: 10, dueDaysAgo: 1, number: 'ЗВ-2030-000001' },
  { student: 'ivanova', typeCode: 'certificate-scholarship', values: { period: 'semester', recipient: 'social' }, status: 'in_progress', createdDaysAgo: 1, createdHour: 11, dueDaysAgo: -1, number: 'ЗВ-2030-000002' },
  { student: 'ivanova', typeCode: 'certificate-visa', values: { country: 'Франция', embassy: 'Посольство Франции в Москве', dates: '10.03.2027 – 20.03.2027' }, status: 'pending', createdDaysAgo: 0, createdHour: 9, dueDaysAgo: -2, number: 'ЗВ-2030-000003' },
  { student: 'smirnov', typeCode: 'retake', values: { courseCode: 'История России', reason: 'Хочу пересдать зачёт до начала зимней сессии' }, status: 'rejected', createdDaysAgo: 2, createdHour: 14, dueDaysAgo: 1, rejectReason: 'Пересдачи по дисциплине назначаются после зачётной недели, обратитесь после 1 декабря', number: 'ЗВ-2030-000004' },
  { student: 'smirnov', typeCode: 'academic-leave', values: { reason: 'family', period: '1y', comment: 'Семейные обстоятельства требуют длительного отсутствия в Москве' }, status: 'pending', createdDaysAgo: 1, createdHour: 12, dueDaysAgo: -1, number: 'ЗВ-2030-000005' },
  { student: 'smirnov', typeCode: 'certificate-study', values: { recipient: 'bank', copies: '1' }, status: 'in_progress', createdDaysAgo: 0, createdHour: 10, dueDaysAgo: -1, number: 'ЗВ-2030-000006' },
  { student: 'karimova', typeCode: 'grade-transcript', values: { semesters: 'all' }, status: 'ready', createdDaysAgo: 0, createdHour: 8, dueDaysAgo: 0, number: 'ЗВ-2030-000007' },
  { student: 'karimova', typeCode: 'certificate-visa', values: { country: 'Испания', embassy: 'Визовый центр Испании в Москве', dates: '05.02.2027 – 15.02.2027' }, status: 'in_progress', createdDaysAgo: 1, createdHour: 15, dueDaysAgo: -2, number: 'ЗВ-2030-000008' },
  { student: 'karimova', typeCode: 'individual-plan', values: { course: 'Теория государства и права', reason: 'Планирую ускоренное изучение курса из-за совпадения дисциплин в расписании', teacherOk: true }, status: 'pending', createdDaysAgo: 0, createdHour: 13, dueDaysAgo: -4, number: 'ЗВ-2030-000009' },
];

const MESSAGES: Array<{
  student: 'ivanova' | 'smirnov' | 'karimova';
  subject: string;
  body: string;
  status: 'new' | 'answered';
  reply?: string;
  createdDaysAgo: number;
}> = [
  {
    student: 'karimova',
    subject: 'Как получить справку для визы в сжатые сроки',
    body: 'Здравствуйте! Улетаю через две недели, подскажите, успеете ли подготовить справку-вызов за три рабочих дня?',
    status: 'new',
    createdDaysAgo: 1,
  },
  {
    student: 'smirnov',
    subject: 'Вопрос о пересдаче по Истории России',
    body: 'Когда можно будет записаться на пересдачу? Заявку отклонили, хотите уточнить сроки после зачётной недели.',
    status: 'new',
    createdDaysAgo: 0,
  },
  {
    student: 'ivanova',
    subject: 'Перенос языковой пары со среды',
    body: 'Спасибо за перенос пары на пятницу! Подскажите, аудитория останется 512?',
    status: 'answered',
    reply: 'Да, ауд. 512, начало в 09:00. Расписание обновлено в кабинете.',
    createdDaysAgo: 2,
  },
];

interface NotificationSeed {
  student: 'ivanova' | 'smirnov' | 'karimova';
  type: 'schedule' | 'grade' | 'request' | 'announcement' | 'deadline' | 'message' | 'info';
  title: string;
  body: string;
  link: string | null;
  daysAgo: number;
  hour: number;
  read: boolean;
}

const NOTIFICATIONS: NotificationSeed[] = [
  { student: 'ivanova', type: 'schedule', title: 'Перенос: английский язык', body: 'Пара со среды, 12:20, перенесена на пятницу 09:00, ауд. 512.', link: '/schedule', daysAgo: 1, hour: 16, read: false },
  { student: 'ivanova', type: 'grade', title: 'Новая оценка: Введение в международные отношения', body: 'За реферат начислено 17 из 20 баллов. Рейтинг по дисциплине — 86%.', link: '/progress', daysAgo: 1, hour: 12, read: false },
  { student: 'ivanova', type: 'request', title: 'Справка об обучении готова', body: 'Заявка ЗВ-2030-000001 выполнена. PDF можно скачать в разделе «Заявки».', link: '/requests?open=1', daysAgo: 1, hour: 10, read: false },
  { student: 'ivanova', type: 'announcement', title: 'Зачётная неделя — с 14 по 19 декабря', body: 'Расписание зачётов опубликовано в разделе «Успеваемость». Следите за изменениями.', link: '/announcements', daysAgo: 2, hour: 9, read: true },
  { student: 'ivanova', type: 'message', title: 'Куратор: напоминание об эссе', body: 'К. И. Лебедева: не забудьте про эссе по английскому — дедлайн через 5 дней.', link: '/progress', daysAgo: 2, hour: 11, read: true },
  { student: 'ivanova', type: 'deadline', title: 'Скоро дедлайн: тест по экономической теории', body: 'Сдать до 20 ноября, 18:00. Доступен в электронной среде.', link: '/progress', daysAgo: 0, hour: 8, read: false },
  { student: 'smirnov', type: 'request', title: 'Заявка ЗВ-2030-000004 отклонена', body: 'Причина: Пересдачи по дисциплине назначаются после зачётной недели, обратитесь после 1 декабря.', link: '/requests?open=4', daysAgo: 1, hour: 15, read: false },
  { student: 'smirnov', type: 'grade', title: 'Новая оценка: Введение в международные отношения', body: 'За семинары начислено 29 из 40 баллов. Рейтинг — 70%, «автомат» достигнут.', link: '/progress', daysAgo: 1, hour: 13, read: false },
  { student: 'smirnov', type: 'announcement', title: 'Зачётная неделя — с 14 по 19 декабря', body: 'Расписание зачётов опубликовано в разделе «Успеваемость».', link: '/announcements', daysAgo: 2, hour: 9, read: true },
  { student: 'smirnov', type: 'deadline', title: 'Дедлайн завтра: тест по истории России', body: 'Сдать до 18 ноября, 20:00.', link: '/progress', daysAgo: 0, hour: 8, read: false },
  { student: 'karimova', type: 'message', title: 'Приветственное письмо от деканата', body: 'Мадина, добро пожаловать! Вопросы по учёбе и документам задавайте прямо в кабинете — ответим в рабочее время.', link: '/requests', daysAgo: 5, hour: 10, read: true },
  { student: 'karimova', type: 'schedule', title: 'Лекция по истории права перенесена', body: 'Лекция со среды 12:20 перенесена на пятницу 09:00, ауд. 214.', link: '/schedule', daysAgo: 1, hour: 17, read: false },
  { student: 'karimova', type: 'grade', title: 'Зачтена посещаемость: Латинский язык', body: 'Посещаемость 81%. Впереди контрольный перевод и реферат.', link: '/progress', daysAgo: 3, hour: 12, read: true },
  { student: 'karimova', type: 'deadline', title: 'Дедлайн завтра: контрольная по ТГП', body: 'Сдать до 18 ноября, 23:59.', link: '/progress', daysAgo: 0, hour: 8, read: false },
];

interface AnnouncementSeed {
  category: 'study' | 'session' | 'documents' | 'life' | 'important';
  title: string;
  body: string;
  pinned: boolean;
  department: number | null;
  daysAgo: number;
  isNew?: boolean;
}

const ANNOUNCEMENTS: AnnouncementSeed[] = [
  // Студенческая жизнь: победы, конференции, патенты, стажировки — верх ленты на экране входа
  {
    category: 'life',
    title: 'Первое место на конкурсе аналитических эссе',
    body: 'Анна Иванова (МО-2-3) победила в региональном этапе конкурса «Молодой аналитик» с работой о политике ЕС в Сахеле. Приз — поездка на школу молодого дипломата в Казани, март 2027.',
    pinned: true,
    department: 1,
    daysAgo: 0,
  },
  {
    category: 'life',
    title: 'Три доклада наших студентов — на конференции «Молодой международник»',
    body: 'Дмитрий Смирнов и двое первокурсников выступили в секции «Региональные конфликты». Доклад Дмитрия отмечен дипломом второй степени, тезисы выйдут в сборнике в январе.',
    pinned: true,
    department: 1,
    daysAgo: 1,
  },
  {
    category: 'life',
    title: 'Команда факультета получила патент на полезную модель',
    body: 'Прототип навигатора по архивам международных договоров зарегистрирован как полезная модель. В команде — два студента МО и преподаватель кафедры, заявка подана через центр интеллектуальной собственности.',
    pinned: true,
    department: 1,
    daysAgo: 2,
  },
  {
    category: 'life',
    title: 'Стажировка в университете-партнёре во Франции: два места',
    body: 'Открыт набор на весенний семестр: Лион, университет-партнёр, обучение на французском или английском. Заявки до 5 декабря, нужен средний балл от 80 и мотивационное письмо.',
    pinned: true,
    department: 1,
    daysAgo: 3,
  },
  {
    category: 'session',
    title: 'Зачётная неделя — с 14 по 19 декабря',
    body: 'Расписание зачётов опубликовано в разделе «Успеваемость». Если не хватает баллов до «автомата» — успейте пересдать контрольные точки до 5 декабря.',
    pinned: true,
    department: 1,
    daysAgo: 2,
  },
  {
    category: 'documents',
    title: 'Справки о стипендии — только через кабинет',
    body: 'С 1 ноября оформить справку о стипендии, об обучении и выписку из зачётной книжки можно только через «Дедлайн». Бумажные заявки не принимаются.',
    pinned: true,
    department: null,
    daysAgo: 4,
  },
  {
    category: 'study',
    title: 'Консультация по истории России — четверг, 13:30',
    body: 'доц. В. М. Громов проведёт консультацию перед зачётной неделей в ауд. 218. Ответит на вопросы по эссе и тесту.',
    pinned: false,
    department: 1,
    daysAgo: 1,
  },
  {
    category: 'important',
    title: 'Перерегистрация в общежитии до 1 декабря',
    body: 'Студентам, заселившимся в начале семестра, нужно пройти перерегистрацию в администрации общежития.',
    pinned: false,
    department: 2,
    daysAgo: 3,
  },
  {
    category: 'life',
    title: 'День факультета — 25 ноября',
    body: 'Концерт, квиз по истории дипломатии и встреча с выпускниками. Регистрация — в студенческом совете.',
    pinned: false,
    department: 1,
    daysAgo: 5,
  },
];

interface DeadlineSeed {
  group: string;
  courseCode: string;
  title: string;
  kind: string;
  hoursFromNow: number;
  points: string;
  done?: 'ivanova';
}

const DEADLINES: DeadlineSeed[] = [
  { group: 'МО-2-3', courseCode: 'ECON-TH', title: 'Тест по экономической теории', kind: 'test', hoursFromNow: 72, points: '35 баллов' },
  { group: 'МО-2-3', courseCode: 'ENG', title: 'Эссе по английскому языку', kind: 'essay', hoursFromNow: 120, points: '20 баллов' },
  { group: 'МО-2-3', courseCode: 'INTRO-IR', title: 'Реферат по введению в международные отношения', kind: 'paper', hoursFromNow: -24, points: '20 баллов', done: 'ivanova' },
  { group: 'МО-2-7', courseCode: 'HIST-RU', title: 'Тест по истории России', kind: 'test', hoursFromNow: 30, points: '30 баллов' },
  { group: 'МО-2-7', courseCode: 'INTRO-IR', title: 'Реферат по введению в международные отношения', kind: 'paper', hoursFromNow: 96, points: '20 баллов' },
  { group: 'МП-1-2', courseCode: 'TGP', title: 'Контрольная работа по теории государства и права', kind: 'test', hoursFromNow: 26, points: '25 баллов' },
  { group: 'МП-1-2', courseCode: 'LATIN', title: 'Реферат по латинскому языку', kind: 'paper', hoursFromNow: 144, points: '30 баллов' },
];

// ---------------------------------------------------------------------------
// Запись в БД
// ---------------------------------------------------------------------------
const TABLES = [
  'deadline_done',
  'deadlines',
  'messages',
  'notifications',
  'announcements',
  'requests',
  'request_types',
  'academic_rank',
  'past_results',
  'enrollments',
  'courses',
  'schedule_entries',
  'profiles',
  'staff_profiles',
  'curator_contacts',
  'audit_log',
  'sessions',
  'login_throttle',
  'users',
  'faculties',
] as const;

function clear(db: DB): void {
  db.pragma('foreign_keys = OFF');
  for (const table of TABLES) db.exec(`DELETE FROM ${table}`);
  db.exec("DELETE FROM sqlite_sequence WHERE name NOT IN ('credentials')");
  db.pragma('foreign_keys = ON');
}

function at(now: Date, daysAgo: number, hour: number, minute = 0): string {
  const d = addDays(now, -daysAgo);
  d.setHours(hour, minute, 0, 0);
  return toLocalIso(d);
}

export function seedAll(db: DB, now: Date = new Date()): void {
  const hash = demoHash(process.env.DEMO_PASSWORD ?? 'DemoKonkurs2030');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = startOfWeek(today);
  // Вспомогательная вставка по именованным параметрам.
  const ins = (sql: string, params: SqlParams | Array<string | number | null>): void => {
    if (Array.isArray(params)) db.prepare(sql).run(...params);
    else db.prepare(sql).run(params);
  };

  db.transaction(() => {
    clear(db);

    // Факультеты и контакты кураторов
    for (const f of FACULTIES) {
      ins(
        `INSERT INTO faculties (id, code, short_name, full_name, dean, office, building, phone, email, hours)
         VALUES (@id, @code, @short_name, @full_name, @dean, @office, @building, @phone, @email, @hours)`,
        { ...f },
      );
    }
    ins(
      `INSERT INTO curator_contacts (department_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)`,
      [1, 'К. И. Лебедева', 'Куратор 2 курса', 'curator-mo@deadline.demo', '+7 (495) 000-00-11'],
    );
    ins(
      `INSERT INTO curator_contacts (department_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)`,
      [2, 'Д. А. Ершов', 'Куратор 1 курса', 'curator-mp@deadline.demo', '+7 (495) 000-00-12'],
    );

    // Пользователи
    const userInsert = db.prepare(
      "INSERT INTO users (role, login, password_hash, theme, created_at) VALUES (?, ?, ?, 'system', ?)",
    );
    const userIds: Record<string, number> = {};
    for (const key of ['ivanova', 'smirnov', 'karimova'] as const) {
      const s = STUDENTS[key];
      const info = userInsert.run('student', s.login, hash, at(today, 120, 9));
      userIds[key] = Number(info.lastInsertRowid);
    }
    const staffInfo = userInsert.run('staff', 'dekanat', hash, at(today, 200, 9));
    const staffId = Number(staffInfo.lastInsertRowid);

    // Две «другие» сессии Анны (ноутбук и телефон) — чтобы счётчик активных сессий был реалистичным (3 с текущей).
    const sessionInsert = db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const nowMs = now.getTime();
    for (const [label, hoursAgo] of [
      ['MacBook · Safari · Москва', 26],
      ['iPhone · Safari · Москва', 5],
    ] as const) {
      sessionInsert.run(
        createHash('sha256').update(`seed-session:${label}:${nowMs}`).digest('hex'),
        userIds.ivanova,
        nowMs - hoursAgo * 3_600_000,
        nowMs + 30 * 86_400_000,
        label,
        null,
      );
    }

    // Профили
    const profileInsert = db.prepare(
      `INSERT INTO profiles (user_id, last_name, first_name, middle_name, department_id, program_code, program_name,
                             study_form, course, group_code, subgroup, record_book, email, phone, enrollment_year,
                             curator, funded, scholarship_json, student_card_json, telegram, notify_mode)
       VALUES (@user_id, @last_name, @first_name, @middle_name, @department_id, @program_code, @program_name,
               @study_form, @course, @group_code, @subgroup, @record_book, @email, @phone, @enrollment_year,
               @curator, @funded, @scholarship_json, @student_card_json, @telegram, @notify_mode)`,
    );
    for (const key of ['ivanova', 'smirnov', 'karimova'] as const) {
      const s = STUDENTS[key];
      profileInsert.run({
        user_id: userIds[key],
        last_name: s.lastName,
        first_name: s.firstName,
        middle_name: s.middleName,
        department_id: s.departmentId,
        program_code: s.programCode,
        program_name: s.programName,
        study_form: 'full_time',
        course: s.course,
        group_code: s.group,
        subgroup: s.subgroup,
        record_book: s.recordBook,
        email: `${s.login}@student.deadline.demo`,
        phone: key === 'ivanova' ? '+7 (900) 000-12-34' : key === 'smirnov' ? '+7 (900) 000-56-78' : '+7 (900) 000-90-12',
        enrollment_year: 2026 - (s.course - 1),
        curator: s.curator,
        funded: s.funded,
        scholarship_json: s.scholarship ? JSON.stringify(s.scholarship) : null,
        student_card_json: JSON.stringify({
          dorm: s.dorm,
          department: s.department,
          course: s.courseName,
          verified: true,
          verificationNote: 'Личность подтверждена через Госуслуги',
          twoFactor: s.twoFactor,
        }),
        telegram: key === 'ivanova' ? '@anna_ivanova_demo' : null,
        notify_mode: 'all',
      });
    }
    db.prepare(
      `INSERT INTO staff_profiles (user_id, full_name, position, department_id, email) VALUES (?, ?, ?, ?, ?)`,
    ).run(staffId, 'Пахомова Ольга Николаевна', 'Специалист деканата', 1, 'dekanat-mo@deadline.demo');

    // Дисциплины и контрольные точки текущего семестра
    const courseInsert = db.prepare(
      'INSERT INTO courses (code, title, teacher) VALUES (@code, @title, @teacher) ON CONFLICT(code) DO NOTHING',
    );
    const courseId = (code: string, title: string, teacher: string): number => {
      courseInsert.run({ code, title, teacher });
      return (db.prepare('SELECT id FROM courses WHERE code = ?').get(code) as { id: number }).id;
    };
    const enrollmentInsert = db.prepare(
      `INSERT INTO enrollments (user_id, course_id, semester, attestation, threshold, control_points_json,
                               final_rating, final_grade, final_ects, exam_at, exam_room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const key of ['ivanova', 'smirnov', 'karimova'] as const) {
      for (const d of DISCIPLINES[key]) {
        const cid = courseId(d.code, d.title, d.teacher);
        const examAt =
          d.examDateOffset == null
            ? null
            : (() => {
                const day = addDays(today, d.examDateOffset);
                const [hh, mm] = (d.examTime ?? '10:00').split(':').map(Number);
                day.setHours(hh, mm, 0, 0);
                return toLocalIso(day);
              })();
        enrollmentInsert.run(
          userIds[key],
          cid,
          '2026-1',
          d.attestation,
          d.threshold,
          JSON.stringify(d.points),
          d.finalRating ?? null,
          d.finalGrade ?? null,
          d.finalEcts ?? null,
          examAt,
          d.examRoom,
        );
      }
      // Прошлые семестры
      for (const p of PAST[key]) {
        db.prepare(
          `INSERT INTO past_results (user_id, semester, course_title, credits, rating, grade, ects)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(userIds[key], p.semester, p.title, p.credits, p.rating, p.grade, p.ects);
      }
    }
    db.prepare(
      `INSERT INTO academic_rank (user_id, semester, place_group, group_size, place_program, program_size, cohort_avg, my_avg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userIds.ivanova, RANK.ivanova.semester, RANK.ivanova.placeGroup, RANK.ivanova.groupSize, RANK.ivanova.placeProgram, RANK.ivanova.programSize, RANK.ivanova.cohortAvg, RANK.ivanova.myAvg);
    db.prepare(
      `INSERT INTO academic_rank (user_id, semester, place_group, group_size, place_program, program_size, cohort_avg, my_avg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userIds.smirnov, RANK.smirnov.semester, RANK.smirnov.placeGroup, RANK.smirnov.groupSize, RANK.smirnov.placeProgram, RANK.smirnov.programSize, RANK.smirnov.cohortAvg, RANK.smirnov.myAvg);

    // Расписание: даты привязаны к текущей неделе
    const schedInsert = db.prepare(
      `INSERT INTO schedule_entries (department_id, group_code, subgroup, weekday, start_min, end_min, kind, course_code,
                                     title, teacher, room, building, week_type, date, change_kind, original_date, comment,
                                     published_by, published_at)
       VALUES (@department_id, @group_code, @subgroup, @weekday, @start_min, @end_min, @kind, @course_code,
               @title, @teacher, @room, @building, @week_type, @date, @change_kind, @original_date, @comment,
               @published_by, @published_at)`,
    );
    const publishedFor = (item: ScheduleSeed): string => {
      // «Добавлена вчера» — публикация вчера, остальные изменения — два часа назад/вчера утром.
      const d = item.changeKind === 'added' ? addDays(today, -1) : addDays(today, -1);
      d.setHours(item.changeKind === 'added' ? 10 : 9, item.changeKind === 'added' ? 5 : 12, 0, 0);
      return toLocalIso(d);
    };
    for (const key of ['ivanova', 'smirnov', 'karimova'] as const) {
      const s = STUDENTS[key];
      for (const item of SCHEDULE[key]) {
        const originalDate = item.originalDate === 'today' ? toDateString(today) : null;
        schedInsert.run({
          department_id: s.departmentId,
          group_code: s.group,
          subgroup: item.subgroup ?? null,
          weekday: item.weekday,
          start_min: item.startMin,
          end_min: item.endMin,
          kind: item.kind,
          course_code: item.courseCode,
          title: item.title,
          teacher: item.teacher,
          room: item.room,
          building: item.building,
          week_type: item.weekType ?? 'all',
          date: null,
          change_kind: item.changeKind ?? null,
          original_date: originalDate,
          comment: item.comment ? JSON.stringify(item.comment) : null,
          published_by: 'Деканат',
          published_at: item.changeKind ? publishedFor(item) : null,
        });
      }
    }

    // Каталог услуг
    const typeInsert = db.prepare(
      `INSERT INTO request_types (code, category, title, short, description, sla_label, sla_minutes, price, form_json, is_new)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const t of REQUEST_TYPES) {
      typeInsert.run(
        t.code,
        t.category,
        t.title,
        t.short,
        t.description,
        t.slaLabel,
        t.slaMinutes,
        t.price,
        JSON.stringify({ steps: t.steps, fields: t.fields }),
        t.isNew ? 1 : 0,
      );
    }

    // Объявления
    const annInsert = db.prepare(
      `INSERT INTO announcements (author_user_id, department_id, category, title, body, pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const a of ANNOUNCEMENTS) {
      const createdAt = at(today, a.daysAgo, 9, 15);
      annInsert.run(staffId, a.department, a.category, a.title, a.body, a.pinned ? 1 : 0, createdAt);
    }

    // Дедлайны
    const dlInsert = db.prepare(
      'INSERT INTO deadlines (group_code, course_code, title, kind, due_at, points) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const d of DEADLINES) {
      const due = new Date(now.getTime() + d.hoursFromNow * 3_600_000);
      // Дедлайны ставим на 18:00 или 23:59, чтобы даты были «человеческими».
      due.setHours(d.kind === 'test' ? 18 : 23, d.kind === 'test' ? 0 : 59, 0, 0);
      const info = dlInsert.run(d.group, d.courseCode, d.title, d.kind, toLocalIso(due), d.points);
      if (d.done === 'ivanova') {
        db.prepare('INSERT INTO deadline_done (user_id, deadline_id, done_at) VALUES (?, ?, ?)').run(
          userIds.ivanova,
          Number(info.lastInsertRowid),
          at(today, 1, 15),
        );
      }
    }

    // Заявки
    const requests = db.prepare(
      `SELECT id, user_id, department_id, type_code, status, payload_json, comment, reject_reason, created_at,
              updated_at, due_at, ready_at, processed_by, history_json FROM requests ORDER BY id`,
    ).all() as Array<{
      id: number;
      user_id: number;
      department_id: number;
      type_code: string;
      status: string;
      payload_json: string;
      comment: string | null;
      reject_reason: string | null;
      created_at: string;
      updated_at: string;
      due_at: string;
      ready_at: string | null;
      processed_by: string | null;
      history_json: string;
    }>;
    const notifications = db
      .prepare('SELECT id FROM notifications ORDER BY id DESC')
      .all() as Array<{ id: number }>;
    const reqInsert = db.prepare(
      `INSERT INTO requests (number, user_id, department_id, type_code, status, payload_json, comment, reject_reason,
                             created_at, updated_at, due_at, ready_at, processed_by, history_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const pendingHistory: Array<{ seed: RequestSeed; created: string; ready: string | null; due: string }> = [];
    void requests;
    for (const r of REQUESTS) {
      const type = REQUEST_TYPES.find((t) => t.code === r.typeCode);
      if (!type) throw new Error(`unknown request type ${r.typeCode}`);
      const created = at(today, r.createdDaysAgo, r.createdHour, 42);
      const dueDate = addDays(today, -r.dueDaysAgo);
      dueDate.setHours(18, 0, 0, 0);
      const due = type.slaMinutes === 0 ? created : toLocalIso(dueDate);
      const ready = r.status === 'ready' ? at(today, Math.max(0, r.createdDaysAgo - 1), Math.min(23, r.createdHour + 2), 10) : null;
      const history = buildSeedHistory(r, created, ready, due);
      pendingHistory.push({ seed: r, created, ready, due });
      reqInsert.run(
        r.number ?? '',
        userIds[r.student],
        STUDENTS[r.student].departmentId,
        r.typeCode,
        r.status,
        JSON.stringify(r.values),
        r.comment ?? null,
        r.rejectReason ?? null,
        created,
        ready ?? created,
        due,
        ready,
        r.status === 'pending' ? null : 'О. Н. Пахомова',
        JSON.stringify(history),
      );
    }
    // Номера без явного номера — следующие по порядку.
    const seededIds = (db.prepare('SELECT id FROM requests ORDER BY id').all() as Array<{ id: number }>).map(
      (r) => r.id,
    );
    let next = 10;
    for (const row of db.prepare("SELECT id FROM requests WHERE number = ''").all() as Array<{ id: number }>) {
      db.prepare('UPDATE requests SET number = ? WHERE id = ?').run(`ЗВ-2030-${String(next).padStart(6, '0')}`, row.id);
      next += 1;
    }

    // Сообщения деканату
    const msgInsert = db.prepare(
      `INSERT INTO messages (user_id, department_id, subject, body, status, reply, created_at, replied_at, replied_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const m of MESSAGES) {
      const created = at(today, m.createdDaysAgo, 11, 20);
      const repliedAt = m.reply ? at(today, Math.max(0, m.createdDaysAgo - 1), 14, 5) : null;
      msgInsert.run(
        userIds[m.student],
        STUDENTS[m.student].departmentId,
        m.subject,
        m.body,
        m.status,
        m.reply ?? null,
        created,
        repliedAt,
        m.reply ? 'О. Н. Пахомова' : null,
      );
    }

    // Уведомления
    const notifInsert = db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const n of NOTIFICATIONS) {
      notifInsert.run(userIds[n.student], n.type, n.title, n.body, n.link, n.read ? 1 : 0, at(today, n.daysAgo, n.hour, 5));
    }

    // Сверка ссылок «/requests?open=ID» в уведомлениях с реальными заявками.
    const seededRequests = db.prepare('SELECT id, number, user_id FROM requests ORDER BY id').all() as Array<{
      id: number;
      number: string;
      user_id: number;
    }>;
    const sent = db.prepare('SELECT id, user_id, title, body, link FROM notifications ORDER BY id').all() as Array<{
      id: number;
      user_id: number;
      title: string;
      body: string;
      link: string | null;
    }>;
    for (const n of sent) {
      const byNumber = /ЗВ-2030-(\d{6})/.exec(`${n.title} ${n.body}`);
      const seeded = byNumber
        ? seededRequests.find((r) => r.number.endsWith(byNumber[1]) && r.user_id === n.user_id)
        : undefined;
      if (seeded) n.link = `/requests?open=${seeded.id}`;
      else if (n.user_id === userIds.karimova && n.link === '/requests') n.link = null;
      db.prepare('UPDATE notifications SET link = ? WHERE id = ?').run(n.link, n.id);
    }
    void pendingHistory;
    void seededIds;
    void notifications;
  })();
  void monday;
  void hash;
}

function buildSeedHistory(
  r: RequestSeed,
  created: string,
  ready: string | null,
  due: string,
): Array<{ label: string; at: string; by: string | null; done: boolean; current: boolean }> {
  // В историю заявки пишем человекочитаемое «16 ноя, 12:10», а не машинный ISO
  const step = (label: string, atIso: string | null, by: string | null, done: boolean, current: boolean) => ({
    label,
    at: atIso ? dateTimeLabel(atIso) : '—',
    by,
    done,
    current,
  });
  switch (r.status) {
    case 'pending':
      return [
        step('Подана', created, 'Студент', true, false),
        step('На проверке в деканате', null, null, false, true),
        step('Готово', null, null, false, false),
      ];
    case 'in_progress':
      return [
        step('Подана', created, 'Студент', true, false),
        step('На проверке в деканате', created, 'О. Н. Пахомова', true, true),
        step('Готово', null, null, false, false),
      ];
    case 'ready':
      return [
        step('Подана', created, 'Студент', true, false),
        step('На проверке в деканате', created, 'О. Н. Пахомова', true, false),
        step('Готово', ready, 'О. Н. Пахомова', true, true),
      ];
    case 'rejected':
      return [
        step('Подана', created, 'Студент', true, false),
        step('На проверке в деканате', created, 'О. Н. Пахомова', true, false),
        step('Отклонено', due, 'О. Н. Пахомова', true, true),
      ];
    default:
      return [];
  }
}
