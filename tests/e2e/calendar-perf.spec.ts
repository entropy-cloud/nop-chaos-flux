import { test, expect } from './fixtures.js';

async function measureCalendarScreen(page: import('@playwright/test').Page, hashRoute: string): Promise<number> {
  return page.evaluate(async (hash) => {
    const start = performance.now();
    window.location.hash = hash;

    return new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('[data-view="month"]') && document.querySelector('[data-slot="calendar-matrix"]')) {
          const elapsed = Math.round((performance.now() - start) * 10) / 10;
          resolve(elapsed);
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }, hashRoute);
}

test.describe('Calendar Performance Baseline', () => {
  test.describe.configure({ timeout: 180_000 });

  test('first-screen render time on calendar demo page targets < 500ms', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[class*="nop-hero"]') !== null, { timeout: 30_000 });

    const elapsed = await measureCalendarScreen(page, '#/scheduling-calendar');
    console.log(`[PERF] Calendar demo first-screen render time: ${elapsed}ms`);

    expect(elapsed).toBeLessThan(500);
  });

  test('high-scale first-screen timing on calendar-perf-scale (300×31) route targets < 10000ms', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    await page.goto('/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[class*="nop-hero"]') !== null, { timeout: 30_000 });

    const elapsed = await measureCalendarScreen(page, '#/calendar-perf-scale');
    console.log(`[PERF] Calendar 300×31 first-screen render time: ${elapsed}ms`);

    expect(elapsed).toBeLessThan(10000);
  });
});
