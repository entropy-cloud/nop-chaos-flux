import { describe, expect, it } from 'vitest';
import { computeUsedFields, groupValuesEqual } from './utils';
import type { ConditionItemValue, ConditionGroupValue } from './types';

describe('computeUsedFields', () => {
  it('returns empty set for empty children', () => {
    expect(computeUsedFields([])).toEqual(new Set());
  });

  it('collects field names from flat items', () => {
    const children: ConditionItemValue[] = [
      { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal' },
      { id: 'i2', left: { type: 'field', field: 'age' }, op: 'greater' },
    ];
    expect(computeUsedFields(children)).toEqual(new Set(['name', 'age']));
  });

  it('skips items without a left.field', () => {
    const children = [
      { id: 'i1', left: { type: 'field', field: '' }, op: 'equal' },
      { id: 'i2', left: { type: 'field' as const, field: 'age' }, op: 'equal' },
    ] as ConditionItemValue[];
    expect(computeUsedFields(children)).toEqual(new Set(['age']));
  });

  it('collects fields from nested groups', () => {
    const children: Array<ConditionItemValue | ConditionGroupValue> = [
      { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal' },
      {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i2', left: { type: 'field', field: 'age' }, op: 'equal' },
          { id: 'i3', left: { type: 'field', field: 'status' }, op: 'equal' },
        ],
      },
    ];
    expect(computeUsedFields(children)).toEqual(new Set(['name', 'age', 'status']));
  });

  it('excludes item by id when excludeId is provided', () => {
    const children: ConditionItemValue[] = [
      { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal' },
      { id: 'i2', left: { type: 'field', field: 'age' }, op: 'greater' },
      { id: 'i3', left: { type: 'field', field: 'status' }, op: 'equal' },
    ];
    expect(computeUsedFields(children, 'i2')).toEqual(new Set(['name', 'status']));
  });

  it('excludes all items when excludeId matches none', () => {
    const children: ConditionItemValue[] = [
      { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal' },
    ];
    expect(computeUsedFields(children, 'nonexistent')).toEqual(new Set(['name']));
  });

  it('handles deeply nested groups', () => {
    const children: Array<ConditionItemValue | ConditionGroupValue> = [
      {
        id: 'g1',
        conjunction: 'and',
        children: [
          {
            id: 'g2',
            conjunction: 'or',
            children: [{ id: 'i1', left: { type: 'field', field: 'deep' }, op: 'equal' }],
          },
        ],
      },
    ];
    expect(computeUsedFields(children)).toEqual(new Set(['deep']));
  });

  it('returns empty set when all items are excluded', () => {
    const children: ConditionItemValue[] = [
      { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal' },
    ];
    expect(computeUsedFields(children, 'i1')).toEqual(new Set());
  });
});

describe('groupValuesEqual', () => {
  it('returns true for same reference', () => {
    const v = { id: 'r', conjunction: 'and' as const, children: [] };
    expect(groupValuesEqual(v, v)).toBe(true);
  });

  it('returns true for identical primitives', () => {
    expect(groupValuesEqual(42, 42)).toBe(true);
    expect(groupValuesEqual('hello', 'hello')).toBe(true);
    expect(groupValuesEqual(true, true)).toBe(true);
    expect(groupValuesEqual(null, null)).toBe(true);
    expect(groupValuesEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(groupValuesEqual(1, 2)).toBe(false);
    expect(groupValuesEqual('a', 'b')).toBe(false);
    expect(groupValuesEqual(true, false)).toBe(false);
  });

  it('returns false for different types', () => {
    expect(groupValuesEqual(1, '1')).toBe(false);
    expect(groupValuesEqual(null, undefined)).toBe(false);
    expect(groupValuesEqual([], false)).toBe(false);
  });

  it('compares arrays by value', () => {
    expect(groupValuesEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(groupValuesEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(groupValuesEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('compares nested arrays', () => {
    expect(groupValuesEqual([[1], [2]], [[1], [2]])).toBe(true);
    expect(groupValuesEqual([[1], [2]], [[1], [3]])).toBe(false);
  });

  it('compares plain objects by value', () => {
    expect(groupValuesEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(groupValuesEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(groupValuesEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(groupValuesEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('compares nested objects', () => {
    expect(groupValuesEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(groupValuesEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('handles mixed object and array comparisons', () => {
    expect(groupValuesEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(groupValuesEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
  });

  it('handles Object.is edge cases', () => {
    expect(groupValuesEqual(NaN, NaN)).toBe(true);
    expect(groupValuesEqual(0, -0)).toBe(false);
  });

  it('returns false for array vs non-array', () => {
    expect(groupValuesEqual([1], 1)).toBe(false);
    expect(groupValuesEqual(1, [1])).toBe(false);
  });

  it('returns false for function comparisons', () => {
    expect(
      groupValuesEqual(
        () => {},
        () => {},
      ),
    ).toBe(false);
  });

  it('Date objects are compared as plain objects (no enumerable keys)', () => {
    const d1 = new Date('2024-01-01');
    const d2 = new Date('2025-01-01');
    expect(groupValuesEqual(d1, d2)).toBe(true);
  });
});
