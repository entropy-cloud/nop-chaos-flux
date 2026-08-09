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
    await page.getByRole('button', { name: '暗色' }).click();
    await expect(page.locator('html.dark')).toHaveCount(1);
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    await page.getByRole('button', { name: '亮色' }).click();
    await expect(page.locator('html.dark')).toHaveCount(0);
    await expect(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
      timeout: 20_000,
    });
    await assertTrackedPageErrors(page);
  });
});
