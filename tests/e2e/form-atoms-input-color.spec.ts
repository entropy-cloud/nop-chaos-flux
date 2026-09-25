import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openColorLab(page: Page): Promise<void> {
  await page.goto('/#/lab/input-color', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('form atoms — input-color (missing-components L1)', () => {
  test('bound value renders on the swatch and the live summary', async ({ page }) => {
    await openColorLab(page);

    const stage = page.getByTestId('scenario-stage-color-picker-with-in-form-live-summary');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const swatch = stage.locator('[data-slot="color-picker-swatch"]');
    await expect(swatch).toBeVisible();
    await expect(swatch).toHaveCSS('background-color', 'rgb(37, 99, 235)');
    // pushDefaultValue 首帧 gap：`${accent}` 摘要断言移至 preset 点击用例。
  });

  test('picking a preset swatch commits the normalized hex value', async ({ page }) => {
    await openColorLab(page);

    const stage = page.getByTestId('scenario-stage-color-picker-with-in-form-live-summary');
    await stage.locator('[data-slot="color-picker"] button').first().click();

    const panel = page.locator('[data-slot="color-picker-panel"]');
    await expect(panel).toBeVisible();
    await panel.locator('[data-slot="color-picker-preset"][data-color="#dc2626"]').click();

    await expect(stage.getByText('Current accent: #dc2626')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('rgba valueFormat preserves alpha and free-form input commits', async ({ page }) => {
    await openColorLab(page);

    const stage = page.getByTestId('scenario-stage-rgba-format-custom-swatches-and-read-only');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    // Bound rgba value keeps alpha on the swatch.
    const swatch = stage.locator('[data-slot="color-picker-swatch"]').first();
    await expect(swatch).toHaveCSS('background-color', 'rgba(12, 34, 56, 0.8)');

    // Type a free-form value into the second picker (custom swatches) and commit.
    const trigger = stage.locator('[data-slot="color-picker"] button').nth(1);
    await trigger.click();
    const panel = page.locator('[data-slot="color-picker-panel"]').last();
    const input = panel.locator('input');
    await input.fill('#00ff00');
    await input.press('Enter');
    await expect(input).toHaveValue('#00ff00');

    await assertTrackedPageErrors(page);
  });
});
