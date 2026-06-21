import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openEventPreventionDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/event-prevention', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'X2 Schema-Driven preventDefault / stopPropagation',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('X2 schema-driven preventDefault / stopPropagation', () => {
  test('preventDefault: true on native form submit blocks submission', async ({ page }) => {
    await openEventPreventionDemo(page);

    const initialUrl = page.url();

    await page.getByTestId('native-submit-button').click();
    await page.waitForTimeout(200);

    // No navigation happened.
    expect(page.url()).toBe(initialUrl);
    await assertTrackedPageErrors(page);
  });

  test('preventDefault: true on native link blocks navigation', async ({ page }) => {
    await openEventPreventionDemo(page);

    const initialUrl = page.url();

    await page.getByTestId('native-link').click();
    await page.waitForTimeout(200);

    expect(page.url()).toBe(initialUrl);
    await assertTrackedPageErrors(page);
  });

  test('preventDefault: true on keydown blocks all keystrokes from entering the input', async ({
    page,
  }) => {
    await openEventPreventionDemo(page);

    const input = page.getByTestId('native-keydown-input');

    await input.focus();
    await page.keyboard.type('a1b2');

    const value = await input.inputValue();
    expect(value).toBe('');

    await assertTrackedPageErrors(page);
  });

  test('toggling keydown prevention off allows typing', async ({ page }) => {
    await openEventPreventionDemo(page);

    // Toggle the keydown prevention off (third checkbox in the page).
    await page
      .getByRole('checkbox')
      .nth(2)
      .uncheck();

    const input = page.getByTestId('native-keydown-input');
    await input.focus();
    await page.keyboard.type('a1b2');

    const value = await input.inputValue();
    expect(value).toBe('a1b2');

    await assertTrackedPageErrors(page);
  });
});
