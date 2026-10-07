import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { openDesignerTab, openFlowDesigner, readViewportReadings } from './helpers/flow-canvas-sequence.js';

// IS-1 (plan 544 Phase 4) V5 sequence spec — Esc/cancel paths leave zero trace.
// Second consumer of helpers/flow-canvas-sequence.ts (the canvas-sequence
// template): evidence from the Phase 4 four-tab review
// (docs/audits/interaction-state/is1-flow-designer/) codified as regression.
test.describe('IS-1 flow-designer V5 cancel-no-trace (plan 544)', () => {
  test('add-node menu Esc cancel leaves viewport/selection unchanged', async ({ page }) => {
    await openFlowDesigner(page);
    await openDesignerTab(page, '钉钉审批流');

    const before = await readViewportReadings(page);
    await page
      .locator('button[aria-label="添加节点"], button[aria-label="Add node"]')
      .first()
      .click();
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const after = await readViewportReadings(page);

    expect(after.menuCount, 'menu closed by Escape').toBe(0);
    expect(after.transform, 'viewport transform unchanged (V5)').toBe(before.transform);
    expect(after.selectedCount, 'selection unchanged (V5)').toBe(before.selectedCount);
    expect(after.nodeCount, 'node count unchanged (V5)').toBe(before.nodeCount);
    await assertTrackedPageErrors(page);
  });

  test('workflow context menu Esc cancel leaves readings unchanged', async ({ page }) => {
    await openFlowDesigner(page);
    await expect(page.locator('.react-flow__node').nth(1)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);

    const before = await readViewportReadings(page);
    await page.locator('.react-flow__node').nth(1).click({ button: 'right' });
    await expect(page.locator('[data-testid="designer-context-menu"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const after = await readViewportReadings(page);

    expect(after.menuCount, 'context menu closed by Escape').toBe(0);
    expect(after.transform, 'viewport transform unchanged (V5)').toBe(before.transform);
    expect(after.selectedCount, 'selection unchanged (V5)').toBe(before.selectedCount);
    await assertTrackedPageErrors(page);
  });
});
