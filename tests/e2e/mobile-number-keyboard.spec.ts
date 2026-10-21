import { expect, test } from './fixtures.js';

type PlaywrightPage = import('@playwright/test').Page;

async function openNumberKeyboard(page: PlaywrightPage) {
  await page.goto('#/m11-number-keyboard', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'M11 安全输入 — number-keyboard',
      level: 1,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('m11 number keyboard — verification', () => {
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  test.setTimeout(120_000);

  test('smoke: keyboard trigger and input box render', async ({ page }) => {
    await openNumberKeyboard(page);
    await expect(page.getByTestId('m11-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m11-keyboard-open')).toBeVisible();
    await expect(page.getByTestId('m11-keyboard-input')).toBeVisible();
  });

  test('keyboard opens, digit taps build the input, confirm closes', async ({ page }) => {
    await openNumberKeyboard(page);
    await page.getByTestId('m11-keyboard-open').click();
    const keyboard = page.locator('[data-slot="number-keyboard"]');
    await expect(keyboard).toBeVisible();

    // tap 1 → 5 via data-key buttons
    for (const digit of ['1', '5']) {
      await keyboard.locator(`[data-key="${digit}"]`).click();
    }
    const input = page.getByTestId('m11-keyboard-input');
    await expect(input).toHaveText(/15/);

    // confirm closes the keyboard
    await keyboard.locator('[data-slot="number-keyboard-confirm"]').click();
    await expect(keyboard).toBeHidden();
    // input text persists after close
    await expect(input).toHaveText(/15/);
  });

  test('delete key removes the last digit', async ({ page }) => {
    await openNumberKeyboard(page);
    await page.getByTestId('m11-keyboard-open').click();
    const keyboard = page.locator('[data-slot="number-keyboard"]');
    await expect(keyboard).toBeVisible();

    await keyboard.locator('[data-key="7"]').click();
    await keyboard.locator('[data-key="8"]').click();
    await expect(page.getByTestId('m11-keyboard-input')).toHaveText(/78/);
    await keyboard.locator('[data-key="delete"]').click();
    await expect(page.getByTestId('m11-keyboard-input')).toHaveText(/7$/);
  });

  test('mask click closes the keyboard', async ({ page }) => {
    await openNumberKeyboard(page);
    await page.getByTestId('m11-keyboard-open').click();
    const keyboard = page.locator('[data-slot="number-keyboard"]');
    await expect(keyboard).toBeVisible();
    await keyboard.locator('[data-slot="number-keyboard-mask"]').click({ force: true });
    await expect(keyboard).toBeHidden();
  });

  test('responsive check: the same route renders after downscaling the viewport', async ({
    page,
  }) => {
    await openNumberKeyboard(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('m11-phone-frame')).toBeVisible();
    await expect(page.getByTestId('m11-keyboard-input')).toBeVisible();
  });
});
