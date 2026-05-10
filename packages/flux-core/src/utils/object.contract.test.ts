import { describe, expect, it } from 'vitest';
import {
  isPlainObject,
  isRecord,
  shallowEqual,
  shallowEqualRecords,
  toPositiveNumber,
  toRecord,
  toStringArray,
} from './object.js';

describe('isPlainObject contract', () => {
  it('returns true for empty object', () => {
    expect(isPlainObject({})).toBe(true);
  });

  it('returns true for object literal', () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPlainObject(undefined)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it('returns false for Date', () => {
    expect(isPlainObject(new Date())).toBe(false);
  });

  it('returns true for simple class instance (known: uses toString, not prototype chain)', () => {
    class Foo {}
    expect(isPlainObject(new Foo())).toBe(true);
  });

  it('returns false for Map', () => {
    expect(isPlainObject(new Map())).toBe(false);
  });

  it('returns false for Set', () => {
    expect(isPlainObject(new Set())).toBe(false);
  });

  it('returns false for number', () => {
    expect(isPlainObject(42)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isPlainObject('hello')).toBe(false);
  });

  it('returns false for boolean', () => {
    expect(isPlainObject(true)).toBe(false);
  });

  it('returns true for Object.create(null)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });
});

describe('isRecord contract', () => {
  it('returns true for plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isRecord([])).toBe(false);
  });

  it('returns true for Object.create(null)', () => {
    expect(isRecord(Object.create(null))).toBe(true);
  });
});

describe('toRecord contract', () => {
  it('returns input when it is a record', () => {
    const input = { a: 1 };
    expect(toRecord(input)).toBe(input);
  });

  it('returns empty object for null', () => {
    expect(toRecord(null)).toEqual({});
  });

  it('returns empty object for array', () => {
    expect(toRecord([1, 2])).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(toRecord(undefined)).toEqual({});
  });
});

describe('toPositiveNumber contract', () => {
  it('returns positive number as-is', () => {
    expect(toPositiveNumber(5, 0)).toBe(5);
  });

  it('returns fallback for zero', () => {
    expect(toPositiveNumber(0, 99)).toBe(99);
  });

  it('returns fallback for negative number', () => {
    expect(toPositiveNumber(-1, 99)).toBe(99);
  });

  it('returns fallback for NaN', () => {
    expect(toPositiveNumber(NaN, 99)).toBe(99);
  });

  it('returns fallback for Infinity', () => {
    expect(toPositiveNumber(Infinity, 99)).toBe(99);
  });

  it('returns fallback for string', () => {
    expect(toPositiveNumber('abc', 99)).toBe(99);
  });

  it('parses numeric string', () => {
    expect(toPositiveNumber('42', 0)).toBe(42);
  });

  it('returns fallback for null', () => {
    expect(toPositiveNumber(null, 99)).toBe(99);
  });

  it('returns fallback for undefined', () => {
    expect(toPositiveNumber(undefined, 99)).toBe(99);
  });
});

describe('toStringArray contract', () => {
  it('returns stringified array elements', () => {
    expect(toStringArray([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('returns empty for non-array', () => {
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray('string')).toEqual([]);
    expect(toStringArray({})).toEqual([]);
  });

  it('converts nested objects to string', () => {
    expect(toStringArray([{ a: 1 }])).toEqual(['[object Object]']);
  });
});

describe('shallowEqual contract', () => {
  it('returns true for identical values', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('returns true for Object.is primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(NaN, NaN)).toBe(true);
  });

  it('returns false for null vs object', () => {
    expect(shallowEqual(null, {})).toBe(false);
  });

  it('returns false for undefined vs object', () => {
    expect(shallowEqual(undefined, {})).toBe(false);
  });

  it('returns false for array vs object', () => {
    expect(shallowEqual([1], { 0: 1, length: 1 })).toBe(false);
  });

  it('returns true for equal arrays', () => {
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
  });

  it('returns false for different-length arrays', () => {
    expect(shallowEqual([1], [1, 2])).toBe(false);
  });

  it('returns true for equal objects (same key order)', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns true for equal objects (different key order)', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('returns false for different number of keys', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false for deep-equal but not shallow-equal objects', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });

  it('handles 0 vs -0 correctly (Object.is)', () => {
    expect(shallowEqual(0, -0)).toBe(false);
  });
});

describe('shallowEqualRecords contract', () => {
  it('returns true for empty records', () => {
    expect(shallowEqualRecords({}, {})).toBe(true);
  });

  it('returns false for different key counts', () => {
    expect(shallowEqualRecords({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns true for identical records', () => {
    expect(shallowEqualRecords({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
  });

  it('returns false when values differ', () => {
    expect(shallowEqualRecords({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('handles undefined values', () => {
    expect(shallowEqualRecords({ a: undefined }, { a: undefined })).toBe(true);
  });

  it('distinguishes undefined from missing key', () => {
    expect(shallowEqualRecords({ a: undefined }, {})).toBe(false);
  });
});
