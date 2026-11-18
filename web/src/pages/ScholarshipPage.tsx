import { useMemo, useState } from 'react';
import { GraduationCap, RotateCcw } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { DisciplineSlider } from '@/components/scholarship/DisciplineSlider';
import { ScholarshipGaps } from '@/components/scholarship/ScholarshipGaps';
import { ScholarshipLadder } from '@/components/scholarship/ScholarshipLadder';
import { ScholarshipNumbers } from '@/components/scholarship/ScholarshipNumbers';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useScholarship } from '@/lib/queries';
import { draftFromServer, evaluateDraft } from '@/lib/scholarship';

export default function ScholarshipPage() {
  useDocumentTitle('Калькулятор стипендии — Дедлайн');
  const query = useScholarship();

  return (
    <div className="animate-fade">
      <PageHeader
        title="Калькулятор стипендии"
        description={query.data?.rules.disclaimer ?? 'Учебный прогноз по баллам текущего семестра — не приказ о назначении.'}
      />
      {query.isLoading && <PageSkeleton />}
      {query.isError && (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Калькулятор не загрузился" />
      )}
      {query.data && <Calculator bundle={query.data} />}
    </div>
  );
}

function Calculator({ bundle }: { bundle: NonNullable<ReturnType<typeof useScholarship>['data']> }) {
  const [draft, setDraft] = useState<Record<number, number>>(() => draftFromServer(bundle));
  const { rules, funded, disciplines, assigned } = bundle;

  const result = useMemo(
    () =>
      evaluateDraft({
        funded,
        rules,
        disciplines: disciplines.map((item) => ({ id: item.id, title: item.title, rating: draft[item.id] ?? item.rating })),
      }),
    [funded, rules, disciplines, draft],
  );
  const dirty = disciplines.some((item) => (draft[item.id] ?? item.rating) !== item.rating);

  return (
    <div className="space-y-4">
      <ScholarshipNumbers assigned={assigned} forecast={result} rules={rules} />

      <section aria-labelledby="scholarship-disciplines">
        <CardHeader
          id="scholarship-disciplines"
          title="Дисциплины этого семестра"
          icon={<GraduationCap className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />}
          count={disciplines.length}
          action={
            dirty ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft(draftFromServer(bundle))}
                iconLeft={<RotateCcw className="size-4" aria-hidden="true" />}
              >
                Вернуть мои баллы
              </Button>
            ) : (
              <span className="text-[12px] text-quiet">мои баллы</span>
            )
          }
        />
        {disciplines.length === 0 ? (
          <EmptyState
            title="В этом семестре пока нет дисциплин"
            description="Как только появятся баллы, калькулятор рассчитает стипендию."
            action={<ActionLink to="/progress">Открыть успеваемость</ActionLink>}
          />
        ) : (
          <ul className="space-y-2">
            {disciplines.map((item) => (
              <DisciplineSlider
                key={item.id}
                discipline={item}
                value={draft[item.id] ?? item.rating}
                onChange={(value) => setDraft((prev) => ({ ...prev, [item.id]: value }))}
              />
            ))}
          </ul>
        )}
      </section>

      <Card padding="md">
        <CardHeader title="Что поднять" />
        <ScholarshipGaps result={result} funded={funded} />
      </Card>

      <Card padding="md">
        <CardHeader title="Лестница стипендий" />
        <ScholarshipLadder result={result} rules={rules} funded={funded} />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
        <p className="text-[13px] text-muted">Справка о стипендии — бесплатно, 2 рабочих дня.</p>
        <ActionLink to="/requests/new?type=certificate-scholarship">Заказать справку о стипендии</ActionLink>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-[12px]" />
        <Skeleton className="h-24 w-full rounded-[12px]" />
      </div>
      <Skeleton className="h-16 w-full rounded-[12px]" />
      <Skeleton className="h-16 w-full rounded-[12px]" />
      <Skeleton className="h-16 w-full rounded-[12px]" />
    </div>
  );
}
