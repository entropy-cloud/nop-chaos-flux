import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

// plan 476 Phase 3：light/dark 双态计算样式断言（V0 helper L3）。
// spreadsheet 渲染页 + report-designer 画布共用点双路由，锁定 --ss-* 令牌面与 dark 变体。

test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

async function openSpreadsheetDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/spreadsheet', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Spreadsheet Playground', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('[data-testid="spreadsheet-demo-host"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-slot="spreadsheet-grid"]')).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function setDarkMode(page: import('@playwright/test').Page, dark: boolean) {
  await page.evaluate((mode) => {
    document.documentElement.setAttribute('data-mode', mode ? 'dark' : 'light');
  }, dark);
  await page.waitForTimeout(80);
}

test.describe('spreadsheet visual tokenization (plan 476)', () => {
  test('cell background and grid border surfaces flip between light and dark modes', async ({ page }) => {
    await openSpreadsheetDemo(page);

    const a1 = page.locator('td[data-row="0"][data-col="0"]').first();
    await a1.click();

    const lightCellBg = await getComputedStyleValue(a1, 'background-color');
    const lightGridBorder = await getComputedStyleValue(
      page.locator('[data-slot="spreadsheet-grid"]').first(),
      'border-color',
    );

    await setDarkMode(page, true);

    const darkCellBg = await getComputedStyleValue(a1, 'background-color');
    const darkGridBorder = await getComputedStyleValue(
      page.locator('[data-slot="spreadsheet-grid"]').first(),
      'border-color',
    );
    expect(darkCellBg, 'cell background must flip in dark mode').not.toBe(lightCellBg);
    expect(darkGridBorder, 'grid border must flip in dark mode').not.toBe(lightGridBorder);

    // --ss-* 令牌在 page scope 解析（定义存在性）
    const gridline = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.nop-spreadsheet-page') as Element)
          .getPropertyValue('--ss-gridline')
          .trim(),
    );
    expect(gridline).toBe('rgb(51, 65, 85)');

    await setDarkMode(page, false);
    const restoredGridline = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.nop-spreadsheet-page') as Element)
          .getPropertyValue('--ss-gridline')
          .trim(),
    );
    expect(restoredGridline).toBe('rgb(212, 212, 212)');
    await assertTrackedPageErrors(page);
  });

  test('active outline and selection overlay stay token-driven in both modes, with a visible fill handle', async ({
    page,
  }) => {
    await openSpreadsheetDemo(page);

    const a1 = page.locator('td[data-row="0"][data-col="0"]').first();
    await a1.click();
    await expect(a1).toHaveAttribute('data-cell-active', 'true');

    const lightOutline = await getComputedStyleValue(a1, 'outline-color');

    await setDarkMode(page, true);
    const darkOutline = await getComputedStyleValue(a1, 'outline-color');
    expect(darkOutline, 'active outline must flip in dark mode').not.toBe(lightOutline);

    await setDarkMode(page, false);

    // R7 护栏：填充柄可见且 z-index 高于冻结分隔线（6），冻结边界可拖拽
    const b2 = page.locator('td[data-row="1"][data-col="1"]').first();
    await b2.click();
    const fillHandle = page.locator('.ss-fill-handle').first();
    await expect(fillHandle).toBeVisible();
    const handleZ = await getComputedStyleValue(fillHandle, 'z-index');
    expect(Number(handleZ)).toBeGreaterThan(6);

    // 冻结分隔线在 dark 下颜色翻转（冻结线令牌化面）
    await page.getByRole('button', { name: /冻结窗格/ }).click();
    const frozenCell = page.locator('td[data-row="0"][data-col="0"][data-cell-frozen]').first();
    await expect(frozenCell).toBeVisible({ timeout: 10_000 });
    // 冻结线视觉 = 冻结单元格的 accent 底边（--ss-frozen-accent）
    const lightFrozenLine = await getComputedStyleValue(frozenCell, 'border-bottom-color');

    await setDarkMode(page, true);
    const darkFrozenLine = await getComputedStyleValue(frozenCell, 'border-bottom-color');
    expect(darkFrozenLine, 'frozen cell border must flip in dark mode').not.toBe(lightFrozenLine);

    // 编辑态 outline 双态（先回 light 再触发编辑）
    await setDarkMode(page, false);
    const editingCell = page.locator('td[data-row="2"][data-col="0"]').first();
    await editingCell.dblclick();
    const lightEditOutline = await getComputedStyleValue(editingCell, 'outline-color');
    await setDarkMode(page, true);
    const darkEditOutline = await getComputedStyleValue(editingCell, 'outline-color');
    expect(darkEditOutline, 'editing outline must flip in dark mode').not.toBe(lightEditOutline);

    await setDarkMode(page, false);
    await assertTrackedPageErrors(page);
  });

  test('report designer canvas shares the token surface and flips in dark mode', async ({
    page,
  }) => {
    await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 15_000 });

    const canvasScope = page
      .locator("[data-slot='report-designer-spreadsheet-canvas']")
      .first();
    await expect(canvasScope).toBeVisible({ timeout: 15_000 });

    const lightGridline = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector("[data-slot='report-designer-spreadsheet-canvas']") as Element,
        )
          .getPropertyValue('--ss-gridline')
          .trim(),
    );
    expect(lightGridline, 'report canvas scope must receive --ss-* definitions').toBe(
      'rgb(212, 212, 212)',
    );

    // 内部网格线（行列表头 border）随令牌翻转
    const innerBorder = page
      .locator("[data-slot='report-designer-spreadsheet-canvas'] [data-slot='spreadsheet-row-header']")
      .first();
    const lightBorder = await getComputedStyleValue(innerBorder, 'border-right-color');

    await setDarkMode(page, true);
    const darkGridline = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector("[data-slot='report-designer-spreadsheet-canvas']") as Element,
        )
          .getPropertyValue('--ss-gridline')
          .trim(),
    );
    expect(darkGridline, 'report canvas --ss-gridline must flip in dark mode').toBe(
      'rgb(51, 65, 85)',
    );
    const darkBorder = await getComputedStyleValue(innerBorder, 'border-right-color');
    expect(darkBorder, 'report canvas inner border must flip in dark mode').not.toBe(lightBorder);

    await setDarkMode(page, false);
    await assertTrackedPageErrors(page);
  });

  test('report canvas bound-cell token face flips in dark mode (plan 477)', async ({ page }) => {
    await page.goto('/#/report-designer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.report-designer-demo')).toBeVisible({ timeout: 15_000 });

    // 绑定单元格由字段拖拽产生（demo 无预置绑定）
    const field = page.locator('[data-slot="report-field-panel-item"]').first();
    const targetCell = page.locator('td.ss-cell[data-row="0"][data-col="0"]').first();
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.dragTo(targetCell);
    await expect(targetCell).toHaveAttribute('data-cell-bound', 'true', { timeout: 15_000 });

    const boundCell = page.locator('td.ss-cell[data-cell-bound]').first();

    const lightBoundBg = await getComputedStyleValue(boundCell, 'background-color');
    expect(lightBoundBg).toBe('rgb(240, 248, 255)');

    await setDarkMode(page, true);
    const darkBoundBg = await getComputedStyleValue(boundCell, 'background-color');
    expect(darkBoundBg, 'bound-cell background must flip in dark mode').not.toBe(lightBoundBg);

    await setDarkMode(page, false);
    await assertTrackedPageErrors(page);
  });
});
