import { describe, expect, it } from 'vitest';
import { diffToDelta } from './diff-delta.js';

describe('diffToDelta — scalars and objects', () => {
  it('returns undefined when nothing changed', () => {
    expect(diffToDelta({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }).value).toBeUndefined();
  });

  it('emits only the changed leaf', () => {
    expect(diffToDelta({ a: 1, b: 2, c: 3 }, { a: 1, b: 9, c: 3 }).value).toEqual({ b: 2 });
  });

  it('emits an added key in full', () => {
    expect(diffToDelta({ a: 1, b: 2 }, { a: 1 }).value).toEqual({ b: 2 });
  });

  it('emits a remove marker for a dropped key', () => {
    expect(diffToDelta({ a: 1 }, { a: 1, b: 2 }).value).toEqual({
      b: { 'xui:override': 'remove' },
    });
  });

  it('emits a remove marker for a dropped keyed object', () => {
    expect(diffToDelta({ a: 1 }, { a: 1, b: { id: 'b1' } }).value).toEqual({
      b: { id: 'b1', 'xui:override': 'remove' },
    });
  });

  it('descends into nested objects', () => {
    expect(diffToDelta({ a: { b: { c: 1, d: 2 } } }, { a: { b: { c: 9, d: 2 } } }).value).toEqual({
      a: { b: { c: 1 } },
    });
  });

  it('omits an unchanged subtree entirely', () => {
    const base = { keep: { deep: { x: 1 } }, change: 1 };
    const resolved = { keep: { deep: { x: 1 } }, change: 2 };
    expect(diffToDelta(resolved, base).value).toEqual({ change: 2 });
  });

  it('records a whole-value delta when the container type changed', () => {
    expect(diffToDelta({ a: [1, 2] }, { a: { x: 1 } }).value).toEqual({ a: [1, 2] });
  });
});

describe('diffToDelta — identity-keyed arrays', () => {
  const base = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];

  it('emits the full list with only the changed element differing', () => {
    const resolved = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B2' },
    ];
    expect(diffToDelta(resolved, base).value).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B2' },
    ]);
  });

  it('returns undefined when the keyed list is unchanged', () => {
    expect(diffToDelta(base, base).value).toBeUndefined();
  });

  it('emits the full resolved list when the order changed', () => {
    const resolved = [base[1], base[0]];
    expect(diffToDelta(resolved, base).value).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ]);
  });

  it('appends a remove marker for a dropped element', () => {
    const resolved = [base[0]];
    expect(diffToDelta(resolved, base).value).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', 'xui:override': 'remove' },
    ]);
  });

  it('emits the whole list when an element was inserted', () => {
    const resolved = [...base, { id: 'c', label: 'C' }];
    const delta = diffToDelta(resolved, base).value as unknown[];
    expect(delta).toHaveLength(3);
    expect(delta[2]).toEqual({ id: 'c', label: 'C' });
  });

  it('returns undefined when the resolved list is empty and base is too', () => {
    expect(diffToDelta([], []).value).toBeUndefined();
  });

  it('emits only remove markers when the resolved list became empty', () => {
    expect(diffToDelta([], base).value).toEqual([
      { id: 'a', 'xui:override': 'remove' },
      { id: 'b', 'xui:override': 'remove' },
    ]);
  });
});

describe('diffToDelta — arrays without identity', () => {
  it('replaces the whole list when it changed', () => {
    const base = { list: [{ label: 'x' }, { label: 'y' }] };
    const resolved = { list: [{ label: 'z' }] };
    expect(diffToDelta(resolved, base).value).toEqual({ list: [{ label: 'z' }] });
  });

  it('returns undefined for an unchanged unkeyed list', () => {
    const list = [{ label: 'x' }, { label: 'y' }];
    expect(diffToDelta({ list }, { list }).value).toBeUndefined();
  });
});

describe('diffToDelta — symmetry with mergeJson', () => {
  it('uses the configured override key for remove markers', () => {
    const options = { markers: { override: 'x:override', virtual: 'x:virtual' } } as const;
    expect(diffToDelta({ a: 1 }, { a: 1, b: 2 }, options).value).toEqual({
      b: { 'x:override': 'remove' },
    });
  });

  it('honours a custom identity key chain', () => {
    const options = { identityKeys: ['code', 'id', 'name'] } as const;
    const base = [{ code: 'C1', v: 1 }];
    const resolved = [{ code: 'C1', v: 2 }];
    expect(diffToDelta(resolved, base, options).value).toEqual([{ code: 'C1', v: 2 }]);
  });
});