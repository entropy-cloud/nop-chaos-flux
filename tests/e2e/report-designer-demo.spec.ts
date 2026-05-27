import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// This route-heavy spec shares one cold-started designer host and stays serial intentionally.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

async function openReportDesignerDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Report Designer Playground', level: 1 }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 15000 });
  await assertTrackedPageErrors(page);
}

test('renders the core report designer surfaces', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.report-designer-demo')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="workbench-body"]')).toBeVisible();
  await expect(page.locator('[data-slot="workbench-left-panel"]')).toBeVisible();
  await expect(page.locator('[data-slot="workbench-canvas"]')).toBeVisible();
  await expect(page.locator('[data-slot="workbench-right-panel"]')).toBeVisible();
  await expect(page.locator('.rd-toolbar')).toBeVisible();
  await expect(page.locator('[data-slot="report-field-panel-source"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="spreadsheet-grid"]')).toBeVisible();
  await expect(page.locator('.ss-sheet-tab[data-active]')).toBeVisible();
  await expect(page.locator('[data-slot="spreadsheet-row-header"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="spreadsheet-column-header"]').first()).toBeVisible();
});

test('verifies field items and inspector elements are visible', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('[data-slot="report-field-panel-item"]')).toHaveCount(4);
  await expect(page.locator('[data-slot="report-field-panel-item-type"]')).toHaveCount(4);
  await expect(page.locator('[data-slot="report-field-panel-item-label"]')).toHaveCount(4);

  await expect(page.locator('[data-slot="report-field-panel-source-label"]')).toContainText(
    'Orders Dataset',
  );

  const fieldItems = page.locator('[data-slot="report-field-panel-item"]');
  await expect(fieldItems.first()).toContainText('Order ID');
  await expect(fieldItems.nth(1)).toContainText('Customer');
  await expect(fieldItems.nth(2)).toContainText('Amount');
  await expect(fieldItems.nth(3)).toContainText('Order Date');

  const fieldItemStyles = await fieldItems.first().evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      display: style.display,
      cursor: style.cursor,
      border: style.borderTopWidth,
      borderRadius: style.borderRadius,
      transition: style.transition,
    };
  });

  expect(fieldItemStyles.display).toBe('flex');
  expect(['grab', 'auto']).toContain(fieldItemStyles.cursor);
  expect(fieldItemStyles.border).toBe('1px');
  expect(parseFloat(fieldItemStyles.borderRadius)).toBeGreaterThanOrEqual(6);

  const inspector = page.locator('[data-slot="workbench-right-panel"]');
  await expect(inspector).toContainText('Inspector');
  await expect(inspector).toContainText('sheet');
  await expect(inspector).toContainText(/Sheet selected|正在加载检查器面板|loading/i);
});

test('spreadsheet grid exposes row and column headers', async ({ page }) => {
  await openReportDesignerDemo(page);

  const rowHeaders = page.locator('[data-slot="spreadsheet-row-header"]');
  const columnHeaders = page.locator('[data-slot="spreadsheet-column-header"]');

  expect(await rowHeaders.count()).toBeGreaterThan(0);
  expect(await columnHeaders.count()).toBeGreaterThan(0);
  await expect(rowHeaders.first()).toContainText('1');
  await expect(columnHeaders.first()).toContainText('A');

  await expect(page.locator('[data-slot="spreadsheet-grid"]')).toBeVisible();
});

