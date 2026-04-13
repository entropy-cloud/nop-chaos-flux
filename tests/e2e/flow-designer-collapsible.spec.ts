import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('collapses palette panel via collapse button', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="left-panel-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="left-panel-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-palette"]');

  await expect(paletteExpanded).toBeVisible();
  await expect(paletteCollapsed).toHaveCount(0);

  await collapseButton.click();
  await expect(paletteExpanded).toHaveCount(0);
  await expect(paletteCollapsed).toBeVisible();
});

test('expands palette panel via expand button', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="left-panel-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="left-panel-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-palette"]');
  const expandButton = page.locator('[data-testid="expand-left-panel"]');

  await expect(paletteExpanded).toBeVisible();

  await collapseButton.click();
  await expect(paletteExpanded).toHaveCount(0);
  await expect(paletteCollapsed).toBeVisible();

  await expandButton.click();
  await expect(paletteCollapsed).toHaveCount(0);
  await expect(paletteExpanded).toBeVisible();
});

test('collapses inspector panel via collapse button', async ({ page }) => {
  await openFlowDesigner(page);

  const inspectorExpanded = page.locator('[data-testid="right-panel-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="right-panel-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-inspector"]');

  await expect(inspectorExpanded).toBeVisible();
  await expect(inspectorCollapsed).toHaveCount(0);

  await collapseButton.click();
  await expect(inspectorExpanded).toHaveCount(0);
  await expect(inspectorCollapsed).toBeVisible();
});

test('expands inspector panel via expand button', async ({ page }) => {
  await openFlowDesigner(page);

  const inspectorExpanded = page.locator('[data-testid="right-panel-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="right-panel-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-inspector"]');
  const expandButton = page.locator('[data-testid="expand-right-panel"]');

  await expect(inspectorExpanded).toBeVisible();

  await collapseButton.click();
  await expect(inspectorExpanded).toHaveCount(0);
  await expect(inspectorCollapsed).toBeVisible();

  await expandButton.click();
  await expect(inspectorCollapsed).toHaveCount(0);
  await expect(inspectorExpanded).toBeVisible();
});

test('collapses both panels simultaneously', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="left-panel-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="left-panel-collapsed"]');
  const inspectorExpanded = page.locator('[data-testid="right-panel-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="right-panel-collapsed"]');
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');

  await expect(paletteExpanded).toBeVisible();
  await expect(inspectorExpanded).toBeVisible();

  await collapsePaletteButton.click();
  await collapseInspectorButton.click();

  await expect(paletteExpanded).toHaveCount(0);
  await expect(paletteCollapsed).toBeVisible();
  await expect(inspectorExpanded).toHaveCount(0);
  await expect(inspectorCollapsed).toBeVisible();
});

test('expands both panels back', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="left-panel-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="left-panel-collapsed"]');
  const inspectorExpanded = page.locator('[data-testid="right-panel-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="right-panel-collapsed"]');
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');
  const expandPaletteButton = page.locator('[data-testid="expand-left-panel"]');
  const expandInspectorButton = page.locator('[data-testid="expand-right-panel"]');

  await collapsePaletteButton.click();
  await collapseInspectorButton.click();

  await expect(paletteExpanded).toHaveCount(0);
  await expect(inspectorExpanded).toHaveCount(0);

  await expandPaletteButton.click();
  await expandInspectorButton.click();

  await expect(paletteCollapsed).toHaveCount(0);
  await expect(paletteExpanded).toBeVisible();
  await expect(inspectorCollapsed).toHaveCount(0);
  await expect(inspectorExpanded).toBeVisible();
});

test('verifies canvas width changes after collapse and expand', async ({ page }) => {
  await openFlowDesigner(page);

  const canvas = page.locator('[data-testid="canvas"]').first();
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');
  const expandPaletteButton = page.locator('[data-testid="expand-left-panel"]');
  const expandInspectorButton = page.locator('[data-testid="expand-right-panel"]');

  const initialWidth = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);

  await collapsePaletteButton.click();
  const afterPaletteCollapse = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(afterPaletteCollapse).toBeGreaterThan(initialWidth);

  await collapseInspectorButton.click();
  const afterBothCollapse = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(afterBothCollapse).toBeGreaterThan(afterPaletteCollapse);

  await expandPaletteButton.click();
  const afterPaletteExpand = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(afterPaletteExpand).toBeLessThan(afterBothCollapse);

  await expandInspectorButton.click();
  const finalWidth = await canvas.evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(finalWidth).toBeLessThan(afterPaletteExpand);
  expect(finalWidth).toBe(initialWidth);
});
