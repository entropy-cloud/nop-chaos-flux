import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openTablePopOverDemoPage(page: import('@playwright/test').Page) {
  await page.goto('/#/table-popover', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'table popOver 单元格（详情弹层）', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 table cell popOver', () => {
  test('click trigger opens popover content region and Esc closes it', async ({ page }) => {
    await openTablePopOverDemoPage(page);

    const trigger = page.locator('[data-slot="table-cell-popover-trigger"]').first();
    await expect(trigger).toBeVisible({ timeout: 10_000 });

    // Popover content not visible before click.
    expect(await page.locator('[data-slot="table-cell-popover-content"]').count()).toBe(0);

    await trigger.click();

    // Content region renders inside PopoverContent portal — it must be visible.
    const content = page.locator('[data-slot="table-cell-popover-content"]');
    await expect(content).toBeVisible({ timeout: 5_000 });

    // Title marker present.
    await expect(page.locator('[data-slot="table-cell-popover-title"]')).toContainText(
      'Note details',
    );

    // Cell value text appears inside the rendered region.
    await expect(content).toContainText('Alice');

    // Esc closes the popover (Base UI escape handling).
    await page.keyboard.press('Escape');
    await expect(content).toBeHidden({ timeout: 5_000 });

    await assertTrackedPageErrors(page);
  });

  test('copyable icon and popOver trigger coexist on the same cell', async ({ page }) => {
    await openTablePopOverDemoPage(page);

    // Second table demonstrates copyable + popOver coexistence.
    // Find the table cell that contains the email value "alice@example.com".
    const emailCell = page
      .locator('td')
      .filter({ hasText: 'alice@example.com' })
      .first();
    await expect(emailCell).toBeVisible({ timeout: 10_000 });

    // Both markers are present within the cell.
    await expect(emailCell.locator('[data-slot="table-cell-copy-button"]')).toBeVisible();
    await expect(emailCell.locator('[data-slot="table-cell-popover-trigger"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('onEmpty=show renders trigger for empty row value and shows emptyText fallback', async ({
    page,
  }) => {
    await openTablePopOverDemoPage(page);

    // Third table uses onEmpty: 'show' for empty descriptions. The trigger is
    // rendered for cells whose row value is empty.
    const triggers = page.locator('[data-slot="table-cell-popover-trigger"]');
    // At least 3 triggers: 3 from table 1 (note column, but Carol's is empty),
    // 1 from table 2 (email column), 2 from table 3 (onEmpty=show, both rows).
    await expect(triggers.first()).toBeVisible({ timeout: 10_000 });

    // The last two triggers belong to the empty-rows table (onEmpty=show).
    const emptyTrigger = triggers.nth(-1);
    await emptyTrigger.click();

    const empty = page.locator('[data-slot="table-cell-popover-empty"]');
    await expect(empty).toBeVisible({ timeout: 5_000 });
    await expect(empty).toContainText('No description available for this row');

    await assertTrackedPageErrors(page);
  });
});
