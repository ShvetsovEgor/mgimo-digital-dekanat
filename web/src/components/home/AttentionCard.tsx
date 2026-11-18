import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { pluralize } from '@/lib/format';
import type { Order, ProgressBundle, ScheduleToday } from '@/lib/types';

interface AttentionCardProps {
  today: ScheduleToday;
  progress?: ProgressBundle;
  requests?: Order[];
}

/** «Что требует внимания» — только срочное: правки расписания, готовый документ, риск «автомата». */
export function AttentionCard({ today, progress, requests }: AttentionCardProps) {
  const items = useMemo(() => {
    const list: { id: string; tone: 'danger' | 'info'; text: string; to: string; cta: string }[] = [];
    if (today.changes.length > 0) {
      list.push({
        id: 'changes',
        tone: 'danger',
        text: `${pluralize(today.changes.length, 'изменение', 'изменения', 'изменений')} в расписании недели`,
        to: '/schedule',
        cta: 'Смотреть',
      });
    }
    const ready = (requests ?? []).filter((order) => order.status === 'ready' && order.canDownload);
    const first = ready[0];
    if (first) {
      list.push({
        id: 'ready',
        tone: 'info',
        text: `Справка ${first.number} готова — скачайте PDF`,
        to: `/requests/${first.id}`,
        cta: 'Открыть',
      });
    }
    if (progress && progress.summary.riskCount > 0) {
      list.push({
        id: 'risk',
        tone: 'danger',
        text: `${pluralize(progress.summary.riskCount, 'дисциплина', 'дисциплины', 'дисциплин')} под угрозой «автомата»`,
        to: '/progress',
        cta: 'Что делать',
      });
    }
    return list.slice(0, 3);
  }, [today.changes.length, progress, requests]);

  if (items.length === 0) return null;

  return (
    <Card padding="md">
      <CardHeader title="Что требует внимания" icon={<AlertTriangle className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />} />
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm no-underline transition-colors hover:text-brand"
            >
              <span className="flex min-w-0 items-center gap-2 text-ink">
                {item.tone === 'info' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-now" strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="line-clamp-2">{item.text}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand">
                {item.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
