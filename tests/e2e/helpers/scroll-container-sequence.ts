// Scroll-container interaction-sequence helpers (plan 545 Phase 3, IS-2
// sediment). Reuse pattern for IS-5 table/timeline batches: locate the scroll
// container, write a scroll offset, poll to a settled value (smooth-scroll
// animations and post-commit layout shifts both settle), read V1 readings.
// Living example: tests/e2e/gantt-scroll-preservation.spec.ts.

import type { Page } from '@playwright/test';
import { expect } from '../fixtures.js';

interface ScrollReadings {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

/** Reads scrollLeft/scrollWidth/clientWidth of the container. */
export async function readScrollState(page: Page, containerSelector: string, parentOfSelector = false): Promise<ScrollReadings> {
  return page.evaluate(
    ([selector, useParent]) => {
      const base = document.querySelector(selector) as HTMLElement | null;
      const el = useParent ? (base?.parentElement as HTMLElement | null) : base;
      if (!el) return { scrollLeft: 0, scrollWidth: 0, clientWidth: 0 };
      return { scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    },
    [containerSelector, parentOfSelector],
  );
}

/**
 * Writes a scroll offset and polls until two consecutive reads agree
 * (`scroll-behavior: smooth` animations and post-commit layout shifts both
 * settle — a single read mid-animation produces false drift). Returns the
 * settled baseline value for before/after comparisons.
 */
export async function scrollToSettled(
  page: Page,
  containerSelector: string,
  value: number,
  parentOfSelector = false,
): Promise<number> {
  await page.evaluate(
    ([selector, v, useParent]) => {
      const base = document.querySelector(selector) as HTMLElement | null;
      const el = useParent ? (base?.parentElement as HTMLElement | null) : base;
      if (el) el.scrollLeft = v;
    },
    [containerSelector, value, parentOfSelector],
  );
  let previous = -1;
  await expect
    .poll(
      async () => {
        const current = (await readScrollState(page, containerSelector, parentOfSelector)).scrollLeft;
        const settled = current === previous ? current : -1;
        previous = current;
        return settled;
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(-1);
  return previous;
}
