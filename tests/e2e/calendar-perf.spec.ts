import { test, expect } from './fixtures.js';

test.describe('Calendar Performance Baseline', () => {
  test('first-screen pure render time < 500ms on calendar demo page', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/scheduling-calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 15_000 });

    const renderTime = await page.evaluate(() => {
      performance.mark('calendar-visible');
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      performance.measure('calendar-pure-render', navEntry.name, 'calendar-visible');
      const entry = performance.getEntriesByName('calendar-pure-render')[0];
      return { durationMs: Math.round(entry.duration * 10) / 10 };
    });

    console.log(`[PERF] Calendar first-screen pure render time: ${renderTime.durationMs}ms`);
    expect(renderTime.durationMs).toBeLessThan(500);
    expect(renderTime.durationMs).toBeGreaterThan(0);
  });

  test('high-scale first-screen timing on calendar-perf-scale (300×31) route', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/calendar-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 30_000 });

    const renderTime = await page.evaluate(() => {
      performance.mark('calendar-scale-visible');
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      performance.measure('calendar-scale-render', navEntry.name, 'calendar-scale-visible');
      const entry = performance.getEntriesByName('calendar-scale-render')[0];
      return { durationMs: Math.round(entry.duration * 10) / 10 };
    });

    console.log(`[PERF] Calendar 300×31 first-screen render time: ${renderTime.durationMs}ms`);
    expect(renderTime.durationMs).toBeGreaterThan(0);
    expect(renderTime.durationMs).toBeLessThan(10000);
  });
});
