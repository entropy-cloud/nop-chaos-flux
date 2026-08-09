import { expect, test } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';
import { crudStage, crudTable, dataRows, openCrudLab, readComputedStyle } from './crud-test-utils';

const QUERY_STAGE = 'CRUD workflow with query, toolbars, and fixed columns';

function dialogSurfaces(page: import('@playwright/test').Page) {
  return page.locator('[data-slot="dialog-surface"]');
}

async function waitForDialogWidth(surface: import('@playwright/test').Locator, expected: number) {
  await expect
    .poll(async () => {
      const box = await surface.boundingBox();
      return box ? Math.round(box.width) : -1;
    })
    .toBe(expected);
}

test.describe('C1a AMIS visual parity acceptance', () => {
  test('table density tokens apply in real browser (12/14px fonts, 40px thead, 10/11px padding, 16px edge)', async ({
    page,
  }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, QUERY_STAGE);
    await expect(stage).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);

    const table = crudTable(stage);
    const firstHead = table.locator('thead th').first();
    const firstBodyCell = table.locator('tbody td').first();

    const headStyle = await readComputedStyle(firstHead, ['font-size', 'height']);
    expect(headStyle['font-size']).toBe('14px');
    expect(headStyle.height).toBe('40px');

    const cellStyle = await readComputedStyle(firstBodyCell, [
      'font-size',
      'padding-top',
      'padding-bottom',
      'padding-left',
    ]);
    expect(cellStyle['font-size']).toBe('12px');
    expect(cellStyle['padding-top']).toBe('11px');
    expect(cellStyle['padding-bottom']).toBe('11px');
    expect(cellStyle['padding-left']).toBe('16px');

    const firstRow = dataRows(stage).first();
    const rowCells = firstRow.locator('td');
    const middleCell = rowCells.nth(Math.floor((await rowCells.count()) / 2));
    const lastCell = rowCells.last();

    const middleStyle = await readComputedStyle(middleCell, ['padding-left', 'padding-right']);
    expect(middleStyle['padding-left']).toBe('10px');
    expect(middleStyle['padding-right']).toBe('10px');

    const lastStyle = await readComputedStyle(lastCell, ['padding-right']);
    expect(lastStyle['padding-right']).toBe('16px');

    const rowBox = await firstRow.boundingBox();
    expect(rowBox!.height).toBeGreaterThan(35);
  });

  test('fixed-column hover pass-through: fixed cell background matches middle cell on row hover', async ({
    page,
  }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, QUERY_STAGE);
    await expect(stage).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);

    const table = crudTable(stage);
    const firstRow = dataRows(stage).first();
    const fixedCell = table.locator('tbody td[data-fixed="left"]').first();
    const middleCell = firstRow.locator('td[data-fixed="left"] ~ td:not([data-fixed])').first();

    const rowBgBefore = await readComputedStyle(firstRow, ['background-color']);
    expect(rowBgBefore['background-color']).toBe('rgba(0, 0, 0, 0)');

    await middleCell.hover();

    await expect
      .poll(async () => (await readComputedStyle(firstRow, ['background-color']))['background-color'])
      .not.toBe('rgba(0, 0, 0, 0)');

    const fixedBg = await readComputedStyle(fixedCell, ['background-color']);
    const middleBg = await readComputedStyle(middleCell, ['background-color']);
    expect(fixedBg['background-color']).toBe(middleBg['background-color']);
    expect(fixedBg['background-color']).toBe('rgba(0, 0, 0, 0)');
  });

  test('fixed edge shadow markers render with a real ::after box-shadow', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, QUERY_STAGE);
    await expect(stage).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);

    const table = crudTable(stage);
    const edgeLeft = table.locator('td.nop-table-sticky-edge-left').first();
    const edgeRight = table.locator('td.nop-table-sticky-edge-right').first();
    await expect(edgeLeft).toHaveCount(1);
    await expect(edgeRight).toHaveCount(1);

    const edgeShadow = await edgeLeft.evaluate((node) => {
      const style = getComputedStyle(node, '::after');
      return { shadow: style.boxShadow, width: style.width, position: style.position };
    });
    expect(edgeShadow.position).toBe('absolute');
    expect(edgeShadow.shadow).not.toBe('none');
    expect(edgeShadow.shadow).toContain('inset');
  });

  test('row action buttons are constrained to 32px height via token', async ({ page }) => {
    const lab = await openCrudLab(page);
    const stage = crudStage(lab, QUERY_STAGE);
    await expect(stage).toBeVisible();
    await expect(dataRows(stage)).toHaveCount(3);

    const actionButton = crudTable(stage).locator("[data-slot='table-actions'] button").first();
    await expect(actionButton).toBeVisible();
    const style = await readComputedStyle(actionButton, ['height']);
    expect(style.height).toBe('32px');
  });

  test('stripe/bordered/fixed-edge CSS rules are loaded in real browser stylesheets', async ({ page }) => {
    const lab = await openCrudLab(page);
    await expect(lab.multiScenarioLab).toBeVisible();

    const loaded = await page.evaluate(() => {
      const cssText = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
        .join('\n');
      return {
        stripe: cssText.includes('tr[data-striped]'),
        bordered: cssText.includes('[data-bordered]'),
        fixedEdge: cssText.includes('nop-table-sticky-edge-left'),
        hoverVar: cssText.includes('--table-hover-bg'),
      };
    });
    expect(loaded.stripe).toBe(true);
    expect(loaded.bordered).toBe(true);
    expect(loaded.fixedEdge).toBe(true);
    expect(loaded.hoverVar).toBe(true);
  });

  test('dialog size matrix maps to --dialog-size-* widths (xs/sm/base/md/lg/xl/full/default)', async ({
    page,
  }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('dialog');
    const slug = scenarioSlug('C1a dialog size matrix');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const cases: Array<{ label: string; expected: number; dataSize: string }> = [
      { label: 'Open xs', expected: 375, dataSize: 'xs' },
      { label: 'Open sm', expected: 350, dataSize: 'sm' },
      { label: 'Open md', expected: 500, dataSize: 'base' },
      { label: 'Open lg', expected: 800, dataSize: 'md' },
      { label: 'Open xl', expected: 1100, dataSize: 'lg' },
    ];

    for (const c of cases) {
      await stage.getByRole('button', { name: c.label }).click();
      const surface = dialogSurfaces(page).last();
      await expect(surface).toBeVisible();
      await expect(surface).toHaveAttribute('data-size', c.dataSize);
      await waitForDialogWidth(surface, c.expected);
      await surface.locator('[data-slot="dialog-close"]').click();
      await expect(surface).not.toBeVisible();
    }

    await stage.getByRole('button', { name: 'Open full' }).click();
    const fullSurface = dialogSurfaces(page).last();
    await expect(fullSurface).toBeVisible();
    await waitForDialogWidth(fullSurface, 1248);
    await fullSurface.locator('[data-slot="dialog-close"]').click();
    await expect(fullSurface).not.toBeVisible();

    await stage.getByRole('button', { name: 'Open default' }).click();
    const defaultSurface = dialogSurfaces(page).last();
    await expect(defaultSurface).toBeVisible();
    await expect(defaultSurface).toHaveAttribute('data-size', 'default');
    await waitForDialogWidth(defaultSurface, 500);
  });

  test('dialog top anchoring 60px with +30px stacking step for nested dialogs', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('dialog');
    const slug = scenarioSlug('C1a dialog size matrix');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: 'Open default' }).click();
    const first = page.locator('[data-slot="dialog-surface"]', { hasText: 'default dialog' });
    await expect(first).toBeVisible();
    await expect
      .poll(async () => {
        const box = await first.boundingBox();
        return box ? Math.round(box.y) : -1;
      })
      .toBe(60);

    await first.getByRole('button', { name: 'Open stacked sm' }).click();
    const second = page.locator('[data-slot="dialog-surface"]', { hasText: 'sm dialog (stacked)' });
    await expect(second).toBeVisible();
    await expect(second).toHaveAttribute('data-size', 'sm');
    await expect
      .poll(async () => {
        const box = await second.boundingBox();
        return box ? Math.round(box.y) : -1;
      })
      .toBe(90);
    await waitForDialogWidth(second, 350);

    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();
    expect(secondBox!.y - firstBox!.y).toBe(30);
  });

  test('dialog overlay is 0.7 opacity, title 14px, footer buttons min-width 72px', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('dialog');
    const slug = scenarioSlug('Informational dialog');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: 'Open Dialog' }).click();
    const surface = dialogSurfaces(page).last();
    await expect(surface).toBeVisible();

    const overlay = page.locator('[data-slot="dialog-overlay"]').last();
    await expect(overlay).toBeVisible();
    const overlayStyle = await readComputedStyle(overlay, ['background-color']);
    expect(overlayStyle['background-color']).toBe('rgba(0, 0, 0, 0.7)');

    const titleStyle = await readComputedStyle(surface.locator('[data-slot="dialog-title"]'), [
      'font-size',
    ]);
    expect(titleStyle['font-size']).toBe('14px');

    const closeButton = surface.locator('[data-slot="dialog-footer"] button').first();
    await expect(closeButton).toBeVisible();
    const buttonStyle = await readComputedStyle(closeButton, ['min-width']);
    expect(buttonStyle['min-width']).toBe('72px');
  });
});
