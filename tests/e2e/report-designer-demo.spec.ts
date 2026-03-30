import { expect, test } from '@playwright/test';

async function openReportDesignerDemo(page: import('@playwright/test').Page) {
  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }

    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.getByRole('button', { name: 'Report Designer' }).click();
  await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 15000 });
}

test('verifies report designer demo layout styles', async ({ page }) => {
  await openReportDesignerDemo(page);

  const styleMetrics = await page.evaluate(() => {
    const root = document.querySelector('.report-designer-demo') as HTMLElement | null;
    const header = document.querySelector('.report-designer-demo__header') as HTMLElement | null;
    const body = document.querySelector('.report-designer-demo__body') as HTMLElement | null;
    const fieldPanel = document.querySelector('.report-designer-demo__field-panel') as HTMLElement | null;
    const canvas = document.querySelector('.report-designer-demo__canvas') as HTMLElement | null;
    const inspector = document.querySelector('.report-designer-demo__inspector') as HTMLElement | null;
    const log = document.querySelector('.report-designer-demo__log') as HTMLElement | null;
    const toolbar = document.querySelector('.rd-toolbar') as HTMLElement | null;
    const fieldSource = document.querySelector('.field-source') as HTMLElement | null;
    const spreadsheetGrid = document.querySelector('.spreadsheet-grid') as HTMLElement | null;
    const sheetBar = document.querySelector('.ss-sheet-bar') as HTMLElement | null;
    const sheetTab = document.querySelector('.ss-sheet-tab[data-active]') as HTMLElement | null;
    const sheetAdd = document.querySelector('.ss-sheet-add') as HTMLElement | null;
    const rowHeader = document.querySelector('.row-header') as HTMLElement | null;
    const colHeader = document.querySelector('.col-header') as HTMLElement | null;

    const missing: string[] = [];
    if (!root) missing.push('.report-designer-demo');
    if (!header) missing.push('.report-designer-demo__header');
    if (!body) missing.push('.report-designer-demo__body');
    if (!fieldPanel) missing.push('.report-designer-demo__field-panel');
    if (!canvas) missing.push('.report-designer-demo__canvas');
    if (!inspector) missing.push('.report-designer-demo__inspector');
    if (!log) missing.push('.report-designer-demo__log');
    if (!toolbar) missing.push('.rd-toolbar');
    if (!fieldSource) missing.push('.field-source');
    if (!spreadsheetGrid) missing.push('.spreadsheet-grid');
    if (!sheetBar) missing.push('.ss-sheet-bar');
    if (!sheetTab) missing.push('.ss-sheet-tab[data-active]');
    if (!sheetAdd) missing.push('.ss-sheet-add');
    if (!rowHeader) missing.push('.row-header');
    if (!colHeader) missing.push('.col-header');
    if (missing.length > 0) {
      return { error: `Missing elements: ${missing.join(', ')}` };
    }

    const rootStyle = window.getComputedStyle(root);
    const headerStyle = window.getComputedStyle(header);
    const bodyStyle = window.getComputedStyle(body);
    const fieldPanelStyle = window.getComputedStyle(fieldPanel);
    const canvasStyle = window.getComputedStyle(canvas);
    const inspectorStyle = window.getComputedStyle(inspector);
    const logStyle = window.getComputedStyle(log);
    const toolbarStyle = window.getComputedStyle(toolbar);
    const fieldSourceStyle = window.getComputedStyle(fieldSource);
    const spreadsheetGridStyle = window.getComputedStyle(spreadsheetGrid);
    const sheetBarStyle = window.getComputedStyle(sheetBar);
    const sheetTabStyle = window.getComputedStyle(sheetTab);
    const sheetAddStyle = window.getComputedStyle(sheetAdd);
    const rowHeaderStyle = window.getComputedStyle(rowHeader);
    const colHeaderStyle = window.getComputedStyle(colHeader);

    return {
      rootDisplay: rootStyle.display,
      headerDisplay: headerStyle.display,
      headerPadding: headerStyle.paddingTop,
      headerBg: headerStyle.backgroundColor,
      headerBorderBottom: headerStyle.borderBottomWidth,
      bodyDisplay: bodyStyle.display,
      fieldPanelDisplay: fieldPanelStyle.display,
      fieldPanelPadding: fieldPanelStyle.paddingTop,
      fieldPanelBorderRight: fieldPanelStyle.borderRightWidth,
      canvasDisplay: canvasStyle.display,
      canvasFlexDirection: canvasStyle.flexDirection,
      canvasOverflow: canvasStyle.overflow,
      inspectorDisplay: inspectorStyle.display,
      inspectorPadding: inspectorStyle.paddingTop,
      inspectorBorderLeft: inspectorStyle.borderLeftWidth,
      logDisplay: logStyle.display,
      logMaxHeight: logStyle.maxHeight,
      logBorderTop: logStyle.borderTopWidth,
      toolbarDisplay: toolbarStyle.display,
      toolbarFlexDirection: toolbarStyle.flexDirection,
      toolbarGap: toolbarStyle.gap,
      toolbarPadding: toolbarStyle.paddingTop,
      toolbarBg: toolbarStyle.backgroundColor,
      toolbarBorderBottom: toolbarStyle.borderBottomWidth,
      fieldSourceDisplay: fieldSourceStyle.display,
      spreadsheetGridDisplay: spreadsheetGridStyle.display,
      spreadsheetGridFlex: spreadsheetGridStyle.flex,
      spreadsheetGridOverflow: spreadsheetGridStyle.overflow,
      sheetBarBg: sheetBarStyle.backgroundColor,
      sheetBarBorderTop: sheetBarStyle.borderTopWidth,
      sheetTabBg: sheetTabStyle.backgroundColor,
      sheetAddDisplay: sheetAddStyle.display,
      sheetAddWidth: sheetAddStyle.width,
      sheetAddHeight: sheetAddStyle.height,
      rowHeaderDisplay: rowHeaderStyle.display,
      rowHeaderTextAlign: rowHeaderStyle.textAlign,
      rowHeaderPosition: rowHeaderStyle.position,
      colHeaderDisplay: colHeaderStyle.display,
      colHeaderTextAlign: colHeaderStyle.textAlign,
      colHeaderPosition: colHeaderStyle.position,
    };
  });

  if (styleMetrics && 'error' in styleMetrics) {
    throw new Error(styleMetrics.error);
  }
  expect(styleMetrics).not.toBeNull();
  expect(styleMetrics!).not.toHaveProperty('error');

  expect(styleMetrics!.rootDisplay).toBe('flex');
  expect(styleMetrics!.headerDisplay).toBe('flex');
  expect(styleMetrics!.headerBg).toContain('248, 250, 252');
  expect(styleMetrics!.headerBorderBottom).toBe('1px');
  expect(styleMetrics!.bodyDisplay).toBe('flex');
  expect(styleMetrics!.fieldPanelDisplay).toBe('flex');
  expect(styleMetrics!.fieldPanelBorderRight).toBe('1px');
  expect(styleMetrics!.canvasDisplay).toBe('flex');
  expect(styleMetrics!.canvasFlexDirection).toBe('column');
  expect(styleMetrics!.inspectorDisplay).toBe('flex');
  expect(styleMetrics!.inspectorBorderLeft).toBe('1px');
  expect(styleMetrics!.logDisplay).toBe('flex');
  expect(styleMetrics!.toolbarDisplay).toBe('flex');
  expect(styleMetrics!.toolbarFlexDirection).toBe('row');
  expect(styleMetrics!.toolbarBg).toContain('246, 247, 250');
  expect(styleMetrics!.toolbarBorderBottom).toBe('1px');
  expect(styleMetrics!.fieldSourceDisplay).toBe('block');
  expect(styleMetrics!.spreadsheetGridDisplay).toBe('block');
  expect(styleMetrics!.spreadsheetGridFlex).toContain('1');
  expect(styleMetrics!.sheetBarBg).toContain('231, 231, 231');
  expect(styleMetrics!.sheetBarBorderTop).toBe('1px');
  expect(styleMetrics!.sheetTabBg).toContain('255, 255, 255');
  expect(styleMetrics!.sheetAddDisplay).toBe('flex');

  // Headers should NOT be flex (table-cell for correct grid layout)
  expect(styleMetrics!.rowHeaderDisplay).toBe('table-cell');
  expect(styleMetrics!.colHeaderDisplay).toBe('table-cell');
  expect(styleMetrics!.rowHeaderTextAlign).toBe('center');
  expect(styleMetrics!.colHeaderTextAlign).toBe('center');
  expect(styleMetrics!.rowHeaderPosition).toBe('relative');
  expect(styleMetrics!.colHeaderPosition).toBe('relative');

  await expect(page.locator('.report-designer-demo')).toBeVisible();
  await expect(page.locator('.report-designer-demo__header')).toBeVisible();
  await expect(page.locator('.report-designer-demo__body')).toBeVisible();
  await expect(page.locator('.report-designer-demo__field-panel')).toBeVisible();
  await expect(page.locator('.report-designer-demo__inspector')).toBeVisible();
  await expect(page.locator('.rd-toolbar')).toBeVisible();
  await expect(page.locator('.field-source')).toBeVisible();
  await expect(page.locator('.spreadsheet-grid')).toBeVisible();
});

