/**
 * JsonTreePatch diff/apply 测试（S1 §7.1：forward/inverse 对称、move 折叠、指针转义）。
 */

import { describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { applyTreePatches, deepEqual, diffSchemaInput } from './tree-patch.js';
import type { JsonTreePatch } from './types.js';

function assertSymmetric(prev: SchemaInput, next: SchemaInput): void {
  const forward = diffSchemaInput(prev, next);
  expect(forward, 'structured change must produce patches').not.toBeNull();
  const applied = applyTreePatches(prev, forward as JsonTreePatch[]);
  expect(deepEqual(applied, next)).toBe(true);
  const inverse = diffSchemaInput(next, prev) as JsonTreePatch[];
  expect(deepEqual(applyTreePatches(applied, inverse), prev)).toBe(true);
}

describe('diffSchemaInput / applyTreePatches', () => {
  it('identical docs produce null', () => {
    const doc: SchemaInput = { type: 'page', body: [] };
    expect(diffSchemaInput(doc, JSON.parse(JSON.stringify(doc)))).toBeNull();
  });

  it('object key add/remove/replace patches', () => {
    assertSymmetric({ type: 'page', a: 1 }, { type: 'page', b: 2 });
    assertSymmetric({ type: 'page', nested: { deep: { x: 1 } } }, { type: 'page', nested: { deep: { x: 2, y: 3 } } });
  });

  it('array append/remove via prefix/suffix trimming', () => {
    assertSymmetric(
      { type: 'page', body: [{ type: 'a' }, { type: 'b' }] },
      { type: 'page', body: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] },
    );
    assertSymmetric(
      { type: 'page', body: [{ type: 'a' }, { type: 'b' }] },
      { type: 'page', body: [{ type: 'a' }] },
    );
    assertSymmetric(
      { type: 'page', body: [{ type: 'a' }, { type: 'mid' }, { type: 'z' }] },
      { type: 'page', body: [{ type: 'a' }, { type: 'new' }, { type: 'z' }] },
    );
  });

  it('single-element relocation folds into one move op (drag shape)', () => {
    const forward = diffSchemaInput(
      { type: 'page', body: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] },
      { type: 'page', body: [{ type: 'b' }, { type: 'a' }, { type: 'c' }] },
    ) as JsonTreePatch[];
    expect(forward.length).toBe(1);
    expect(forward[0].op).toBe('move');
    expect((forward[0] as Extract<JsonTreePatch, { op: 'move' }>).from).toBe('/body/1');
    expect((forward[0] as Extract<JsonTreePatch, { op: 'move' }>).path).toBe('/body/0');
    assertSymmetric(
      { type: 'page', body: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] },
      { type: 'page', body: [{ type: 'b' }, { type: 'a' }, { type: 'c' }] },
    );
  });

  it('shuffled arrays fall back to remove+add and stay symmetric', () => {
    assertSymmetric(
      { type: 'page', body: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }] },
      { type: 'page', body: [{ n: 4 }, { n: 2 }, { n: 1 }, { n: 3 }] },
    );
  });

  it('escapes JSON pointer tokens (~ and /) in keys', () => {
    assertSymmetric(
      { type: 'page', 'a~b': { 'c/d': 1 } },
      { type: 'page', 'a~b': { 'c/d': 2 } },
    );
  });

  it('root replace (object ↔ array form) applies wholesale', () => {
    assertSymmetric({ type: 'page', body: [] }, [{ type: 'page', body: [] }]);
  });

  it('root scalar replace is applied directly', () => {
    const forward = diffSchemaInput(1 as unknown as SchemaInput, 2 as unknown as SchemaInput) as JsonTreePatch[];
    expect(forward).toEqual([{ op: 'replace', path: '', value: 2 }]);
    expect(applyTreePatches(1 as unknown as SchemaInput, forward)).toBe(2);
  });

  it('apply throws on invalid paths (editor-core catches downstream)', () => {
    expect(() => applyTreePatches({ type: 'page' }, [{ op: 'remove', path: '/nope/x' }])).toThrow();
    expect(() => applyTreePatches({ type: 'page' }, [{ op: 'replace', path: '' }, { op: 'remove', path: '' }])).toThrow();
  });

  it('move applies per RFC6902 order (remove before re-insert)', () => {
    const doc = { type: 'page', body: [{ n: 1 }, { n: 2 }, { n: 3 }] };
    const next = applyTreePatches(doc, [{ op: 'move', from: '/body/2', path: '/body/0' }]);
    expect((next as Record<string, unknown>).body).toEqual([{ n: 3 }, { n: 1 }, { n: 2 }]);
  });

  it('fuzz: randomized nested docs stay forward/inverse symmetric', () => {
    let seed = 20260926;
    const rand = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const randomPrimitive = (): unknown => {
      const pick = Math.floor(rand() * 4);
      return pick === 0 ? rand() : pick === 1 ? `s${Math.floor(rand() * 100)}` : pick === 2 && true;
    };
    const randomValue = (depth: number): unknown => {
      if (depth <= 0 || rand() < 0.3) return randomPrimitive();
      if (rand() < 0.5) {
        return Array.from({ length: Math.floor(rand() * 4) }, () => randomValue(depth - 1));
      }
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < Math.floor(rand() * 4) + 1; i += 1) {
        obj[`k${Math.floor(rand() * 6)}`] = randomValue(depth - 1);
      }
      return obj;
    };
    for (let round = 0; round < 200; round += 1) {
      const prev = { type: 'page', payload: randomValue(4) } as unknown as SchemaInput;
      const next = { type: 'page', payload: randomValue(4) } as unknown as SchemaInput;
      const forward = diffSchemaInput(prev, next) as JsonTreePatch[] | null;
      const applied = applyTreePatches(prev, forward ?? []);
      expect(deepEqual(applied, next), `round ${round}`).toBe(true);
      const inverse = diffSchemaInput(next, prev) as JsonTreePatch[] | null;
      expect(deepEqual(applyTreePatches(applied, inverse ?? []), prev), `round ${round} inverse`).toBe(true);
    }
  });
});
