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
    const toolbar = document.querySelector('.toolbar') as HTMLElement | null;
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
    if (!toolbar) missing.push('.toolbar');
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
      colHeaderDisplay: colHeaderStyle.display,
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
  expect(styleMetrics!.toolbarBorderBottom).toBe('1px');
  expect(styleMetrics!.fieldSourceDisplay).toBe('block');
  expect(styleMetrics!.spreadsheetGridDisplay).toBe('block');
  expect(styleMetrics!.spreadsheetGridFlex).toContain('1');
  expect(styleMetrics!.sheetBarBg).toContain('231, 231, 231');
  expect(styleMetrics!.sheetBarBorderTop).toBe('1px');
  expect(styleMetrics!.sheetTabBg).toContain('255, 255, 255');
  expect(styleMetrics!.sheetAddDisplay).toBe('flex');
  expect(styleMetrics!.rowHeaderDisplay).toBe('flex');
  expect(styleMetrics!.colHeaderDisplay).toBe('flex');

  await expect(page.locator('.report-designer-demo')).toBeVisible();
  await expect(page.locator('.report-designer-demo__header')).toBeVisible();
  await expect(page.locator('.report-designer-demo__body')).toBeVisible();
  await expect(page.locator('.report-designer-demo__field-panel')).toBeVisible();
  await expect(page.locator('.report-designer-demo__inspector')).toBeVisible();
  await expect(page.locator('.toolbar')).toBeVisible();
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
    };
  });

  expect(rowHeaderStyles.display).toBe('flex');
  expect(rowHeaderStyles.textAlign).toBe('center');
  expect(rowHeaderStyles.fontSize).toBe('12px');
  expect(rowHeaderStyles.fontWeight).toBe('600');
  expect(rowHeaderStyles.background).toContain('248, 250, 252');
  expect(rowHeaderStyles.userSelect).toBe('none');

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
    };
  });

  expect(colHeaderStyles.display).toBe('flex');
  expect(colHeaderStyles.textAlign).toBe('center');
  expect(colHeaderStyles.fontSize).toBe('12px');
  expect(colHeaderStyles.fontWeight).toBe('600');
  expect(colHeaderStyles.background).toContain('248, 250, 252');
  expect(colHeaderStyles.userSelect).toBe('none');

  await expect(page.locator('.spreadsheet-grid')).toBeVisible();
});
