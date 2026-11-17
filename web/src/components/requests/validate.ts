import type { RequestType, RequestValues } from '@/lib/types';

export type FormErrors = Record<string, string | undefined>;

/** Клиентская валидация формы заявки — те же правила, что и на сервере, но с понятным текстом. */
export function validateRequest(type: RequestType, values: RequestValues): FormErrors {
  const errors: FormErrors = {};
  for (const field of type.fields) {
    const value = values[field.name];
    const text = typeof value === 'string' ? value.trim() : '';

    if (field.type === 'checkbox') continue;

    if (field.type === 'select' || field.type === 'radio') {
      if (field.required && !text) errors[field.name] = 'Выберите вариант — без этого заявку не примут';
      else if (field.type === 'select' && text && field.options && !field.options.some((option) => option.value === text)) {
        errors[field.name] = 'Такого варианта нет — выберите из списка';
      }
      continue;
    }

    if (field.required && !text) {
      errors[field.name] = field.type === 'date' ? 'Укажите дату' : 'Заполните поле — без него заявку не примут';
      continue;
    }
    if (field.minLength && text.length > 0 && text.length < field.minLength) {
      const left = field.minLength - text.length;
      errors[field.name] = `Ещё ${left} ${left === 1 ? 'символ' : left < 5 ? 'символа' : 'символов'} — нужно не меньше ${field.minLength}`;
    }
    if (field.type === 'date' && text && Number.isNaN(Date.parse(text))) {
      errors[field.name] = 'Проверьте дату: формат день.месяц.год';
    }
  }
  return errors;
}
