import { expect, test } from './fixtures.js';

async function openW3d(page: import('@playwright/test').Page) {
  await page.goto('#/w3d-advanced-input-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '高级输入族 — period / markdown-editor / upload / editor',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W3d period family — input-month/quarter/year', () => {
  test('input-month writes the selected value back to scope (programmatic scope read)', async ({
    page,
  }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="month-report"]');
    await expect(report).toContainText('month:2024-06');

    const input = page.locator('[data-testid="demo-input-month"] input[data-testid="period-input-month"]');
    await input.scrollIntoViewIfNeeded();
    // 2024-09 is inside the minDate(2024-01)/maxDate(2024-12) window.
    await input.fill('2024-09');

    await expect(report).toHaveText('month:2024-09', { timeout: 10_000 });
  });

  test('input-quarter renders the initial quarter and writes a new quarter selection', async ({
    page,
  }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="quarter-report"]');
    await expect(report).toContainText('quarter:2024-Q3');

    const host = page.locator('[data-testid="demo-input-quarter"] [data-testid="period-input-quarter"]');
    await host.scrollIntoViewIfNeeded();
    const select = host.locator('select');
    await select.selectOption('1');

    await expect(report).toHaveText('quarter:2024-Q1', { timeout: 10_000 });
  });

  test('input-year writes the selected year back to scope', async ({ page }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="year-report"]');
    await expect(report).toContainText('year:2024');

    const input = page.locator('[data-testid="demo-input-year"] input[data-testid="period-input-year"]');
    await input.scrollIntoViewIfNeeded();
    await input.fill('');
    await input.fill('2031');

    await expect(report).toHaveText('year:2031', { timeout: 10_000 });
  });

  test('input-month range selectionMode joins ends with the delimiter', async ({ page }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="range-report"]');
    await expect(report).toContainText('range:2024-01,2024-06');

    // The range field exposes its resolved selection mode for assertions.
    const rangeField = page.locator('[data-testid="demo-input-month-range"]');
    await expect(rangeField.locator('[data-selection-mode]')).toHaveAttribute(
      'data-selection-mode',
      'range',
    );
  });
});
