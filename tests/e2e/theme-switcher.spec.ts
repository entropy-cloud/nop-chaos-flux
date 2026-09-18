import { expect, test } from '@playwright/test';
import { expectCssVarResolves, getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * Runtime theme switching (plan 471, visual-quality V1 / ui-review G-I).
 * Four states (classic/glass × light/dark) driven through the App-shell
 * switcher; pass/fail is fully programmatic (attributes + computed styles +
 * localStorage), per the AGENTS.md 2026-08-28 snapshot policy.
 */

const SWITCHER = '[data-testid="theme-switcher"]';

async function openFluxBasic(page: import('@playwright/test').Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/flux-basic', { waitUntil: 'commit' });
  await expect(page.locator('.nop-page').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(SWITCHER)).toBeVisible();
}

async function switchSelect(page: import('@playwright/test').Page, label: string, value: string) {
  await page.getByLabel(label).selectOption(value);
}

test.describe('runtime theme switcher', () => {
  test('01 four states update data-theme/data-mode attributes', async ({ page }) => {
    await openFluxBasic(page);

    for (const [theme, mode] of [
      ['glass', 'dark'],
      ['classic', 'dark'],
      ['glass', 'light'],
    ] as const) {
      await switchSelect(page, '主题', theme);
      await switchSelect(page, '模式', mode);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
    }
  });

  test('02 light↔dark flips computed styles incl. Tailwind dark: variants', async ({ page }) => {
    await openFluxBasic(page);

    // Token layer: --background resolves to the classic-dark value under dark.
    const backgroundLight = await expectCssVarResolves(page, '--background');
    const inputLight = await getComputedStyleValue(page.locator('html'), '--input');

    // dark: variant consumer: ui Input (data-slot=input, .nop-input) carries
    // dark:bg-input/30 — its computed background must actually change once the
    // data-mode trigger is active (the .dark-era dead-trigger regression this
    // assertion pins).
    const input = page.locator('.nop-page input[data-slot="input"].nop-input').first();
    const groupBgLight = await getComputedStyleValue(input, 'background-color');

    await switchSelect(page, '模式', 'dark');
    const backgroundDark = await expectCssVarResolves(page, '--background');
    const inputDark = await getComputedStyleValue(page.locator('html'), '--input');
    const groupBgDark = await getComputedStyleValue(input, 'background-color');

    expect(backgroundDark).not.toBe(backgroundLight);
    expect(backgroundDark).toBe('222 84% 5%');
    expect(inputDark).not.toBe(inputLight);

    expect(groupBgDark).not.toBe(groupBgLight);
  });

  test('03 classic↔glass swaps theme-block token values', async ({ page }) => {
    await openFluxBasic(page);

    const surfaceClassic = await expectCssVarResolves(page, '--card-surface');
    await switchSelect(page, '主题', 'glass');
    const surfaceGlass = await expectCssVarResolves(page, '--card-surface');
    expect(surfaceGlass).not.toBe(surfaceClassic);
    expect(surfaceClassic).toBe('rgba(255, 255, 255, 0.72)');
    expect(surfaceGlass).toBe('rgba(255, 255, 255, 0.68)');
  });

  test('04 persisted theme survives a reload', async ({ page }) => {
    await openFluxBasic(page);
    await switchSelect(page, '主题', 'glass');
    await switchSelect(page, '模式', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('.nop-page').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'glass');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    await expect(page.locator(SWITCHER)).toBeVisible();
  });
});
