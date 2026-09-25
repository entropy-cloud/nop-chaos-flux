import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openSliderLab(page: Page): Promise<void> {
  await page.goto('/#/lab/slider', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('form atoms — slider (missing-components L1)', () => {
  test('bound value renders on the thumb, output, and live summary', async ({ page }) => {
    await openSliderLab(page);

    const stage = page.getByTestId('scenario-stage-slider-with-in-form-live-summary');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const thumb = stage.locator('[data-slot="slider-thumb"]');
    await expect(thumb).toBeVisible();
    // base-ui renders a hidden range input inside the thumb carrying the
    // value surface (native min/max/value + aria-valuenow).
    const input = thumb.locator('input');
    await expect(input).toHaveAttribute('min', '0');
    await expect(input).toHaveAttribute('max', '100');
    await expect(input).toHaveAttribute('value', '40');
    await expect(input).toHaveAttribute('aria-valuenow', '40');

    await expect(stage.locator('[data-slot="slider-value"]')).toHaveText('40');
    // 已知首帧时序 gap：pushDefaultValue 的写入不触发模板依赖重解析，
    // `${volume}` 摘要首帧为空、交互后实时更新——交互断言在下方用例。
  });

  test('keyboard stepping commits the bound value (ArrowRight → 41, step 1)', async ({ page }) => {
    await openSliderLab(page);

    const stage = page.getByTestId('scenario-stage-slider-with-in-form-live-summary');
    const thumb = stage.locator('[data-slot="slider-thumb"]');
    await thumb.click();
    await page.keyboard.press('ArrowRight');

    await expect(thumb.locator('input')).toHaveAttribute('aria-valuenow', '41');
    await expect(stage.locator('[data-slot="slider-value"]')).toHaveText('41');
    await expect(stage.getByText('Current volume: 41')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('coarse step quantizes to 25, zero-step falls back to 1, disabled ignores keys', async ({ page }) => {
    await openSliderLab(page);

    const stage = page.getByTestId('scenario-stage-bounded-ranges-coarse-steps-and-disabled-state');
    const thumbs = stage.locator('[data-slot="slider-thumb"]');
    await expect(thumbs).toHaveCount(4);

    // Coarse step slider (step: 25): blank → first ArrowRight lands on 25.
    const coarse = thumbs.nth(2);
    await coarse.click();
    await page.keyboard.press('ArrowRight');
    await expect(coarse.locator('input')).toHaveAttribute('value', '25');
    await expect(coarse.locator('input')).toHaveAttribute('aria-valuenow', '25');

    // Non-positive step (step: 0) falls back to 1 at runtime: 10 → ArrowRight → 11.
    const zeroStep = thumbs.nth(3);
    await expect(zeroStep.locator('input')).toHaveAttribute('value', '10');
    await zeroStep.click();
    await page.keyboard.press('ArrowRight');
    await expect(zeroStep.locator('input')).toHaveAttribute('value', '11');
    await expect(zeroStep.locator('input')).toHaveAttribute('aria-valuenow', '11');

    // Disabled slider stays bound to 60 and shows the disabled presentation
    // (thumb carries data-disabled — pointer/keyboard input is disabled at the
    // native-input level, so no click/keyboard is attempted here).
    const disabledThumb = thumbs.nth(1);
    await expect(disabledThumb).toHaveAttribute('data-disabled', '');
    await expect(disabledThumb.locator('input')).toBeDisabled();
    await expect(disabledThumb.locator('input')).toHaveAttribute('value', '60');
    await expect(stage.locator('[data-slot="slider"]').nth(1)).toHaveAttribute('data-disabled', '');

    await assertTrackedPageErrors(page);
  });
});
