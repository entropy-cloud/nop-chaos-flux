import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openInputSuggestPage(page: import('@playwright/test').Page) {
  await page.goto('/#/input-suggest', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'Input Autocomplete — Data-Source Async Suggestions',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 input autocomplete (data-source suggestions)', () => {
  test('typing shows suggestion popover and selecting writes back value', async ({ page }) => {
    await openInputSuggestPage(page);

    const input = page.getByLabel('Fruit (async suggest)');
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.click();
    await input.fill('ap');

    const list = page.locator('[data-slot="input-suggest-list"]');
    await expect(list).toBeVisible({ timeout: 10_000 });

    const firstItem = page.locator('[data-slot="input-suggest-item"]').first();
    await expect(firstItem).toBeVisible();
    const expectedValue = await firstItem.getAttribute('data-value');
    expect(expectedValue).toBeTruthy();

    await firstItem.click();

    await expect(input).toHaveValue(expectedValue!);

    const liveValue = await page.getByTestId('input-suggest-fruit').textContent();
    expect(liveValue).toContain(expectedValue!);

    await expect(list).toBeHidden({ timeout: 5_000 });

    await assertTrackedPageErrors(page);
  });

  test('suggestTemplate region renders custom item content', async ({ page }) => {
    await openInputSuggestPage(page);

    const input = page.getByLabel('Fruit (suggestTemplate region)');
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.click();
    await input.fill('che');

    const list = page.locator('[data-slot="input-suggest-list"]');
    await expect(list).toBeVisible({ timeout: 10_000 });

    const firstItem = page.locator('[data-slot="input-suggest-item"]').first();
    const text = (await firstItem.textContent()) ?? '';
    expect(text).toContain('value:');

    await assertTrackedPageErrors(page);
  });

  test('keyboard Escape closes popover without changing value', async ({ page }) => {
    await openInputSuggestPage(page);

    const input = page.getByLabel('Fruit (async suggest)');
    await input.click();
    await input.fill('ap');

    const list = page.locator('[data-slot="input-suggest-list"]');
    await expect(list).toBeVisible({ timeout: 10_000 });

    await input.press('Escape');

    await expect(list).toBeHidden({ timeout: 5_000 });
    await expect(input).toHaveValue('ap');

    await assertTrackedPageErrors(page);
  });
});
