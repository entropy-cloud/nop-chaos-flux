import { test, expect, assertTrackedPageErrors } from './fixtures.js';

test.describe('Calendar Demo', () => {
  test('page loads with month view visible', async ({ page }) => {
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeout: 15_000 });

    const resourceRows = page.locator('[data-slot="calendar-resource-row"]');
    await expect(resourceRows.first()).toBeVisible();
    const rowCount = await resourceRows.count();
    expect(rowCount).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('view switch buttons present with correct labels', async ({ page }) => {
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
    await assertTrackedPageErrors(page);
  });

  test('calendar navigation buttons work', async ({ page }) => {
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const dateDisplay = page.locator('[data-slot="calendar-header"] h2');
    const initialDateText = await dateDisplay.textContent();

    // Locale-agnostic: the app defaults to zh-CN but honors en-US builds.
    const nextBtn = page.locator('button[aria-label="Next"], button[aria-label="下一个"]');
    const prevBtn = page.locator('button[aria-label="Previous"], button[aria-label="上一个"]');

    await nextBtn.click();
    await expect(dateDisplay).not.toHaveText(initialDateText!, { timeout: 3_000 });

    await prevBtn.click();
    await expect(dateDisplay).toHaveText(initialDateText!, { timeout: 3_000 });
    await assertTrackedPageErrors(page);
  });

  test('events rendered with correct count and attributes', async ({ page }) => {
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const eventBlocks = page.locator('[data-slot="calendar-event"]');
    await expect(eventBlocks.first()).toBeVisible({ timeout: 10_000 });
    const eventCount = await eventBlocks.count();
    expect(eventCount).toBeGreaterThan(0);

    await expect(eventBlocks.first()).toHaveAttribute('data-event-id');
    await expect(eventBlocks.first()).toHaveAttribute('data-event-type');
    await assertTrackedPageErrors(page);
  });

  test('day cells clickable', async ({ page }) => {
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const cells = page.locator('[data-slot="calendar-cell"][data-date]');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('resource rows present', async ({ page }) => {
    await page.goto('/#/scheduling-calendar', { waitUntil: 'load' });
    await expect(page.locator('[data-view="month"]')).toBeVisible({ timeout: 15_000 });

    const resourceRows = page.locator('[data-slot="calendar-resource-row"]');
    const rowCount = await resourceRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
    await assertTrackedPageErrors(page);
  });
});
