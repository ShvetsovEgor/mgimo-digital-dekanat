import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock, FileText, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ServiceField } from '@/components/requests/ServiceField';
import { validateRequest, type FormErrors } from '@/components/requests/validate';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/http';
import { mockRouteOf, useRequestTypes } from '@/lib/queries';
import { cx, isMock } from '@/lib/cx';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { RequestType, RequestValues, Order } from '@/lib/types';

type Category = 'certificate' | 'application' | 'service';

export default function NewRequestPage() {
  useDocumentTitle('Новая заявка — Дедлайн');
  const types = useRequestTypes();
  const [params, setParams] = useSearchParams();
  const selectedCode = params.get('type');
  const selected = types.data?.find((item) => item.code === selectedCode) ?? null;

  const pick = (code: string) => setParams({ type: code }, { replace: true });
  const reset = () => setParams({}, { replace: true });

  return (
    <div className="animate-fade">
      <PageHeader
        title={selected ? selected.title : 'Новая заявка'}
        description={selected ? undefined : 'Выберите услугу — покажем, что нужно, сколько ждать и что получите.'}
        back={
          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline underline-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Мои заявки
          </Link>
        }
      />
      {types.isLoading && (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-24 w-full rounded-[12px]" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
        </div>
      )}
      {types.isError && <ErrorState error={types.error} onRetry={() => void types.refetch()} title="Каталог услуг не загрузился" />}
      {types.data && !selected && <ServiceCatalog types={types.data} onPick={pick} />}
      {selected && <OrderFlow type={selected} onBack={reset} />}
    </div>
  );
}

