import { CalendarClock, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/States';
import { SectionTitle } from '../ui/Layout';
import type { SessionExam, TranscriptRow } from '@/lib/types';

/** Список сессии: даты, форма, оценка или «ещё не сдано». */
export function SessionList({ session }: { session: SessionExam[] }) {
  if (session.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-6" aria-hidden="true" />}
        title="Расписание сессии ещё не опубликовано"
        description="Как только деканат утвердит график, даты появятся здесь и в уведомлениях."
      />
    );
  }
  const graded = session.filter((item) => item.grade);
  return (
    <Card padding="md">
      <CardHeader
        title="Сессия"
        icon={<CalendarClock className="size-[18px]" aria-hidden="true" />}
        count={session.length}
        action={<span className="text-[12px] text-muted">сдано {graded.length} из {session.length}</span>}
      />
      <ul className="divide-y divide-line">
        {session.map((exam) => (
          <li key={exam.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className="w-[52px] shrink-0 text-center">
              <p className="nums text-[12px] font-bold text-brand-ink">{exam.date.split(' ')[0]}</p>
              <p className="text-[10px] text-muted uppercase">{exam.date.split(' ')[1] ?? ''}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug font-bold text-ink">{exam.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden="true" /> {exam.time}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden="true" /> {exam.room}
                </span>
                <span>{exam.form}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-muted">{exam.teacher}</p>
            </div>
            <div className="shrink-0">
              {exam.grade ? (
                <Badge tone="ok" icon={<CheckCircle2 className="size-3" aria-hidden="true" />}>
                  {exam.grade}
                  {exam.rating !== null ? ` · ${exam.rating}%` : ''}
                </Badge>
              ) : (
                <Badge tone="neutral">ещё не сдано</Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Итоги прошлых семестров — компактная таблица на десктопе и карточки на мобильном. */
export function TranscriptTable({ rows }: { rows: TranscriptRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Итогов прошлых семестров пока нет" description="Оценки появятся после первой зачётной недели." />;
  }
  const semesters = Array.from(new Set(rows.map((row) => row.semester)));
  return (
    <div className="space-y-4">
      {semesters.map((semester) => {
        const items = rows.filter((row) => row.semester === semester);
        const avg = Math.round(items.reduce((sum, item) => sum + item.rating, 0) / items.length);
        const credits = items.reduce((sum, item) => sum + item.credits, 0);
        const withA = items.filter((item) => item.ects === 'A').length;
        return (
          <section key={semester} aria-labelledby={`sem-${semester}`}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <SectionTitle className="mb-0" ><span id={`sem-${semester}`}>{semester}</span></SectionTitle>
              <span className="nums text-[12px] text-muted">средний {avg}% · {credits} з.е. · «A» — {withA}</span>
            </div>
            <Card padding="none" className="overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <caption className="sr-only">Итоги: {semester}</caption>
                <thead className="hidden sm:table-header-group">
                  <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-wide text-muted uppercase">
                    <th scope="col" className="px-3 py-2">Дисциплина</th>
                    <th scope="col" className="px-3 py-2 text-right">З.е.</th>
                    <th scope="col" className="px-3 py-2 text-right">Рейтинг</th>
                    <th scope="col" className="px-3 py-2">Оценка</th>
                    <th scope="col" className="px-3 py-2 text-right">ECTS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={`${row.semester}-${row.course}`} className="border-t border-line align-top">
                      <td className="px-3 py-2.5 font-semibold text-ink">
                        {row.course}
                        <span className="mt-0.5 block text-[12px] font-normal text-muted sm:hidden">
                          {row.credits} з.е. · {row.rating}% · {row.grade} · ECTS {row.ects}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-right text-muted sm:table-cell">{row.credits}</td>
                      <td className="nums hidden px-3 py-2.5 text-right font-bold text-ink sm:table-cell">{row.rating}%</td>
                      <td className="hidden px-3 py-2.5 text-ink sm:table-cell">{row.grade}</td>
                      <td className="hidden px-3 py-2.5 text-right font-bold text-brand-ink sm:table-cell">{row.ects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
