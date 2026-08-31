import { describe, expect, it } from 'vitest';
import { computeColumnAggregate } from './kanban-aggregate.js';
import type { BoardItem } from './kanban.types.js';

function card(id: string, data: { [key: string]: any }): BoardItem {
  return { id, type: 'card', parentId: 'col1', children: [], data, meta: {} };
}

const numbers = [card('c1', { points: 10 }), card('c2', { points: 20 }), card('c3', { points: 40 })];

describe('computeColumnAggregate — function matrix', () => {
  it('count ignores field and equals the card count', () => {
    expect(computeColumnAggregate(numbers, { fn: 'count' })).toEqual({ value: 3 });
    expect(computeColumnAggregate(numbers, { fn: 'count', field: 'points' })).toEqual({ value: 3 });
  });

  it('sum adds numeric field values', () => {
    expect(computeColumnAggregate(numbers, { fn: 'sum', field: 'points' })).toEqual({ value: 70 });
  });

  it('avg rounds to two decimal places', () => {
    expect(
      computeColumnAggregate(
        [card('c1', { points: 1 }), card('c2', { points: 2 }), card('c3', { points: 2 })],
        { fn: 'avg', field: 'points' },
      ),
    ).toEqual({ value: 1.67 });
  });

  it('min and max pick the extremes', () => {
    expect(computeColumnAggregate(numbers, { fn: 'min', field: 'points' })).toEqual({ value: 10 });
    expect(computeColumnAggregate(numbers, { fn: 'max', field: 'points' })).toEqual({ value: 40 });
  });
});

describe('computeColumnAggregate — data source adjudication', () => {
  it('skips cards with a missing field key', () => {
    const cards = [card('c1', { points: 5 }), card('c2', {}), card('c3', { points: 7 })];
    expect(computeColumnAggregate(cards, { fn: 'sum', field: 'points' })).toEqual({ value: 12 });
  });

  it('skips non-numeric and empty-string field values', () => {
    const cards = [
      card('c1', { points: 'abc' }),
      card('c2', { points: '' }),
      card('c3', { points: null }),
      card('c4', { points: 6 }),
    ];
    expect(computeColumnAggregate(cards, { fn: 'sum', field: 'points' })).toEqual({ value: 6 });
  });

  it('returns the "-" fallback when no card carries a valid value (gc-aggregate-missing-field)', () => {
    const cards = [card('c1', {}), card('c2', { points: 'n/a' })];
    expect(computeColumnAggregate(cards, { fn: 'sum', field: 'points' })).toEqual({ value: '-' });
    expect(computeColumnAggregate(cards, { fn: 'avg', field: 'points' })).toEqual({ value: '-' });
    expect(computeColumnAggregate(cards, { fn: 'min', field: 'points' })).toEqual({ value: '-' });
    expect(computeColumnAggregate(cards, { fn: 'max', field: 'points' })).toEqual({ value: '-' });
  });

  it('count on an empty column is 0, never NaN (gc-aggregate-empty-column)', () => {
    expect(computeColumnAggregate([], { fn: 'count' })).toEqual({ value: 0 });
    expect(computeColumnAggregate([], { fn: 'sum', field: 'points' })).toEqual({ value: '-' });
  });

  it('is null-safe against cards without a data record', () => {
    const broken: BoardItem = { id: 'cx', type: 'card', parentId: 'col1', children: [], data: undefined as any, meta: {} };
    expect(computeColumnAggregate([broken, card('c2', { points: 4 })], { fn: 'sum', field: 'points' })).toEqual({
      value: 4,
    });
  });
});
