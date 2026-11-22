import { useEffect, useState } from 'react';

const CHANGE_EVENT = 'deadline:demo-clock-change';
let activeClock: DemoClock | null = null;

export interface DemoClock {
  /** Дата нужна, чтобы у жюри всегда был учебный день с парами, даже в выходной. */
  date: string;
  /** Минуты от начала суток по локальному времени. */
  minutes: number;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Ближайший понедельник текущей недели: в нём сид гарантированно содержит занятия. */
function studyMonday(): string {
  const date = new Date();
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - (weekday - 1));
  return dateKey(date);
}

/** Время демо синхронно во всех компонентах, но сбрасывается при обновлении вкладки. */
export function useDemoClock(): [DemoClock | null, (clock: DemoClock | null) => void] {
  const [clock, setClock] = useState<DemoClock | null>(() => activeClock);

  useEffect(() => {
    const sync = () => setClock(activeClock);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const update = (next: DemoClock | null) => {
    activeClock = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setClock(next);
  };

  return [clock, update];
}

export function demoMonday(): string {
  return studyMonday();
}

export function demoTimeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Параметры отправляются только на GET-роуты расписания. */
export function demoScheduleQuery(clock: DemoClock | null): string {
  if (!clock) return '';
  return `date=${encodeURIComponent(clock.date)}&time=${encodeURIComponent(demoTimeLabel(clock.minutes))}`;
}

export function toDemoDate(clock: DemoClock | null): Date {
  if (!clock) return new Date();
  const date = new Date(`${clock.date}T00:00:00`);
  date.setHours(Math.floor(clock.minutes / 60), clock.minutes % 60, 0, 0);
  return date;
}
