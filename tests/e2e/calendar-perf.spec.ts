import { test, expect } from './fixtures.js';

test.describe('Calendar Performance Baseline', () => {
  test('first-screen timing on calendar demo page', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    const startTime = Date.now();

    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 15_000 });

    const mountTime = Date.now() - startTime;
    console.log(`[PERF] Calendar first-screen mount time: ${mountTime}ms`);

    expect(mountTime).toBeGreaterThan(0);
    expect(mountTime).toBeLessThan(30000);
  });
});
