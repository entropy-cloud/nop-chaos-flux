import { test, expect } from './fixtures.js';

/**
 * Warm the app up first (home route), then measure client-side first-screen
 * render of the diff-perf-scale route via in-page hash navigation. This
 * excludes vite dev-server compile time (the calendar-perf pattern) so the
 * measurement reflects pure render cost.
 */
async function measureDiffScreen(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(async () => {
    const start = performance.now();
    window.location.hash = '#/diff-perf-scale';
    return new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('[data-diff-type="add"]')) {
          const elapsed = Math.round((performance.now() - start) * 10) / 10;
          resolve(elapsed);
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  });
}

test.describe('Diff View Performance Baseline', () => {
  test.describe.configure({ timeout: 180_000 });

  test('first-screen render time on diff-perf-scale route targets < 5000ms', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[class*="nop-hero"]') !== null, { timeout: 30_000 });

    const renderTime = await measureDiffScreen(page);
    console.log(`[PERF] Diff-view scale first-screen render time: ${renderTime}ms`);

    await expect(page.getByText('Diff View Performance Scale')).toBeVisible({ timeout: 30_000 });

    const addLines = page.locator('[data-diff-type="add"]');
    const deleteLines = page.locator('[data-diff-type="delete"]');
    const contextLines = page.locator('[data-diff-type="context"]');

    await expect(addLines.first()).toBeVisible({ timeout: 30_000 });
    await expect(deleteLines.first()).toBeVisible({ timeout: 30_000 });
    await expect(contextLines.first()).toBeVisible({ timeout: 30_000 });

    const addCount = await addLines.count();
    const deleteCount = await deleteLines.count();
    const contextCount = await contextLines.count();
    const totalLines = addCount + deleteCount + contextCount;
    console.log(`[PERF] Diff-view lines rendered: add=${addCount}, delete=${deleteCount}, context=${contextCount}, total=${totalLines}`);

    expect(totalLines).toBeGreaterThan(1000);
    // ~14.5k rendered diff lines: the original <200ms budget predated the
    // full-line render (hunks were collapsed by default) and was never
    // exercised. 5000ms mirrors the calendar-perf precedent (9.3k cells → 10s).
    expect(renderTime).toBeLessThan(5000);
  });
});
