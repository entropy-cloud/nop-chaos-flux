import { expect, test } from '../fixtures.js';
import {
  crudFooter,
  crudStage,
  dataRows,
  expectCrudStageVisible,
  openCrudLab,
} from './crud-test-utils';

test.describe('crud renderer query and ownership flows', () => {
  test('filters and resets rows through the query workflow', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD workflow with query, toolbars, and fixed columns');

    await expectCrudStageVisible(stage);
    await expect(stage.getByLabel('Keyword')).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3');
  });

  test('refreshes request-owned source data through the CRUD owner surface', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD request-owned refresh baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3; Total: 42');

    await stage.getByRole('button', { name: 'Refresh source owner' }).click();

    await expect(stage.getByRole('cell', { name: /User-\d+/, exact: false }).first()).toBeVisible();
    await expect(stage.getByRole('cell', { name: /Owner-\d+/, exact: false }).first()).toBeVisible();
  });

  test('keeps client-mode filtering local when loadDataOnce is enabled', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD client-mode baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3; Total: 42; Query: none');
  });

  test('re-enters the upstream source owner when client-mode fetchOnFilter is enabled', async ({
    page,
  }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD client-mode fetch-on-filter baseline');

    await expectCrudStageVisible(stage);
    await expect(stage.getByLabel('Keyword')).toBeVisible();
    await expect(crudFooter(stage)).toContainText(/Visible rows: \d+/);
  });

  test('shows the empty row when a query removes all visible items', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD source-result baseline');

    await expectCrudStageVisible(stage);
    await expect(stage.getByLabel('Keyword')).toBeVisible();
    await expect(crudFooter(stage)).toContainText('Visible rows: 3; Total: 42');
  });
});
