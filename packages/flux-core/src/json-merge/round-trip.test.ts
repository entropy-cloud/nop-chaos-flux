import { describe, expect, it } from 'vitest';
import { diffToDelta } from './diff-delta.js';
import { mergeJson } from './merge-json.js';

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => deepEqual(item, right[index]));
  }
  if (!left || !right || typeof left !== 'object') return false;
  const leftKeys = Object.keys(left as Record<string, unknown>);
  const rightKeys = Object.keys(right as Record<string, unknown>);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) =>
    deepEqual(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
    ),
  );
}

const cases: Array<{ name: string; base: unknown; resolved: unknown }> = [
  { name: 'identical documents', base: { a: 1 }, resolved: { a: 1 } },
  {
    name: 'non-plain object (Date) treated as scalar leaf',
    base: { a: 1, when: { raw: 'placeholder' } },
    resolved: { a: 1, when: new Date('2026-01-01T00:00:00Z') },
  },
  { name: 'scalar change', base: { a: 1, b: 2 }, resolved: { a: 1, b: 3 } },
  { name: 'key added', base: { a: 1 }, resolved: { a: 1, b: { c: 2 } } },
  { name: 'key removed', base: { a: 1, b: 2 }, resolved: { a: 1 } },
  { name: 'key removed (nested object)', base: { a: 1, b: { c: 2 } }, resolved: { a: 1 } },
  { name: 'key set to null', base: { a: 1 }, resolved: { a: null } },
  { name: 'nested leaf change', base: { a: { b: { c: 1, d: 2 } } }, resolved: { a: { b: { c: 9 } } } },
  {
    name: 'container type change',
    base: { a: { x: 1 } },
    resolved: { a: [1, 2] },
  },
  {
    name: 'keyed array element changed',
    base: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    resolved: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B2' },
    ],
  },
  {
    name: 'keyed array reordered',
    base: [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 3 },
    ],
    resolved: [
      { id: 'c', v: 3 },
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ],
  },
  {
    name: 'keyed array element removed',
    base: [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 3 },
    ],
    resolved: [
      { id: 'a', v: 1 },
      { id: 'c', v: 3 },
    ],
  },
  {
    name: 'keyed array element appended',
    base: [{ id: 'a', v: 1 }],
    resolved: [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ],
  },
  {
    name: 'keyed array emptied',
    base: [{ id: 'a' }, { id: 'b' }],
    resolved: [],
  },
  {
    name: 'keyed array with change and removal together',
    base: [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ],
    resolved: [{ id: 'b', v: 9 }],
  },
  {
    name: 'unkeyed array changed',
    base: { list: [{ label: 'x' }, { label: 'y' }] },
    resolved: { list: [{ label: 'z' }] },
  },
  {
    name: 'nested keyed array inside a keyed element',
    base: { items: [{ id: 'a', tags: [{ code: 't1', v: 1 }] }] },
    resolved: { items: [{ id: 'a', tags: [{ code: 't1', v: 2 }] }] },
  },
  {
    name: 'nested unkeyed array inside a keyed element',
    base: { items: [{ id: 'a', labels: ['x', 'y'] }] },
    resolved: { items: [{ id: 'a', labels: ['x'] }] },
  },
  {
    name: 'keyed element gains a field',
    base: { items: [{ id: 'a', label: 'A' }] },
    resolved: { items: [{ id: 'a', label: 'A', extra: 1 }] },
  },
  {
    name: 'keyed element removed entirely',
    base: { items: [{ id: 'a' }, { id: 'b' }] },
    resolved: { items: [{ id: 'a' }] },
  },
  {
    name: 'identity by name',
    base: [{ name: 'a', v: 1 }],
    resolved: [{ name: 'a', v: 2 }],
  },
  {
    name: 'mixed deep change',
    base: {
      title: 'Old',
      cols: [
        { id: 'c1', label: 'One', w: 10 },
        { id: 'c2', label: 'Two', w: 20 },
      ],
      footer: { note: 'keep', stale: 'drop' },
    },
    resolved: {
      title: 'New',
      cols: [
        { id: 'c2', label: 'Two', w: 25 },
        { id: 'c1', label: 'One', w: 10 },
        { id: 'c3', label: 'Three', w: 30 },
      ],
      footer: { note: 'keep' },
    },
  },
];

describe('mergeJson / diffToDelta round-trip', () => {
  for (const testCase of cases) {
    it(`reconstructs resolved from base + delta: ${testCase.name}`, () => {
      const delta = diffToDelta(testCase.resolved, testCase.base).value;
      const merged = mergeJson(testCase.base, delta).value;
      expect(deepEqual(merged, testCase.resolved)).toBe(true);
    });
  }

  it('reconstructs under a custom identity key chain', () => {
    const options = { identityKeys: ['code', 'id', 'name'] } as const;
    const base = [{ code: 'C1', v: 1 }];
    const resolved = [{ code: 'C1', v: 2 }];
    const delta = diffToDelta(resolved, base, options).value;
    expect(deepEqual(mergeJson(base, delta, options).value, resolved)).toBe(true);
  });

  it('reconstructs under a custom override key', () => {
    const options = { markers: { override: 'x:override', virtual: 'x:virtual' } } as const;
    const base = { a: 1, b: { id: 'b1', v: 1 } };
    const resolved = { a: 2 };
    const delta = diffToDelta(resolved, base, options).value;
    expect(deepEqual(mergeJson(base, delta, options).value, resolved)).toBe(true);
  });

  it('leaves the base document untouched', () => {
    const base = { a: 1, items: [{ id: 'a', v: 1 }] };
    const snapshot = JSON.stringify(base);
    diffToDelta({ a: 2, items: [] }, base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});