import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer');
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await assertTrackedPageErrors(page);
}

async function dragHandle(
  page: import('@playwright/test').Page,
  handle: import('@playwright/test').Locator,
  dx: number,
) {
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error('resize handle has no bounding box');
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY, { steps: 8 });
  await page.mouse.up();
}

test('drag-resizes the palette panel and shrinks the canvas', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteHandle = page.locator('[data-testid="left-resize-handle"]');
  const canvas = page.locator('[data-testid="canvas"]').first();

  await expect(paletteHandle).toBeVisible();
  await expect(paletteHandle).toHaveAttribute('role', 'separator');
  await expect(paletteHandle).toHaveAttribute('aria-orientation', 'vertical');
  expect(Number(await paletteHandle.getAttribute('aria-valuenow'))).toBe(240);

  const canvasWidthBefore = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);

  await dragHandle(page, paletteHandle, 120);

  const paletteWidthAfter = Number(await paletteHandle.getAttribute('aria-valuenow'));
  expect(paletteWidthAfter).toBeGreaterThan(240);
  expect(paletteWidthAfter).toBeLessThanOrEqual(600);

  const canvasWidthAfter = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(canvasWidthAfter).toBeLessThan(canvasWidthBefore);
  await assertTrackedPageErrors(page);
});

test('clamps palette width to max when dragging far past the limit', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteHandle = page.locator('[data-testid="left-resize-handle"]');

  await dragHandle(page, paletteHandle, 900);

  const paletteWidthAfter = Number(await paletteHandle.getAttribute('aria-valuenow'));
  expect(paletteWidthAfter).toBeLessThanOrEqual(600);
  await assertTrackedPageErrors(page);
});

test('resizes panels via keyboard arrows with a fixed step', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteHandle = page.locator('[data-testid="left-resize-handle"]');
  const initialWidth = Number(await paletteHandle.getAttribute('aria-valuenow'));

  await paletteHandle.click();
  await page.keyboard.press('ArrowRight');

  const afterArrowRight = Number(await paletteHandle.getAttribute('aria-valuenow'));
  expect(afterArrowRight).toBe(initialWidth + 16);

  await page.keyboard.press('ArrowLeft');
  const afterArrowLeft = Number(await paletteHandle.getAttribute('aria-valuenow'));
  expect(afterArrowLeft).toBe(initialWidth);
  await assertTrackedPageErrors(page);
});

test('keeps the resized width after collapse and expand', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteHandle = page.locator('[data-testid="left-resize-handle"]');

  await paletteHandle.click();
  await page.keyboard.press('ArrowRight');
  const resizedWidth = Number(await paletteHandle.getAttribute('aria-valuenow'));
  expect(resizedWidth).toBeGreaterThan(240);

  await page.locator('[data-testid="collapse-palette"]').click();
  await expect(page.locator('[data-testid="left-panel-collapsed"]')).toBeVisible();

  await page.locator('[data-testid="expand-left-panel"]').click();
  await expect(page.locator('[data-testid="left-panel-expanded"]')).toBeVisible();

  const paletteHandleAfterExpand = page.locator('[data-testid="left-resize-handle"]');
  await expect(paletteHandleAfterExpand).toBeVisible();
  const restoredWidth = Number(await paletteHandleAfterExpand.getAttribute('aria-valuenow'));
  expect(restoredWidth).toBe(resizedWidth);
  await assertTrackedPageErrors(page);
});

test('inverts drag direction on the right inspector handle', async ({ page }) => {
  await openFlowDesigner(page);

  const inspectorHandle = page.locator('[data-testid="right-resize-handle"]');
  const canvas = page.locator('[data-testid="canvas"]').first();

  await expect(inspectorHandle).toBeVisible();
  expect(Number(await inspectorHandle.getAttribute('aria-valuenow'))).toBe(352);

  const canvasWidthBefore = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);

  // Dragging LEFT on the right panel widens it.
  await dragHandle(page, inspectorHandle, -120);

  const inspectorWidthAfter = Number(await inspectorHandle.getAttribute('aria-valuenow'));
  expect(inspectorWidthAfter).toBeGreaterThan(352);

  const canvasWidthAfter = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(canvasWidthAfter).toBeLessThan(canvasWidthBefore);
  await assertTrackedPageErrors(page);
});
