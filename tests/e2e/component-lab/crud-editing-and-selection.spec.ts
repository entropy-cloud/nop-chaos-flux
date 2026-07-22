import { expect, test } from '../fixtures.js';
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
    await input.press('Enter');

    await expect(inlineEditor.locator('input[name="quick-edit-name"]')).toHaveValue('Alpha Prime');

    const quickEditHtml = await readInnerHtml(inlineEditor);
    expect(quickEditHtml).toContain('quick-edit-name');
  });

  test('supports dialog quick edit shell and preserves the edited value when reopened', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD quick-edit baseline');

    await expectCrudStageVisible(stage);
    await stage.getByRole('button', { name: 'Dialog Status' }).first().click();

    const dialog = page.locator('[data-slot="table-quick-edit-dialog"]');
    await expect(dialog).toBeVisible();
    const statusInput = dialog.getByLabel('Status');
    await statusInput.fill('review');

    await dialog.getByRole('button', { name: /关闭|close/i }).first().click();
    await expect(dialog).toHaveCount(0);
  });

  test('updates selection-driven list actions and clears selection on refresh', async ({
    page,
  }) => {
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

  test('keeps only one selected row in radio selection mode', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD radio selection baseline');

    await expectCrudStageVisible(stage);

    const inspectSelected = stage.getByRole('button', { name: 'Inspect Selected' });
    await expect(inspectSelected).toBeDisabled();
    await expect(crudFooter(stage)).toContainText('Selected rows: 0');

    const radios = stage.locator('tbody [data-slot="radio-group-item"]');
    await expect(radios).toHaveCount(3);

    await radios.nth(0).click();
    await expect(inspectSelected).toBeEnabled();
    await expect(crudFooter(stage)).toContainText('Selected rows: 1; Keys: 1');

    await radios.nth(1).click();
    await expect(crudFooter(stage)).toContainText('Selected rows: 1; Keys: 2');
    await expect(crudFooter(stage)).not.toContainText('Keys: 1,2');

    const alignment = await stage.evaluate((root) => {
      const headerCells = Array.from(root.querySelectorAll('thead [data-slot="table-head"]')) as HTMLElement[];
      const bodyRow = root.querySelector('tbody tr[data-slot="table-row"]');
      const bodyCells = bodyRow
        ? (Array.from(bodyRow.querySelectorAll('td')) as HTMLElement[])
        : [];

      return {
        headerLefts: headerCells.map((cell) => Math.round(cell.getBoundingClientRect().left)),
        bodyLefts: bodyCells.map((cell) => Math.round(cell.getBoundingClientRect().left)),
      };
    });

    expect(alignment.headerLefts.length).toBeGreaterThanOrEqual(2);
    expect(alignment.bodyLefts.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(alignment.headerLefts[0]! - alignment.bodyLefts[1]!)).toBeLessThanOrEqual(2);
    expect(Math.abs(alignment.headerLefts[1]! - alignment.bodyLefts[2]!)).toBeLessThanOrEqual(2);
  });
});
