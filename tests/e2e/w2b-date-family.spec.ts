import { expect, test } from './fixtures.js';

async function openW2b(page: import('@playwright/test').Page) {
  await page.goto('#/w2b-date-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '日期族 — input-date / input-datetime / input-time / date-range',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

async function openInputDatePopover(page: import('@playwright/test').Page) {
  // The input-date field frame is wrapped; the trigger lives inside demo-input-date.
  const field = page.locator('[data-testid="demo-input-date"]');
  await field.scrollIntoViewIfNeeded();
  await field.locator('[data-testid="date-trigger"]').click();
  const popover = page.locator('[data-testid="date-popover"]');
  await expect(popover).toBeVisible({ timeout: 10_000 });
  return popover;
}

async function clickDay(popover: import('@playwright/test').Locator, day: number) {
  // Day buttons re-render on focus/hover; Playwright's full pointer sequence can
  // race that re-render, so dispatch the click event directly — this fires
  // react-day-picker's real onSelect handler (the same path fireEvent.click
  // exercises in the unit tests).
  await popover
    .locator('button')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first()
    .dispatchEvent('click');
}

test.describe('W2b date family — input-date/input-datetime/input-time/date-range', () => {
  test('input-date writes the selected value back to scope (programmatic scope read)', async ({
    page,
  }) => {
    await openW2b(page);

    const report = page.locator('[data-testid="date-report"]');
    // Initial scope value flows into the report text node.
    await expect(report).toContainText('date:2024-06-09');

    // Select day 12 via the calendar — valueFormat storage is YYYY-MM-DD (utc).
    const popover = await openInputDatePopover(page);
    await clickDay(popover, 12);

    // The scope-backed report must reflect the new stored value (writeback verified
    // by reading scope-derived DOM text, not a screenshot).
    await expect(report).toHaveText('date:2024-06-12', { timeout: 10_000 });
  });
  test('input-date disables days outside minDate/maxDate', async ({ page }) => {
    await openW2b(page);

    // The bounded field constrains to 2024-06-10..2024-06-20 in the initial
    // June 2024 month, so no month navigation is required (deterministic).
    const field = page.locator('[data-testid="demo-input-date-bounded"]');
    await field.scrollIntoViewIfNeeded();
    await field.locator('[data-testid="date-trigger"]').click();
    const popover = page.locator('[data-testid="date-popover"]');
    await expect(popover).toBeVisible({ timeout: 10_000 });

    // Day 5 (before min) must be disabled; day 15 (inside) must be enabled.
    const day5 = popover.locator('button').filter({ hasText: /^5$/ }).first();
    const day15 = popover.locator('button').filter({ hasText: /^15$/ }).first();
    await expect(day5).toBeDisabled();
    await expect(day15).toBeEnabled();
  });

  test('date-range converges to one canonical type with rangeKind=date', async ({ page }) => {
    await openW2b(page);

    const rangeField = page.locator('[data-testid="demo-date-range"]');
    await rangeField.scrollIntoViewIfNeeded();
    // The canonical owner exposes the resolved kind for assertions.
    await expect(rangeField.locator('[data-range-kind]')).toHaveAttribute('data-range-kind', 'date');

    // The stored range uses the default ',' delimiter (scope-derived report).
    const report = page.locator('[data-testid="range-report"]');
    await expect(report).toContainText('range:2024-06-01,2024-06-10');
  });

  test('date-range shortcut writes a normalized range back to scope', async ({ page }) => {
    await openW2b(page);

    const rangeField = page.locator('[data-testid="demo-date-range"]');
    await rangeField.scrollIntoViewIfNeeded();
    await rangeField.locator('[data-testid="range-trigger"]').click();
    const popover = page.locator('[data-testid="range-popover"]');
    await expect(popover).toBeVisible({ timeout: 10_000 });

    // "Last 7 days" shortcut is provided start<=end; assert it writes back verbatim.
    await popover.getByRole('button', { name: 'Last 7 days' }).click();

    const report = page.locator('[data-testid="range-report"]');
    await expect(report).toContainText('range:2024-06-03,2024-06-10');
  });

  test('input-time reports the initial scope value via the report node', async ({ page }) => {
    await openW2b(page);

    const report = page.locator('[data-testid="time-report"]');
    await expect(report).toHaveText('time:08:30');
  });

  test('input-datetime reports the initial scope value via the report node', async ({ page }) => {
    await openW2b(page);

    const report = page.locator('[data-testid="datetime-report"]');
    await expect(report).toHaveText('datetime:2024-06-09 14:30');
  });
});
