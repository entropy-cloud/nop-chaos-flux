import { expect, test } from '../fixtures.js';
import {
  crudFooter,
  crudStage,
  crudTable,
  dataRows,
  expectCrudStageVisible,
  expectRowTexts,
  openCrudLab,
  readComputedStyle,
  readInnerHtml,
} from './crud-test-utils';

test.describe('crud renderer rendering and style', () => {
  test('renders the basic CRUD shell with sticky fixed columns', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'Basic CRUD shell');

    await expectCrudStageVisible(stage);
    await expect(stage.locator('[data-slot="crud-toolbar"]')).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);
    await expectRowTexts(stage, ['Alpha', 'Beta', 'Gamma']);

    const fixedHeader = stage.locator('[data-slot="table-head"][data-fixed="left"]').first();
    const fixedCell = stage.locator('tbody [data-fixed="left"]').first();
    await expect(fixedHeader).toBeVisible();
    await expect(fixedCell).toBeVisible();

    const headerStyle = await readComputedStyle(fixedHeader, ['position', 'left']);
    const cellStyle = await readComputedStyle(fixedCell, ['position', 'left']);
    expect(headerStyle.position).toBe('sticky');
    expect(headerStyle.left).toBe('0px');
    expect(cellStyle.position).toBe('sticky');
    expect(cellStyle.left).toBe('0px');

    const tableHtml = await readInnerHtml(crudTable(stage));
    expect(tableHtml).toContain('data-fixed="left"');
    expect(tableHtml).toContain('Alpha');
  });

  test('renders query workflow shell with fixed left and right columns plus inline column settings', async ({
    page,
  }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD workflow with query, toolbars, and fixed columns');

    await expectCrudStageVisible(stage);
    await expect(stage.locator('[data-slot="crud-query"]')).toBeVisible();
    await expect(stage.locator('[data-slot="header-toolbar-pagination"]')).toBeVisible();
    await expect(stage.locator('[data-slot="footer-toolbar-statistics"]')).toBeVisible();
    await expect(stage.locator('[data-slot="footer-toolbar-page-size"]')).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Delete Selected' }).first()).toBeVisible();

    await stage.getByRole('button', { name: /列设置|columns/i }).click();
    const inlinePanel = stage.locator('[data-slot="table-column-settings-inline"]');
    await expect(inlinePanel).toBeVisible();

    const panelStyle = await readComputedStyle(inlinePanel, ['max-width', 'background-color']);
    expect(panelStyle['max-width']).not.toBe('none');
    expect(panelStyle['background-color']).not.toBe('rgba(0, 0, 0, 0)');

    const leftHeader = stage.locator('[data-slot="table-head"][data-fixed="left"]').first();
    const rightHeader = stage.locator('[data-slot="table-head"][data-fixed="right"]').first();
    const rightCell = stage.locator('tbody [data-fixed="right"]').first();
    const rightStyle = await readComputedStyle(rightHeader, ['position', 'right']);
    const rightCellStyle = await readComputedStyle(rightCell, ['position', 'right']);
    expect(rightStyle.position).toBe('sticky');
    expect(rightStyle.right).toBe('0px');
    expect(rightCellStyle.position).toBe('sticky');
    expect(rightCellStyle.right).toBe('0px');
    await expect(leftHeader).toBeVisible();

    const stageHtml = await readInnerHtml(stage.locator('[data-slot="crud-table"]'));
    expect(stageHtml).toContain('data-slot="table-column-settings-inline"');
    expect(stageHtml).toContain('data-fixed="right"');
  });

  test('renders source-result footer summary from $crud binding', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD source-result baseline');

    await expectCrudStageVisible(stage);
    await expect(crudFooter(stage)).toContainText('Visible rows: 3; Total: 42');
    await expect(dataRows(stage)).toHaveCount(3);

    const footerHtml = await readInnerHtml(crudFooter(stage));
    expect(footerHtml).toContain('Visible rows: 3; Total: 42');
  });

  test('renders responsive expand detail rows with grid styling', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, 'CRUD responsive expand baseline');

    await expectCrudStageVisible(stage);
    await expect(stage.locator('tbody tr[data-slot="table-row"]')).toHaveCount(3);

    const firstRow = stage.locator('tbody tr[data-slot="table-row"]').first();
    await firstRow.click();

    const expanded = stage.locator('[data-slot="table-responsive-expanded"]');
    await expect(expanded).toBeVisible();
    await expect(stage.locator('[data-slot="table-responsive-expanded-item"]')).toHaveCount(2);

    const expandedStyle = await readComputedStyle(expanded, ['display', 'grid-template-columns']);
    expect(expandedStyle.display).toBe('grid');
    expect(expandedStyle['grid-template-columns']).not.toBe('none');

    const expandedHtml = await readInnerHtml(expanded);
    expect(expandedHtml).toContain('Owner');
    expect(expandedHtml).toContain('Category');
    expect(expandedHtml).toContain('Alice');
    expect(expandedHtml).toContain('Platform');
  });
});
