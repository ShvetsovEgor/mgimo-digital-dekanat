// Черновик калькулятора стипендии в браузере: та же формула, что и на сервере,
// но пороги и суммы приходят из ответа API — клиент не хранит их у себя.
import type { ScholarshipDiscipline, ScholarshipResult, ScholarshipRules, ScholarshipTier } from './types';

export interface DraftInput {
  funded: 'budget' | 'contract';
  rules: ScholarshipRules;
  disciplines: ReadonlyArray<{ id: number; title: string; rating: number }>;
}

const TITLES: Record<ScholarshipTier, string> = {
  none: 'Стипендия не положена',
  academic: 'Академическая',
  increased: 'Повышенная академическая',
};

function clampRating(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Пересчитывает прогноз локально — без запросов, пока двигают ползунки. */
export function evaluateDraft({ funded, rules, disciplines }: DraftInput): ScholarshipResult {
  if (funded === 'contract') {
    return {
      tier: 'none',
      title: 'На договорном месте академическая стипендия не назначается',
      amount: 0,
      gaps: [],
    };
  }
  if (disciplines.length === 0) {
    return { tier: 'none', title: 'Нет данных о баллах этого семестра', amount: 0, gaps: [] };
  }
  const min = Math.min(...disciplines.map((item) => clampRating(item.rating)));
  const tier: ScholarshipTier =
    min >= rules.increasedMin ? 'increased' : min >= rules.academicMin ? 'academic' : 'none';
  const amount = tier === 'increased' ? rules.increasedAmount : tier === 'academic' ? rules.academicAmount : 0;
  const nextThreshold = tier === 'none' ? rules.academicMin : tier === 'academic' ? rules.increasedMin : null;
  const gaps =
    nextThreshold === null
      ? []
      : disciplines
          .map((item) => ({ ...item, rating: clampRating(item.rating) }))
          .filter((item) => item.rating < nextThreshold)
          .map((item) => ({
            id: item.id,
            title: item.title,
            rating: item.rating,
            need: nextThreshold,
            delta: nextThreshold - item.rating,
          }))
          .sort((a, b) => b.delta - a.delta);
  return { tier, title: TITLES[tier], amount, gaps };
}

/** Черновик из данных сервера: баллы можно менять, правила — нет. */
export function draftFromServer(bundle: {
  funded: 'budget' | 'contract';
  rules: ScholarshipRules;
  disciplines: ScholarshipDiscipline[];
}): Record<number, number> {
  const values: Record<number, number> = {};
  for (const item of bundle.disciplines) values[item.id] = clampRating(item.rating);
  return values;
}

export function formatMonthly(amount: number): string {
  if (amount <= 0) return '0 ₽/мес';
  return `${amount.toLocaleString('ru-RU')} ₽/мес`;
}
