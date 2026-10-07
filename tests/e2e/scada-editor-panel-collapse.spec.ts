import { expect, test, type Page } from './fixtures.js';

// plan 538 Phase 3：scada 编辑器侧板收起-展开 e2e（WorkbenchShell collapsed 契约接线）。
// 程序化断言，无截图：面板头收起按钮 → collapsed rail 出现；rail 点击 → 面板恢复。

async function gotoEditorDemo(page: Page) {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
}

test.describe('scada editor panel collapse (plan 538)', () => {
  test('palette header collapse button collapses the left panel, rail click restores it', async ({ page }) => {
    await gotoEditorDemo(page);

    await expect(page.getByTestId('left-panel-expanded')).toBeVisible();
    await page.getByTestId('collapse-palette').click();
    await expect(page.getByTestId('left-panel-collapsed')).toBeVisible();
    await expect(page.getByTestId('left-panel-expanded')).toHaveCount(0);
    // 右侧不受影响（左右状态独立）。
    await expect(page.getByTestId('right-panel-expanded')).toBeVisible();

    await page.getByTestId('expand-left-panel').click();
    await expect(page.getByTestId('left-panel-expanded')).toBeVisible();
    await expect(page.getByTestId('left-panel-collapsed')).toHaveCount(0);
  });

  test('inspector header collapse button collapses the right panel, rail click restores it', async ({ page }) => {
    await gotoEditorDemo(page);

    await expect(page.getByTestId('right-panel-expanded')).toBeVisible();
    await page.getByTestId('collapse-inspector').click();
    await expect(page.getByTestId('right-panel-collapsed')).toBeVisible();
    await expect(page.getByTestId('right-panel-expanded')).toHaveCount(0);
    await expect(page.getByTestId('left-panel-expanded')).toBeVisible();

    await page.getByTestId('expand-right-panel').click();
    await expect(page.getByTestId('right-panel-expanded')).toBeVisible();
    await expect(page.getByTestId('right-panel-collapsed')).toHaveCount(0);
  });
});
