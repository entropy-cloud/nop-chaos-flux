import { describe, expect, it } from 'vitest';
import {
  clampArrayIndex,
  clampInsertIndex,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  swapArrayValue,
} from './array.js';

describe('clampArrayIndex contract', () => {
  it('returns 0 for negative index', () => {
    expect(clampArrayIndex(-1, 3)).toBe(0);
    expect(clampArrayIndex(-100, 3)).toBe(0);
  });

  it('returns length-1 for index beyond bounds', () => {
    expect(clampArrayIndex(5, 3)).toBe(2);
    expect(clampArrayIndex(100, 3)).toBe(2);
  });

  it('returns exact index when in bounds', () => {
    expect(clampArrayIndex(0, 3)).toBe(0);
    expect(clampArrayIndex(1, 3)).toBe(1);
    expect(clampArrayIndex(2, 3)).toBe(2);
  });

  it('returns 0 for empty array regardless of index', () => {
    expect(clampArrayIndex(0, 0)).toBe(0);
    expect(clampArrayIndex(-1, 0)).toBe(0);
    expect(clampArrayIndex(5, 0)).toBe(0);
  });
});

describe('clampInsertIndex contract', () => {
  it('returns 0 for negative index', () => {
    expect(clampInsertIndex(-1, 3)).toBe(0);
  });

  it('returns length for index beyond bounds', () => {
    expect(clampInsertIndex(10, 3)).toBe(3);
  });

  it('returns exact index when in range', () => {
    expect(clampInsertIndex(0, 3)).toBe(0);
    expect(clampInsertIndex(3, 3)).toBe(3);
  });
});

describe('insertArrayValue contract', () => {
  it('inserts at beginning for negative index', () => {
    expect(insertArrayValue(['b', 'c'], -5, 'a')).toEqual(['a', 'b', 'c']);
  });

  it('appends for index beyond bounds', () => {
    expect(insertArrayValue(['a', 'b'], 10, 'c')).toEqual(['a', 'b', 'c']);
  });

  it('inserts into empty array', () => {
    expect(insertArrayValue([], 0, 'x')).toEqual(['x']);
  });

  it('does not mutate input', () => {
    const input = ['a'];
    insertArrayValue(input, 0, 'b');
    expect(input).toEqual(['a']);
  });
});

describe('removeArrayValue contract', () => {
  it('returns empty slice for empty array', () => {
    expect(removeArrayValue([], 0)).toEqual([]);
  });

  it('removes from single-element array', () => {
    expect(removeArrayValue(['only'], 0)).toEqual([]);
  });

  it('clamps negative index to 0', () => {
    expect(removeArrayValue(['a', 'b', 'c'], -1)).toEqual(['b', 'c']);
  });

  it('clamps out-of-bounds index to last', () => {
    expect(removeArrayValue(['a', 'b', 'c'], 10)).toEqual(['a', 'b']);
  });

  it('does not mutate input', () => {
    const input = ['a', 'b'];
    removeArrayValue(input, 0);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('moveArrayValue contract', () => {
  it('returns same-length slice for empty array', () => {
    expect(moveArrayValue([], 0, 1)).toEqual([]);
  });

  it('returns slice for single-element array', () => {
    expect(moveArrayValue(['x'], 0, 0)).toEqual(['x']);
  });

  it('moves element forward', () => {
    expect(moveArrayValue(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves element backward', () => {
    expect(moveArrayValue(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns equivalent when from equals clamped to', () => {
    const result = moveArrayValue(['a', 'b'], 0, 0);
    expect(result).toEqual(['a', 'b']);
  });

  it('clamps negative indices', () => {
    expect(moveArrayValue(['a', 'b', 'c'], -1, 2)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input', () => {
    const input = ['a', 'b', 'c'];
    moveArrayValue(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});

describe('swapArrayValue contract', () => {
  it('returns slice for empty array', () => {
    expect(swapArrayValue([], 0, 1)).toEqual([]);
  });

  it('returns slice for single-element array', () => {
    expect(swapArrayValue(['x'], 0, 0)).toEqual(['x']);
  });

  it('swaps two elements', () => {
    expect(swapArrayValue(['a', 'b', 'c'], 0, 2)).toEqual(['c', 'b', 'a']);
  });

  it('returns equivalent when indices clamp to same value', () => {
    const result = swapArrayValue(['a', 'b'], 0, 0);
    expect(result).toEqual(['a', 'b']);
  });

  it('clamps negative indices to 0', () => {
    expect(swapArrayValue(['a', 'b', 'c'], -1, 2)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate input', () => {
    const input = ['a', 'b'];
    swapArrayValue(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});