test('verifies field items and inspector elements are visible', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.field-item')).toHaveCount(4);
  await expect(page.locator('.field-item__type')).toHaveCount(4);
  await expect(page.locator('.field-item__label')).toHaveCount(4);

  const fieldItems = page.locator('.field-item');
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
  expect(fieldItemStyles.cursor).toBe('grab');
  expect(fieldItemStyles.border).toBe('1px');
  expect(fieldItemStyles.borderRadius).toBe('6px');

  const inspectorEmpty = page.locator('.inspector-empty');
  await expect(inspectorEmpty).toBeVisible();
  await expect(inspectorEmpty).toContainText('Click a cell to inspect');
});

test('verifies spreadsheet headers and grid structure', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.row-header')).toHaveCount(31);
  await expect(page.locator('.col-header')).toHaveCount(10);

  const rowHeaderStyles = await page.locator('.row-header').first().evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      display: style.display,
      textAlign: style.textAlign,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      background: style.backgroundColor,
      border: style.borderBottomWidth,
      userSelect: style.userSelect,
      position: style.position,
    };
  });

  expect(rowHeaderStyles.display).toBe('table-cell');
  expect(rowHeaderStyles.textAlign).toBe('center');
  expect(rowHeaderStyles.fontSize).toBe('12px');
  expect(rowHeaderStyles.fontWeight).toBe('600');
  expect(rowHeaderStyles.background).toContain('248, 250, 252');
  expect(rowHeaderStyles.userSelect).toBe('none');
  expect(rowHeaderStyles.position).toBe('relative');

  const colHeaderStyles = await page.locator('.col-header').first().evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      display: style.display,
      textAlign: style.textAlign,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      background: style.backgroundColor,
      border: style.borderBottomWidth,
      userSelect: style.userSelect,
      position: style.position,
    };
  });

  expect(colHeaderStyles.display).toBe('table-cell');
  expect(colHeaderStyles.textAlign).toBe('center');
  expect(colHeaderStyles.fontSize).toBe('12px');
  expect(colHeaderStyles.fontWeight).toBe('600');
  expect(colHeaderStyles.background).toContain('248, 250, 252');
  expect(colHeaderStyles.userSelect).toBe('none');
  expect(colHeaderStyles.position).toBe('relative');

  await expect(page.locator('.spreadsheet-grid')).toBeVisible();
});

