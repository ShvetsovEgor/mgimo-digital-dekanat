// Мок-режим: фикстуры и роутер «API без сервера» (VITE_USE_MOCK=1 или ?mock=1).
// В прод-сборке по умолчанию выключен; модуль грузится динамически только когда включён.

import type {
  Announcement,
  Discipline,
  Order,
  ProgressBundle,
  RequestStatus,
  RequestType,
  RequestTimelineStep,
  RequestValues,
  ScheduleChange,
  ScheduleToday,
  ScheduleWeek,
  StaffMessage,
  StaffOrder,
  TodayEntry,
  WeekEntry,
} from '../types';
import { ApiError } from './http';
import {
  MOCK_ANNOUNCEMENTS,
  MOCK_DEADLINES,
  MOCK_DEANERY,
  MOCK_META,
  MOCK_NOTIFICATIONS,
  MOCK_PROFILE,
  MOCK_QUESTIONS,
  MOCK_STAFF_MESSAGES,
  MOCK_STAFF_ORDERS,
  MOCK_STAFF_STATS,
} from './mock-fixtures';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const NETWORK_DELAY = 320;

// ---------------------------------------------------------------------------
// Состояние мока (in-memory)
// ---------------------------------------------------------------------------
const today = new Date();
today.setHours(0, 0, 0, 0);

