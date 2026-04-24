import { expect, test } from '@playwright/test';

async function openReportDesignerDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Report Designer Playground', level: 1 })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 15000 });
}

test('renders the core report designer surfaces', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.report-designer-demo')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-header"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-body"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-field-panel"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-canvas"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-inspector"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-demo-log"]')).toBeVisible();
  await expect(page.locator('.rd-toolbar')).toBeVisible();
  await expect(page.locator('.field-source')).toBeVisible();
  await expect(page.locator('.spreadsheet-grid')).toBeVisible();
  await expect(page.locator('.ss-sheet-tab[data-active]')).toBeVisible();
  await expect(page.locator('.row-header').first()).toBeVisible();
  await expect(page.locator('.col-header').first()).toBeVisible();
});

test('verifies field items and inspector elements are visible', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.field-item')).toHaveCount(4);
  await expect(page.locator('[data-slot="field-item-type"]')).toHaveCount(4);
  await expect(page.locator('[data-slot="field-item-label"]')).toHaveCount(4);

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

test('spreadsheet grid exposes row and column headers', async ({ page }) => {
  await openReportDesignerDemo(page);

  await expect(page.locator('.row-header')).toHaveCount(31);
  await expect(page.locator('.col-header')).toHaveCount(10);
  await expect(page.locator('.row-header').nth(1)).toContainText('1');
  await expect(page.locator('.col-header').first()).toContainText('A');

  await expect(page.locator('.spreadsheet-grid')).toBeVisible();
});

test('clicking a spreadsheet cell updates the inspector context', async ({ page }) => {
  await openReportDesignerDemo(page);

  const cells = page.locator('.ss-cell');
  await expect(cells.first()).toBeVisible();
  await expect(page.locator('.inspector-empty')).toBeVisible();

  await cells.nth(5).click();

  await expect(page.locator('.inspector-empty')).toHaveCount(0);
  await expect(page.locator('.inspector-content')).toBeVisible();
  await expect(page.locator('.inspector-section').first()).toContainText('Cell:');
  await expect(page.locator('.inspector-field').filter({ hasText: 'Row:' })).toHaveCount(1);
  await expect(page.locator('.inspector-field').filter({ hasText: 'Col:' })).toHaveCount(1);
  await expect(page.locator('.inspector-field').filter({ hasText: 'Value:' })).toHaveCount(1);
});

test('toolbar actions are available to the spreadsheet editor', async ({ page }) => {
  await openReportDesignerDemo(page);

  const toolbarButtons = page.locator('.rd-toolbar button');
  const count = await toolbarButtons.count();
  expect(count).toBeGreaterThan(10);
  await expect(toolbarButtons.first()).toBeVisible();
  await expect(toolbarButtons.last()).toBeVisible();
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
