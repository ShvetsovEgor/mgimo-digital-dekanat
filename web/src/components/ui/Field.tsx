import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cx } from '@/lib/cx';

const CONTROL =
  'w-full rounded-xl border bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:opacity-60';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  counter?: string;
}

function FieldShell({ id, label, hint, error, required, children, counter }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only"> (обязательное поле)</span>}
        </label>
        {counter && <span className="nums text-xs text-muted">{counter}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[13px] font-medium text-danger-ink" role="alert">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  valueLength?: number;
  maxLength?: number;
}

export interface TextFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  trailing?: ReactNode;
}

export function TextField({ label, error, hint, className, trailing, required, valueLength, maxLength, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      counter={valueLength !== undefined && maxLength ? `${valueLength}/${maxLength}` : undefined}
    >
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cx(
            CONTROL,
            'h-11',
            trailing && 'pr-11',
            error ? 'border-danger' : 'border-line-strong hover:border-line-strong/80',
            className,
          )}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</span>}
      </div>
    </FieldShell>
  );
}

export interface TextAreaFieldProps
  extends BaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {}

export function TextAreaField({ label, error, hint, className, required, valueLength, maxLength, rows = 4, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      counter={valueLength !== undefined && maxLength ? `${valueLength}/${maxLength}` : undefined}
    >
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(CONTROL, 'resize-y py-2.5 leading-relaxed', error ? 'border-danger' : 'border-line-strong', className)}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps
  extends BaseFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'> {
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectField({ label, error, hint, className, required, options, placeholder, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cx(
            CONTROL,
            'h-11 cursor-pointer appearance-none pr-10',
            error ? 'border-danger' : 'border-line-strong',
            !rest.value && 'text-muted',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </FieldShell>
  );
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  name: string;
  value: T | '';
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  columns?: 1 | 2;
}

/** Радио-группа в виде «плиток» 44 px. */
export function RadioGroup<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  columns = 1,
}: ChoiceGroupProps<T>) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className={cx('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-1')} role="radiogroup" aria-describedby={error ? `${id}-error` : undefined}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cx(
                'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[15px] transition-colors duration-150',
                selected ? 'border-brand bg-brand-soft font-semibold text-brand-ink' : 'border-line-strong bg-surface hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="size-4 accent-[var(--color-brand)]"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-danger-ink" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </fieldset>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  className?: string;
}

export function CheckboxField({ label, checked, onChange, hint, className }: CheckboxFieldProps) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[15px] text-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-[var(--color-brand)]"
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p className="pl-7 text-[13px] text-muted" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[15px] font-semibold text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-[13px] text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-line',
        )}
      >
        <span
          className={cx(
            'inline-block size-5 rounded-full bg-white shadow transition-transform duration-150',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
