import { describe, expect, it } from 'vitest';
import { createScopeStore } from '../scope.js';

describe('sanitizeSnapshot security guards', () => {
  it('preserves undefined in initial data', () => {
    const store = createScopeStore({ a: undefined } as any);
    expect(store.getSnapshot().a).toBeUndefined();
  });

  it('preserves NaN in safe flat data', () => {
    const store = createScopeStore({ a: NaN } as any);
    expect(store.getSnapshot().a).toBeNaN();
  });

  it('preserves Infinity in safe flat data', () => {
    const store = createScopeStore({ a: Infinity, b: -Infinity } as any);
    expect(store.getSnapshot().a).toBe(Infinity);
    expect(store.getSnapshot().b).toBe(-Infinity);
  });

  it('preserves regular numbers and strings', () => {
    const store = createScopeStore({ num: 42, str: 'hello', bool: true });
    const snap = store.getSnapshot();
    expect(snap.num).toBe(42);
    expect(snap.str).toBe('hello');
    expect(snap.bool).toBe(true);
  });

  it('removes constructor key when present as dangerous own property', () => {
    const store = createScopeStore({ constructor: { prototype: {} }, safe: 2 } as any);
    const snap = store.getSnapshot();
    expect(Object.prototype.hasOwnProperty.call(snap, 'constructor')).toBe(false);
    expect(snap.safe).toBe(2);
  });

  it('removes prototype key when present as dangerous own property', () => {
    const store = createScopeStore({ prototype: { pollute: true }, safe: 3 } as any);
    const snap = store.getSnapshot();
    expect(Object.prototype.hasOwnProperty.call(snap, 'prototype')).toBe(false);
    expect(snap.safe).toBe(3);
  });

  it('sanitizes NaN and Infinity at primitive level when dangerous key present', () => {
    const store = createScopeStore({ constructor: null, a: NaN, b: Infinity } as any);
    const snap = store.getSnapshot();
    expect(snap.a).toBeNull();
    expect(snap.b).toBeNull();
  });

  it('sanitizes Date to ISO string at top level when dangerous key present', () => {
    const store = createScopeStore({ constructor: null, date: new Date('2025-06-01T12:00:00Z') } as any);
    expect(store.getSnapshot().date).toBe('2025-06-01T12:00:00.000Z');
  });

  it('sanitizes Map to plain object at top level when dangerous key present', () => {
    const store = createScopeStore({ constructor: null, map: new Map([['x', 1]]) } as any);
    expect(store.getSnapshot().map).toEqual({ x: 1 });
  });

  it('sanitizes Set to array at top level when dangerous key present', () => {
    const store = createScopeStore({ constructor: null, set: new Set([10, 20]) } as any);
    expect(store.getSnapshot().set).toEqual([10, 20]);
  });
});
