/**
 * Shared pagination page-window math ([G3-视角10-01] bounded convergence: the
 * standalone pagination renderer and the table pagination bar must render the
 * same window shape instead of two divergent algorithms; the crud list footer
 * keeps its first/prev/page-of/next/last shape but shares the disabled-state
 * mechanism via the ui pagination primitives).
 */

export function buildPageWindow(current: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages <= 0) {
    return [1];
  }
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = current - half;
  let end = current + half;
  if (start < 1) {
    start = 1;
    end = Math.min(totalPages, windowSize);
  }
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - windowSize + 1);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  return pages;
}

export function shouldShowLeadingEllipsis(pages: number[]): boolean {
  return pages.length > 0 && pages[0]! > 2;
}

export function shouldShowTrailingEllipsis(pages: number[], totalPages: number): boolean {
  return pages.length > 0 && pages[pages.length - 1]! < totalPages - 1;
}

export function shouldShowFirstPage(pages: number[]): boolean {
  return pages.length > 0 && pages[0]! > 1;
}

export function shouldShowLastPage(pages: number[], totalPages: number): boolean {
  return pages.length > 0 && pages[pages.length - 1]! < totalPages;
}
