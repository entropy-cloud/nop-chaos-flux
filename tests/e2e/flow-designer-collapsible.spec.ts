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
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

test('collapses palette panel via collapse button', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="palette-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="palette-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-palette"]');

  await expect(paletteExpanded).toBeVisible();
  await expect(paletteCollapsed).toBeHidden();

  await collapseButton.click();
  await expect(paletteExpanded).toBeHidden();
  await expect(paletteCollapsed).toBeVisible();
});

test('expands palette panel via expand button', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="palette-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="palette-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-palette"]');
  const expandButton = page.locator('[data-testid="expand-palette"]');

  await expect(paletteExpanded).toBeVisible();

  await collapseButton.click();
  await expect(paletteExpanded).toBeHidden();
  await expect(paletteCollapsed).toBeVisible();

  await expandButton.click();
  await expect(paletteCollapsed).toBeHidden();
  await expect(paletteExpanded).toBeVisible();
});

test('collapses inspector panel via collapse button', async ({ page }) => {
  await openFlowDesigner(page);

  const inspectorExpanded = page.locator('[data-testid="inspector-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="inspector-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-inspector"]');

  await expect(inspectorExpanded).toBeVisible();
  await expect(inspectorCollapsed).toBeHidden();

  await collapseButton.click();
  await expect(inspectorExpanded).toBeHidden();
  await expect(inspectorCollapsed).toBeVisible();
});

test('expands inspector panel via expand button', async ({ page }) => {
  await openFlowDesigner(page);

  const inspectorExpanded = page.locator('[data-testid="inspector-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="inspector-collapsed"]');
  const collapseButton = page.locator('[data-testid="collapse-inspector"]');
  const expandButton = page.locator('[data-testid="expand-inspector"]');

  await expect(inspectorExpanded).toBeVisible();

  await collapseButton.click();
  await expect(inspectorExpanded).toBeHidden();
  await expect(inspectorCollapsed).toBeVisible();

  await expandButton.click();
  await expect(inspectorCollapsed).toBeHidden();
  await expect(inspectorExpanded).toBeVisible();
});

test('collapses both panels simultaneously', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="palette-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="palette-collapsed"]');
  const inspectorExpanded = page.locator('[data-testid="inspector-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="inspector-collapsed"]');
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');

  await expect(paletteExpanded).toBeVisible();
  await expect(inspectorExpanded).toBeVisible();

  await collapsePaletteButton.click();
  await collapseInspectorButton.click();

  await expect(paletteExpanded).toBeHidden();
  await expect(paletteCollapsed).toBeVisible();
  await expect(inspectorExpanded).toBeHidden();
  await expect(inspectorCollapsed).toBeVisible();
});

test('expands both panels back', async ({ page }) => {
  await openFlowDesigner(page);

  const paletteExpanded = page.locator('[data-testid="palette-expanded"]');
  const paletteCollapsed = page.locator('[data-testid="palette-collapsed"]');
  const inspectorExpanded = page.locator('[data-testid="inspector-expanded"]');
  const inspectorCollapsed = page.locator('[data-testid="inspector-collapsed"]');
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');
  const expandPaletteButton = page.locator('[data-testid="expand-palette"]');
  const expandInspectorButton = page.locator('[data-testid="expand-inspector"]');

  await collapsePaletteButton.click();
  await collapseInspectorButton.click();

  await expect(paletteExpanded).toBeHidden();
  await expect(inspectorExpanded).toBeHidden();

  await expandPaletteButton.click();
  await expandInspectorButton.click();

  await expect(paletteCollapsed).toBeHidden();
  await expect(paletteExpanded).toBeVisible();
  await expect(inspectorCollapsed).toBeHidden();
  await expect(inspectorExpanded).toBeVisible();
});

test('verifies canvas width changes after collapse and expand', async ({ page }) => {
  await openFlowDesigner(page);

  const canvas = page.locator('.nop-designer__canvas').first();
  const collapsePaletteButton = page.locator('[data-testid="collapse-palette"]');
  const collapseInspectorButton = page.locator('[data-testid="collapse-inspector"]');
  const expandPaletteButton = page.locator('[data-testid="expand-palette"]');
  const expandInspectorButton = page.locator('[data-testid="expand-inspector"]');

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