function ServiceCatalog({ types, onPick }: { types: RequestType[]; onPick: (code: string) => void }) {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const shown = category === 'all' ? types : types.filter((item) => item.category === category);
  return (
    <div className="space-y-3">
      <Segmented
        label="Категория услуги"
        value={category}
        onChange={setCategory}
        options={[
          { value: 'all', label: 'Все' },
          { value: 'certificate', label: 'Справки' },
          { value: 'application', label: 'Заявления' },
          { value: 'service', label: 'Сервис' },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState title="В этой категории пока пусто" description="Выберите другую категорию — или «Все»." />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {shown.map((type) => (
            <li key={type.code}>
              <Card
                as="article"
                padding="md"
                interactive
                className="flex h-full flex-col"
                accent={type.isNew ? 'ok' : null}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral" size="sm">
                        {type.categoryLabel}
                      </Badge>
                      {type.isNew && (
                        <Badge tone="ok" size="sm">
                          новый
                        </Badge>
                      )}
                    </div>
                    <h2 className="mt-1.5 text-sm leading-snug font-semibold text-ink">{type.title}</h2>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-hover text-brand" aria-hidden="true">
                    <FileText className="size-[18px]" />
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted">{type.short}</p>
                <p className="mt-2 line-clamp-2 text-[12px] text-muted">{type.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge tone="info" size="sm" icon={<Clock className="size-3" aria-hidden="true" />}>
                    {type.slaLabel}
                  </Badge>
                  <Badge tone="gold" size="sm">
                    {type.price}
                  </Badge>
                  <Badge tone="neutral" size="sm" icon={<ListChecks className="size-3" aria-hidden="true" />}>
                    {type.fieldCount} {type.fieldCount === 1 ? 'поле' : type.fieldCount < 5 ? 'поля' : 'полей'}
                  </Badge>
                </div>
                <Button
                  className="mt-3"
                  fullWidth
                  variant="outline"
                  size="sm"
                  onClick={() => onPick(type.code)}
                  iconRight={<ArrowRight className="size-4" aria-hidden="true" />}
                >
                  Выбрать
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Документы приходят с QR-подписью: работодатель или военкомат может проверить подлинность на публичной странице.
      </p>
    </div>
  );
}

type Step = 'form' | 'review' | 'done';

function OrderFlow({ type, onBack }: { type: RequestType; onBack: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState<RequestValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Order | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const update = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const check = () => {
    const found = validateRequest(type, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setServerError(null);
    try {
      const order = await api.post<Order>('/requests', { typeCode: type.code, values }, { mockRoute: mockRouteOf('/requests') });
      setCreated(order);
      setStep('done');
      toast.success('Заявка подана — номер и прогноз готовности ниже');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не получилось подать заявку. Повторите.';
      if (error instanceof ApiError && error.fields) {
        const map: FormErrors = {};
        for (const item of error.fields) map[item.field] = item.message;
        setErrors((prev) => ({ ...prev, ...map }));
        setStep('form');
      }
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRows = useMemo(
    () =>
      type.fields
        .filter((field) => values[field.name] !== undefined && values[field.name] !== '' && values[field.name] !== false)
        .map((field) => ({
          label: field.label,
          value:
            typeof values[field.name] === 'boolean'
              ? values[field.name]
                ? 'Да'
                : 'Нет'
              : (field.options?.find((option) => option.value === values[field.name])?.label ?? String(values[field.name] ?? '')),
        })),
    [type.fields, values],
  );

  if (step === 'done' && created) return <SuccessScreen order={created} type={type} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[13px]">
          <StepDot index={1} label="Заполнить" active={step === 'form'} done={step !== 'form'} />
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <StepDot index={2} label="Проверить" active={step === 'review'} done={false} />
        </div>

        {step === 'form' && (
          <Card padding="md">
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (check()) setStep('review');
              }}
              className="space-y-4"
            >
              <p className="text-[13px] text-muted">{type.description}</p>
              {type.fields.map((field) => (
                <div key={field.name} data-field={field.name}>
                  <ServiceField field={field} value={values[field.name]} error={errors[field.name]} onChange={(value) => update(field.name, value)} />
                </div>
              ))}
              {serverError && (
                <p role="alert" className="rounded-[10px] border border-line bg-surface-hover px-3 py-2 text-[13px] font-semibold text-danger">
                  {serverError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={onBack} iconLeft={<ArrowLeft className="size-4" aria-hidden="true" />}>
                  Другая услуга
                </Button>
                <Button type="submit" iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
                  Проверить
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === 'review' && (
          <Card padding="md">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Проверьте заявку</h2>
              <Badge tone="info">{type.slaLabel}</Badge>
            </div>
            <dl className="mt-3 divide-y divide-line">
              {reviewRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 py-2">
                  <dt className="text-[13px] text-muted">{row.label}</dt>
                  <dd className="max-w-[60%] text-right text-[14px] font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-muted">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
              Номер присвоится после подачи. Прогноз готовности учитывает только рабочие дни.
            </p>
            {serverError && (
              <p role="alert" className="mt-2 rounded-[10px] border border-line bg-surface-hover px-3 py-2 text-[13px] font-semibold text-danger">
                {serverError}
              </p>
            )}
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('form')} iconLeft={<ArrowLeft className="size-4" aria-hidden="true" />}>
                Изменить
              </Button>
              <Button onClick={() => void submit()} loading={submitting} iconLeft={<Check className="size-4" aria-hidden="true" />}>
                Подать заявку
              </Button>
            </div>
          </Card>
        )}
      </div>

      <aside className="space-y-3">
        <Card padding="md" className="bg-surface-hover">
          <h2 className="text-[13px] font-semibold text-brand">Как это работает</h2>
          <ol className="mt-2 space-y-2">
            {type.steps.map((text, index) => (
              <li key={text} className="flex gap-2 text-[13px] text-ink">
                <span className="nums grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-semibold text-brand">
                  {index + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-brand pt-2.5">
            <Badge tone="info" size="sm">
              {type.slaLabel}
            </Badge>
            <Badge tone="gold" size="sm">
              {type.price}
            </Badge>
          </div>
        </Card>
        {isMock() && (
          <p className="text-[11px] text-muted">
            Демо-режим: заявка сохранится в браузере, PDF не сформируется. На рабочем сервере номер и прогноз придут от деканата.
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setValues({});
            setErrors({});
            setStep('form');
            navigate('/requests/new', { replace: true });
          }}
        >
          Начать заново
        </Button>
      </aside>
    </div>
  );
}

function StepDot({ index, label, active, done }: { index: number; label: string; active: boolean; done: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-semibold', active || done ? 'text-brand' : 'text-muted')}>
      <span
        className={cx(
          'nums grid size-6 place-items-center rounded-full text-[11px] font-semibold',
          done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-line text-muted',
        )}
      >
        {done ? <Check className="size-3.5" aria-hidden="true" /> : index}
      </span>
      {label}
    </span>
  );
}

function SuccessScreen({ order, type }: { order: Order; type: RequestType }) {
  return (
    <Card padding="lg" className="mx-auto max-w-xl text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-hover text-ink" aria-hidden="true">
        <Check className="size-7" />
      </span>
      <h2 className="mt-3 text-xl font-semibold text-ink">Заявка подана</h2>
      <p className="mt-1 text-[13px] text-muted">{type.title}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-left">
        <div className="rounded-[10px] border border-line bg-surface-2 p-3">
          <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">Номер</dt>
          <dd className="nums mt-0.5 text-sm font-semibold text-ink">{order.number}</dd>
        </div>
        <div className="rounded-[10px] border border-line bg-surface-2 p-3">
          <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">Прогноз готовности</dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink">{order.dueLabel}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-[10px] bg-surface-hover px-3 py-2 text-[13px] text-brand">
        Статус обновляется автоматически. Когда документ будет готов, придёт уведомление — ничего звонить не нужно.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <ButtonLink to={`/requests/${order.id}`} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
          Открыть заявку
        </ButtonLink>
        <ButtonLink to="/requests" variant="outline">
          В мои заявки
        </ButtonLink>
      </div>
    </Card>
  );
}
