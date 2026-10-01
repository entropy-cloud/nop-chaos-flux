import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openPivotDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/pivot-table-demo', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Pivot Table Demo' })).toBeVisible({
    timeout: 40_000,
  });
}

test.describe('Pivot Table Demo', () => {
  test('renders VTable pivot instances for non-empty cards with correct option mapping', async ({
    page,
  }) => {
    await openPivotDemo(page);
    const pivots = page.locator('[data-slot="pivot-table"]');
    // Sales Pivot + Filtered 两张非空卡片（VTable 实例挂 canvas）
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    // 程序化断言锚点：按 schema id 暴露实例
    const exposedKeys = await page.evaluate(() =>
      Object.keys(window).filter((key) => key.startsWith('__flux_pivot_')),
    );
    expect(exposedKeys).toContain('__flux_pivot_demoSalesPivot');
    expect(exposedKeys).toContain('__flux_pivot_demoFilteredPivot');
    await assertTrackedPageErrors(page);
  });

  test('detail cells resolve values after leaf-subtotal guard (ux-r2, live VTable probe)', async ({
    page,
  }) => {
    await openPivotDemo(page);
    await expect(
      page.locator('[data-slot="pivot-canvas"] canvas').first(),
    ).toBeAttached({ timeout: 20_000 });
    const probe = await page.evaluate(() => {
      const instance = (window as unknown as Record<string, { instance: {
        getCellValue: (col: number, row: number) => unknown;
        getLayoutRowTreeCount: () => number;
      } }>).__flux_pivot_demoSalesPivot?.instance;
      if (!instance) return { found: false as const };
      const rowCount = instance.getLayoutRowTreeCount();
      const cell = (col: number, row: number) => instance.getCellValue(col, row);
      // 布局扫描定位（坐标语义：col 0/1 为 region/quarter 行表头，col 2..5 为
      // Electronics/Furniture 各 sales/profit 指标列；row 2 起为 body）
      let northQ1Row = -1;
      let northSubtotalRow = -1;
      let westQ3Row = -1;
      for (let row = 2; row < rowCount; row += 1) {
        const dim0 = cell(0, row);
        const dim1 = cell(1, row);
        if (dim0 === 'North' && dim1 === 'Q1' && northQ1Row === -1) northQ1Row = row;
        // 合并单元格渲染时序：'小计'可能落在 col 0 或 col 1，取 North 段首个命中
        if ((dim0 === '小计' || dim1 === '小计') && northSubtotalRow === -1) {
          northSubtotalRow = row;
        }
        if (dim0 === 'West' && dim1 === 'Q3' && westQ3Row === -1) westQ3Row = row;
      }
      return {
        found: true as const,
        rowCount,
        northQ1Row,
        northSubtotalRow,
        westQ3Row,
        // 明细锚点 1：North/Q1/Electronics/sales = 1200
        northQ1ElectronicsSales: cell(2, northQ1Row),
        // 明细锚点 2：West/Q3/Furniture/profit = 164（col 5 = Furniture/profit）
        westQ3FurnitureProfit: cell(5, westQ3Row),
        // region 小计：North 小计行 × Electronics/sales = 4050
        northSubtotalElectronicsSales:
          northSubtotalRow >= 0 ? cell(2, northSubtotalRow) : null,
      };
    });
    expect(probe.found).toBe(true);
    expect(probe.northQ1ElectronicsSales).toBe(1200);
    expect(probe.westQ3FurnitureProfit).toBe(164);
    expect(probe.northSubtotalElectronicsSales).toBe(4050);
    await assertTrackedPageErrors(page);
  });

  test('empty card renders the empty slot without creating an instance', async ({ page }) => {
    await openPivotDemo(page);
    const emptyCard = page.locator('div').filter({ hasText: '暂无销售数据' }).first();
    await expect(emptyCard).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-slot="pivot-empty"]')).toHaveCount(1, {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('theme toggle keeps pivot instances alive (no crash, canvas re-renders)', async ({
    page,
  }) => {
    await openPivotDemo(page);
    const pivots = page.locator('[data-slot="pivot-table"]');
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    // Mechanism migrated to the data-mode attribute trigger (plan 471 V1-F2);
    // the former html.dark class toggle was never read by any token block.
    await page.getByRole('button', { name: '暗色' }).click();
    await expect(page.locator("html[data-mode='dark']")).toHaveCount(1);
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    await page.getByRole('button', { name: '亮色' }).click();
    await expect(page.locator("html[data-mode='dark']")).toHaveCount(0);
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    await assertTrackedPageErrors(page);
  });
});
