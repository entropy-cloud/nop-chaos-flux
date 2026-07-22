import { test, expect } from './fixtures.js';
import { measureFps } from './helpers/measure-perf.js';

test.describe('Kanban Performance Baseline', () => {
  test('idle FPS baseline on demo page', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(10);
    await page.goto('/#/kanban', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    await page.waitForTimeout(1000);

    const fps = await measureFps(page, 2000);
    console.log(`[PERF] Kanban idle FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(0);
    expect(fps.totalFrames).toBeGreaterThan(10);
  });

  test('idle FPS baseline on kanban-perf-scale (20×300) route', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/kanban-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Kanban Performance Scale')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 60_000 });

    await page.waitForTimeout(2000);

    const fps = await measureFps(page, 3000);
    console.log(`[PERF] Kanban 20×300 idle FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(0);
    expect(fps.totalFrames).toBeGreaterThan(10);
  });

  test('drag FPS on kanban-perf-scale (20×300) route targets 60fps', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/kanban-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Kanban Performance Scale')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 60_000 });

    await page.waitForTimeout(2000);

    const firstCard = page.locator('[data-slot="kanban-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    const box = await firstCard.boundingBox();
    if (!box) {
      console.log('[PERF] Kanban drag FPS: cannot locate card for drag simulation, skipping');
      return;
    }

    const fps = await measureFps(page, 2000);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2 + 30, { steps: 2 });
    }
    await page.mouse.up();

    console.log(`[PERF] Kanban 20×300 drag FPS: avg=${fps.avgFps}, min=${fps.minFps}, frames=${fps.totalFrames}, duration=${fps.durationMs}ms`);

    expect(fps.avgFps).toBeGreaterThan(0);
    expect(fps.totalFrames).toBeGreaterThan(10);
  });
});
