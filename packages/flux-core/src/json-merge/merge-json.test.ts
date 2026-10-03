import { describe, expect, it } from 'vitest';
import { mergeJson } from './merge-json.js';

describe('mergeJson — scalars and shape transitions', () => {
  it('lets delta win for scalars', () => {
    expect(mergeJson({ a: 1 }, { a: 2 }).value).toEqual({ a: 2 });
  });

  it('keeps base entries the delta does not mention', () => {
    expect(mergeJson({ a: 1, b: 2 }, { a: 9 }).value).toEqual({ a: 9, b: 2 });
  });

  it('adds keys absent from base', () => {
    expect(mergeJson({ a: 1 }, { b: 2 }).value).toEqual({ a: 1, b: 2 });
  });

  it('erases a value when delta is null', () => {
    expect(mergeJson({ a: 1 }, { a: null }).value).toEqual({ a: null });
  });

  it('replaces the whole subtree on a container type change', () => {
    expect(mergeJson({ a: { x: 1 } }, { a: [1, 2] }).value).toEqual({ a: [1, 2] });
    expect(mergeJson({ a: [1, 2] }, { a: { x: 1 } }).value).toEqual({ a: { x: 1 } });
  });

  it('treats non-plain objects (Date / class instance) as scalars — delta wins', () => {
    // Failure Paths「非 plain object 输入」：isPlainObject 结构判定下
    // Date/类实例不进入递归合并，按标量被 delta 覆盖（plan 526 评审 Major-1 修正）
    const when = new Date('2026-01-01T00:00:00Z');
    expect(mergeJson({ a: 1, when: {} }, { when }).value).toEqual({ a: 1, when });

    class Ref {
      constructor(public id: string) {}
    }
    const ref = new Ref('r1');
    expect(mergeJson({ ref: { nested: true } }, { ref }).value).toEqual({ ref });
  });

  it('returns the delta unchanged for a non-record base', () => {
    expect(mergeJson(5, { a: 1 }).value).toEqual({ a: 1 });
  });
});

describe('mergeJson — nested objects', () => {
  it('merges recursively without dropping sibling branches', () => {
    const base = { a: { b: { c: 1, d: 2 }, e: 3 } };
    const delta = { a: { b: { c: 9 } } };
    expect(mergeJson(base, delta).value).toEqual({ a: { b: { c: 9, d: 2 }, e: 3 } });
  });

  it('does not mutate or share references with its inputs', () => {
    const base = { a: { b: 1 }, list: [{ id: 'x', v: 1 }] };
    const delta = { a: { b: 2 }, list: [{ id: 'x', v: 2 }] };
    const merged = mergeJson(base, delta).value as Record<string, unknown>;
    expect(merged).not.toBe(base);
    expect(merged.a).not.toBe(base.a);
    expect(merged.list).not.toBe(base.list);
    expect(base).toEqual({ a: { b: 1 }, list: [{ id: 'x', v: 1 }] });
  });
});

