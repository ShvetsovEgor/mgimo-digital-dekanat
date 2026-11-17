import { CheckboxField, RadioGroup, SelectField, TextAreaField, TextField } from '../ui/Field';
import type { RequestField, RequestValue } from '@/lib/types';

interface ServiceFieldProps {
  field: RequestField;
  value: RequestValue | undefined;
  error?: string;
  onChange: (value: RequestValue) => void;
}

/** Поле формы заявки по его описанию из каталога (text/textarea/select/date/radio/checkbox). */
export function ServiceField({ field, value, error, onChange }: ServiceFieldProps) {
  const stringValue = typeof value === 'string' ? value : '';
  const hint = field.placeholder && field.type !== 'select' && field.type !== 'radio' ? field.placeholder : undefined;

  if (field.type === 'checkbox') {
    return <CheckboxField label={field.label} checked={value === true} onChange={onChange} hint={field.placeholder ?? undefined} />;
  }

  if (field.type === 'radio') {
    return (
      <RadioGroup
        label={field.label}
        name={field.name}
        value={stringValue}
        required={field.required}
        onChange={onChange}
        error={error}
        options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <SelectField
        label={field.label}
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        options={field.options ?? []}
        placeholder={`Выберите: ${field.label.toLowerCase()}`}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <TextAreaField
        label={field.label}
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        hint={field.minLength ? `Не меньше ${field.minLength} символов${hint ? ` · ${hint}` : ''}` : hint}
        placeholder={field.placeholder ?? undefined}
        valueLength={stringValue.length}
        maxLength={600}
        rows={4}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <TextField
        label={field.label}
        type="date"
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        hint={hint}
      />
    );
  }

  return (
    <TextField
      label={field.label}
      required={field.required}
      value={stringValue}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      hint={field.minLength ? `${hint ?? ''}${hint ? ' · ' : ''}не меньше ${field.minLength} символов` : hint}
      placeholder={field.placeholder ?? undefined}
      autoComplete="off"
    />
  );
}
