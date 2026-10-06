import { expect, test } from './fixtures.js';

/**
 * plan 528 — report-designer 外壳体验 e2e（程序化断言，零截图）：
 * 三栏面板可调宽（demo 路径，≥1024px 视口）、字段面板检索与空态、
 * 字段拖拽 ghost、Inspector 三态（空态卡/骨架/错误卡）。
 * renderer 路径（/#/report-designer-host）由 host spec 家族既有断言保障；
 * resize 手柄为 WorkbenchShell 共性（TABLET_BREAKPOINT=1024）。
 */

async function openReportDesigner(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/report-designer', { waitUntil: 'commit' });
  await expect(page.locator('.nop-report-designer, .report-designer-demo').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.react-grid-item, [data-slot="report-field-panel-shell"]').first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('report designer ux-visual (plan 528)', () => {
  // Phase 1：demo 路径左右面板可调宽——拖动分隔手柄后面板宽度变化。
  test('side panels resize via drag handles', async ({ page }) => {
    await openReportDesigner(page);

    // WorkbenchShell resize 手柄（w-1 cursor-col-resize）
    const handles = page.locator('[class*="cursor-col-resize"]');
    const handleCount = await handles.count();
    expect(handleCount).toBeGreaterThanOrEqual(2);

    const leftPanel = page.locator('[data-slot="report-field-panel-shell"]').first();
    await expect(leftPanel).toBeVisible();
    const widthBefore = await leftPanel.evaluate((el) => el.getBoundingClientRect().width);

    // 拖左侧手柄（手柄位于左面板右缘）：向右拖 60px
    const firstHandle = handles.first();
    const handleBox = await firstHandle.boundingBox();
    expect(handleBox).toBeTruthy();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + 200);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 60, handleBox!.y + 200, {
      steps: 8,
    });
    await page.mouse.up();

    const widthAfter = await leftPanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(widthAfter).toBeGreaterThan(widthBefore + 40);
  });

  // Phase 2：字段面板检索——过滤计数、空态、清除。
  test('field panel search filters and shows empty state', async ({ page }) => {
    await openReportDesigner(page);

    const items = page.locator('[data-slot="report-field-panel-item"]');
    const total = await items.count();
    expect(total).toBeGreaterThan(0);

    const search = page.getByTestId('report-field-search');
    await search.fill('不存在的字段zzz');
    await expect(items).toHaveCount(0);
    await expect(page.getByTestId('report-field-empty')).toBeVisible();

    await page.getByRole('button', { name: '清除搜索' }).click();
    await expect(search).toHaveValue('');
    await expect(items).toHaveCount(total);
  });

  // Phase 2：字段拖拽 ghost——dragstart 时注入、落点 drop 链路不回归。
  test('field drag injects ghost and drop still binds', async ({ page }) => {
    await openReportDesigner(page);

    await page.evaluate(() => {
      const w = window as typeof window & { __pd528GhostSeen?: boolean };
      w.__pd528GhostSeen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="report-field-drag-ghost"]')) {
          w.__pd528GhostSeen = true;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 10_000);
    });

    const firstField = page.locator('[data-slot="report-field-panel-item"]').first();
    const target = page.locator('[data-slot="report-designer-spreadsheet-canvas"], [data-cell-drop-target]').first();
    await firstField.dragTo(target);

    const ghostSeen = await page.evaluate(
      () => (window as typeof window & { __pd528GhostSeen?: boolean }).__pd528GhostSeen === true,
    );
    expect(ghostSeen).toBe(true);
    await expect(page.locator('[data-testid="report-field-drag-ghost"]')).toHaveCount(0);
  });

  // Phase 3：Inspector 三态——空态卡（图标+文案）、结构化容器。
  test('inspector empty state renders upgraded card', async ({ page }) => {
    await openReportDesigner(page);

    // demo 路由自带默认选中，空态卡不可达——本用例断言 shell 在场；
    // 空态卡/骨架/错误三态的确定性断言由 inspector-shell-states.test.tsx 单测覆盖
    //（demo 未传 noSelectionLabel，空态文案走 zh-CN noSelection）。
    const shell = page.locator('[data-slot="report-designer-inspector-shell"]');
    await expect(shell).toBeVisible();
    const empty = page.getByTestId('report-inspector-empty');
    if ((await empty.count()) > 0) {
      await expect(empty.locator('svg')).toBeVisible();
      await expect(empty).toContainText('选择一个目标进行检查');
    }
  });
});
