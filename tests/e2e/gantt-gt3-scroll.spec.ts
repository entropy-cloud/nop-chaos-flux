import { expect, test } from './fixtures.js';

// plan 639 UR-12 GT-3: single-horizontal-scrollbar principle — the left grid
// never scrolls horizontally (percentage column widths + overflow-x-hidden);
// the timeline is the only horizontal scrollbar. Bars carry a native tooltip.
test('GT-3: grid has no horizontal overflow and the timeline stays the sole horizontal scroller', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/gantt', { waitUntil: 'domcontentloaded' });
  const grid = page.locator('[data-slot="gantt-grid"]');
  await grid.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  const measure = () =>
    page.evaluate(() => {
      const g = document.querySelector('[data-slot="gantt-grid"]') as HTMLElement;
      return { scrollWidth: g.scrollWidth, clientWidth: g.clientWidth };
    });

  const full = await measure();
  expect(full.scrollWidth, 'grid must not overflow horizontally at full width').toBeLessThanOrEqual(
    full.clientWidth,
  );

  // Narrow pane (deterministic): shrink the viewport so the grid pane goes
  // well below its natural column width — still no horizontal overflow.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(800);
  const narrow = await measure();
  expect(
    narrow.scrollWidth,
    'grid must not overflow horizontally at narrow pane width',
  ).toBeLessThanOrEqual(narrow.clientWidth);
});

test('GT-3: the overflowing timeline stays the sole horizontal scroller and bars carry tooltips', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/gantt', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-slot="gantt-grid"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  // Timeline: walk up from the time scale to the actual horizontal scroll
  // container (computed overflowX != visible + content overflow). When the
  // time range overflows the viewport it must be scrollable; a fully-fitting
  // range trivially has nothing to scroll.
  const scrollInfo = await page.evaluate(() => {
    let el: HTMLElement | null = document.querySelector('[data-slot="gantt-scale"]') as HTMLElement;
    let scroller: HTMLElement | null = null;
    while (el) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) {
        scroller = el;
        break;
      }
      el = el.parentElement;
    }
    if (!scroller) return { overflow: false, after: 0 };
    // Neutralize potential scroll-behavior:smooth so the sync assignment lands
    // immediately (the scale-today spec reads across async gaps instead).
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollLeft = scroller.scrollWidth;
    return { overflow: true, after: scroller.scrollLeft };
  });
  if (scrollInfo.overflow) {
    expect(scrollInfo.after, 'overflowing timeline must be horizontally scrollable').toBeGreaterThan(0);
  }

  const milestone = page.locator('[data-bar-type="milestone"]').first();
  if ((await milestone.count()) > 0) {
    expect(await milestone.getAttribute('title')).toBeTruthy();
  }
  const bar = page.locator('[data-slot="gantt-bar"]').first();
  await expect(bar).toBeVisible({ timeout: 15_000 });
  expect(await bar.getAttribute('title')).toBeTruthy();
});
