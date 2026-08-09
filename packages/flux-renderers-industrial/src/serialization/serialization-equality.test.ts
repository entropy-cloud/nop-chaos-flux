import { describe, it, expect } from 'vitest';
import { deepEqual } from './equality.js';

// plan 2026-08-06-0900-1 Phase 1（open-audit P2-2 + multi-audit P2-9-deepEqual）：
// `deepEqual` 判等正确性 + 深嵌套 fail-closed。failing-first：修复前 (a) array↔object 混同返 true；
// (b2) 超深嵌套抛 stack overflow（无 depth 上限）。修复后两类断言转绿。
describe('deepEqual array/object 形态分歧（open-audit P2-2，plan 2026-08-06-0900-1）', () => {
  it('数组与 array-shaped 对象不再混同（deepEqual([1,2],{0:1,1:2})===false）', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('合法数组判等不回归（同序同值 → true；异序 → false）', () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual([2, 1], [1, 2])).toBe(false);
  });

  it('合法对象判等不回归（key 序不影响 → true；内容不同 → false）', () => {
    expect(deepEqual({ 0: 1, 1: 2 }, { 0: 1, 1: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('deepEqual 深嵌套 fail-closed（multi-audit P2-9-deepEqual，plan 2026-08-06-0900-1）', () => {
  const buildDeep = (depth: number): unknown => {
    let node: unknown = { value: 'leaf' };
    for (let i = 0; i < depth; i++) {
      node = { a: node };
    }
    return node;
  };

  it('cap 内（~50 层）相同结构判等 → true', () => {
    const a = buildDeep(50);
    const b = buildDeep(50);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('超 cap（~10k 层）不抛 stack overflow 且返 false（fail-closed）', () => {
    const a = buildDeep(10_000);
    const b = buildDeep(10_000);
    // 两个独立引用 → 触发递归（不因 a===b 短路）。修复前：抛 RangeError stack overflow；修复后：返 false。
    expect(() => deepEqual(a, b)).not.toThrow();
    expect(deepEqual(a, b)).toBe(false);
  });

  it('超 cap（~10k 层）结构不同同样不抛且返 false', () => {
    const a = buildDeep(10_000);
    let b: unknown = { value: 'different-leaf' };
    for (let i = 0; i < 10_000; i++) {
      b = { a: b };
    }
    expect(() => deepEqual(a, b)).not.toThrow();
    expect(deepEqual(a, b)).toBe(false);
  });
});
