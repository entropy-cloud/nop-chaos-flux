import { describe, expect, it } from 'vitest';
import {
  clampArrayIndex,
  clampInsertIndex,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  swapArrayValue
} from './array';

describe('array utils', () => {
  it('clamps insert indexes into the valid append range', () => {
    expect(clampInsertIndex(-1, 2)).toBe(0);
    expect(clampInsertIndex(1, 2)).toBe(1);
    expect(clampInsertIndex(5, 2)).toBe(2);
  });

  it('clamps array indexes into the existing item range', () => {
    expect(clampArrayIndex(-1, 3)).toBe(0);
    expect(clampArrayIndex(1, 3)).toBe(1);
    expect(clampArrayIndex(5, 3)).toBe(2);
    expect(clampArrayIndex(4, 0)).toBe(0);
  });

  it('inserts and removes array values without mutating the input', () => {
    const input = ['alpha', 'gamma'];

    expect(insertArrayValue(input, 1, 'beta')).toEqual(['alpha', 'beta', 'gamma']);
    expect(removeArrayValue(input, 1)).toEqual(['alpha']);
    expect(input).toEqual(['alpha', 'gamma']);
  });

  it('moves and swaps array values without mutating the input', () => {
    const input = ['alpha', 'beta', 'gamma'];

    expect(moveArrayValue(input, 0, 2)).toEqual(['beta', 'gamma', 'alpha']);
    expect(swapArrayValue(input, 0, 2)).toEqual(['gamma', 'beta', 'alpha']);
    expect(input).toEqual(['alpha', 'beta', 'gamma']);
  });
});
