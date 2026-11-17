import { Info } from 'lucide-react';
import { AccordionItem } from '../ui/Layout';
import type { GradeScaleRow } from '@/lib/types';

/** «Как читать баллы»: шкала МГИМО 100-балльная / 5-балльная / ECTS. */
export function GradeScale({ rows, compact }: { rows: GradeScaleRow[]; compact?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <AccordionItem
      defaultOpen={compact === true ? false : undefined}
      title="Как читать рейтинг и оценки"
      subtitle="Шкала перевода: 100-балльная, 5-балльная и ECTS"
      meta={<Info className="size-5 text-brand-ink" aria-hidden="true" />}
    >
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">Шкала перевода рейтинга в оценки</caption>
          <thead>
            <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-wide text-muted uppercase">
              <th scope="col" className="px-3 py-2">Рейтинг</th>
              <th scope="col" className="px-3 py-2">Оценка</th>
              <th scope="col" className="px-3 py-2 text-right">ECTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.range} className={index % 2 === 1 ? 'bg-surface-2/60' : 'bg-surface'}>
                <td className="nums px-3 py-2 font-semibold text-ink">{row.range}</td>
                <td className="px-3 py-2 text-ink">{row.five}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-grid size-6 place-items-center rounded-md bg-brand-soft text-[11px] font-extrabold text-brand-ink">
                    {row.ects}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-muted">
        Порог «автомата» — 70% накопленного рейтинга. Если баллов меньше, дисциплина сдаётся на сессии, а итоговая оценка
        считается по этой же шкале.
      </p>
    </AccordionItem>
  );
}
