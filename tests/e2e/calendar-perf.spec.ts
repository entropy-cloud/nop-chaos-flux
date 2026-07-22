import { test, expect } from './fixtures.js';

test.describe('Calendar Performance Baseline', () => {
  test.describe.configure({ timeout: 180_000 });

  test('first-screen pure render time on calendar demo page', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/scheduling-calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 15_000 });

    const renderTime = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      performance.mark('calendar-visible');
      const mark = performance.getEntriesByName('calendar-visible')[0];
      return { durationMs: Math.round((mark.startTime - navEntry.startTime) * 10) / 10 };
    });

    console.log(`[PERF] Calendar first-screen pure render time: ${renderTime.durationMs}ms`);
    expect(renderTime.durationMs).toBeGreaterThan(0);
  });

  test('high-scale first-screen timing on calendar-perf-scale (300×31) route', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/calendar-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Calendar Performance Scale')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 120_000 });

    const renderTime = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      performance.mark('calendar-scale-visible');
      const mark = performance.getEntriesByName('calendar-scale-visible')[0];
      return { durationMs: Math.round((mark.startTime - navEntry.startTime) * 10) / 10 };
    });

    console.log(`[PERF] Calendar 300×31 first-screen render time: ${renderTime.durationMs}ms`);
    expect(renderTime.durationMs).toBeGreaterThan(0);
    expect(renderTime.durationMs).toBeLessThan(60000);
  });
});