function isoDate(offsetDays: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return toIso(d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoAt(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Расписание
// ---------------------------------------------------------------------------
interface LessonSeed {
  weekday: number; // 1 = Пн
  start: string;
  end: string;
  subject: string;
  code: string;
  kind: WeekEntry['kind'];
  kindLabel: string;
  teacher: string;
  room: string;
  subgroup: string | null;
  change?: NonNullable<WeekEntry['change']>;
}

const BUILDING: Record<string, { full: string; short: string }> = {
  '224': { full: 'пр. Вернадского, 76', short: 'К1' },
  '318': { full: 'пр. Вернадского, 76', short: 'К1' },
  '512': { full: 'пр. Вернадского, 76, корп. 2', short: 'К2' },
  '101': { full: 'пр. Вернадского, 76', short: 'К1' },
  '210': { full: 'пр. Вернадского, 76', short: 'К1' },
  '307': { full: 'пр. Вернадского, 76', short: 'К1' },
  '218': { full: 'пр. Вернадского, 76', short: 'К1' },
  Спортзал: { full: 'пр. Вернадского, 76, корп. 2', short: 'К2' },
};

function mins(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function buildingFor(room: string): { full: string; short: string } {
  return BUILDING[room] ?? { full: 'пр. Вернадского, 76', short: 'К1' };
}

const LESSONS: LessonSeed[] = [
  { weekday: 1, start: '09:00', end: '10:30', subject: 'История России', code: 'IR-201', kind: 'lecture', kindLabel: 'Лекция', teacher: 'доц. В. М. Громов', room: '224', subgroup: null },
  { weekday: 1, start: '10:45', end: '12:15', subject: 'Экономическая теория', code: 'ET-202', kind: 'seminar', kindLabel: 'Семинар', teacher: 'ст. преп. Е. А. Корнилова', room: '318', subgroup: 'А' },
  { weekday: 1, start: '13:30', end: '15:00', subject: 'Иностранный язык (английский)', code: 'EN-101', kind: 'language', kindLabel: 'Языковая группа', teacher: 'преп. M. Harris', room: '512', subgroup: 'А' },
  { weekday: 2, start: '08:50', end: '10:20', subject: 'Введение в международные отношения', code: 'IMO-101', kind: 'lecture', kindLabel: 'Лекция', teacher: 'проф. Л. Г. Симонова', room: '101', subgroup: null },
  {
    weekday: 2,
    start: '10:45',
    end: '12:15',
    subject: 'История России',
    code: 'IR-201',
    kind: 'seminar',
    kindLabel: 'Семинар',
    teacher: 'доц. В. М. Громов',
    room: '224',
    subgroup: null,
    change: {
      kind: 'room',
      note: 'Аудитория изменена: 218 → 224',
      published: 'вчера, 16:42',
      publishedBy: 'Деканат МО',
    },
  },
  { weekday: 3, start: '09:00', end: '10:30', subject: 'Экономическая теория', code: 'ET-202', kind: 'lecture', kindLabel: 'Лекция', teacher: 'доц. А. Н. Тарасов', room: '210', subgroup: null },
  {
    weekday: 3,
    start: '12:20',
    end: '13:50',
    subject: 'Иностранный язык (английский)',
    code: 'EN-101',
    kind: 'language',
    kindLabel: 'Языковая группа',
    teacher: 'преп. M. Harris',
    room: '512',
    subgroup: 'А',
    change: {
      kind: 'cancelled',
      note: 'Отменено — преподаватель на конференции. Перенесено на пятницу, 09:00',
      published: 'вчера, 16:40',
      publishedBy: 'Деканат МО',
    },
  },
  { weekday: 3, start: '15:10', end: '16:40', subject: 'Физическая культура', code: 'PE-100', kind: 'physical', kindLabel: 'Физическая культура', teacher: 'преп. И. С. Гришин', room: 'Спортзал', subgroup: null },
  { weekday: 4, start: '10:45', end: '12:15', subject: 'Введение в международные отношения', code: 'IMO-101', kind: 'seminar', kindLabel: 'Семинар', teacher: 'проф. Л. Г. Симонова', room: '307', subgroup: null },
  {
    weekday: 4,
    start: '13:30',
    end: '15:00',
    subject: 'История России',
    code: 'IR-201',
    kind: 'consult',
    kindLabel: 'Консультация',
    teacher: 'доц. В. М. Громов',
    room: '218',
    subgroup: null,
    change: { kind: 'added', note: 'Добавлена консультация перед зачётной неделей', published: 'вчера, 12:05', publishedBy: 'Деканат МО' },
  },
  {
    weekday: 5,
    start: '09:00',
    end: '10:30',
    subject: 'Иностранный язык (английский)',
    code: 'EN-101',
    kind: 'language',
    kindLabel: 'Языковая группа',
    teacher: 'преп. M. Harris',
    room: '512',
    subgroup: 'А',
    change: { kind: 'moved', note: 'Перенос со среды, 12:20', published: 'вчера, 16:40', publishedBy: 'Деканат МО' },
  },
  { weekday: 5, start: '10:45', end: '12:15', subject: 'Экономическая теория', code: 'ET-202', kind: 'seminar', kindLabel: 'Практикум', teacher: 'ст. преп. Е. А. Корнилова', room: '318', subgroup: null },
];

// Чётность недели: чётные ISO-недели — «чётная». 17.11.2026 — чётная неделя в демо.
const PARITY_BY_WEEK_START = new Map<string, 'odd' | 'even'>();
function parityFor(weekStart: string): 'odd' | 'even' {
  const cached = PARITY_BY_WEEK_START.get(weekStart);
  if (cached) return cached;
  const date = new Date(`${weekStart}T12:00:00`);
  const week = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / (7 * 86_400_000));
  const parity = week % 2 === 0 ? 'even' : 'odd';
  PARITY_BY_WEEK_START.set(weekStart, parity);
  return parity;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

let entryIdSeq = 1000;
function entriesForDate(date: Date): WeekEntry[] {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  const iso = toIso(date);
  return LESSONS.filter((lesson) => lesson.weekday === weekday).map((lesson) => {
    const building = buildingFor(lesson.room);
    let change = lesson.change;
    // Изменения «живут» только на текущей неделе — на других неделях расписание стабильно.
    if (change && isoDate(0).slice(0, 7) !== iso.slice(0, 7)) change = undefined;
    return {
      id: (entryIdSeq += 1),
      date: iso,
      movedTo: change?.kind === 'moved' ? iso : null,
      start: lesson.start,
      end: lesson.end,
      startMin: mins(lesson.start),
      endMin: mins(lesson.end),
      subject: lesson.subject,
      subjectCode: lesson.code,
      kind: lesson.kind,
      kindLabel: lesson.kindLabel,
      teacher: lesson.teacher,
      room: lesson.room,
      building: building.full,
      buildingShort: building.short,
      group: 'МО-2-3',
      subgroup: lesson.subgroup,
      change: change ?? null,
    };
  });
}

const CHANGES: ScheduleChange[] = [
  {
    entryId: 1,
    kind: 'moved',
    kindLabel: 'Перенос',
    subject: 'Иностранный язык (английский)',
    from: 'Ср, 12:20',
    to: 'Пт, 09:00',
    note: 'Преподаватель на конференции — пара перенесена на пятницу',
    published: 'вчера, 16:40',
    publishedBy: 'Деканат МО',
    severity: 'info',
  },
  {
    entryId: 2,
    kind: 'room',
    kindLabel: 'Аудитория',
    subject: 'История России',
    from: 'Вт, 10:45 · ауд. 218',
    to: 'ауд. 224',
    note: 'Аудитория занята — семинар в 224',
    published: 'вчера, 16:42',
    publishedBy: 'Деканат МО',
    severity: 'warning',
  },
  {
    entryId: 3,
    kind: 'cancelled',
    kindLabel: 'Отменено',
    subject: 'Иностранный язык (английский)',
    from: 'Ср, 12:20',
    to: null,
    note: 'Пара отменена, вместо неё — перенос на пятницу',
    published: 'вчера, 16:40',
    publishedBy: 'Деканат МО',
    severity: 'warning',
  },
  {
    entryId: 4,
    kind: 'added',
    kindLabel: 'Добавлено',
    subject: 'История России',
    from: 'Чт, 13:30 · ауд. 218',
    to: null,
    note: 'Добавлена консультация перед зачётной неделей',
    published: 'вчера, 12:05',
    publishedBy: 'Деканат МО',
    severity: 'info',
  },
];

function weekFor(dateIso: string | null): ScheduleWeek {
  const anchor = dateIso ? new Date(`${dateIso}T12:00:00`) : new Date();
  if (Number.isNaN(anchor.getTime())) {
    throw new ApiError(422, 'VALIDATION', 'Неверная дата.');
  }
  const monday = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const todayIso = isoDate(0);
    return {
      date: toIso(date),
      weekdayLabel: WEEKDAYS_SHORT[date.getDay()] ?? '',
      dayLabel: String(date.getDate()),
      monthLabel: MONTHS_SHORT[date.getMonth()] ?? '',
      isToday: toIso(date) === todayIso,
      isHoliday: false,
      entries: entriesForDate(date),
    };
  });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const parity = parityFor(toIso(monday));
  return {
    weekStart: toIso(monday),
    weekLabel:
      monday.getMonth() === sunday.getMonth()
        ? `${monday.getDate()}–${sunday.getDate()} ${MONTHS_GEN[monday.getMonth()]}`
        : `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]}`,
    parity,
    parityLabel: parity === 'odd' ? 'нечётная неделя' : 'чётная неделя',
    days,
    changes: CHANGES,
  };
}

/** Тестовый стенд может «подвинуть» время, чтобы увидеть состояние «сейчас идёт». */
let fakeClock: { h: number; m: number } | null = null;

function nowParts(): { minutes: number; label: string } {
  const now = new Date();
  const h = fakeClock ? fakeClock.h : now.getHours();
  const m = fakeClock ? fakeClock.m : now.getMinutes();
  return { minutes: h * 60 + m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}

function humanizeMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function todaySchedule(): ScheduleToday {
  const date = new Date();
  const iso = toIso(date);
  const entries = entriesForDate(date);
  const clock = nowParts();
  const enriched: TodayEntry[] = entries.map((entry) => {
    if (entry.change?.kind === 'cancelled') return { ...entry, status: 'cancelled' };
    if (entry.change?.kind === 'moved') return { ...entry, status: 'moved_away' };
    if (clock.minutes >= entry.endMin) return { ...entry, status: 'done' };
    if (clock.minutes >= entry.startMin) return { ...entry, status: 'now' };
    return { ...entry, status: 'upcoming' };
  });
  const active = enriched.filter((entry) => entry.status === 'upcoming' || entry.status === 'now');
  const nextEntry = active[0] ?? null;
  let next: ScheduleToday['next'] = null;
  if (nextEntry) {
    const isNow = nextEntry.status === 'now';
    const relative = isNow
      ? 'сейчас идёт'
      : clock.minutes < nextEntry.startMin
        ? `до пары ${humanizeMs((nextEntry.startMin - clock.minutes) * 60_000)}`
        : 'скоро';
    next = {
      entryId: nextEntry.id,
      subject: nextEntry.subject,
      start: nextEntry.start,
      end: nextEntry.end,
      room: nextEntry.room,
      building: nextEntry.building,
      teacher: nextEntry.teacher,
      kindLabel: nextEntry.kindLabel,
      relative,
      isNow,
      status: isNow ? 'now' : 'upcoming',
    };
  }
  const counted = enriched.filter((entry) => entry.status !== 'cancelled' && entry.status !== 'moved_away');
  const done = counted.filter((entry) => entry.status === 'done').length;
  const weekday = WEEKDAYS_FULL[date.getDay()] ?? '';
  return {
    dateLabel: `${weekday}, ${date.getDate()} ${MONTHS_GEN[date.getMonth()]}`,
    weekParityLabel: parityFor(toIso(mondayOf(date))) === 'odd' ? 'нечётная неделя' : 'чётная неделя',
    universityDay: `Учебный день ${Math.round((date.getTime() - new Date(date.getFullYear(), 8, 1).getTime()) / 86_400_000)}`,
    next,
    now: clock.label,
    total: counted.length,
    done,
    finished: active.length === 0,
    entries: enriched,
    changes: CHANGES,
  };
}

// ---------------------------------------------------------------------------
// Успеваемость
// ---------------------------------------------------------------------------
const DISCIPLINES: Discipline[] = [
  {
    id: 1,
    code: 'IR-201',
    title: 'История России',
    teacher: 'доц. В. М. Громов',
    attestation: 'credit',
    attestationLabel: 'Зачёт',
    rating: 42,
    threshold: 70,
    toAuto: 28,
    autoPossible: true,
    autoReached: false,
    controlPoints: [
      { label: 'Посещаемость', earned: 9, max: 10 },
      { label: 'Эссе «Петровские реформы»', earned: 17, max: 20 },
      { label: 'Семинары', earned: 16, max: 20 },
      { label: 'Тест', earned: null, max: 30 },
      { label: 'Экзамен-коллоквиум', earned: null, max: 20 },
    ],
    examDate: null,
    examRoom: null,
    finalGrade: null,
    finalRating: null,
  },
  {
    id: 2,
    code: 'ET-202',
    title: 'Экономическая теория',
    teacher: 'ст. преп. Е. А. Корнилова',
    attestation: 'credit',
    attestationLabel: 'Зачёт',
    rating: 57,
    threshold: 70,
    toAuto: 13,
    autoPossible: true,
    autoReached: false,
    controlPoints: [
      { label: 'Посещаемость', earned: 9, max: 10 },
      { label: 'Кейс', earned: 21, max: 25 },
      { label: 'Тест', earned: 27, max: 35 },
      { label: 'Зачётная работа', earned: null, max: 30 },
    ],
    examDate: null,
    examRoom: null,
    finalGrade: null,
    finalRating: null,
  },
  {
    id: 3,
    code: 'EN-101',
    title: 'Иностранный язык (английский)',
    teacher: 'преп. M. Harris',
    attestation: 'graded',
    attestationLabel: 'Зачёт с оценкой',
    rating: 51,
    threshold: 70,
    toAuto: 19,
    autoPossible: true,
    autoReached: false,
    controlPoints: [
      { label: 'Лексико-грамматический тест', earned: 18, max: 20 },
      { label: 'Аудирование', earned: 16, max: 20 },
      { label: 'Эссе', earned: 17, max: 20 },
      { label: 'Устная часть', earned: null, max: 40 },
    ],
    examDate: '24 декабря',
    examRoom: 'ауд. 512',
    finalGrade: null,
    finalRating: null,
  },
  {
    id: 4,
    code: 'IMO-101',
    title: 'Введение в международные отношения',
    teacher: 'проф. Л. Г. Симонова',
    attestation: 'exam',
    attestationLabel: 'Экзамен',
    rating: 86,
    threshold: 70,
    toAuto: null,
    autoPossible: true,
    autoReached: true,
    controlPoints: [
      { label: 'Коллоквиум', earned: 18, max: 20 },
      { label: 'Реферат', earned: 17, max: 20 },
      { label: 'Тест', earned: 17, max: 20 },
      { label: 'Семинары', earned: 34, max: 40 },
    ],
    examDate: '22 декабря',
    examRoom: 'ауд. 101',
    finalGrade: null,
    finalRating: null,
  },
  {
    id: 5,
    code: 'PE-100',
    title: 'Физическая культура',
    teacher: 'преп. И. С. Гришин',
    attestation: 'credit',
    attestationLabel: 'Зачёт',
    rating: 90,
    threshold: 0,
    toAuto: null,
    autoPossible: false,
    autoReached: false,
    controlPoints: [{ label: 'Посещаемость и нормативы', earned: 90, max: 100 }],
    examDate: null,
    examRoom: null,
    finalGrade: null,
    finalRating: null,
  },
];

const MOCK_PROGRESS: ProgressBundle = {
  summary: { avgRating: 76.4, avgLabel: '76%', autoCount: 2, riskCount: 2, creditsEarnedYear: 28, creditsPlanYear: 60 },
  disciplines: DISCIPLINES,
  session: [
    { id: 1, title: 'Введение в международные отношения', date: '22 декабря', time: '10:00', room: 'ауд. 101', teacher: 'проф. Л. Г. Симонова', form: 'Экзамен', grade: null, rating: 86 },
    { id: 2, title: 'Иностранный язык (английский)', date: '24 декабря', time: '12:20', room: 'ауд. 512', teacher: 'преп. M. Harris', form: 'Зачёт с оценкой', grade: null, rating: 51 },
    { id: 3, title: 'История России', date: '25 декабря', time: '09:00', room: 'ауд. 224', teacher: 'доц. В. М. Громов', form: 'Зачёт', grade: null, rating: 42 },
    { id: 4, title: 'Экономическая теория', date: '26 декабря', time: '10:00', room: 'ауд. 210', teacher: 'доц. А. Н. Тарасов', form: 'Зачёт', grade: null, rating: 57 },
  ],
  past: [
    { semester: '2 семестр', course: 'История России', credits: 4, rating: 92, grade: 'Отлично', ects: 'A' },
    { semester: '2 семестр', course: 'Экономическая теория', credits: 5, rating: 81, grade: 'Хорошо', ects: 'B' },
    { semester: '2 семестр', course: 'Иностранный язык (английский)', credits: 6, rating: 88, grade: 'Отлично', ects: 'B' },
    { semester: '1 семестр', course: 'Введение в международные отношения', credits: 4, rating: 95, grade: 'Отлично', ects: 'A' },
    { semester: '1 семестр', course: 'Правоведение', credits: 3, rating: 78, grade: 'Хорошо', ects: 'C' },
    { semester: '1 семестр', course: 'Информатика и ИИ', credits: 3, rating: 90, grade: 'Отлично', ects: 'A' },
  ],
  rank: {
    semester: '2 семестр 2025/26',
    placeGroup: 3,
    group: 'МО-2-3',
    outOfGroup: 25,
    placeProgram: 41,
    outOfProgram: 320,
    cohortAvg: 76,
    myAvg: 84,
    trend: '+12 позиций',
  },
  scale: [
    { range: '90–100 %', five: 'Отлично', ects: 'A' },
    { range: '80–89 %', five: 'Хорошо', ects: 'B' },
    { range: '70–79 %', five: 'Хорошо', ects: 'C' },
    { range: '60–69 %', five: 'Удовлетворительно', ects: 'D' },
    { range: '50–59 %', five: 'Удовлетворительно', ects: 'E' },
    { range: '0–49 %', five: 'Неудовлетворительно', ects: 'F' },
  ],
};

// ---------------------------------------------------------------------------
// Заявки
// ---------------------------------------------------------------------------
const REQUEST_TYPES: RequestType[] = [
  {
    code: 'certificate-study',
    category: 'certificate',
    categoryLabel: 'Сертификаты',
    title: 'Справка об обучении',
    short: 'Для военкомата, банка, работодателя',
    description: 'Подтверждает, что вы учитесь в МГИМО: факультет, курс, форма обучения. Придёт PDF с QR-подписью.',
    slaLabel: '1 рабочий день',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Заполните заявку', 'Деканат проверит данные', 'Скачайте PDF или получите бумажную копию'],
    fieldCount: 3,
    fields: [
      {
        name: 'recipient',
        label: 'Куда нужна справка',
        type: 'select',
        required: true,
        placeholder: null,
        minLength: null,
        options: [
          { value: 'voenkomat', label: 'Военный комиссариат' },
          { value: 'bank', label: 'Банк' },
          { value: 'employer', label: 'Работодатель' },
          { value: 'other', label: 'По месту требования' },
        ],
      },
      {
        name: 'copies',
        label: 'Количество копий',
        type: 'radio',
        required: true,
        placeholder: null,
        minLength: null,
        options: [
          { value: '1', label: '1 копия' },
          { value: '2', label: '2 копии' },
          { value: '3', label: '3 копии' },
        ],
      },
      { name: 'note', label: 'Комментарий', type: 'textarea', required: false, placeholder: 'Если нужна особая формулировка', minLength: null, options: null },
    ],
  },
  {
    code: 'certificate-scholarship',
    category: 'certificate',
    categoryLabel: 'Сертификаты',
    title: 'Справка о стипендии',
    short: 'Размер и период выплат',
    description: 'Подтверждает вид и размер стипендии за выбранный период — для банка, работодателя или соцзащиты.',
    slaLabel: '2 рабочих дня',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Выберите период', 'Деканат проверит выплаты', 'Скачайте PDF'],
    fieldCount: 2,
    fields: [
      {
        name: 'period',
        label: 'Период',
        type: 'select',
        required: true,
        placeholder: null,
        minLength: null,
        options: [
          { value: 'month', label: 'За последний месяц' },
          { value: 'semester', label: 'За семестр' },
        ],
      },
      { name: 'recipient', label: 'Куда нужна справка', type: 'text', required: true, placeholder: 'Например, в банк «Демо»', minLength: 3, options: null },
    ],
  },
  {
    code: 'certificate-visa',
    category: 'certificate',
    categoryLabel: 'Сертификаты',
    title: 'Справка-вызов для визы',
    short: 'Для поездки и оформления визы',
    description: 'Справка с места учёбы для консульства: сроки, статус студента, контакты факультета.',
    slaLabel: '3 рабочих дня',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Укажите страну и посольство', 'Деканат подготовит справку', 'Скачайте PDF'],
    fieldCount: 3,
    fields: [
      { name: 'country', label: 'Страна поездки', type: 'text', required: true, placeholder: 'Например, Франция', minLength: 3, options: null },
      { name: 'embassy', label: 'Посольство / консульство', type: 'text', required: true, placeholder: 'Например, посольство Франции', minLength: 3, options: null },
      { name: 'dates', label: 'Даты поездки', type: 'text', required: true, placeholder: '10.01.2027 – 20.01.2027', minLength: 3, options: null },
    ],
  },
  {
    code: 'academic-leave',
    category: 'application',
    categoryLabel: 'Заявления',
    title: 'Академический отпуск',
    short: 'По здоровью или семейным обстоятельствам',
    description: 'Заявление об академическом отпуске. Деканат проверит основания и приложенные документы.',
    slaLabel: '3 рабочих дня',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Выберите основание', 'Приложите документы в деканат', 'Решение придёт в уведомления'],
    fieldCount: 3,
    fields: [
      {
        name: 'reason',
        label: 'Основание',
        type: 'radio',
        required: true,
        placeholder: null,
        minLength: null,
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
        placeholder: null,
        minLength: null,
        options: [
          { value: '1y', label: '1 год' },
          { value: '2y', label: '2 года' },
        ],
      },
      { name: 'comment', label: 'Описание', type: 'textarea', required: true, placeholder: 'Не менее 20 символов', minLength: 20, options: null },
    ],
  },
  {
    code: 'individual-plan',
    category: 'application',
    categoryLabel: 'Заявления',
    title: 'Индивидуальный учебный план',
    short: 'Для совмещения с работой или вузом',
    description: 'Рекомендуем для работающих студентов и совмещения двух программ: ваше расписание собирается отдельно.',
    slaLabel: '5 рабочих дней',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Укажите причину', 'Согласуйте с преподавателями', 'Утвердим план в деканате'],
    fieldCount: 3,
    fields: [
      { name: 'course', label: 'Дисциплины', type: 'text', required: true, placeholder: 'Например, Экономическая теория', minLength: 3, options: null },
      { name: 'reason', label: 'Причина', type: 'textarea', required: true, placeholder: 'Опишите ситуацию', minLength: 20, options: null },
      { name: 'teacherOk', label: 'Согласовано с преподавателями', type: 'checkbox', required: false, placeholder: null, minLength: null, options: null },
    ],
  },
  {
    code: 'retake',
    category: 'application',
    categoryLabel: 'Заявления',
    title: 'Пересдача по дисциплине',
    short: 'Дополнительная попытка',
    description: 'Заявление на пересдачу. Причину и дисциплину проверяет деканат перед назначением даты.',
    slaLabel: '2 рабочих дня',
    price: 'Бесплатно',
    isNew: false,
    steps: ['Выберите дисциплину', 'Деканат назначит дату', 'Дата придёт в уведомления'],
    fieldCount: 2,
    fields: [
      {
        name: 'courseCode',
        label: 'Дисциплина',
        type: 'select',
        required: true,
        placeholder: null,
        minLength: null,
        options: DISCIPLINES.map((item) => ({ value: item.code, label: item.title })),
      },
      { name: 'reason', label: 'Причина', type: 'textarea', required: true, placeholder: 'Коротко опишите причину', minLength: 10, options: null },
    ],
  },
  {
    code: 'grade-transcript',
    category: 'service',
    categoryLabel: 'Сервисы',
    title: 'Выписка из зачётной книжки',
    short: 'PDF мгновенно',
    description: 'Электронная выписка с оценками — формируется сразу после подачи, PDF с QR-подписью.',
    slaLabel: 'мгновенно',
    price: 'Бесплатно',
    isNew: true,
    steps: ['Выберите семестры', 'PDF сформируется сразу', 'Скачайте в кабинете'],
    fieldCount: 1,
    fields: [
      {
        name: 'semesters',
        label: 'Какие семестры включить',
        type: 'select',
        required: true,
        placeholder: null,
        minLength: null,
        options: [
          { value: 'all', label: 'Все' },
          { value: 'current', label: 'Только текущий' },
        ],
      },
    ],
  },
];

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Ожидает проверки',
  in_progress: 'В работе',
  ready: 'Готово',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
};

const historyFor = (
  status: RequestStatus,
  createdLabel: string,
  dueLabel: string,
  extra: { reject?: string } = {},
): RequestTimelineStep[] => {
  const base: RequestTimelineStep[] = [
    { label: 'Заявка подана', at: createdLabel, by: 'Вы', done: true, current: status === 'pending' },
    { label: 'Проверка деканата', at: status === 'pending' ? '—' : createdLabel, by: 'О. Н. Пахомова', done: status !== 'pending', current: status === 'in_progress' },
  ];
  if (status === 'rejected') {
    base.push({ label: extra.reject ?? 'Отклонено', at: createdLabel, by: 'О. Н. Пахомова', done: true, current: true });
  } else if (status === 'cancelled') {
    base.push({ label: 'Отменено вами', at: createdLabel, by: 'Вы', done: true, current: true });
  } else {
    base.push({ label: 'Готово', at: status === 'ready' ? dueLabel : `прогноз ${dueLabel}`, by: null, done: status === 'ready', current: status === 'ready' });
  }
  return base;
};

const MOCK_ORDERS: Order[] = [
  {
    id: 12,
    number: 'ЗВ-2030-000012',
    typeCode: 'certificate-study',
    typeTitle: 'Справка об обучении',
    category: 'certificate',
    status: 'ready',
    statusLabel: 'Готово',
    statusNote: null,
    createdAt: isoAt(-3, 10, 42),
    createdAtLabel: '14 ноя, 10:42',
    dueAt: isoAt(-1, 12),
    dueLabel: '16 ноя',
    readyAtLabel: '16 ноя',
    isOverdue: false,
    canCancel: false,
    canDownload: true,
    fields: [
      { label: 'Куда нужна справка', value: 'Военный комиссариат' },
      { label: 'Количество копий', value: '2 копии' },
    ],
    rejectReason: null,
    history: historyFor('ready', '14 ноя, 10:42', '16 ноя'),
  },
  {
    id: 13,
    number: 'ЗВ-2030-000013',
    typeCode: 'certificate-scholarship',
    typeTitle: 'Справка о стипендии',
    category: 'certificate',
    status: 'in_progress',
    statusLabel: 'В работе',
    statusNote: 'Проверяем выплаты за семестр',
    createdAt: isoAt(-2, 16, 15),
    createdAtLabel: '15 ноя, 16:15',
    dueAt: isoAt(1, 12),
    dueLabel: '18 ноя',
    readyAtLabel: null,
    isOverdue: false,
    canCancel: true,
    canDownload: false,
    fields: [
      { label: 'Период', value: 'За семестр' },
      { label: 'Куда нужна справка', value: 'В банк «Демо»' },
    ],
    rejectReason: null,
    history: historyFor('in_progress', '15 ноя, 16:15', '18 ноя'),
  },
  {
    id: 14,
    number: 'ЗВ-2030-000014',
    typeCode: 'certificate-visa',
    typeTitle: 'Справка-вызов для визы',
    category: 'certificate',
    status: 'pending',
    statusLabel: 'Ожидает проверки',
    statusNote: null,
    createdAt: isoAt(0, 9, 20),
    createdAtLabel: 'сегодня, 09:20',
    dueAt: isoAt(3, 12),
    dueLabel: '20 ноя',
    readyAtLabel: null,
    isOverdue: false,
    canCancel: true,
    canDownload: false,
    fields: [
      { label: 'Страна поездки', value: 'Франция' },
      { label: 'Посольство / консульство', value: 'Посольство Франции' },
      { label: 'Даты поездки', value: '10.01.2027 – 20.01.2027' },
    ],
    rejectReason: null,
    history: historyFor('pending', 'сегодня, 09:20', '20 ноя'),
  },
  {
    id: 9,
    number: 'ЗВ-2030-000009',
    typeCode: 'retake',
    typeTitle: 'Пересдача по дисциплине',
    category: 'application',
    status: 'rejected',
    statusLabel: 'Отклонена',
    statusNote: null,
    createdAt: isoAt(-12, 11, 5),
    createdAtLabel: '5 ноя, 11:05',
    dueAt: isoAt(-10, 12),
    dueLabel: '7 ноя',
    readyAtLabel: null,
    isOverdue: false,
    canCancel: false,
    canDownload: false,
    fields: [
      { label: 'Дисциплина', value: 'История России' },
      { label: 'Причина', value: 'Хочу улучшить рейтинг перед зачётной неделей' },
    ],
    rejectReason: 'Пересдачи по дисциплине назначаются после зачётной недели, обратитесь после 1 декабря.',
    history: historyFor('rejected', '5 ноя, 11:05', '7 ноя', { reject: 'Отклонено' }),
  },
];

const SAMPLE_DUE = ['18 ноя', '19 ноя', '20 ноя', '23 ноя'];

const ordersStore: Order[] = [...MOCK_ORDERS];
const staffOrdersStore: StaffOrder[] = [...MOCK_STAFF_ORDERS];
let questionsStore = [...MOCK_QUESTIONS];
let notificationsStore = [...MOCK_NOTIFICATIONS];
let deadlinesStore = [...MOCK_DEADLINES];
let announcements = [...MOCK_ANNOUNCEMENTS];
const staffMessagesStore = [...MOCK_STAFF_MESSAGES];
let profileState = { ...MOCK_PROFILE, security: { ...MOCK_PROFILE.security } };
let orderSeq = 30;

function labelize(field: RequestType['fields'][number], value: string | boolean | undefined): string {
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (field.type === 'select' || field.type === 'radio') {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

let orderDueLabelSeq = 0;

function createOrder(typeCode: string, values: RequestValues): Order {
  const type = REQUEST_TYPES.find((item) => item.code === typeCode);
  if (!type) throw new ApiError(404, 'NOT_FOUND', 'Не знаем такую услугу — выберите из каталога.');
  const instant = type.code === 'grade-transcript';
  const fields = type.fields
    .filter((field) => {
      const value = values[field.name];
      return value !== undefined && value !== '' && value !== false;
    })
    .map((field) => ({ label: field.label, value: labelize(field, values[field.name]) }));
  orderSeq += 1;
  const dueLabels = { '1': '18 ноя', '2': '19 ноя', '3': '20 ноя', '5': '24 ноя' } as Record<string, string>;
  const slaDays = type.code === 'certificate-scholarship' ? '2' : type.code === 'academic-leave' ? '3' : type.code === 'individual-plan' ? '5' : '1';
  const dueLabel = instant ? 'сразу' : (dueLabels[slaDays] ?? SAMPLE_DUE[orderDueLabelSeq++ % SAMPLE_DUE.length] ?? '18 ноя');
  const order: Order = {
    id: orderSeq,
    number: `ЗВ-2030-${String(orderSeq).padStart(6, '0')}`,
    typeCode: type.code,
    typeTitle: type.title,
    category: type.category,
    status: instant ? 'ready' : 'pending',
    statusLabel: instant ? 'Готово' : 'Ожидает проверки',
    statusNote: instant ? 'PDF сформирован автоматически' : null,
    createdAt: new Date().toISOString(),
    createdAtLabel: 'только что',
    dueAt: new Date(Date.now() + Number(slaDays) * 86_400_000).toISOString(),
    dueLabel,
    readyAtLabel: instant ? 'сегодня' : null,
    isOverdue: false,
    canCancel: !instant,
    canDownload: instant,
    fields,
    rejectReason: null,
    history: historyFor(instant ? 'ready' : 'pending', 'только что', dueLabel),
  };
  ordersStore.unshift(order);
  return order;
}

function findOwnOrder(id: number): Order {
  const order = ordersStore.find((item) => item.id === id);
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена.');
  return order;
}

// ---------------------------------------------------------------------------
// Роутер
// ---------------------------------------------------------------------------
let sessionUser: { login: string } | null = { login: 'a.ivanova' };
let signedOut = false;

const auth = (): void => {
  if (signedOut || !sessionUser) throw new ApiError(401, 'UNAUTHENTICATED', 'Сессия истекла.');
};

export async function mockRequest<T>(route: string, method: string, body: unknown): Promise<T> {
  await delay(NETWORK_DELAY);
  const [pathOnly, query = ''] = route.split('?');
  const path = pathOnly ?? '';
  const params = new URLSearchParams(query);
  const payload = (body ?? {}) as Record<string, unknown>;
  const isStaff = sessionUser?.login === 'dekanat';

  // Публичные
  if (path === 'health') return { status: 'ok', time: new Date().toISOString() } as T;
  if (path === 'meta') return MOCK_META as T;
  if (path === 'auth/login' && method === 'POST') {
    const login = String(payload.login ?? '');
    const password = String(payload.password ?? '');
    const account = MOCK_META.accounts.find((item) => item.login === login);
    if (password === 'blocked') throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Слишком много попыток входа.');
    if (!account || password !== account.password) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Неверный логин или пароль.');
    }
    sessionUser = { login };
    signedOut = false;
    return { student: { login, name: account.name, group: login === 'd.smirnov' ? 'МО-2-7' : 'МО-2-3' } } as T;
  }
  if (path === 'auth/logout' && method === 'POST') {
    sessionUser = null;
    signedOut = true;
    return undefined as T;
  }
  if (path === 'auth/me') {
    if (signedOut || !sessionUser) throw new ApiError(401, 'UNAUTHENTICATED', 'Нет сессии.');
    if (!MOCK_META.accounts.some((item) => item.login === sessionUser?.login)) sessionUser = { login: 'a.ivanova' };
    const account = MOCK_META.accounts.find((item) => item.login === sessionUser?.login);
    return { user: { student: { login: sessionUser.login, name: account?.name ?? 'Анна Иванова', group: 'МО-2-3' } } } as T;
  }
  if (path.startsWith('verify/')) {
    const token = path.slice('verify/'.length);
    if (!token || token.length < 8) return { verified: false } as T;
    return { verified: true, number: 'ЗВ-2030-000012', issuedAt: '16 ноября 2026' } as T;
  }

  auth();

  // Профиль
  if (path === 'me/profile') return { profile: profileState, deanery: MOCK_DEANERY } as T;
  if (path === 'me/profile' && method === 'PATCH') {
    const next = { ...profileState };
    if (typeof payload.phone === 'string') next.phone = payload.phone || null;
    if (typeof payload.telegram === 'string') next.telegram = payload.telegram || null;
    if (payload.phone !== undefined && typeof payload.phone === 'string' && payload.phone.length > 0 && !/^[+0-9 ()-]+$/.test(payload.phone)) {
      throw new ApiError(422, 'VALIDATION', 'Телефон может содержать только цифры, +, пробелы и скобки.', null, [
        { field: 'phone', message: 'Только цифры, +, пробелы и скобки' },
      ]);
    }
    if (payload.telegram !== undefined && typeof payload.telegram === 'string' && payload.telegram.length > 0 && !/^@?[A-Za-z0-9_]+$/.test(payload.telegram)) {
      throw new ApiError(422, 'VALIDATION', 'Telegram — только латиница, цифры и _.', null, [
        { field: 'telegram', message: 'Только латиница, цифры и _' },
      ]);
    }
    profileState = next;
    return { profile: profileState, deanery: MOCK_DEANERY } as T;
  }
  if (path === 'me/password' && method === 'POST') {
    if (payload.current !== 'DemoKonkurs2030') throw new ApiError(403, 'WRONG_PASSWORD', 'Текущий пароль не подошёл.');
    if (String(payload.next ?? '').length < 8) throw new ApiError(422, 'VALIDATION', 'Новый пароль — не меньше 8 символов.');
    if (payload.next !== payload.confirm) throw new ApiError(400, 'PASSWORD_MISMATCH', 'Пароли не совпадают.');
    profileState = { ...profileState, security: { ...profileState.security, lastPasswordChange: 'сегодня' } };
    return undefined as T;
  }
  if (path === 'me/2fa' && method === 'POST') {
    profileState = {
      ...profileState,
      security: { ...profileState.security, twoFactor: Boolean(payload.enabled) },
      verification: { ...profileState.verification, note: payload.enabled ? 'Личность подтверждена через Госуслуги · 2FA включена' : 'Личность подтверждена через Госуслуги' },
    };
    return { profile: profileState, deanery: MOCK_DEANERY } as T;
  }
  if (path === 'me/logout-all' && method === 'POST') {
    profileState = { ...profileState, security: { ...profileState.security, activeSessions: 1 } };
    return undefined as T;
  }

  // Расписание
  if (path === 'schedule/today') return todaySchedule() as T;
  if (path === 'schedule/week') return weekFor(params.get('date')) as T;

  // Успеваемость
  if (path === 'progress') return MOCK_PROGRESS as T;

  // Дедлайны
  if (path === 'deadlines' && method === 'GET') return deadlinesStore as T;
  if (/^deadlines\/\d+\/toggle$/.test(path) && method === 'POST') {
    const id = Number(path.split('/')[1]);
    deadlinesStore = deadlinesStore.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    return deadlinesStore as T;
  }

  // Заявки
  if (path === 'requests/types') return REQUEST_TYPES as T;
  if (path === 'requests' && method === 'GET') return ordersStore as T;
  if (path === 'requests' && method === 'POST') {
    const typeCode = String(payload.typeCode ?? '');
    const values = (payload.values ?? {}) as RequestValues;
    return createOrder(typeCode, values) as T;
  }
  const orderMatch = /^requests\/(\d+)(\/cancel)?$/.exec(path);
  if (orderMatch && method === 'GET') return findOwnOrder(Number(orderMatch[1])) as T;
  if (orderMatch && orderMatch[2] && method === 'POST') {
    const order = findOwnOrder(Number(orderMatch[1]));
    if (!order.canCancel) throw new ApiError(409, 'REQUEST_NOT_CANCELLABLE', 'Эту заявку уже нельзя отменить.');
    const updated: Order = {
      ...order,
      status: 'cancelled',
      statusLabel: STATUS_LABEL.cancelled,
      canCancel: false,
      statusNote: null,
      history: historyFor('cancelled', order.createdAtLabel, order.dueLabel),
    };
    ordersStore[ordersStore.findIndex((item) => item.id === order.id)] = updated;
    return updated as T;
  }

  // Уведомления
  if (path === 'notifications' && method === 'GET') return notificationsStore as T;
  if (path === 'notifications/read-all' && method === 'POST') {
    notificationsStore = notificationsStore.map((item) => ({ ...item, read: true }));
    return undefined as T;
  }
  const notifRead = /^notifications\/(\d+)\/read$/.exec(path);
  if (notifRead && method === 'POST') {
    const id = Number(notifRead[1]);
    notificationsStore = notificationsStore.map((item) => (item.id === id ? { ...item, read: true } : item));
    return undefined as T;
  }

  // Объявления
  if (path === 'announcements') return announcements as T;

  // Вопросы
  if (path === 'messages' && method === 'GET') return questionsStore as T;
  if (path === 'messages' && method === 'POST') {
    const subject = String(payload.subject ?? '');
    const text = String(payload.body ?? '');
    if (subject.trim().length < 3) throw new ApiError(422, 'VALIDATION', 'Тема слишком короткая.');
    if (text.trim().length < 10) throw new ApiError(422, 'VALIDATION', 'Опишите вопрос подробнее.');
    const message = {
      id: Date.now(),
      subject,
      body: text,
      createdAtLabel: 'только что',
      status: 'new' as const,
      reply: null,
    };
    questionsStore = [message, ...questionsStore];
    return message as T;
  }

  // Кабинет сотрудника
  if (path === 'staff/stats') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    return MOCK_STAFF_STATS as T;
  }
  if (path === 'staff/requests') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    const status = params.get('status');
    return (status ? staffOrdersStore.filter((item) => item.status === status) : staffOrdersStore) as T;
  }
  const staffOrderMatch = /^staff\/requests\/(\d+)$/.exec(path);
  if (staffOrderMatch && method === 'PATCH') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    const id = Number(staffOrderMatch[1]);
    const index = staffOrdersStore.findIndex((item) => item.id === id);
    const order = staffOrdersStore[index];
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Заявка не найдена.');
    const status = payload.status as RequestStatus;
    if (status === 'rejected' && String(payload.rejectReason ?? '').trim().length < 5) {
      throw new ApiError(422, 'VALIDATION', 'Укажите причину отказа — студент увидит её.', null, [
        { field: 'rejectReason', message: 'Причина обязательна' },
      ]);
    }
    const updated: StaffOrder = {
      ...order,
      status,
      statusLabel: STATUS_LABEL[status],
      canDownload: status === 'ready',
      readyAtLabel: status === 'ready' ? 'сегодня' : order.readyAtLabel,
      rejectReason: status === 'rejected' ? String(payload.rejectReason ?? '') : null,
      statusNote: typeof payload.comment === 'string' && payload.comment ? payload.comment : null,
    };
    staffOrdersStore[index] = updated;
    return updated as T;
  }
  if (path === 'staff/messages' && method === 'GET') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    return staffMessagesStore as T;
  }
  const staffReply = /^staff\/messages\/(\d+)\/reply$/.exec(path);
  if (staffReply && method === 'POST') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    const id = Number(staffReply[1]);
    const index = staffMessagesStore.findIndex((item) => item.id === id);
    const message = staffMessagesStore[index];
    if (!message) throw new ApiError(404, 'NOT_FOUND', 'Вопрос не найден.');
    const reply = String(payload.reply ?? '');
    if (reply.trim().length < 5) throw new ApiError(422, 'VALIDATION', 'Ответ слишком короткий.');
    const updated: StaffMessage = { ...message, reply, status: 'answered' };
    staffMessagesStore[index] = updated;
    return updated as T;
  }
  if (path === 'staff/announcements' && method === 'POST') {
    if (!isStaff) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
    const title = String(payload.title ?? '');
    const text = String(payload.body ?? '');
    if (title.trim().length < 3 || text.trim().length < 10) {
      throw new ApiError(422, 'VALIDATION', 'Проверьте заголовок и текст.');
    }
    announcements = [
      {
        id: Date.now(),
        category: (payload.category as Announcement['category']) ?? 'study',
        categoryLabel: 'Учёба',
        title,
        body: text,
        pinned: Boolean(payload.pinned),
        createdAt: new Date().toISOString(),
        createdAtLabel: 'только что',
        scope: payload.forAll ? 'Для всех студентов' : 'Для факультета МО',
      },
      ...announcements,
    ];
    return undefined as T;
  }

  if (path.startsWith('staff/')) throw new ApiError(403, 'FORBIDDEN', 'Нет доступа.');
  throw new ApiError(404, 'NOT_FOUND', `Мок-режим не знает маршрут ${method} /api/${path}`);
}

