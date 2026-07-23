import { test, expect } from './fixtures.js';
import { measureFps } from './helpers/measure-perf.js';

test.describe('Gantt Performance Baseline', () => {
  test.describe.configure({ timeout: 180_000 });

  test('idle FPS at scale on gantt-perf-scale route', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/gantt-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Gantt Performance Scale')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 120_000 });

    await page.waitForTimeout(2000);

    const fps = await measureFps(page, 2000);
    console.log(`[PERF] Gantt scale idle FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(30);
  });

  test('scroll FPS on gantt-perf-scale synchronized grid+timeline', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/gantt-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Gantt Performance Scale')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 120_000 });

    await page.waitForTimeout(2000);

    const bars = page.locator('[data-slot="gantt-bars"]');
    await bars.evaluate((el) => {
      const scrollable = el.closest('[style*="overflow"]') || el.parentElement;
      if (scrollable) {
        (scrollable as HTMLElement).scrollTop = 500;
      }
    });
    await page.waitForTimeout(1000);

    const fps = await measureFps(page, 2000);
    console.log(`[PERF] Gantt scale scroll FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(50);
  });

  test('drag FPS on gantt-perf-scale (drag a task bar 200px)', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/gantt-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Gantt Performance Scale')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 120_000 });

    await page.waitForTimeout(2000);

    const taskBar = page.locator('[data-slot="gantt-bar"]').first();
    await expect(taskBar).toBeVisible({ timeout: 10_000 });

    const box = await taskBar.boundingBox();
    if (!box) {
      console.log('[PERF] Gantt drag FPS: cannot locate task bar, skipping');
      return;
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    for (let i = 0; i < 20; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2, { steps: 2 });
    }

    const fps = await measureFps(page, 2000);
    await page.mouse.up();

    console.log(`[PERF] Gantt scale drag FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(50);
  });
});
