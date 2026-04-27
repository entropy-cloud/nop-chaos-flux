import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function openPerformanceTable(page: import('@playwright/test').Page) {
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
}

test.describe('Performance Table Page', () => {
  test('switches scenario modes and updates host-mutation measurement output', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);

    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible();

    await page.getByRole('button', { name: 'Table Only' }).click();
    await expect(page.getByText('Scenario D: Editable subset form')).toHaveCount(0);

    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible();

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Host row mutation benchmark: 20 updates')).toBeVisible({ timeout: 60_000 });
  });

  test('resets the measurement panel after a host benchmark run', async ({ page }) => {
    await openPerformanceTable(page);

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Reset Metrics' }).click();
    await expect(page.getByText('Last Measurement')).toHaveCount(0);
  });
});
