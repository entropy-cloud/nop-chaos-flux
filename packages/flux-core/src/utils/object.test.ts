import { describe, expect, it } from 'vitest';
import { cloneDeep } from './object.js';
import { isPlainObject, shallowEqual } from '../index.js';

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

describe('cloneDeep (cq-2)', () => {
  it('deep-copies nested plain data without sharing references', () => {
    const input = { a: { b: [1, 2, { c: 'd' }] }, e: 'f' };
    const output = cloneDeep(input);
    expect(output).toEqual(input);
    expect(output).not.toBe(input);
    expect(output.a).not.toBe(input.a);
    expect(output.a.b[2]).not.toBe(input.a.b[2]);
  });

  it('declares the structuredClone input domain: Date preserved, functions rejected, undefined props dropped', () => {
    expect(() => cloneDeep({ fn: () => 1 })).toThrow();
    const withDate = cloneDeep({ at: new Date(0) });
    expect(withDate.at).toBeInstanceOf(Date);
    const source: Record<string, unknown> = { x: 1 };
    source.y = undefined;
    expect(cloneDeep(source).y).toBeUndefined();
  });
});
