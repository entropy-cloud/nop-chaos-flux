import { expect, test } from '@playwright/test';
import { getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * Plan 478 (visual-quality V8b) word editor visual assertions.
 * Pass/fail is fully programmatic (input values, aria state, computed
 * styles) per the AGENTS.md 2026-08-28 snapshot policy; screenshots stay
 * diagnostic-only.
 */

async function waitForIdleFrame(page: import('@playwright/test').Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('word-ribbon-toolbar')).toBeVisible({ timeout: 30_000 });
}

test.describe('Word editor visual assertions (V8b)', () => {
  test('font/size combobox echoes out-of-preset values applied from the canvas', async ({
    page,
  }) => {
    await openWordEditor(page);

    const canvasElement = page.locator('canvas').first();
    await expect(canvasElement).toBeVisible({ timeout: 20_000 });
    await canvasElement.click();
    await waitForIdleFrame(page);

    await page.keyboard.type('visual echo probe');
    await page.keyboard.press('ControlOrMeta+a');
    await waitForIdleFrame(page);

    // Free-typed size outside the 16 preset tiers; the clamped value must
    // come back through the rangeStyleChange echo channel.
    const sizeInput = page.getByTestId('toolbar-size-input');
    await sizeInput.click();
    await sizeInput.fill('15');
    await sizeInput.press('Enter');
    await expect(sizeInput).toHaveValue('15', { timeout: 15_000 });

    // Free-typed font family outside the 6 presets must echo back as-is.
    const fontInput = page.getByTestId('toolbar-font-input');
    await fontInput.click();
    await fontInput.fill('楷体');
    await fontInput.press('Enter');
    await expect(fontInput).toHaveValue('楷体', { timeout: 15_000 });
  });

  test('zone switcher flips its activation indicator and keeps the editor alive', async ({
    page,
  }) => {
    await openWordEditor(page);

    const headerToggle = page.getByTestId('zone-toggle-header');
    const mainToggle = page.getByTestId('zone-toggle-main');
    const footerToggle = page.getByTestId('zone-toggle-footer');

    await expect(headerToggle).toBeVisible();
    await expect(mainToggle).toBeVisible();
    await expect(footerToggle).toBeVisible();

    // The switcher stays disabled until the canvas bridge reports ready.
    await expect(headerToggle).toBeEnabled({ timeout: 30_000 });
    await expect(footerToggle).toBeEnabled();
    await expect(mainToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(headerToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(footerToggle).toHaveAttribute('aria-pressed', 'false');

    await footerToggle.click();
    await expect(footerToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(mainToggle).toHaveAttribute('aria-pressed', 'false');

    await headerToggle.click();
    await expect(headerToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(footerToggle).toHaveAttribute('aria-pressed', 'false');

    // The canvas surface must survive zone switches without page errors.
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('toolbar surface flips computed styles across light/dark modes', async ({ page }) => {
    await openWordEditor(page);

    const toolbar = page.getByTestId('word-ribbon-toolbar');
    const zoneGroup = page.locator('[data-slot="word-editor-zone-switcher"]');
    const toolbarBgLight = await getComputedStyleValue(toolbar, 'background-color');
    const zoneColorLight = await getComputedStyleValue(zoneGroup, 'color');
    expect(toolbarBgLight).not.toBe('rgba(0, 0, 0, 0)');

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    await waitForIdleFrame(page);

    const toolbarBgDark = await getComputedStyleValue(toolbar, 'background-color');
    const zoneColorDark = await getComputedStyleValue(zoneGroup, 'color');

    expect(toolbarBgDark).not.toBe(toolbarBgLight);
    expect(toolbarBgDark).not.toBe('rgba(0, 0, 0, 0)');
    expect(zoneColorDark).not.toBe(zoneColorLight);

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    await expect(toolbar).toHaveCSS('background-color', toolbarBgLight);
  });
});
