// Расписание: сегодня, неделя, изменения, экспорт ICS.
import type { ChangeKind, EntryRow, ScheduleChange, ScheduleToday, ScheduleWeek, TodayLecture, WeekEntry } from './mappers.js';
import {
  CHANGE_LABELS,
  buildingShort,
  changeInfo,
  changeMeta,
  changeNote,
  toWeekEntry,
} from './mappers.js';
import { MONTHS_SHORT, fullDateLabel, humanDelta, weekRangeLabel } from './format.js';
import {
  WEEKDAYS,
  addDays,
  formatClock,
  parseLocal,
  startOfWeek,
  toDateString,
  toLocalIso,
  weekParity,
} from './time.js';
import { holidayLabel } from '../today.js';

export interface ScheduleContext {
  now: Date;
  group: string;
  subgroup: string | null;
  weekParityLabel: string;
  universityDayLabel: string;
}

const UNSCHEDULED_SUBGROUPS = new Set(['*', 'all', 'все', 'вся группа']);

function normSubgroup(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toUpperCase();
  if (!t || UNSCHEDULED_SUBGROUPS.has(t.toLowerCase())) return null;
  return t.replace(/^ПОДГР\.?\s*/i, '').replace(/[А]$/, 'A');
}

function normStudentSubgroup(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toUpperCase();
  return t.replace(/^ПОДГР\.?\s*/i, '').replace(/[А]$/, 'A');
}

/**
 * Видна ли пара: пары без подгруппы видны всем, пары подгруппы — только её студентам.
 * Если у студента подгруппа не задана, он видит все пары группы.
 */
export function entryVisible(row: EntryRow, subgroup: string | null): boolean {
  const entrySub = normSubgroup(row.subgroup);
  if (!entrySub) return true;
  const mine = normStudentSubgroup(subgroup);
  if (!mine) return true;
  return entrySub === mine;
}

/** Пары в этот день недели (1..7), с учётом даты вхождения и чётности недели. */
function entriesOnDay(rows: EntryRow[], monday: Date, weekday: number): EntryRow[] {
  const day = addDays(monday, weekday - 1);
  const date = toDateString(day);
  const parity = weekParity(day);
  return rows.filter((r) => {
    if (r.weekday !== weekday) return false;
    if (r.date && r.date !== date) return false; // пара привязана к конкретной дате
    if (r.week_type !== 'all' && r.week_type !== parity) return false;
    return true;
  });
}

function sortEntries(rows: EntryRow[]): EntryRow[] {
  return [...rows].sort((a, b) => a.start_min - b.start_min || a.id - b.id);
}

function mondayOf(now: Date, weekOffset: number): Date {
  return addDays(startOfWeek(now), weekOffset * 7);
}

export function buildWeek(
  rows: EntryRow[],
  ctx: ScheduleContext,
  weekOffset: number,
): ScheduleWeek {
  const monday = mondayOf(ctx.now, weekOffset);
  const today = toDateString(ctx.now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    const date = toDateString(day);
    const entries: WeekEntry[] = sortEntries(entriesOnDay(rows, monday, i + 1))
      .filter((r) => entryVisible(r, ctx.subgroup))
      .map((r) => toWeekEntry(r, date, ctx.now));
    return {
      date,
      weekdayLabel: WEEKDAYS[i],
      dayLabel: String(day.getDate()),
      monthLabel: MONTHS_SHORT[day.getMonth()],
      isToday: date === today,
      isHoliday: holidayLabel(day) !== null,
      entries,
    };
  });

  const changes = collectChanges(rows, monday, ctx);
  return {
    weekStart: toDateString(monday),
    weekLabel: weekRangeLabel(monday),
    parity: weekParity(monday),
    parityLabel: weekParity(monday) === 'odd' ? 'нечётная неделя' : 'чётная неделя',
    days,
    changes,
  };
}

/** «Ср, 13:30» — для карточек изменений. */
function dayClock(weekday: number, startMin: number): string {
  return `${WEEKDAYS[weekday - 1]}, ${formatClock(startMin)}`;
}

function clockWithWeekday(dateStr: string, startMin: number): string {
  const d = parseLocal(dateStr);
  return dayClock(d.getDay() === 0 ? 7 : d.getDay(), startMin);
}

/** Изменения в неделе (отмены, переносы, новые аудитории, добавленные пары). */
export function collectChanges(rows: EntryRow[], monday: Date, ctx: ScheduleContext): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  for (const weekday of [1, 2, 3, 4, 5, 6, 7]) {
    for (const row of sortEntries(entriesOnDay(rows, monday, weekday))) {
      if (!entryVisible(row, ctx.subgroup) || !row.change_kind) continue;
      const kind: ChangeKind = row.change_kind;
      const meta = changeInfo(row, ctx.now);
      const originalStart = changeMeta(row).fromStartMin ?? row.start_min;
      const from =
        kind === 'moved' && row.original_date
          ? clockWithWeekday(row.original_date, originalStart)
          : dayClock(row.weekday, originalStart);
      const to =
        kind === 'cancelled'
          ? null
          : kind === 'room'
            ? `Ауд. ${row.room}`
            : dayClock(row.weekday, row.start_min);
      changes.push({
        entryId: row.id,
        kind,
        kindLabel: CHANGE_LABELS[kind],
        subject: row.title,
        from,
        to,
        note: changeNote(row),
        published: meta?.published ?? '—',
        publishedBy: meta?.publishedBy ?? 'Деканат',
        severity: kind === 'cancelled' ? 'warning' : kind === 'added' ? 'info' : 'warning',
      });
    }
  }
  return changes;
}

