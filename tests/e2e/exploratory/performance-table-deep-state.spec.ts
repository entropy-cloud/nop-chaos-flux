import { expect, test, type Page, assertTrackedPageErrors } from '../fixtures.js';

async function clearDebugger(page: Page) {
  await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    api?.clear?.();
  });
}

async function assertDebuggerHealthy(page: Page) {
  const result = await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    if (!api) {
      return { errors: [], failures: [] };
    }

    return {
      errors: api.queryEvents({ kind: 'error' }),
      failures: api.getRecentFailures({ limit: 10 }),
    };
  });

  expect(result.errors).toHaveLength(0);
  expect(result.failures).toHaveLength(0);
}

async function openPerformanceTable(page: Page) {
  await page.goto('/#/performance-table', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function waitForTableRows(page: Page) {
  await expect(page.locator('table tbody tr[data-slot="table-row"]').first()).toBeVisible({
    timeout: 45_000,
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Exploratory run-02: performance table deep state', () => {
  test('scope-owned selection and pagination stay coherent across page size and page changes', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);
    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario B: Nested loop card list')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario C: Scope-owned selection and pagination')).toBeVisible({
      timeout: 20_000,
    });
    await waitForTableRows(page);
    await clearDebugger(page);

    const selectedKeysText = page.getByText(/^Selected keys:/).first();
    const pageSizeText = page.getByText(/^Current page size:/).first();
    const pageSummaryText = page.getByText(/^Total: 1000 rows \| Selected:/).first();
    const pagination = page.locator('[data-slot="table-pagination"]');

    await expect(selectedKeysText).toContainText('none');
    await expect(pageSizeText).toContainText('50');
    await expect(pageSummaryText).toContainText('Selected: 0 | Page: 1');

    const firstCheckbox = page.locator('table tbody tr[data-slot="table-row"] [data-slot="checkbox"]').first();
    await firstCheckbox.click();
    await expect(selectedKeysText).not.toContainText('none');
    await expect(pageSummaryText).toContainText('Selected: 1 | Page: 1');

    await pagination.getByLabel('Next page').click();
    await expect(pageSummaryText).toContainText('Selected: 1 | Page: 2');

    const pageSizeSelect = pagination.getByRole('combobox').first();
    await pageSizeSelect.selectOption('25');
    await expect(pageSizeText).toContainText('25');
    await expect(pageSummaryText).toContainText('Selected: 1 | Page: 1');

    await pagination.getByLabel('Next page').click();
    await expect(pageSummaryText).toContainText('Selected: 1 | Page: 2');

    await assertDebuggerHealthy(page);
  });

  test('sorting and row action updates keep scope state and debugger failures clean', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);
    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario B: Nested loop card list')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario C: Scope-owned selection and pagination')).toBeVisible({
      timeout: 20_000,
    });
    await waitForTableRows(page);
    await clearDebugger(page);

    const lastActionText = page.getByText(/^Last action:/).first();
    const pageSummaryText = page.getByText(/^Total: 1000 rows \| Selected:/).first();

    const usernameSort = page.getByRole('columnheader', { name: /Profile/i }).getByRole('button').first();
    await usernameSort.click();
    await usernameSort.click();

    const firstProfile = page.locator('table tbody tr[data-slot="table-row"]').first();
    await expect(firstProfile).toContainText('user_');

    const pingButton = page.getByRole('button', { name: 'Ping' }).first();
    await pingButton.click();
    await expect(lastActionText).toContainText('ping:');
    await expect(pageSummaryText).toContainText('Page: 1');

    await assertDebuggerHealthy(page);
  });
});
