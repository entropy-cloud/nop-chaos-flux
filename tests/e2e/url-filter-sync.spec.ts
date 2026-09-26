import { expect, test } from './fixtures.js';

test.describe('filter ↔ URL sync (missing-components L3.5)', () => {
  test('deep link restores the keyword filter and the list reflects it', async ({ page }) => {
    await page.goto('/#/complex-pages/standard-crud?keyword=顾北辰', { waitUntil: 'commit' });
    await expect(page.getByTestId('user-crud')).toBeVisible({ timeout: 30_000 });

    // Restored filter drove the load: only matching rows remain (or the empty
    // state when the mock seed has no match) — the URL value must be visible
    // in the keyword input of the query form.
    const keywordInput = page.getByPlaceholder('姓名 / 邮箱');
    await expect(keywordInput).toHaveValue('顾北辰', { timeout: 15_000 });
  });

  test('filtering writes back to the URL with replace semantics', async ({ page }) => {
    await page.goto('/#/complex-pages/standard-crud', { waitUntil: 'commit' });
    await expect(page.getByTestId('user-crud')).toBeVisible({ timeout: 30_000 });

    const keywordInput = page.getByPlaceholder('姓名 / 邮箱');
    await keywordInput.fill('青禾');
    await page.locator('[data-slot="crud-query"]').locator('button', { hasText: '搜索' }).click();

    await expect.poll(async () => page.evaluate(() => window.location.hash), { timeout: 15_000 }).toContain(
      'keyword=',
    );
    expect(await page.evaluate(() => window.location.hash)).toContain('keyword=');
  });
});
