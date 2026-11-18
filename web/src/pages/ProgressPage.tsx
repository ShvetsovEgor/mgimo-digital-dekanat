import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, GraduationCap, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AccordionItem, SectionTitle, Stat } from '@/components/ui/Layout';
import { Progress, RingProgress, Skeleton } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/Layout';
import { RankCard } from '@/components/progress/RankCard';
import { GradeScale } from '@/components/progress/GradeScale';
import { SessionList, TranscriptTable } from '@/components/progress/Results';
import { ScholarshipTeaser } from '@/components/scholarship/ScholarshipTeaser';
import { cx } from '@/lib/cx';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useProgress } from '@/lib/queries';
import type { Discipline, ProgressBundle } from '@/lib/types';

type Tab = 'disciplines' | 'session' | 'rank' | 'past';

const TABS = [
  { value: 'disciplines' as const, label: 'Дисциплины' },
  { value: 'session' as const, label: 'Сессия' },
  { value: 'rank' as const, label: 'Рейтинг' },
  { value: 'past' as const, label: 'Оценки' },
];

export default function ProgressPage() {
  useDocumentTitle('Успеваемость — Дедлайн');
  const progress = useProgress();
  const [tab, setTab] = useState<Tab>('disciplines');

  return (
    <div>
      <PageHeader title="Успеваемость" description="Накопительный рейтинг, прогноз «автомата» и сессия — по регламенту МГИМО." />
      {progress.isLoading && <ProgressSkeleton />}
      {progress.isError && <ErrorState error={progress.error} onRetry={() => void progress.refetch()} title="Успеваемость не загрузилась" />}
      {progress.data && (
        <div className="space-y-4">
          <SummaryCard data={progress.data} onShowDisciplines={() => setTab('disciplines')} />
          <ScholarshipTeaser />
          <Segmented label="Разделы успеваемости" options={TABS} value={tab} onChange={setTab} />
          <div>
            {tab === 'disciplines' && <DisciplinesTab data={progress.data} />}
            {tab === 'session' && <SessionList session={progress.data.session} />}
            {tab === 'rank' && (
              <div className="space-y-4">
                <RankCard rank={progress.data.rank} />
                <GradeScale rows={progress.data.scale} />
              </div>
            )}
            {tab === 'past' && <TranscriptTable rows={progress.data.past} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-48 w-full rounded-[12px]" />
      <Skeleton className="h-10 w-full rounded-[10px]" />
      <Skeleton className="h-20 w-full rounded-[12px]" />
      <Skeleton className="h-20 w-full rounded-[12px]" />
    </div>
  );
}

function SummaryCard({ data, onShowDisciplines }: { data: ProgressBundle; onShowDisciplines: () => void }) {
  const { summary, disciplines } = data;
  const total = disciplines.length;
  const tone = summary.riskCount > 0 ? 'warn' : 'ok';
  return (
    <Card padding="lg" className="bg-surface">
      <div className="flex items-center gap-4 sm:gap-6">
        <RingProgress
          value={summary.avgRating}
          max={100}
          size={104}
          stroke={9}
          tone="brand"
          label="Средний рейтинг"
          center={
            <span>
              <span className="display-num block text-[24px] leading-none text-ink">{Math.round(summary.avgRating)}</span>
              <span className="block text-[10px] font-semibold text-muted">из 100%</span>
            </span>
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Средний рейтинг</p>
          <p className="display-num mt-0.5 text-xl text-ink">
            {summary.avgLabel} <span className="text-[13px] font-semibold text-muted">за семестр</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone="ok" icon={<CheckCircle2 className="size-3" aria-hidden="true" />}>
              «Автоматов»: {summary.autoCount} из {total}
            </Badge>
            <Badge tone={tone} icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
              В зоне риска: {summary.riskCount}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
        <Stat label="Засчитано" value={`${summary.creditsEarnedYear} / ${summary.creditsPlanYear}`} hint="зачётных единиц" />
        <Stat label="Место в группе" value={`${data.rank.placeGroup} / ${data.rank.outOfGroup}`} hint="по рейтингу" />
        <Stat label="Средний по потоку" value={`${data.rank.cohortAvg}%`} hint={`у вас ${data.rank.myAvg}%`} tone={data.rank.myAvg >= data.rank.cohortAvg ? 'ok' : 'warn'} />
      </div>

      {summary.riskCount > 0 && (
        <button
          type="button"
          onClick={onShowDisciplines}
          className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-[10px] bg-surface-hover px-3 py-2.5 text-left text-[13px] font-semibold text-ink hover:brightness-[0.98]"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {summary.riskCount === 1 ? '1 дисциплина' : `${summary.riskCount} дисциплины`} под угрозой «автомата» — посмотрите, сколько баллов осталось
        </button>
      )}
    </Card>
  );
}

function DisciplinesTab({ data }: { data: ProgressBundle }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => {
    if (showAll) return data.disciplines;
    return data.disciplines
      .filter((item) => item.threshold > 0 && !item.autoReached)
      .sort((a, b) => a.rating - b.rating);
  }, [data.disciplines, showAll]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle className="mb-0">
          {showAll ? 'Все дисциплины' : 'Требуют внимания'} · {data.disciplines.length}
        </SectionTitle>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="cursor-pointer text-[13px] font-semibold text-brand hover:underline underline-offset-2"
        >
          {showAll ? 'Только под угрозой' : 'Показать все'}
        </button>
      </div>
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-6" aria-hidden="true" />}
          title="Все дисциплины в режиме «автомата»"
          description="Отличная работа: по каждой дисциплине рейтинг уже выше 70%."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => (
            <li key={item.id}>
              <DisciplineItem item={item} defaultOpen={!showAll && item === sorted[0]} />
            </li>
          ))}
        </ul>
      )}
      <GradeScale rows={data.scale} compact />
    </div>
  );
}

