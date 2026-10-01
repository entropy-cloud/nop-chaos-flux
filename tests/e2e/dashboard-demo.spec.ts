import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * dashboard-demo 专属断言（plan 482 A1/A2/A5）：
 * - 双视口几何：运行态面板 px 随实测容器宽缩放、网格比例不变（A1 程序化判据）
 * - 编辑态 Arrow 键移动 1 格 + 单 undo 步还原（A2）
 * - light/dark 面板 chrome 计算样式（A5，visual-assert helper）
 * 全部程序化判据（2026-08-28 快照政策），零截图。
 */

async function openDashboardDemo(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/dashboard-demo', { waitUntil: 'commit' });
  // 30s：vite dev 冷编译该路由 chunk 图较重（与 map-demo 等 30s 冒烟口径一致）
  await expect(
    page.getByRole('heading', { name: 'dashboard-editor 演示页', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-slot="dashboard-editor-panel"]')).toHaveCount(4, {
    timeout: 30_000,
  });
}

async function enterPreview(page: import('@playwright/test').Page) {
  await page.getByTestId('editor-mode-toggle').click();
  await expect(page.locator('[data-slot="dashboard-editor-preview"] .nop-dashboard')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.locator('[data-slot="dashboard-editor-preview"] [data-slot="dashboard-panel"]'),
  ).toHaveCount(4);
}

interface PanelGeometry {
  left: number;
  top: number;
  width: number;
}

interface PreviewGeometry {
  canvasWidth: number;
  panels: Record<string, PanelGeometry>;
}

async function readPreviewGeometry(
  page: import('@playwright/test').Page,
): Promise<PreviewGeometry> {
  return page.evaluate(() => {
    const preview = document.querySelector('[data-slot="dashboard-editor-preview"]');
    const canvas = preview?.querySelector('[data-slot="dashboard-canvas"]');
    const panels = Array.from(
      preview?.querySelectorAll('[data-slot="dashboard-panel"]') ?? [],
    ) as HTMLElement[];
    const entries = panels.map((panel) => {
      const id = panel.getAttribute('data-panel-id') ?? '';
      const rect = {
        left: parseFloat(panel.style.left),
        top: parseFloat(panel.style.top),
        width: parseFloat(panel.style.width),
      };
      return [id, rect] as const;
    });
    return {
      canvasWidth: canvas ? canvas.getBoundingClientRect().width : 0,
      panels: Object.fromEntries(entries),
    };
  });
}

test.describe('Dashboard demo — runtime adaptive geometry (A1)', () => {
  test('panels rescale with the measured container across viewports and the grid ratio is invariant', async ({
    page,
  }) => {
    await openDashboardDemo(page);
    await enterPreview(page);

    // 面板 px 与实测容器宽的一致性差（panelToPixels 契约自实测 canvasWidth 复算）。
    // shell 容器宽可能带 CSS 过渡，用轮询等一致性收敛而非单帧快照。
    const mismatchPx = async (): Promise<number> => {
      const g = await readPreviewGeometry(page);
      const cw = (g.canvasWidth - 11 * 8) / 12;
      // ux-r10 勘误：R1 起 DEFAULT_LAYOUT_PANELS 的 table-orders 为 x:0 w:12（通栏表），
      // 本期望表仍停留在 6 列旧默认——自 R1 后全量 e2e 未再整体跑过，属于陈旧期望
      // （本轮探针实证：仅 table-orders 差 252px = 12 列实际宽 - 6 列期望宽）。按现行默认修正。
      const expected: Record<string, number> = {
        'kpi-revenue': 3 * cw + 2 * 8,
        'kpi-orders': 3 * cw + 2 * 8,
        'chart-sales': 6 * cw + 5 * 8,
        'table-orders': 12 * cw + 11 * 8,
      };
      return Math.max(
        ...Object.entries(expected).map(([id, v]) => Math.abs((g.panels[id]?.width ?? 0) - v)),
      );
    };
    await expect
      .poll(mismatchPx, { message: 'panels settle on the measured canvas width' })
      .toBeLessThan(1);

    const wide = await readPreviewGeometry(page);
    expect(wide.canvasWidth).toBeGreaterThan(0);
    // A1 判据：容器实测宽 ≠ 旧硬编码 1200，面板几何自实测宽复算成立（上方 poll 已钉）
    expect(wide.canvasWidth).toBeLessThan(1200);

    await page.setViewportSize({ width: 1000, height: 900 });
    await expect
      .poll(async () => (await readPreviewGeometry(page)).canvasWidth)
      .not.toBe(wide.canvasWidth);
    await expect
      .poll(mismatchPx, { message: 'panels resettle on the narrowed canvas width' })
      .toBeLessThan(1);

    const narrow = await readPreviewGeometry(page);
    expect(narrow.canvasWidth).toBeGreaterThan(0);
    expect(narrow.canvasWidth).not.toBe(wide.canvasWidth);
    expect(narrow.canvasWidth).toBeLessThan(1200);

    // 网格比例不变：left 差值比 = 3 : 6，与视口无关（gap 项在差值中消去；
    // 各 left 同属一次 commit，任意已提交快照下恒成立）
    const ratioAt = (g: PreviewGeometry): number =>
      (g.panels['kpi-orders']!.left - g.panels['kpi-revenue']!.left) /
      (g.panels['chart-sales']!.left - g.panels['kpi-revenue']!.left);
    expect(ratioAt(wide)).toBeCloseTo(0.5, 3);
    expect(ratioAt(narrow)).toBeCloseTo(0.5, 3);

    await assertTrackedPageErrors(page);
  });
});

