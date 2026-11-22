import { Clock3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { demoMonday, demoTimeLabel, useDemoClock } from '@/lib/demo-time';

/** Управляемое демо-время: меняет только GET-запросы расписания в текущей вкладке. */
export function DemoTimeControl() {
  const [clock, setClock] = useDemoClock();
  const minutes = clock?.minutes ?? 8 * 60 + 20;
  const setMinutes = (next: number) => setClock({ date: clock?.date ?? demoMonday(), minutes: next });

  return (
    <Card padding="sm" className="border-brand/25 bg-surface">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <p className="truncate text-[13px] font-semibold text-ink">
            Время в демо
            <span className="nums ml-1.5 font-medium text-muted">{clock ? demoTimeLabel(minutes) : 'выберите момент'}</span>
          </p>
        </div>
        {clock && (
          <Button variant="ghost" size="sm" className="shrink-0 px-2" onClick={() => setClock(null)} aria-label="Вернуть реальное время">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Сейчас</span>
          </Button>
        )}
      </div>
      <label className="mt-2 flex min-h-9 items-center gap-2">
        <span className="sr-only">Промотать учебный день</span>
        <input
          className="block h-8 min-w-0 flex-1 cursor-pointer accent-brand"
          type="range"
          min={7 * 60}
          max={21 * 60}
          step={5}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          aria-label="Время учебного дня"
        />
        <span className="nums w-10 text-right text-[12px] font-semibold text-muted">{demoTimeLabel(minutes)}</span>
      </label>
    </Card>
  );
}
