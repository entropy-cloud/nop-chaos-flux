import { test, expect } from './fixtures.js';
import { measureFps } from './helpers/measure-perf.js';

test.describe('Kanban Performance Baseline', () => {
  test('idle FPS baseline on demo page', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(10);
    await page.goto('/#/kanban', { waitUntil: 'load' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    await page.waitForTimeout(1000);

    const fps = await measureFps(page, 2000);
    console.log(`[PERF] Kanban idle FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(0);
    expect(fps.totalFrames).toBeGreaterThan(10);
  });
});