test.describe('Dashboard demo — editor arrow-key navigation (A2)', () => {
  test('ArrowRight moves the selected panel one grid cell and one undo step restores it', async ({
    page,
  }) => {
    await openDashboardDemo(page);
    const panel = page.locator('[data-slot="dashboard-editor-panel"][data-panel-id="kpi-revenue"]');
    const orders = page.locator('[data-slot="dashboard-editor-panel"][data-panel-id="kpi-orders"]');

    // stride = 同行相邻面板 left 差（跨 3 列），由 live DOM 推导，不假设容器宽
    const threeColSpan =
      (await orders.evaluate((el) => parseFloat(el.style.left))) -
      (await panel.evaluate((el) => parseFloat(el.style.left)));
    const leftBefore = await panel.evaluate((el) => parseFloat(el.style.left));

    await panel.click();
    await expect(panel).toHaveAttribute('data-selected', 'true');
    await panel.press('ArrowRight');

    const leftAfter = await panel.evaluate((el) => parseFloat(el.style.left));
    expect(leftAfter - leftBefore).toBeCloseTo(threeColSpan / 3, 0);

    // 单次按键 = 单 undo 步：一次 undo 精确还原，undo 栈随之清空（按钮回到 disabled）
    await page.getByTestId('editor-undo').click();
    await expect
      .poll(() => panel.evaluate((el) => parseFloat(el.style.left)))
      .toBeCloseTo(leftBefore, 3);
    expect(await page.getByTestId('editor-undo').getAttribute('disabled')).toBe('');

    await assertTrackedPageErrors(page);
  });

  test('ArrowLeft clamps at the canvas origin without moving the panel', async ({ page }) => {
    await openDashboardDemo(page);
    const panel = page.locator('[data-slot="dashboard-editor-panel"][data-panel-id="kpi-revenue"]');
    await panel.click();
    await expect(panel).toHaveAttribute('data-selected', 'true');

    await panel.press('ArrowLeft');
    expect(await panel.evaluate((el) => parseFloat(el.style.left))).toBe(0);
    await assertTrackedPageErrors(page);
  });
});

test.describe('Dashboard demo — panel chrome across light/dark (A5)', () => {
  test('panel chrome computed styles respond to the data-mode flip', async ({ page }) => {
    await openDashboardDemo(page);
    await enterPreview(page);

    const panel = page.locator(
      '[data-slot="dashboard-editor-preview"] [data-slot="dashboard-panel"][data-panel-id="kpi-revenue"]',
    );
    const borderLight = await getComputedStyleValue(panel, 'border-top-color');
    const backgroundLight = await getComputedStyleValue(panel, 'background-color');

    await page.getByLabel('模式').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    const borderDark = await getComputedStyleValue(panel, 'border-top-color');
    const backgroundDark = await getComputedStyleValue(panel, 'background-color');
    expect(borderDark).not.toBe(borderLight);
    expect(backgroundDark).not.toBe(backgroundLight);

    await assertTrackedPageErrors(page);
  });
});
