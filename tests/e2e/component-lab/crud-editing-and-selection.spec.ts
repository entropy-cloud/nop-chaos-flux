import { expect, test } from '@playwright/test';
import {
  crudFooter,
  crudStage,
  dataRows,
  expectCrudStageVisible,
  openCrudLab,
  readInnerHtml,
} from './crud-test-utils';

test.describe('crud renderer editing and selection flows', () => {
  test('supports inline quick edit and persists the updated row value', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD quick-edit baseline');

    await expectCrudStageVisible(stage);
    const inlineEditor = stage.locator('[data-slot="table-quick-edit"]').first();
    const input = inlineEditor.locator('input[name="quick-edit-name"]');
    await input.fill('Alpha Prime');
    await inlineEditor.getByRole('button', { name: 'Save' }).click();

    await expect(stage.getByRole('cell', { name: 'Alpha Prime', exact: true })).toBeVisible();

    const quickEditHtml = await readInnerHtml(inlineEditor);
    expect(quickEditHtml).toContain('quick-edit-name');
  });

  test('supports dialog quick edit shell and updates the row value on save', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD quick-edit baseline');

    await expectCrudStageVisible(stage);
    await stage.getByRole('button', { name: 'Dialog Status' }).first().click();

    const dialog = page.locator('[data-slot="table-quick-edit-dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Status').fill('review');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(stage.getByRole('cell', { name: 'review', exact: true })).toBeVisible();
  });

  test('updates selection-driven list actions and clears selection on refresh', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD selection refresh baseline');

    await expectCrudStageVisible(stage);
    await expect(dataRows(stage)).toHaveCount(3);

    const bulkDelete = stage.getByRole('button', { name: 'Bulk Delete' });
    await expect(bulkDelete).toBeDisabled();
    await expect(crudFooter(stage)).toContainText('Selected rows: 0');

    const rowCheckboxes = stage.locator('tbody [data-slot="checkbox"]');
    await rowCheckboxes.first().click();

    await expect(bulkDelete).toBeEnabled();
    await expect(crudFooter(stage)).toContainText('Selected rows: 1');

    await stage.getByRole('button', { name: 'Refresh current list' }).click();

    await expect(bulkDelete).toBeDisabled();
    await expect(crudFooter(stage)).toContainText('Selected rows: 0');
  });
});
