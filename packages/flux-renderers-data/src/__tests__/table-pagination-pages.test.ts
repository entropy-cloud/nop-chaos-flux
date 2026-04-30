import { describe, it, expect } from 'vitest';
import { computePaginationPages } from '../table-renderer/table-pagination-bar';

describe('computePaginationPages', () => {
  it('returns all pages when totalPages <= 7', () => {
    expect(computePaginationPages(1, 1)).toEqual([1]);
    expect(computePaginationPages(1, 3)).toEqual([1, 2, 3]);
    expect(computePaginationPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('never produces duplicate page numbers', () => {
    const totalPages = 20;
    for (let page = 1; page <= totalPages; page++) {
      const pages = computePaginationPages(page, totalPages);
      const unique = [...new Set(pages)];
      expect(pages).toEqual(unique);
    }
  });

  it('always includes page 1 and last page', () => {
    const totalPages = 100;
    for (let page = 1; page <= totalPages; page++) {
      const pages = computePaginationPages(page, totalPages);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(totalPages);
    }
  });

  it('always includes current page', () => {
    const totalPages = 50;
    for (let page = 1; page <= totalPages; page++) {
      const pages = computePaginationPages(page, totalPages);
      expect(pages).toContain(page);
    }
  });

  it('produces sorted ascending pages', () => {
    const totalPages = 30;
    for (let page = 1; page <= totalPages; page++) {
      const pages = computePaginationPages(page, totalPages);
      for (let i = 1; i < pages.length; i++) {
        expect(pages[i]).toBeGreaterThan(pages[i - 1]);
      }
    }
  });

  it('shows [1, 2, 3, 20] for page 1 of 20', () => {
    expect(computePaginationPages(1, 20)).toEqual([1, 2, 3, 20]);
  });

  it('shows [1, 19, 20] for page 20 of 20', () => {
    expect(computePaginationPages(20, 20)).toEqual([1, 19, 20]);
  });

  it('shows [1, 2, 3, 20] for page 2 of 20', () => {
    expect(computePaginationPages(2, 20)).toEqual([1, 2, 3, 20]);
  });

  it('shows [1, 2, 3, 4, 20] for page 3 of 20', () => {
    expect(computePaginationPages(3, 20)).toEqual([1, 2, 3, 4, 20]);
  });

  it('shows [1, 9, 10, 11, 20] for page 10 of 20', () => {
    expect(computePaginationPages(10, 20)).toEqual([1, 9, 10, 11, 20]);
  });

  it('shows [1, 18, 19, 20] for page 19 of 20', () => {
    expect(computePaginationPages(19, 20)).toEqual([1, 18, 19, 20]);
  });

  it('handles edge case: 8 pages (just above threshold)', () => {
    expect(computePaginationPages(1, 8)).toEqual([1, 2, 3, 8]);
    expect(computePaginationPages(4, 8)).toEqual([1, 3, 4, 5, 8]);
    expect(computePaginationPages(8, 8)).toEqual([1, 7, 8]);
  });

  it('handles single page', () => {
    expect(computePaginationPages(1, 1)).toEqual([1]);
  });

  it('handles 2 pages', () => {
    expect(computePaginationPages(1, 2)).toEqual([1, 2]);
    expect(computePaginationPages(2, 2)).toEqual([1, 2]);
  });
});