describe('mergeJson — identity-keyed arrays', () => {
  it('merges array elements matched by id', () => {
    const base = [
      { id: 'a', label: 'A', extra: 1 },
      { id: 'b', label: 'B' },
    ];
    const delta = [{ id: 'b', label: 'B2' }];
    expect(mergeJson(base, delta).value).toEqual([
      { id: 'a', label: 'A', extra: 1 },
      { id: 'b', label: 'B2' },
    ]);
  });

  it('matches elements by name when id is absent', () => {
    const base = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
    ];
    expect(mergeJson(base, [{ name: 'a', label: 'A2' }]).value).toEqual([
      { name: 'a', label: 'A2' },
      { name: 'b', label: 'B' },
    ]);
  });

  it('inserts new delta elements after their anchor', () => {
    const base = [{ id: 'a' }, { id: 'b' }];
    const delta = [{ id: 'b' }, { id: 'c' }];
    expect(mergeJson(base, delta).value).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('applies delta ordering when delta reorders matched elements', () => {
    const base = [{ id: 'a' }, { id: 'b' }];
    expect(mergeJson(base, [{ id: 'b' }, { id: 'a' }]).value).toEqual([{ id: 'b' }, { id: 'a' }]);
  });

  it('merges a single keyed object into an array base', () => {
    const base = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    expect(mergeJson(base, { id: 'a', v: 9 }).value).toEqual([{ id: 'a', v: 9 }, { id: 'b', v: 2 }]);
  });

  it('replaces the list and reports a diagnostic when base is not fully keyed', () => {
    const base = [{ label: 'a' }, { id: 'b' }];
    const result = mergeJson(base, [{ id: 'c' }]);
    expect(result.value).toEqual([{ id: 'c' }]);
    expect(result.diagnostics).toEqual([
      { code: 'list-not-keyed', path: '', listKind: 'some' },
    ]);
  });

  it('reports the list path for a nested unkeyed list', () => {
    const result = mergeJson({ cfg: { items: [{ label: 'x' }] } }, { cfg: { items: [] } });
    expect(result.value).toEqual({ cfg: { items: [] } });
    expect(result.diagnostics.map((d) => d.code)).toEqual([]);
  });

  it('reports duplicate base identities and keeps the first match', () => {
    const base = [
      { id: 'a', v: 1 },
      { id: 'a', v: 2 },
    ];
    const result = mergeJson(base, [{ id: 'a', v: 9 }]);
    expect(result.value).toEqual([
      { id: 'a', v: 9 },
      { id: 'a', v: 2 },
    ]);
    expect(result.diagnostics).toEqual([
      { code: 'duplicate-identity', path: '', listKind: 'all', identityKey: 'id', identityValue: 'a' },
    ]);
  });

  it('appends delta entries when no delta element carries identity', () => {
    const base = [{ id: 'a' }, { id: 'b' }];
    expect(mergeJson(base, [{ label: 'x' }]).value).toEqual([
      { id: 'a' },
      { id: 'b' },
      { label: 'x' },
    ]);
  });

  it('honours a custom identity key chain for array matching', () => {
    const base = [{ code: 'C1', v: 1 }];
    const delta = [{ code: 'C1', v: 2 }];
    const options = { identityKeys: ['code', 'id', 'name'] } as const;
    expect(mergeJson(base, delta, options).value).toEqual([{ code: 'C1', v: 2 }]);
  });

  it('returns the delta list for an empty base array', () => {
    expect(mergeJson([], [{ id: 'a' }]).value).toEqual([{ id: 'a' }]);
  });
});

describe('mergeJson — control markers', () => {
  it('deletes a key marked with the remove marker', () => {
    const result = mergeJson({ a: 1, b: 2 }, { b: { 'xui:override': 'remove' } });
    expect(result.value).toEqual({ a: 1 });
  });

  it('removes a matched array element marked with the remove marker', () => {
    const base = [{ id: 'a' }, { id: 'b' }];
    const delta = [{ id: 'a', 'xui:override': 'remove' }];
    expect(mergeJson(base, delta).value).toEqual([{ id: 'b' }]);
  });

  it('replaces a subtree and strips the marker from the output', () => {
    const result = mergeJson({ a: { x: 1, y: 2 } }, { a: { 'xui:override': 'replace', z: 3 } });
    expect(result.value).toEqual({ a: { z: 3 } });
  });

  it('never leaks control marker keys into the output', () => {
    const base = { a: { 'xui:virtual': false, keep: 1 } };
    const delta = { a: { 'xui:override': 'merge', other: 2 } };
    expect(mergeJson(base, delta).value).toEqual({ a: { keep: 1, other: 2 } });
  });

  it('skips a new delta element marked virtual', () => {
    const base = [{ id: 'a' }];
    const delta = [{ id: 'probe', 'xui:virtual': true }, { id: 'b' }];
    expect(mergeJson(base, delta).value).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('merges a virtual delta element that matches a base element', () => {
    const base = [{ id: 'a', v: 1 }];
    const delta = [{ id: 'a', 'xui:virtual': true, v: 2 }];
    expect(mergeJson(base, delta).value).toEqual([{ id: 'a', v: 2 }]);
  });

  it('supports a configurable override key', () => {
    const options = { markers: { override: 'x:override', virtual: 'x:virtual' } } as const;
    const result = mergeJson({ a: 1, b: 2 }, { b: { 'x:override': 'remove' } }, options);
    expect(result.value).toEqual({ a: 1 });
  });

  it('replaces the whole value for a forced-override key', () => {
    const options = { forceOverridePrefix: '!' } as const;
    expect(mergeJson({ a: { x: 1, y: 2 } }, { '!a': { x: 9 } }, options).value).toEqual({
      a: { x: 9 },
    });
  });

  it('treats an empty delta array as an explicit empty list', () => {
    expect(mergeJson({ list: [{ id: 'a' }] }, { list: [] }).value).toEqual({ list: [] });
  });
});

describe('mergeJson — root handling', () => {
  it('returns undefined when the whole root is removed', () => {
    expect(mergeJson({ a: 1 }, { 'xui:override': 'remove' }).value).toBeUndefined();
  });

  it('treats an undefined delta as no change', () => {
    expect(mergeJson({ a: 1 }, undefined).value).toEqual({ a: 1 });
  });
});