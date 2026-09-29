import { expect, test } from '@playwright/test';

// plan 2026-09-29-6 Phase 1: compiled-product proof for the list/transfer
// windowing paths. BLOCKED (see plan 2026-09-29-6 Deferred): the playground
// does not yet expose large-dataset list/transfer demo pages — the specs
// below are the ready-to-unblock shape (test.skip + plan pointer, 2026-09-28-2
// precedent). Unit coverage: list-windowing.test.tsx (real fallback render +
// mocked window branch) and transfer-windowing.test.tsx (real below-threshold
// render + mocked window branch).

test.describe('large-dataset windowing (plan 2026-09-29-6)', () => {
  test.skip('virtualized list mounts a bounded window and scrolls with content', async ({ page }) => {
    await page.goto('/#/performance-table?mode=virtualized-list');
    await page.waitForSelector('[data-slot="list-root"]', { timeout: 15_000 });

    const rows = page.locator('[data-slot="list-item"]');
    const mounted = await rows.count();
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(300);

    const before = await rows.first().getAttribute('data-item-key');
    await page.mouse.move(400, 300);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
    const after = await rows.first().getAttribute('data-item-key');
    expect(after).not.toBe(before);
  });

  test.skip('transfer windowing keeps pane options interactive above the threshold', async ({ page }) => {
    await page.goto('/#/transfer-windowing');
    await page.waitForSelector('[data-slot="transfer-option-candidate"]', { timeout: 15_000 });

    const candidates = page.locator('[data-slot="transfer-option-candidate"]');
    const mounted = await candidates.count();
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(1000);

    await candidates.first().click();
    const checked = await page.locator('[data-slot="transfer-option-candidate"] input:checked').count();
    expect(checked).toBeGreaterThan(0);
  });
});
