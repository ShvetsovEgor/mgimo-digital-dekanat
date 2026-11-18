// Регламент калькулятора стипендии: чистые случаи без HTTP и базы.
import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateScholarship, SCHOLARSHIP_RULES, normalizeRating } from '../src/lib/scholarship.js';

const d = (id: number, title: string, rating: number | null) => ({ id, title, rating });

test('пороги и суммы совпадают с договорённостью', () => {
  assert.equal(SCHOLARSHIP_RULES.academicMin, 70);
  assert.equal(SCHOLARSHIP_RULES.increasedMin, 90);
  assert.equal(SCHOLARSHIP_RULES.academicAmount, 2500);
  assert.equal(SCHOLARSHIP_RULES.increasedAmount, 3500);
  assert.ok(SCHOLARSHIP_RULES.disclaimer.length > 10);
});

test('договор: 0 ₽ и пустые gaps, даже при всех 100', () => {
  const result = evaluateScholarship({
    funded: 'contract',
    disciplines: [d(1, 'История России', 100), d(2, 'Экономическая теория', 96)],
  });
  assert.equal(result.tier, 'none');
  assert.equal(result.amount, 0);
  assert.deepEqual(result.gaps, []);
  assert.match(result.title, /договорном месте/i);
});

test('договор: ползунки на итог не влияют', () => {
  const zero = evaluateScholarship({ funded: 'contract', disciplines: [d(1, 'История России', 0)] });
  const hundred = evaluateScholarship({ funded: 'contract', disciplines: [d(1, 'История России', 100)] });
  assert.equal(zero.amount, hundred.amount);
  assert.deepEqual(zero.gaps, hundred.gaps);
});

test('бюджет, 69 и 90: стипендии нет, gap до 70', () => {
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', 69), d(2, 'Экономическая теория', 90)],
  });
  assert.equal(result.tier, 'none');
  assert.equal(result.amount, 0);
  assert.deepEqual(
    result.gaps.map((gap) => ({ id: gap.id, need: gap.need, delta: gap.delta })),
    [{ id: 1, need: 70, delta: 1 }],
  );
});

test('бюджет, все ровно 70: академическая 2 500, gap до 90', () => {
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', 70), d(2, 'Экономическая теория', 70), d(3, 'Английский', 70)],
  });
  assert.equal(result.tier, 'academic');
  assert.equal(result.amount, 2500);
  assert.equal(result.gaps.length, 3);
  for (const gap of result.gaps) {
    assert.equal(gap.need, 90);
    assert.equal(gap.delta, 20);
  }
});

test('бюджет, 89 и 90: академическая, gap 1 балл', () => {
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', 89), d(2, 'Экономическая теория', 90)],
  });
  assert.equal(result.tier, 'academic');
  assert.equal(result.amount, 2500);
  assert.deepEqual(
    result.gaps.map((gap) => ({ title: gap.title, delta: gap.delta })),
    [{ title: 'История России', delta: 1 }],
  );
});

test('бюджет, все ровно 90: повышенная 3 500 и пустые gaps', () => {
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', 90), d(2, 'Экономическая теория', 90)],
  });
  assert.equal(result.tier, 'increased');
  assert.equal(result.amount, 3500);
  assert.deepEqual(result.gaps, []);
  assert.equal(result.title, 'Повышенная академическая');
});

test('бюджет, пустой список: честное «нет данных», без падения', () => {
  const result = evaluateScholarship({ funded: 'budget', disciplines: [] });
  assert.equal(result.tier, 'none');
  assert.equal(result.amount, 0);
  assert.deepEqual(result.gaps, []);
  assert.match(result.title, /данных/i);
});

test('null-рейтинг считается 0 и попадает в gaps', () => {
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', null), d(2, 'Экономическая теория', 95)],
  });
  assert.equal(result.tier, 'none');
  assert.equal(result.amount, 0);
  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0]?.rating, 0);
  assert.equal(result.gaps[0]?.delta, 70);
});

test('нормализация рейтинга: границы и округление', () => {
  assert.equal(normalizeRating(null), 0);
  assert.equal(normalizeRating(-10), 0);
  assert.equal(normalizeRating(140), 100);
  assert.equal(normalizeRating(89.6), 90);
});

test('gaps отсортированы по величине дефицита', () => {
  // Уровень академической уже есть (все ≥ 70), до повышенной не хватает 15, 10 и 5 баллов.
  const result = evaluateScholarship({
    funded: 'budget',
    disciplines: [d(1, 'История России', 75), d(2, 'Экономическая теория', 80), d(3, 'Английский', 85)],
  });
  assert.equal(result.tier, 'academic');
  assert.deepEqual(
    result.gaps.map((gap) => gap.delta),
    [15, 10, 5],
  );
});
