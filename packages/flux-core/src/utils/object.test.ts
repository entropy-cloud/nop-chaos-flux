import { describe, expect, it } from 'vitest';
import { isPlainObject, shallowEqual } from '../index';

describe('object utils', () => {
  it('detects plain objects but not arrays or null', () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([1, 2, 3])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
  });

  it('compares arrays shallowly', () => {
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowEqual([1, 2], [2, 1])).toBe(false);
  });

  it('compares objects shallowly by keys and values', () => {
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: { deep: true } }, { a: { deep: true } })).toBe(false);
  });
});
