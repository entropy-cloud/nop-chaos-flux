import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFormInputEnhancementsPage(page: import('@playwright/test').Page) {
  await page.goto('/#/form-input-enhancements', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '表单输入控件增强 — 长按步进 + min/max + 重排',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 form input enhancements', () => {
  test('input-number long-press continuously steps and clamps at max', async ({ page }) => {
    await openFormInputEnhancementsPage(page);

    const increase = page.getByRole('button', { name: 'Increase' });
    await expect(increase).toBeVisible({ timeout: 10_000 });

    await increase.dispatchEvent('pointerdown', { button: 0 });
    await page.waitForTimeout(600);
    await increase.dispatchEvent('pointerup');

    const countText = await page
      .getByTestId('form-input-enhancements-count')
      .textContent();
    const match = countText?.match(/count = (-?\d+)/);
    const finalCount = match ? Number(match[1]) : 0;
    expect(finalCount).toBeGreaterThanOrEqual(2);
    expect(finalCount).toBeLessThanOrEqual(10);

    await assertTrackedPageErrors(page);
  });

  test('array-editor move-up reorders rows and disables move-up on the first row', async ({
    page,
  }) => {
    await openFormInputEnhancementsPage(page);

    const moveUpButtons = page.getByRole('button', { name: /^Move up Tag \d+$/ });
    await expect(moveUpButtons.nth(0)).toBeDisabled();
    await expect(moveUpButtons.nth(1)).toBeEnabled();

    await expect(page.getByPlaceholder('Tag 1')).toHaveValue('alpha');
    await expect(page.getByPlaceholder('Tag 2')).toHaveValue('beta');

    await moveUpButtons.nth(1).click();

    await expect(page.getByPlaceholder('Tag 1')).toHaveValue('beta');
    await expect(page.getByPlaceholder('Tag 2')).toHaveValue('alpha');

    await assertTrackedPageErrors(page);
  });

  test('key-value move-down reorders entries and disables move-down on the last row', async ({
    page,
  }) => {
    await openFormInputEnhancementsPage(page);

    const moveDownButtons = page.getByRole('button', { name: /^Move down entry \d+$/ });
    const count = await moveDownButtons.count();
    await expect(moveDownButtons.nth(count - 1)).toBeDisabled();
    await expect(moveDownButtons.nth(0)).toBeEnabled();

    const keyInputs = page.getByPlaceholder('Key');
    await expect(keyInputs.nth(0)).toHaveValue('env');
    await expect(keyInputs.nth(1)).toHaveValue('region');

    await moveDownButtons.nth(0).click();

    await expect(keyInputs.nth(0)).toHaveValue('region');
    await expect(keyInputs.nth(1)).toHaveValue('env');

    await assertTrackedPageErrors(page);
  });
});

