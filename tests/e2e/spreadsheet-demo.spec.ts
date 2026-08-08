import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// Standalone spreadsheet host spec (D3.2). Route-backed shared host, serial by design.
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

async function openSpreadsheetDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/spreadsheet', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Spreadsheet Playground', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="spreadsheet-demo-host"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-slot="spreadsheet-grid"]')).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function selectCell(page: import('@playwright/test').Page, row: number, col: number) {
  const cell = page.locator(`td[data-row="${row}"][data-col="${col}"]`).first();
  await expect(cell).toBeVisible();
  await cell.click();
  return cell;
}

test('ss-1 table rendering: seeded cells render inside a virtualized window', async ({ page }) => {
  await openSpreadsheetDemo(page);

  const a1 = page.locator('td[data-row="0"][data-col="0"]').first();
  await expect(a1).toContainText('Alpha');
  await expect(page.locator('td[data-row="1"][data-col="0"]').first()).toContainText('Beta');
  await expect(page.locator('td[data-row="0"][data-col="1"]').first()).toContainText('42');

  const renderedRows = page.locator('tbody tr[role="row"]');
  const rowCount = await renderedRows.count();
  expect(rowCount).toBeGreaterThan(5);
  expect(rowCount).toBeLessThan(200);

  await expect(page.locator('[data-slot="spreadsheet-row-header"]').first()).toContainText('1');
  await expect(page.locator('[data-slot="spreadsheet-column-header"]').first()).toContainText('A');
});

test('ss-2 cell editing: inline editor commits on Enter and cancels on Escape', async ({ page }) => {
  await openSpreadsheetDemo(page);

  const cell = await selectCell(page, 3, 0);
  await cell.dblclick();

  const editor = page.locator('[data-slot="spreadsheet-cell-editor-input"]');
  await expect(editor).toBeVisible();
  await editor.fill('Edited');
  await editor.press('Enter');

  await expect(page.locator('td[data-row="3"][data-col="0"]')).toContainText('Edited', {
    timeout: 10_000,
  });
  await expect(page.locator('[data-slot="spreadsheet-cell-editor-input"]')).toHaveCount(0);

  await page.locator('td[data-row="3"][data-col="0"]').first().dblclick();
  await expect(page.locator('[data-slot="spreadsheet-cell-editor-input"]')).toBeVisible();
  await page.locator('[data-slot="spreadsheet-cell-editor-input"]').fill('Discarded');
  await page.keyboard.press('Escape');

  await expect(page.locator('[data-slot="spreadsheet-cell-editor-input"]')).toHaveCount(0);
  await expect(page.locator('td[data-row="3"][data-col="0"]')).toContainText('Edited');
});

test('ss-3 toolbar: bold tool writes a style class onto the selected cell', async ({ page }) => {
  await openSpreadsheetDemo(page);

  await selectCell(page, 4, 1);
  await page.getByRole('button', { name: /加粗/ }).click();

  const cell = page.locator('td[data-row="4"][data-col="1"]').first();
  await expect(cell).toHaveClass(/ss-bold/, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: /撤销/ })).toBeVisible();
});

test('ss-4 status bar: cell address and frozen badge reflect selection and freeze state', async ({
  page,
}) => {
  await openSpreadsheetDemo(page);

  const address = page.locator('[data-slot="spreadsheet-toolbar-cell-address"]');
  await expect(address).toHaveText('');

  await selectCell(page, 1, 1);
  await expect(address).toHaveText('B2');

  await expect(page.locator('[data-slot="spreadsheet-toolbar-frozen-badge"]')).toHaveCount(0);
  await page.getByRole('button', { name: /冻结窗格/ }).click();
  await expect(page.locator('[data-slot="spreadsheet-toolbar-frozen-badge"]')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: /取消冻结/ }).click();
  await expect(page.locator('[data-slot="spreadsheet-toolbar-frozen-badge"]')).toHaveCount(0, {
    timeout: 10_000,
  });
});

test('ss-5 formula: setFormula writes the formula into the document', async ({ page }) => {
  await openSpreadsheetDemo(page);

  await selectCell(page, 0, 0);
  await page.getByRole('button', { name: /Set Formula/ }).click();

  await expect(page.locator('[data-testid="spreadsheet-demo-formula"]')).toContainText(
    '=SUM(B1:B2)',
  );

  const exported = await page.evaluate(() => {
    const cell = window.__SPREADSHEET_DEMO__?.exportDocument().workbook.sheets[0].cells?.['A1'];
    return cell?.formula;
  });
  expect(exported).toBe('=SUM(B1:B2)');
});

