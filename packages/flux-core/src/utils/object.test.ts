import { describe, expect, it } from 'vitest';
import { cloneDeep, deepEqual } from './object.js';
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

describe('deepEqual (CX-6 eight-pin grid, replicated from flux-react characterization)', () => {
  it('pin 1 cyclic pair compares equal (WeakMap visited pairing)', () => {
    const left: Record<string, unknown> = { name: 'a' };
    left.self = left;
    const right: Record<string, unknown> = { name: 'a' };
    right.self = right;

    expect(deepEqual(left, right)).toBe(true);
  });

  it('pin 2 DAG shared reference compares equal', () => {
    const shared = { v: 1 };

    expect(deepEqual({ x: shared, y: shared }, { x: { v: 1 }, y: { v: 1 } })).toBe(true);
  });

  it('pin 3 inherited key on the right satisfies `key in` membership: equal', () => {
    const right: Record<string, unknown> = Object.assign(Object.create({ a: 1 }), { z: 5 });

    expect(deepEqual({ a: 1 }, right)).toBe(true);
  });

  it('pin 4 zero-own-key branded objects: Date(1) equals Date(2) (quirk, do not fix)', () => {
    expect(deepEqual(new Date(1), new Date(2))).toBe(true);
  });

  it('pin 5 {a: undefined} vs {}: not equal (undefined-valued key counts in key length)', () => {
    expect(deepEqual({ a: undefined }, {})).toBe(false);
  });

  it('pin 6 NaN pair compares equal (Object.is)', () => {
    expect(deepEqual({ v: NaN }, { v: NaN })).toBe(true);
  });

  it('pin 7 +0 vs -0: not equal (Object.is)', () => {
    expect(deepEqual({ v: 0 }, { v: -0 })).toBe(false);
  });

  it('pin 8 distinct function values: not equal (not same reference)', () => {
    expect(deepEqual({ fn: () => 1 }, { fn: () => 1 })).toBe(false);
  });
});
