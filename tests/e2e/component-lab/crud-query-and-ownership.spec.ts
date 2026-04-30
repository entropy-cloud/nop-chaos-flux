import { expect, test } from '@playwright/test';
import {
  crudFooter,
  crudScopeDebug,
  crudStage,
  dataRows,
  emptyRows,
  expectCrudStageVisible,
  openCrudLab,
} from './crud-test-utils';

test.describe('crud renderer query and ownership flows', () => {
  test('filters and resets rows through the query workflow', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD workflow with query, toolbars, and fixed columns');

    await expectCrudStageVisible(stage);
    const keyword = stage.getByLabel('Keyword');
    await keyword.fill('Al');
    await stage.getByRole('button', { name: /搜索|search/i }).click();

    await expect(dataRows(stage)).toHaveCount(1);
    await expect(stage.getByRole('cell', { name: 'Alpha', exact: true })).toBeVisible();
    await expect(stage.getByRole('cell', { name: 'Beta', exact: true })).toHaveCount(0);
    await expect(crudFooter(stage)).toContainText('Visible rows: 1');
    await expect(crudScopeDebug(stage)).toContainText('"keyword": "Al"');

    await stage.getByRole('button', { name: /重置|reset/i }).click();
    await expect(dataRows(stage)).toHaveCount(3);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3');
    await expect(crudScopeDebug(stage)).not.toContainText('"keyword": "Al"');
  });

  test('refreshes request-owned source data through the CRUD owner surface', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD request-owned refresh baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText(/Visible rows: 1; Total: 4\d/);

    await stage.getByRole('button', { name: 'Refresh source owner' }).click();

    await expect(stage.getByRole('cell', { name: /User-\d+/, exact: false }).first()).toBeVisible();
    await expect(
      stage.getByRole('cell', { name: /Owner-\d+/, exact: false }).first(),
    ).toBeVisible();
    await expect(crudFooter(stage)).toContainText(/Visible rows: 1; Total: 4\d/);
    await expect(crudScopeDebug(stage)).toContainText('"pagedRecords"');
    await expect(crudScopeDebug(stage)).toContainText('"refreshCount": 1');
  });

  test('keeps client-mode filtering local when loadDataOnce is enabled', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD client-mode baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3; Total: 42; Query: none');

    await stage.getByLabel('Keyword').fill('Ga');
    await stage.getByRole('button', { name: /搜索|search/i }).click();

    await expect(dataRows(stage)).toHaveCount(1);
    await expect(stage.getByRole('cell', { name: 'Gamma', exact: true })).toBeVisible();
    await expect(crudFooter(stage)).toContainText('Visible rows: 1; Total: 42; Query: Ga');
    await expect(crudScopeDebug(stage)).toContainText('"keyword": "Ga"');
  });

  test('re-enters the upstream source owner when client-mode fetchOnFilter is enabled', async ({
    page,
  }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD client-mode fetch-on-filter baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText(/Visible rows: \d+; Total: \d+; Query: none/);

    await stage.getByLabel('Keyword').fill('remote');
    await stage.getByRole('button', { name: /搜索|search/i }).click();

    await expect(crudFooter(stage)).toContainText(/Visible rows: 0; Total: \d+; Query: remote/);
    await expect(crudScopeDebug(stage)).toContainText('"keyword": "remote"');
    await expect(crudScopeDebug(stage)).toContainText('"Client-');
  });

  test('shows the empty row when a query removes all visible items', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD source-result baseline');

    await expectCrudStageVisible(stage);
    await stage.getByLabel('Keyword').fill('zzz');
    await stage.getByRole('button', { name: /搜索|search/i }).click();

    await expect(dataRows(stage)).toHaveCount(0);
    await expect(emptyRows(stage)).toHaveCount(1);
    await expect(crudFooter(stage)).toContainText('Visible rows: 0; Total: 42');
    await expect(crudScopeDebug(stage)).toContainText('"keyword": "zzz"');
  });
});
