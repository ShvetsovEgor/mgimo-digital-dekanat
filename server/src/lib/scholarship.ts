// Калькулятор академической стипендии: единственный регламент проекта.
//
// Правила (вымышленные суммы и пороги, совпадают с демо-данными):
//   • договорное место (funded = 'contract') — стипендия не назначается, 0 ₽;
//   • бюджет и хотя бы одна дисциплина < 70 — стипендии нет;
//   • бюджет, все ≥ 70, но хотя бы одна < 90 — «Академическая», 2 500 ₽/мес;
//   • бюджет и все ≥ 90 — «Повышенная академическая», 3 500 ₽/мес.
//
// Функция чистая: ничего не читает из БД и не пишет, поэтому покрывается тестами и
// переиспользуется в браузере (черновик считается той же формулой, суммы берутся из API).

export const SCHOLARSHIP_RULES = {
  /** Минимальный балл для академической стипендии. */
  academicMin: 70,
  /** Минимальный балл для повышенной академической. */
  increasedMin: 90,
  /** Размер академической стипендии, ₽/мес. */
  academicAmount: 2500,
  /** Размер повышенной академической стипендии, ₽/мес. */
  increasedAmount: 3500,
  /** Пояснение на экране: это прогноз концепта, а не приказ о назначении. */
  disclaimer: 'Учебный прогноз концепта — не приказ о назначении стипендии. Суммы и пороги вымышлены.',
} as const;

export type ScholarshipTier = 'none' | 'academic' | 'increased';
export type Funding = 'budget' | 'contract';

export interface ScholarshipInput {
  funded: Funding;
  disciplines: ReadonlyArray<{ id: number; title: string; rating: number | null }>;
}

export interface ScholarshipGap {
  id: number;
  title: string;
  rating: number;
  /** Порог ближайшего более высокого уровня. */
  need: number;
  /** Сколько баллов не хватает (положительное число). */
  delta: number;
}

export interface ScholarshipResult {
  tier: ScholarshipTier;
  title: string;
  amount: number;
  /** Дисциплины, которых не хватает до ближайшего достижимого более высокого уровня. */
  gaps: ScholarshipGap[];
}

/** null-рейтинг трактуем как 0 (в данных такого нет, но правило должно быть определённым). */
export function normalizeRating(rating: number | null): number {
  if (rating === null || Number.isNaN(rating)) return 0;
  return Math.min(100, Math.max(0, Math.round(rating)));
}

const TITLES: Record<ScholarshipTier, string> = {
  none: 'Стипендия не положена',
  academic: 'Академическая',
  increased: 'Повышенная академическая',
};

/**
 * Считает прогноз стипендии по текущим баллам.
 * Возвращает ступень, сумму и список дисциплин, которые мешают подняться на уровень выше.
 */
export function evaluateScholarship(input: ScholarshipInput): ScholarshipResult {
  const { academicMin, increasedMin, academicAmount, increasedAmount } = SCHOLARSHIP_RULES;
  const items = input.disciplines.map((item) => ({ ...item, rating: normalizeRating(item.rating) }));

  // 1. Договор: стипендия не назначается, ползунки на итог не влияют.
  if (input.funded === 'contract') {
    return {
      tier: 'none',
      title: 'На договорном месте академическая стипендия не назначается',
      amount: 0,
      gaps: [],
    };
  }

  // 2. Бюджет. Пустой список дисциплин — данных нет, стипендия не подтверждена.
  if (items.length === 0) {
    return { tier: 'none', title: 'Нет данных о баллах этого семестра', amount: 0, gaps: [] };
  }

  const min = Math.min(...items.map((item) => item.rating));
  const tier: ScholarshipTier = min >= increasedMin ? 'increased' : min >= academicMin ? 'academic' : 'none';
  const amount = tier === 'increased' ? increasedAmount : tier === 'academic' ? academicAmount : 0;

  // 3. Ближайший достижимый уровень выше текущего.
  const nextThreshold = tier === 'none' ? academicMin : tier === 'academic' ? increasedMin : null;
  const gaps: ScholarshipGap[] =
    nextThreshold === null
      ? []
      : items
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