test('verifies ss-cell classes and data-* attributes for cell rendering', async ({ page }) => {
  await openReportDesignerDemo(page);

  const cells = page.locator('.ss-cell');
  await expect(cells.first()).toBeVisible();

  const cellStyles = await cells.first().evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      position: style.position,
      overflow: style.overflow,
      cursor: style.cursor,
      whiteSpace: style.whiteSpace,
      boxSizing: style.boxSizing,
    };
  });

  expect(cellStyles.position).toBe('relative');
  expect(cellStyles.overflow).toBe('hidden');
  expect(cellStyles.cursor).toBe('cell');
  expect(cellStyles.whiteSpace).toBe('nowrap');
  expect(cellStyles.boxSizing).toBe('border-box');

  // Verify column headers (A, B, C...) are in a horizontal row
  const colHeadersLayout = await page.evaluate(() => {
    const headers = document.querySelectorAll('.col-header');
    if (headers.length < 2) return { error: 'Not enough column headers' };
    const rect0 = headers[0].getBoundingClientRect();
    const rect1 = headers[1].getBoundingClientRect();
    return {
      firstTop: rect0.top,
      secondTop: rect1.top,
      firstLeft: rect0.left,
      secondLeft: rect1.left,
      firstWidth: rect0.width,
    };
  });

  expect(colHeadersLayout).not.toHaveProperty('error');
  // Column headers should be on the same row (same top)
  expect((colHeadersLayout as any).firstTop).toBe((colHeadersLayout as any).secondTop);
  // Column headers should be side by side (second is to the right)
  expect((colHeadersLayout as any).secondLeft).toBeGreaterThan((colHeadersLayout as any).firstLeft);
});

test('verifies toolbar buttons use shadcn Button with icon-sm size', async ({ page }) => {
  await openReportDesignerDemo(page);

  const toolbarButtons = page.locator('.rd-toolbar button[data-slot="button"]');
  const count = await toolbarButtons.count();
  expect(count).toBeGreaterThan(10);

  const firstButtonStyle = await toolbarButtons.first().evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      display: style.display,
      width: style.width,
      height: style.height,
    };
  });

  expect(firstButtonStyle.display).toBe('inline-flex');
  // icon-sm size is 32px (size-8 = 2rem)
  expect(parseInt(firstButtonStyle.width)).toBeGreaterThanOrEqual(28);
  expect(parseInt(firstButtonStyle.height)).toBeGreaterThanOrEqual(28);
});

test('verifies table layout is correct with border-collapse', async ({ page }) => {
  await openReportDesignerDemo(page);

  const tableStyles = await page.locator('.spreadsheet-grid table').evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      borderCollapse: style.borderCollapse,
      tableLayout: style.tableLayout,
    };
  });

  expect(tableStyles.borderCollapse).toBe('collapse');
  expect(tableStyles.tableLayout).toBe('fixed');
});
