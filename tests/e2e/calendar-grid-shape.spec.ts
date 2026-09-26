import { expect, test } from '@playwright/test';

/**
 * L4.2 calendar monthShape:'grid' (plan 514 Phase 2): six-week date-selection
 * grid renders with zero events/resources; clicking a cell marks it selected
 * (selection ≠ navigation — no date change).
 */

test.describe('calendar grid month shape (L4.2)', () => {
  test('renders 42 selectable cells and marks the clicked date', async ({ page }) => {
    await page.goto('/#/lab/calendar');
    const calendar = page.locator('[data-testid="calendar-grid-shape"]');
    await expect(calendar).toBeVisible();

    const cells = calendar.locator('[data-slot="calendar-grid-cell"]');
    await expect(cells).toHaveCount(42);
    await expect(calendar.locator('[data-outside-month]').first()).toBeAttached();

    const target = calendar.locator('[data-outside-month]').first();
    await target.click();
    await expect(target).toHaveAttribute('data-selected', 'true');
  });
});