export function buildToday(rows: EntryRow[], ctx: ScheduleContext): ScheduleToday {
  const now = ctx.now;
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  const todayRows = sortEntries(entriesOnDay(rows, startOfWeek(now), weekday)).filter((r) =>
    entryVisible(r, ctx.subgroup),
  );
  const todayDate = toDateString(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const monday = startOfWeek(now);

  const entries: ScheduleToday['entries'] = todayRows.map((r) => {
    let status: 'upcoming' | 'now' | 'done' | 'cancelled' | 'moved_away';
    if (r.change_kind === 'cancelled') status = 'cancelled';
    else if (nowMin >= r.end_min) status = 'done';
    else if (nowMin >= r.start_min) status = 'now';
    else status = 'upcoming';
    return { ...toWeekEntry(r, todayDate, now), status };
  });

  // Следующая пара: ближайшая по времени среди сегодняшних, включая идущую сейчас.
  const nextRow = todayRows.find((r) => r.change_kind !== 'cancelled' && r.start_min > nowMin);
  const liveRow = todayRows.find(
    (r) => r.change_kind !== 'cancelled' && nowMin >= r.start_min && nowMin < r.end_min,
  );

  const next: TodayLecture | null = liveRow
    ? lectureFrom(liveRow, 'сейчас идёт', true)
    : nextRow
      ? lectureFrom(nextRow, `до пары ${humanDelta(nextRow.start_min - nowMin)}`, false)
      : null;

  const active = entries.filter((e) => e.status !== 'cancelled');
  const done = active.filter((e) => e.status === 'done').length;
  const finished = active.length > 0 && done === active.length && !entries.some((e) => e.status === 'now');

  return {
    dateLabel: fullDateLabel(now),
    weekParityLabel: ctx.weekParityLabel,
    universityDay: ctx.universityDayLabel,
    next,
    now: formatClock(nowMin),
    total: entries.length,
    done,
    finished,
    entries,
    changes: collectChanges(rows, monday, ctx),
  };
}

function lectureFrom(row: EntryRow, relative: string, isNow: boolean): TodayLecture {
  return {
    entryId: row.id,
    subject: row.title,
    start: formatClock(row.start_min),
    end: formatClock(row.end_min),
    room: row.room,
    building: row.building,
    teacher: row.teacher,
    kindLabel: kindLabel(row),
    relative,
    isNow,
    status: isNow ? 'now' : 'upcoming',
  };
}

function kindLabel(row: EntryRow): string {
  return {
    lecture: 'Лекция',
    seminar: 'Семинар',
    language: 'Языковая группа',
    physical: 'Физкультура',
    consult: 'Консультация',
    exam: 'Экзамен',
  }[row.kind];
}

// ---------------------------------------------------------------------------
// Экспорт .ics (RFC 5545)
// ---------------------------------------------------------------------------
const TZ_ID = 'Europe/Moscow';
const MSK_OFFSET = '+0300';

function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function icsDate(d: Date): string {
  return `${toDateString(d).replace(/-/g, '')}`;
}

function icsDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${icsDate(d)}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function fold(line: string): string {
  // RFC 5545: строки длиннее 75 октетов переносятся с ведущим пробелом.
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 73) return line;
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (currentBytes + b > 73) {
      out.push(current);
      current = ` ${ch}`;
      currentBytes = b + 1;
    } else {
      current += ch;
      currentBytes += b;
    }
  }
  if (current) out.push(current);
  return out.join('\r\n');
}

/** Календарь на 4 недели начиная с понедельника недели weekOffset. Только пары своей группы. */
export function buildIcs(rows: EntryRow[], ctx: ScheduleContext, weekOffset: number): string {
  const start = mondayOf(ctx.now, weekOffset);
  const nowUtc = new Date();
  const stamp = `${nowUtc.getUTCFullYear()}${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}${String(nowUtc.getUTCDate()).padStart(2, '0')}T${String(nowUtc.getUTCHours()).padStart(2, '0')}${String(nowUtc.getUTCMinutes()).padStart(2, '0')}${String(nowUtc.getUTCSeconds()).padStart(2, '0')}Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dedline Digital Dekanat 2030//MGIMO demo//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Расписание ${ctx.group} — Дедлайн`,
    `X-WR-TIMEZONE:${TZ_ID}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TZ_ID}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:MSK',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (let w = 0; w < 4; w += 1) {
    const monday = addDays(start, w * 7);
    for (const weekday of [1, 2, 3, 4, 5, 6, 7]) {
      const day = addDays(monday, weekday - 1);
      for (const row of sortEntries(entriesOnDay(rows, monday, weekday))) {
        if (!entryVisible(row, ctx.subgroup) || row.change_kind === 'cancelled') continue;
        const begin = new Date(day);
        begin.setHours(Math.floor(row.start_min / 60), row.start_min % 60, 0, 0);
        const end = new Date(day);
        end.setHours(Math.floor(row.end_min / 60), row.end_min % 60, 0, 0);
        lines.push(
          'BEGIN:VEVENT',
          `UID:schedule-${row.id}-${icsDate(day)}@deadline.demo`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${TZ_ID}:${icsDateTime(begin)}`,
          `DTEND;TZID=${TZ_ID}:${icsDateTime(end)}`,
          `SUMMARY:${icsEscape(row.title)}`,
          `LOCATION:${icsEscape(`${row.building}, ауд. ${row.room}`)}`,
          `DESCRIPTION:${icsEscape([row.teacher, kindLabel(row), row.change_kind ? changeNote(row) : null].filter(Boolean).join(' · '))}`,
          'END:VEVENT',
        );
      }
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export { buildingShort, toLocalIso };