test('spreadsheet headers stay sticky while the grid scrolls', async ({ page }) => {
  await openReportDesignerDemo(page);

  const grid = page.locator('[data-slot="spreadsheet-grid"]');
  const columnHeader = page.locator('[data-slot="spreadsheet-column-header"]').first();
  const rowHeader = page.locator('[data-slot="spreadsheet-row-header"]').first();

  await expect(grid).toBeVisible();
  await expect(columnHeader).toBeVisible();
  await expect(rowHeader).toBeVisible();

  const before = await page.evaluate(() => {
    const gridEl = document.querySelector('[data-slot="spreadsheet-grid"]') as HTMLElement | null;
    const columnHeaderEl = document.querySelector('[data-slot="spreadsheet-column-header"]') as HTMLElement | null;
    const rowHeaderEl = document.querySelector('[data-slot="spreadsheet-row-header"]') as HTMLElement | null;
    if (!gridEl || !columnHeaderEl || !rowHeaderEl) {
      return null;
    }
    const gridRect = gridEl.getBoundingClientRect();
    const columnRect = columnHeaderEl.getBoundingClientRect();
    const rowRect = rowHeaderEl.getBoundingClientRect();
    return {
      columnDeltaTop: Math.round(columnRect.top - gridRect.top),
      rowDeltaLeft: Math.round(rowRect.left - gridRect.left),
      columnPosition: getComputedStyle(columnHeaderEl).position,
      rowPosition: getComputedStyle(rowHeaderEl).position,
    };
  });

  expect(before).not.toBeNull();
  expect(before?.columnPosition).toBe('sticky');
  expect(before?.rowPosition).toBe('sticky');

  await grid.evaluate((el) => {
    const node = el as HTMLElement;
    node.scrollTop = 240;
    node.scrollLeft = 160;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  const after = await page.evaluate(() => {
    const gridEl = document.querySelector('[data-slot="spreadsheet-grid"]') as HTMLElement | null;
    const columnHeaderEl = document.querySelector('[data-slot="spreadsheet-column-header"]') as HTMLElement | null;
    const rowHeaderEl = document.querySelector('[data-slot="spreadsheet-row-header"]') as HTMLElement | null;
    if (!gridEl || !columnHeaderEl || !rowHeaderEl) {
      return null;
    }
    const gridRect = gridEl.getBoundingClientRect();
    const columnRect = columnHeaderEl.getBoundingClientRect();
    const rowRect = rowHeaderEl.getBoundingClientRect();
    return {
      columnDeltaTop: Math.round(columnRect.top - gridRect.top),
      rowDeltaLeft: Math.round(rowRect.left - gridRect.left),
      columnPosition: getComputedStyle(columnHeaderEl).position,
      rowPosition: getComputedStyle(rowHeaderEl).position,
    };
  });

  expect(after).not.toBeNull();
  expect(after?.columnPosition).toBe('sticky');
  expect(after?.rowPosition).toBe('sticky');
  expect(Math.abs((after?.columnDeltaTop ?? 999) - (before?.columnDeltaTop ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((after?.rowDeltaLeft ?? 999) - (before?.rowDeltaLeft ?? 0))).toBeLessThanOrEqual(1);
});

test('clicking a spreadsheet cell keeps the inspector surface active', async ({ page }) => {
  await openReportDesignerDemo(page);

  const cells = page.locator('.ss-cell');
  await expect(cells.first()).toBeVisible();
  const inspector = page.locator('[data-slot="workbench-right-panel"]');
  await expect(inspector).toContainText(/sheet|正在加载检查器面板|loading/i);

  await cells.nth(5).click();

  await expect(inspector).toContainText('Inspector');
  await expect(inspector).toContainText(/sheet|cell|正在加载检查器面板|loading/i);
});

test('toolbar exposes localized spreadsheet controls on the live surface', async ({ page }) => {
  await openReportDesignerDemo(page);

  const toolbarLayout = await page.locator('.rd-toolbar').evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    const rect = (el as HTMLElement).getBoundingClientRect();
    const buttonRects = Array.from(el.querySelectorAll('button')).slice(0, 20).map((button) => {
      const buttonRect = button.getBoundingClientRect();
      return Math.round(buttonRect.top - rect.top);
    });
    return {
      flexWrap: style.flexWrap,
      height: rect.height,
      rowCount: [...new Set(buttonRects)].length,
    };
  });

  expect(toolbarLayout.flexWrap).toBe('nowrap');
  expect(toolbarLayout.rowCount).toBe(1);
  expect(toolbarLayout.height).toBeLessThan(80);

  const toolbarButtons = page.locator('.rd-toolbar button');
  const count = await toolbarButtons.count();
  expect(count).toBeGreaterThan(10);
  await expect(toolbarButtons.first()).toBeVisible();
  await expect(toolbarButtons.last()).toBeVisible();

  await expect(page.getByRole('button', { name: '撤销 Ctrl+Z' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重做 Ctrl+Y' })).toBeVisible();
  await expect(page.getByRole('button', { name: '查找替换 Ctrl+F' })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消冻结' })).toBeVisible();
});

test('selecting a cell does not render the removed toolbar cell editor', async ({ page }) => {
  await openReportDesignerDemo(page);

  await page.locator('.ss-cell').nth(5).click();

  await expect(page.locator('[data-slot="spreadsheet-cell-editor"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="spreadsheet-cell-value-input"]')).toHaveCount(0);
  await expect(page.getByPlaceholder('输入单元格值')).toHaveCount(0);
});

test('dragging a field onto a cell writes the cell value and binds report metadata', async ({
  page,
}) => {
  await openReportDesignerDemo(page);

  const field = page.locator('[data-slot="report-field-panel-item"]').first();
  const targetCell = page.locator('td.ss-cell[data-row="0"][data-col="0"]').first();

  await expect(field).toBeVisible();
  await expect(targetCell).toBeVisible();

  await field.dragTo(targetCell);

  await expect(targetCell).toContainText('${orderId}');
  await expect(targetCell).toHaveAttribute('data-cell-bound', 'true');
});

test('sheet tab bar exposes the active sheet and add-sheet action', async ({ page }) => {
  await openReportDesignerDemo(page);

  const activeTab = page.locator('.ss-sheet-tab[data-active]').first();
  const allTabs = page.locator('.ss-sheet-tab');
  const beforeCount = await allTabs.count();

  await expect(activeTab).toBeVisible();
  await expect(page.locator('.ss-sheet-add')).toBeVisible();

  await page.locator('.ss-sheet-add').click();

  await expect(allTabs).toHaveCount(beforeCount + 1);
});
