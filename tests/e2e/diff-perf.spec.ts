import { test, expect } from './fixtures.js';

test.describe('Diff View Performance Baseline', () => {
  test.describe.configure({ timeout: 180_000 });

  test('first-screen render time < 200ms on diff-perf-scale route', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);

    const startTime = Date.now();

    await page.goto('/#/diff-perf-scale', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Diff View Performance Scale')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('.nop-diff-view').first()).toBeVisible({ timeout: 120_000 });

    const addLines = page.locator('[data-diff-type="add"]');
    const deleteLines = page.locator('[data-diff-type="delete"]');
    const contextLines = page.locator('[data-diff-type="context"]');

    await expect(addLines.first()).toBeVisible({ timeout: 30_000 });
    await expect(deleteLines.first()).toBeVisible({ timeout: 30_000 });
    await expect(contextLines.first()).toBeVisible({ timeout: 30_000 });

    const renderTime = Date.now() - startTime;
    console.log(`[PERF] Diff-view scale first-screen render time: ${renderTime}ms`);

    const addCount = await addLines.count();
    const deleteCount = await deleteLines.count();
    const contextCount = await contextLines.count();
    const totalLines = addCount + deleteCount + contextCount;
    console.log(`[PERF] Diff-view lines rendered: add=${addCount}, delete=${deleteCount}, context=${contextCount}, total=${totalLines}`);

    expect(totalLines).toBeGreaterThan(1000);
    expect(renderTime).toBeLessThan(200);
  });
});
