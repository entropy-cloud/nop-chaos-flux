import { describe, it, expect } from 'vitest';
import { computeWindowRange } from '../table-renderer/table-pagination-bar';

describe('computeWindowRange', () => {
  it('returns [1, 0] for 0 pages', () => {
    expect(computeWindowRange(1, 0)).toEqual([1, 0]);
  });

  it('returns [1, 1] for 1 page', () => {
    expect(computeWindowRange(1, 1)).toEqual([1, 1]);
  });

  it('returns [1, 2] for 2 pages', () => {
    expect(computeWindowRange(1, 2)).toEqual([1, 2]);
    expect(computeWindowRange(2, 2)).toEqual([1, 2]);
  });

  it('returns [1, n] for totalPages <= 7 (show all)', () => {
    expect(computeWindowRange(1, 3)).toEqual([1, 3]);
    expect(computeWindowRange(2, 5)).toEqual([1, 5]);
    expect(computeWindowRange(4, 7)).toEqual([1, 7]);
  });

  it('window always contains currentPage', () => {
    for (let tp = 8; tp <= 30; tp += 7) {
      for (let cp = 1; cp <= tp; cp++) {
        const [s, e] = computeWindowRange(cp, tp);
        expect(s).toBeLessThanOrEqual(cp);
        expect(e).toBeGreaterThanOrEqual(cp);
      }
    }
  });

  it('window never produces duplicates with first/last page', () => {
    const tp = 20;
    for (let cp = 1; cp <= tp; cp++) {
      const [s, e] = computeWindowRange(cp, tp);
      if (s === 1 || e === tp) continue;
      expect(s).toBeGreaterThan(1);
      expect(e).toBeLessThan(tp);
    }
  });

  it('page 1 of 20: window is [1, 3]', () => {
    expect(computeWindowRange(1, 20)).toEqual([1, 3]);
  });

  it('page 2 of 20: window is [1, 3]', () => {
    expect(computeWindowRange(2, 20)).toEqual([1, 3]);
  });

  it('page 3 of 20: window is [2, 4]', () => {
    expect(computeWindowRange(3, 20)).toEqual([2, 4]);
  });

  it('page 10 of 20: window is [9, 11]', () => {
    expect(computeWindowRange(10, 20)).toEqual([9, 11]);
  });

  it('page 19 of 20: window is [18, 20]', () => {
    expect(computeWindowRange(19, 20)).toEqual([18, 20]);
  });

  it('page 20 of 20: window is [18, 20]', () => {
    expect(computeWindowRange(20, 20)).toEqual([18, 20]);
  });

  it('page 1 of 8: window is [1, 3]', () => {
    expect(computeWindowRange(1, 8)).toEqual([1, 3]);
  });

  it('page 8 of 8: window is [6, 8]', () => {
    expect(computeWindowRange(8, 8)).toEqual([6, 8]);
  });
});
