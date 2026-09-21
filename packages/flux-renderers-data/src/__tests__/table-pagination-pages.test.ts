import { describe, it, expect } from 'vitest';
import {
  buildPageWindow,
  shouldShowFirstPage,
  shouldShowLastPage,
  shouldShowLeadingEllipsis,
  shouldShowTrailingEllipsis,
} from '../pagination-window.js';

/**
 * [G3-视角10-01] unified pagination window contract. Supersedes the former
 * `computeWindowRange` spec (table-pagination-bar's private [start, end]
 * algorithm): the bar now renders the SAME window shape as the standalone
 * pagination renderer via the shared `buildPageWindow`, so this suite pins the
 * unified behavior with equivalent coverage (show-all threshold, containment,
 * no duplicate with first/last, boundary windows).
 */
describe('buildPageWindow (unified pagination window)', () => {
  it('returns [1] for 0 pages', () => {
    expect(buildPageWindow(1, 0)).toEqual([1]);
  });

  it('returns [1] for 1 page', () => {
    expect(buildPageWindow(1, 1)).toEqual([1]);
  });

  it('returns [1, 2] for 2 pages', () => {
    expect(buildPageWindow(1, 2)).toEqual([1, 2]);
    expect(buildPageWindow(2, 2)).toEqual([1, 2]);
  });

  it('returns all pages for totalPages <= windowSize + 2 (show all)', () => {
    expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(buildPageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('window always contains currentPage', () => {
    for (let tp = 8; tp <= 30; tp += 7) {
      for (let cp = 1; cp <= tp; cp++) {
        const pages = buildPageWindow(cp, tp);
        expect(pages).toContain(cp);
      }
    }
  });

  it('window never duplicates the first/last page', () => {
    const tp = 20;
    for (let cp = 1; cp <= tp; cp++) {
      const pages = buildPageWindow(cp, tp);
      expect(new Set(pages).size).toBe(pages.length);
      if (shouldShowFirstPage(pages)) {
        expect(pages).not.toContain(1);
      }
      if (shouldShowLastPage(pages, tp)) {
        expect(pages).not.toContain(tp);
      }
    }
  });

  it('page 1 of 20: window is [1..5], no leading ellipsis, first page hidden', () => {
    expect(buildPageWindow(1, 20)).toEqual([1, 2, 3, 4, 5]);
    expect(shouldShowFirstPage(buildPageWindow(1, 20))).toBe(false);
    expect(shouldShowLeadingEllipsis(buildPageWindow(1, 20))).toBe(false);
    expect(shouldShowLastPage(buildPageWindow(1, 20), 20)).toBe(true);
    expect(shouldShowTrailingEllipsis(buildPageWindow(1, 20), 20)).toBe(true);
  });

  it('page 3 of 20: window is [1..5] (clamped start)', () => {
    expect(buildPageWindow(3, 20)).toEqual([1, 2, 3, 4, 5]);
  });

  it('page 10 of 20: window is [8..12] with first/last + both ellipses', () => {
    const pages = buildPageWindow(10, 20);
    expect(pages).toEqual([8, 9, 10, 11, 12]);
    expect(shouldShowFirstPage(pages)).toBe(true);
    expect(shouldShowLeadingEllipsis(pages)).toBe(true);
    expect(shouldShowTrailingEllipsis(pages, 20)).toBe(true);
    expect(shouldShowLastPage(pages, 20)).toBe(true);
  });

  it('page 20 of 20: window is [16..20], trailing ellipsis hidden, last hidden', () => {
    const pages = buildPageWindow(20, 20);
    expect(pages).toEqual([16, 17, 18, 19, 20]);
    expect(shouldShowFirstPage(pages)).toBe(true);
    expect(shouldShowLeadingEllipsis(pages)).toBe(true);
    expect(shouldShowTrailingEllipsis(pages, 20)).toBe(false);
    expect(shouldShowLastPage(pages, 20)).toBe(false);
  });
});