function DisciplineItem({ item, defaultOpen }: { item: Discipline; defaultOpen?: boolean }) {
  const earned = item.controlPoints.reduce((sum, point) => sum + (point.earned ?? 0), 0);
  const max = item.controlPoints.reduce((sum, point) => sum + point.max, 0);
  const pending = item.controlPoints.filter((point) => point.earned === null);
  const tone = item.autoReached ? 'ok' : item.toAuto !== null && item.toAuto > max - earned ? 'danger' : item.threshold > 0 ? 'warn' : 'neutral';

  return (
    <AccordionItem
      defaultOpen={defaultOpen}
      tone={tone === 'danger' ? 'danger' : tone === 'ok' ? 'neutral' : 'neutral'}
      title={
        <span className="flex items-center gap-1.5">
          {item.title}
          {item.autoReached && <CheckCircle2 className="size-4 text-ok" aria-label="Автомат достигнут" />}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{item.teacher}</span>
          <span aria-hidden="true">·</span>
          <span>{item.attestationLabel}</span>
        </span>
      }
      meta={<RatingPill item={item} />}
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="font-semibold text-ink">
              Рейтинг <span className="nums text-sm font-semibold">{Math.round(item.rating)}%</span>
            </span>
            <span className="text-muted">
              {earned} из {max} баллов получено
            </span>
          </div>
          <Progress
            value={item.rating}
            threshold={item.threshold > 0 ? item.threshold : null}
            tone={item.autoReached ? 'ok' : 'brand'}
            label={`Рейтинг по дисциплине «${item.title}»`}
          />
          <p className="mt-1.5 text-[12px] text-muted">
            Маркер на полосе — порог {item.threshold}% для «автомата» по регламенту МГИМО.
          </p>
        </div>

        {item.autoReached ? (
          <p className="flex items-center gap-1.5 rounded-[10px] bg-surface-hover px-3 py-2 text-[13px] font-semibold text-ink">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            «Автомат» уже заслужен: {Math.round(item.rating)}% ≥ {item.threshold}%
          </p>
        ) : item.toAuto !== null ? (
          <p className="rounded-[10px] bg-surface-hover px-3 py-2 text-[13px] font-semibold text-brand">
            До «автомата» — {item.toAuto} {item.toAuto === 1 ? 'балл' : item.toAuto < 5 ? 'балла' : 'баллов'} из {max - earned} оставшихся
            {pending.length > 0 && ` · ещё ${pending.length} контрольны${pending.length === 1 ? 'х' : 'е'} впереди`}
          </p>
        ) : item.threshold === 0 ? (
          <p className="rounded-[10px] bg-surface-hover px-3 py-2 text-[13px] font-semibold text-ink">
            Зачёт по посещаемости — порог баллов не применяется
          </p>
        ) : null}

        <div>
          <SectionTitle>Контрольные точки</SectionTitle>
          <ul className="space-y-1.5">
            {item.controlPoints.map((point) => (
              <li key={point.label} className="flex items-center justify-between gap-2 rounded-[8px] bg-surface-2 px-2.5 py-1.5 text-[13px]">
                <span className="min-w-0 truncate text-ink">{point.label}</span>
                <span className={cx('nums shrink-0 font-semibold', point.earned === null ? 'text-muted' : 'text-ink')}>
                  {point.earned === null ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
                      <CircleDashed className="size-3" aria-hidden="true" /> не сдано
                    </span>
                  ) : (
                    <>
                      {point.earned}
                      <span className="font-medium text-muted"> / {point.max}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {(item.examDate || item.finalGrade) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px]">
            {item.examDate && (
              <Badge tone="info" icon={<CalendarClock className="size-3" aria-hidden="true" />}>
                {item.attestation === 'exam' ? 'Экзамен' : 'Зачёт'} {item.examDate}
                {item.examRoom ? ` · ${item.examRoom}` : ''}
              </Badge>
            )}
            {item.finalGrade && (
              <Badge tone="ok" icon={<GraduationCap className="size-3" aria-hidden="true" />}>
                Итог: {item.finalGrade}
                {item.finalRating !== null ? ` · ${item.finalRating}%` : ''}
              </Badge>
            )}
          </div>
        )}
      </div>
    </AccordionItem>
  );
}

function RatingPill({ item }: { item: Discipline }) {
  if (item.autoReached) {
    return (
      <span className="inline-flex flex-col items-end">
        <span className="nums text-sm font-semibold text-ink">{Math.round(item.rating)}%</span>
        <span className="text-[10px] font-semibold text-ink">автомат</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end">
      <span className="nums text-sm font-semibold text-ink">{Math.round(item.rating)}%</span>
      {item.toAuto !== null ? (
        <span className="text-[10px] font-semibold text-ink">−{item.toAuto} до {item.threshold}%</span>
      ) : (
        <span className="text-[10px] text-muted">без порога</span>
      )}
    </span>
  );
}