test('ss-6 freeze: frozen cells stay pinned while the grid scrolls', async ({ page }) => {
  await openSpreadsheetDemo(page);

  await selectCell(page, 1, 1);
  await page.getByRole('button', { name: /冻结窗格/ }).click();

  const frozenCell = page.locator('td[data-row="0"][data-col="0"][data-cell-frozen]').first();
  await expect(frozenCell).toBeVisible({ timeout: 10_000 });

  const before = await page.evaluate(() => {
    const gridEl = document.querySelector('[data-slot="spreadsheet-grid"]') as HTMLElement | null;
    const cellEl = document.querySelector('td[data-row="0"][data-col="0"]') as HTMLElement | null;
    if (!gridEl || !cellEl) return null;
    const gridRect = gridEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    return {
      deltaTop: Math.round(cellRect.top - gridRect.top),
      deltaLeft: Math.round(cellRect.left - gridRect.left),
      position: getComputedStyle(cellEl).position,
      rowPosition: getComputedStyle(cellEl.closest('tr')!).position,
    };
  });

  expect(before).not.toBeNull();
  expect(before?.rowPosition).toBe('sticky');

  await page.evaluate(() => {
    const gridEl = document.querySelector('[data-slot="spreadsheet-grid"]') as HTMLElement | null;
    if (!gridEl) return;
    gridEl.scrollTop = 200;
    gridEl.scrollLeft = 150;
    gridEl.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await page.waitForTimeout(300);

  const after = await page.evaluate(() => {
    const gridEl = document.querySelector('[data-slot="spreadsheet-grid"]') as HTMLElement | null;
    const cellEl = document.querySelector('td[data-row="0"][data-col="0"]') as HTMLElement | null;
    if (!gridEl || !cellEl) return null;
    const gridRect = gridEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    return {
      deltaTop: Math.round(cellRect.top - gridRect.top),
      deltaLeft: Math.round(cellRect.left - gridRect.left),
      inside: cellRect.top >= gridRect.top && cellRect.left >= gridRect.left,
    };
  });

  expect(after).not.toBeNull();
  expect(after?.inside).toBe(true);
  expect(Math.abs((after?.deltaTop ?? 999) - (before?.deltaTop ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((after?.deltaLeft ?? 999) - (before?.deltaLeft ?? 0))).toBeLessThanOrEqual(2);

  await page.getByRole('button', { name: /取消冻结/ }).click();
});

test('ss-7 selection: multi-row delete removes only the actually selected rows', async ({
  page,
}) => {
  await openSpreadsheetDemo(page);

  await expect(page.locator('td[data-row="2"][data-col="2"]')).toContainText('Middle');
  await expect(page.locator('td[data-row="1"][data-col="0"]')).toContainText('Beta');

  const rowHeader2 = page.locator('[data-slot="spreadsheet-row-header"] button').nth(1);
  const rowHeader4 = page.locator('[data-slot="spreadsheet-row-header"] button').nth(3);
  await expect(rowHeader2).toBeVisible();
  await expect(rowHeader4).toBeVisible();

  await rowHeader2.click();
  await rowHeader4.click({ modifiers: ['Shift'] });

  await page.locator('[data-slot="spreadsheet-row-header"]').nth(1).click({ button: 'right' });
  await expect(page.getByTestId('spreadsheet-context-delete-row')).toBeVisible();
  await page.getByTestId('spreadsheet-context-delete-row').click();

  await expect(page.getByText('Beta')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText('Middle')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.getByText('Alpha')).toHaveCount(1);
});

test('ss-8 keyboard: arrows move selection, typing opens the editor, Ctrl+Z undoes', async ({
  page,
}) => {
  await openSpreadsheetDemo(page);

  const grid = page.locator('[data-slot="spreadsheet-grid"]');
  await grid.focus();

  await selectCell(page, 0, 0);
  await grid.focus();
  await page.keyboard.press('ArrowDown');

  const a2 = page.locator('td[data-row="1"][data-col="0"][data-cell-active]').first();
  await expect(a2).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-slot="spreadsheet-toolbar-cell-address"]')).toHaveText('A2');

  await grid.focus();
  await page.keyboard.press('x');

  const editor = page.locator('[data-slot="spreadsheet-cell-editor-input"]');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue('x');
  await editor.press('Enter');

  await expect(page.locator('td[data-row="1"][data-col="0"]')).toContainText('x', {
    timeout: 10_000,
  });

  await grid.focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('td[data-row="1"][data-col="0"]')).toContainText('Beta', {
    timeout: 10_000,
  });

  await grid.focus();
  await page.keyboard.press('Control+y');
  await expect(page.locator('td[data-row="1"][data-col="0"]')).toContainText('x', {
    timeout: 10_000,
  });
});

test('ss-9 search: find locates a value and replace-all rewrites it', async ({ page }) => {
  await openSpreadsheetDemo(page);

  const grid = page.locator('[data-slot="spreadsheet-grid"]');
  await grid.focus();
  await page.keyboard.press('Control+f');

  const panel = page.locator('[data-slot="spreadsheet-find-replace-panel"]');
  await expect(panel).toBeVisible();

  const findInput = page.locator('[data-slot="spreadsheet-find-input"]');
  await findInput.fill('Alpha');
  await panel.getByRole('button', { name: /查找下一个/ }).click();

  const results = page.locator('[data-slot="spreadsheet-find-results"]');
  await expect(results).toContainText('A1', { timeout: 10_000 });

  const replaceInput = page.locator('[data-slot="spreadsheet-replace-input"]');
  await replaceInput.fill('Zulu');
  await panel.getByRole('button', { name: /全部替换/ }).click();

  await expect(page.locator('td[data-row="0"][data-col="0"]')).toContainText('Zulu', {
    timeout: 10_000,
  });

  await findInput.focus();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0, { timeout: 10_000 });
});

test('ss-10 undo: toolbar undo/redo round-trips a cell edit', async ({ page }) => {
  await openSpreadsheetDemo(page);

  const cell = await selectCell(page, 5, 0);
  await cell.dblclick();
  const editor = page.locator('[data-slot="spreadsheet-cell-editor-input"]');
  await expect(editor).toBeVisible();
  await editor.fill('RoundTrip');
  await editor.press('Enter');
  await expect(page.locator('td[data-row="5"][data-col="0"]')).toContainText('RoundTrip');

  await page.getByRole('button', { name: /撤销/ }).click();
  await expect(page.locator('td[data-row="5"][data-col="0"]')).not.toContainText('RoundTrip', {
    timeout: 10_000,
  });

  await page.getByRole('button', { name: /重做/ }).click();
  await expect(page.locator('td[data-row="5"][data-col="0"]')).toContainText('RoundTrip', {
    timeout: 10_000,
  });
});
