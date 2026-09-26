import { expect, test } from '@playwright/test';

/**
 * L4.11a table column drag reorder (plan 513 Phase 6): columnSettings with
 * `draggable: true` renders drag handles; dropping one row's handle onto
 * another reorders the columns through the ordered-columns state channel.
 * Selectors are structural (data-slot) so the spec is locale-independent.
 */

test.describe('table column drag reorder (L4.11a)', () => {
  test('dragging a handle onto another row reorders the columns', async ({ page }) => {
    await page.goto('/#/lab/table');
    const table = page.locator('[data-testid="column-drag-table"]');
    await expect(table).toBeVisible();

    const settingsPanel = page.locator('[data-slot="table-column-settings"]').last();
    await settingsPanel.getByRole('button').click();

    const handles = table
      .locator('xpath=ancestor::*[last()]')
      .locator('[data-slot="table-column-settings-drag-handle"]');
    await expect(handles).toHaveCount(3);

    // Drag the first row's handle (Name) onto the last row (Role).
    const items = table
      .locator('xpath=ancestor::*[last()]')
      .locator('[data-slot="table-column-settings-item"]');
    await handles.nth(0).dragTo(items.nth(2));

    const labels = await table.locator('thead th').allInnerTexts();
    expect(labels.map((label) => label.trim())).toEqual(['Email', 'Role', 'Name']);
  });
});
