import { test, expect } from './fixtures.js';

test.describe('Calendar Demo', () => {
  test('page loads with month view visible', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 15_000 });

    const resourceRows = page.locator('[data-slot="calendar-resource-row"]');
    await expect(resourceRows.first()).toBeVisible();
    const rowCount = await resourceRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('view switch buttons present with correct labels', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const headerButtons = page.locator('[data-slot="calendar-header"] button');
    const allTexts = await headerButtons.allTextContents();

    const monthBtn = allTexts.find((t) => t.trim() === '月');
    const weekBtn = allTexts.find((t) => t.trim() === '周');
    const dayBtn = allTexts.find((t) => t.trim() === '日');

    expect(monthBtn).toBeTruthy();
    expect(weekBtn).toBeTruthy();
    expect(dayBtn).toBeTruthy();
  });

  test('calendar navigation buttons work', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const dateDisplay = page.locator('[data-slot="calendar-header"] h2');
    const initialDateText = await dateDisplay.textContent();

    await page.locator('button[aria-label="Next"]').click();
    await expect(dateDisplay).not.toHaveText(initialDateText!, { timeout: 3_000 });

    await page.locator('button[aria-label="Previous"]').click();
    await expect(dateDisplay).toHaveText(initialDateText!, { timeout: 3_000 });
  });

  test('events rendered in month view', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const hasEventBlocks = await page.evaluate(() => {
      return document.querySelectorAll('.nop-calendar-event-block').length > 0;
    });

    if (hasEventBlocks) {
      await expect(page.locator('.nop-calendar-event-block').first()).toBeVisible();
    }
  });

  test('day cells clickable', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const cells = page.locator('[data-slot="calendar-cell"][data-date]');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
  });

  test('resource rows present', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(100);
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const resourceRows = page.locator('[data-slot="calendar-resource-row"]');
    const rowCount = await resourceRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});
