import { expect, test } from '@playwright/test';

/**
 * L4.6 resizable layout (plan 514 Phase 3): schema-driven split panes —
 * dragging the handle changes panel geometry (programmatic bounding-box
 * assertion); the wrapper map persists sizes to the declared scope path.
 */

test.describe('resizable layout (L4.6)', () => {
  test('keyboard resize on the handle changes panel widths', async ({ page }) => {
    await page.goto('/#/lab/resizable');
    const group = page.locator('[data-testid="demo-resizable"]');
    await expect(group).toBeVisible({ timeout: 15_000 });

    const left = group.locator('[data-panel-key="left"]');
    const handle = group.locator('[data-slot="resizable-panel-handle"]').first();

    // Let the panel layout settle before measuring (dev-server cold transform
    // and first paint of react-resizable-panels can lag).
    await page.waitForTimeout(500);
    const before = await left.boundingBox();
    expect(before).not.toBeNull();

    // Keyboard resize on the focused separator is deterministic (native
    // react-resizable-panels behavior). Shrink direction: the initial layout
    // may sit at the panel's max clamp, but never at its min (2%).
    await handle.focus();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowLeft');
    }

    await page.waitForTimeout(300);
    const after = await left.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.width).toBeLessThan(before!.width - 20);
  });
});
