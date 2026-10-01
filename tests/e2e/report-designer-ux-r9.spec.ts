import { expect, test } from './fixtures.js';

/**
 * ux-r9 Report Designer 程序化断言（RD-1/2/3）。
 */

async function openReportDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
}

test('rd1-seeded-report: canvas shows the seeded sample report content', async ({ page }) => {
  await openReportDesigner(page);

  const canvas = page.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas.locator('text=Demo Sales Report').first()).toBeVisible({ timeout: 10_000 });
  await expect(canvas.locator('text=Acme Corp').first()).toBeVisible();
});

test('rd2-cell-inspector-actions: selecting a cell exposes style actions that apply', async ({
  page,
}) => {
  await openReportDesigner(page);

  const canvas = page.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  const cellA3 = canvas.locator("td[data-row='2'][data-col='0']").first();
  await cellA3.click();
  await expect(page.locator('[data-slot="report-cell-style-panel"]')).toBeVisible({
    timeout: 10_000,
  });

  await page.locator('[data-testid="report-style-bold"]').click();
  await expect(cellA3, 'bold style should add ss-bold to the cell').toHaveClass(/ss-bold/, {
    timeout: 10_000,
  });
});

test('rd3-binding-indicator-readable: bound cell fx indicator is ≥12px', async ({ page }) => {
  await openReportDesigner(page);

  const canvas = page.locator("[data-slot='report-designer-spreadsheet-canvas']").first();
  const boundCell = canvas.locator("td[data-row='1'][data-col='1']").first();
  await expect(boundCell).toBeVisible({ timeout: 10_000 });

  const indicator = boundCell.locator("[data-slot='spreadsheet-bound-indicator']");
  await expect(indicator).toBeVisible();
  const fontSize = await indicator.evaluate((el) => getComputedStyle(el).fontSize);
  const px = Number.parseFloat(fontSize);
  expect(px, `fx indicator font-size ${fontSize}`).toBeGreaterThanOrEqual(12);
});
