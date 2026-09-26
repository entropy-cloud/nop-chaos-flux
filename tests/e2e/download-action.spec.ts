import { expect, test } from './fixtures.js';

test.describe('download built-in action (missing-components L3.3)', () => {
  test('export button fetches the backend-generated CSV and triggers a real download', async ({ page }) => {
    await page.goto('/#/complex-pages/crud-views-export', { waitUntil: 'commit' });
    await expect(page.getByTestId('crud-views-export-page')).toBeVisible({ timeout: 30_000 });

    // Host-channels contract (plan 512 L3.3): the backend generates the file;
    // the `download` action fetches it and triggers the browser save flow.
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await page.getByTestId('btn-export').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^users-\d+\.csv$/);
    // The report UI chain (ajax → setValue) still drives the on-page state.
    await expect(page.getByTestId('export-report')).toContainText('已生成', { timeout: 10_000 });
  });
});
