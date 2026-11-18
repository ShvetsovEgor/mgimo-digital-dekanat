import { AlertTriangle, CheckCircle2, Hourglass, Inbox, MessageCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { cx } from '@/lib/cx';
import type { StaffStats as Stats } from '@/lib/types';

/** Статистика кабинета деканата. */
export function StaffStats({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Новые', value: stats.new, icon: Inbox, tone: 'brand' as const },
    { label: 'В работе', value: stats.inProgress, icon: Hourglass, tone: 'warn' as const },
    { label: 'Просрочены', value: stats.overdue, icon: AlertTriangle, tone: 'danger' as const },
    { label: 'Готовы сегодня', value: stats.readyToday, icon: CheckCircle2, tone: 'ok' as const },
    { label: 'Вопросы', value: stats.newMessages, icon: MessageCircle, tone: 'info' as const },
  ];
  return (
    <Card padding="sm">
      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cx(
              'rounded-[10px] border px-2.5 py-2',
              item.tone === 'danger' && item.value > 0 ? 'border-line bg-surface-hover/60' : 'border-line bg-surface-2',
            )}
          >
            <div className="flex items-center gap-1.5">
              <item.icon className="size-3.5 text-muted" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{item.label}</span>
            </div>
            <p className="display-num mt-0.5 text-xl text-ink">{item.value}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
