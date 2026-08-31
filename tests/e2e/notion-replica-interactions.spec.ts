/**
 * Notion 风格多视图数据库复刻页交互接线测试（plan 2026-08-30-0614-1 P5b）。
 *
 * 承载分析篇 §4 交互清单处置表（N1–N14）的接线/锁定用例（初屏结构见
 * notion-replica-visual.spec.ts）。pass/fail 全部为程序化断言（testid
 * 可见性、mock 会话态可观察变化、端点计数、getComputedStyle）；截图仅作
 * 视觉证据附件。
 *
 * 显式裁决不模拟项（处置表落字，无对应用例）：I2 新建视图真实分支（G-C）、
 * I7 动态列模型子项（G-D）、I13 视图 tab 定制全谱（G-C/G-B2）、I9 行拖排序
 * 与 calendar 拖改期子项（G-D/自绘网格无事件面）、I12 规则编辑器动态化
 * （G-F2）、N14 批量选择（按钮面等价路径承载）。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/notion-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(page: import('@playwright/test').Page, label = '多视图数据库 · 产品需求库') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/complex-pages/notion-database', { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function openViewTab(page: import('@playwright/test').Page, tabTitle: string, branchTestId: string) {
  await page.getByTestId('notion-view-tabs').getByText(tabTitle, { exact: true }).click();
  await expect(page.getByTestId(branchTestId)).toBeVisible();
}

/** Opt-in mock observation: mirrors the linear endpoint-counter hook pattern. */
async function trackEndpointCalls(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __notionEndpointCalls: Record<string, number> }).__notionEndpointCalls = {};
    (window as unknown as { __notionTestHooks: Record<string, unknown> }).__notionTestHooks = {};
  });
}

async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __notionEndpointCalls?: Record<string, number> }).__notionEndpointCalls ?? {},
  );
}

/**
 * Hover-reveal probe: opacity:0 elements still count as "visible" for
 * Playwright, so the pure-CSS :hover controls are asserted via computed
 * opacity of their reveal group (`.nt-cal-add`).
 */
async function revealOpacity(locator: import('@playwright/test').Locator): Promise<string> {
  return locator.evaluate((el) => {
    let cur: HTMLElement | null = el as HTMLElement;
    while (cur) {
      if (cur.classList.contains('nt-cal-add')) {
        return getComputedStyle(cur).opacity;
      }
      cur = cur.parentElement;
    }
    return 'unknown';
  });
}

test.describe('Notion table — I5 搜索参数化', () => {
  test('01 I5 keyword filters live from the search dialog; empty state and restore', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    expect(await page.getByTestId('notion-row-title').count()).toBe(10);

    await page.getByTestId('notion-search-entry').click();
    const dialog = page.getByTestId('notion-search-dialog');
    await expect(dialog).toBeVisible();
    const input = page.getByTestId('notion-search-input');

    // 输入即过滤（裸 input scope 写入 → url 物化 → dependsOn 自动刷新）
    await input.fill('看板视图');
    await expect(page.getByTestId('notion-row-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('notion-row-title').first()).toContainText('看板视图支持按人员分组');

    // 属性值命中（状态标签「评审中」属属性值域，I5「标题+属性值」）
    await input.fill('评审中');
    await expect(page.getByTestId('notion-row-title')).not.toHaveCount(0, { timeout: 10_000 });

    // nt-filter-empty：零命中 → 空态文案不报错
    await input.fill('zzz绝不存在的关键词');
    await expect(page.getByText('当前筛选条件下没有记录')).toBeVisible({ timeout: 10_000 });

    // 清空恢复全量
    await input.fill('');
    await expect(page.getByTestId('notion-row-title')).toHaveCount(10, { timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect((await readEndpointCalls(page)).Notion__records).toBeGreaterThanOrEqual(4);
    await snap(page, 'n01-search.png');
  });
});

test.describe('Notion table — I8 新建行', () => {
  test('02 I8 empty title is blocked by built-in validation without a write', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：空提交触发校验失败，宿主 onActionError 记一条 action error。
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('notion-new-record-trigger').click();
    const dialog = page.getByTestId('notion-record-dialog');
    await expect(dialog).toBeVisible();

    await page.getByTestId('notion-record-submit').click();
    const titleField = page.getByTestId('notion-record-input-title');
    await expect(titleField).toHaveAttribute('data-field-invalid', '');
    await expect(titleField.locator('[data-slot="field-error"]')).toBeVisible();
    await expect(dialog).toBeVisible();
    expect((await readEndpointCalls(page)).Notion__createRecord ?? 0).toBe(0);
  });

  test('03 I8 valid submit posts createRecord and the new row is reachable at the tail', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    // 表底 +New 与右上「新建」同链路（此处走表底入口）
    await page.getByTestId('notion-table-new-row').click();
    await page.getByTestId('notion-record-input-title').locator('input').fill('链路验证新建记录样本');
    await page.getByTestId('notion-record-submit').click();

    await expect(page.getByText('记录已创建')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('notion-record-dialog')).not.toBeVisible();
    expect((await readEndpointCalls(page)).Notion__createRecord).toBe(1);

    // 新行在会话库表尾：经搜索端点（同一 mock 会话态）检索证明落库 + 表尾插行
    await page.getByTestId('notion-search-entry').click();
    await page.getByTestId('notion-search-input').locator('input').fill('链路验证新建');
    await expect(page.getByTestId('notion-row-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('notion-row-title').first()).toContainText('链路验证新建记录样本');
    // 默认值（分类=产品需求 / 状态=未开始）随创建落库
    await expect(page.getByTestId('notion-cell-category').first()).toContainText('产品需求');
  });
});

test.describe('Notion peek — I6/I10 属性编辑保存链路', () => {
  test('04 I6+I10 peek edit saves via updateRecord; session state is observable across views', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    // table 行 → side peek → 编辑保存
    await page.getByTestId('notion-row-title').first().hover();
    await page.getByTestId('notion-row-open').first().click();
    const peek = page.getByTestId('notion-peek-side');
    await expect(peek).toBeVisible();
    await expect(page.getByTestId('notion-peek-title')).toContainText('首页信息流卡片支持双列布局切换');

    const editTitle = page.getByTestId('notion-peek-edit-title').locator('input');
    await expect(editTitle).toHaveValue('首页信息流卡片支持双列布局切换');
    await editTitle.fill('首页信息流卡片已改标题');
    await page.getByTestId('notion-peek-edit-status').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '评审中' }).click();
    await page.getByTestId('notion-peek-save').click();

    await expect(page.getByText('属性已保存')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Notion__updateRecord).toBe(1);
    await page.keyboard.press('Escape');
    await expect(peek).not.toBeVisible();

    // 会话态跨视图一致：table 行已更新
    await expect(page.getByTestId('notion-row-title').first()).toContainText('首页信息流卡片已改标题', { timeout: 10_000 });

    // board 卡片描述行（REC-101）与 list 标题同步（board/list 分支 keepMounted，刷新后随会话态）
    await openViewTab(page, '状态看板', 'notion-views-board');
    await expect(page.getByTestId('notion-board-kanban')).toContainText('首页信息流卡片已改标题', { timeout: 10_000 });
    await openViewTab(page, '进行清单', 'notion-views-list');
    await expect(page.getByTestId('notion-list').getByText('首页信息流卡片已改标题')).toBeVisible({ timeout: 10_000 });
  });

  test('05 I6 center peek (gallery) edit path and I14 equivalent copy-link carrier', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    await openViewTab(page, '封面墙', 'notion-views-gallery');
    await page.getByTestId('notion-gallery-card').first().hover();
    await page.getByTestId('notion-gallery-open').first().click();
    const centerPeek = page.getByTestId('notion-peek-center');
    await expect(centerPeek).toBeVisible();

    // 复制链接（语义模拟，第四例 clipboard 载体）+ 端点计数
    await page.getByTestId('notion-peek-copy').click();
    await expect(page.getByText('链接已复制')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Notion__copyLink).toBe(1);

    // center peek 编辑保存
    await page.getByTestId('notion-peek-edit-title').locator('input').fill('双列布局卡片已改名');
    await page.getByTestId('notion-peek-save').click();
    await expect(page.getByText('属性已保存')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Notion__updateRecord).toBe(1);
    await page.keyboard.press('Escape');
    await expect(centerPeek).not.toBeVisible();
    await expect(page.getByTestId('notion-gallery-title').first()).toContainText('双列布局卡片已改名', { timeout: 10_000 });
  });
});

test.describe('Notion board — I9 拖拽改分组', () => {
  function boardColumn(page: import('@playwright/test').Page, title: string) {
    return page.getByTestId('notion-board-kanban').locator('[data-slot="kanban-column"]').filter({
      has: page.locator('[data-slot="kanban-column-header"]', { hasText: title }),
    });
  }

  test('09 I9 drag card across columns posts moveCard; distribution and aggregates follow session', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, '多视图数据库 · 产品需求库');
    await openViewTab(page, '状态看板', 'notion-views-board');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    // 初态列计数（mock 会话库：未开始 9 / 进行中 9 / 评审中 6 / 已完成 8）
    await expect(boardColumn(page, '未开始').locator('[data-slot="kanban-column-header"]')).toContainText('9');
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText('9');

    // 拖拽跨列：未开始首卡 → 进行中（端点收 {id, toColumn, toIndex}）
    const fromCards = boardColumn(page, '未开始').locator('[data-slot="kanban-card"]');
    await fromCards.first().dragTo(boardColumn(page, '进行中').locator('[data-slot="kanban-column-body"]'));

    // 端点调用 + 会话态回流（拖拽源注册滞后注记沿 P4b：以 lastMove 载荷锁数据一致性）
    const move = await page.evaluate(
      () => (window as unknown as { __notionTestHooks: { lastMove?: Record<string, unknown> } }).__notionTestHooks.lastMove,
    );
    expect(move?.toColumn).toBe('col-in_progress');
    const movedId = String(move?.id ?? '').replace(/^card-/, '');
    expect(movedId).toMatch(/^REC-\d+$/);

    await expect(page.getByText('卡片已移动')).toBeVisible({ timeout: 10_000 });
    await expect(boardColumn(page, '未开始').locator('[data-slot="kanban-column-header"]')).toContainText('8', { timeout: 10_000 });
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText('10', { timeout: 10_000 });
    // 聚合条随会话态更新（P5b 裁定端点动态化）
    await expect(page.getByTestId('notion-board-aggregate')).toHaveCount(4);
    expect((await readEndpointCalls(page)).Notion__moveCard).toBe(1);
  });

  test('10 I9 forced miss keeps the board unchanged (nt-move-miss via mock hook)', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 失败分支走真实端点（moveMiss 钩子），宿主记录一条 action error 噪声
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page, '多视图数据库 · 产品需求库');
    await openViewTab(page, '状态看板', 'notion-views-board');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      (window as unknown as { __notionTestHooks: { moveMiss: boolean } }).__notionTestHooks.moveMiss = true;
    });

    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText('9');
    const fromCards = boardColumn(page, '未开始').locator('[data-slot="kanban-card"]');
    await fromCards.first().dragTo(boardColumn(page, '进行中').locator('[data-slot="kanban-column-body"]'));

    // 失败 message + component:refresh 回读会话态 → 卡片回原列、布局不变
    await expect(page.getByText('卡片移动失败')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Notion__moveCard).toBe(1);
    await expect(boardColumn(page, '未开始').locator('[data-slot="kanban-column-header"]')).toContainText('9', { timeout: 10_000 });
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText('9', { timeout: 10_000 });

    await page.evaluate(() => {
      (window as unknown as { __notionTestHooks: { moveMiss: boolean } }).__notionTestHooks.moveMiss = false;
    });
  });

  test('11 I9 board move is observable in the table view (session state across views)', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, '多视图数据库 · 产品需求库');
    await openViewTab(page, '状态看板', 'notion-views-board');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    const fromCards = boardColumn(page, '评审中').locator('[data-slot="kanban-card"]');
    await fromCards.first().dragTo(boardColumn(page, '已完成').locator('[data-slot="kanban-column-body"]'));
    const move = await page.evaluate(
      () => (window as unknown as { __notionTestHooks: { lastMove?: Record<string, unknown> } }).__notionTestHooks.lastMove,
    );
    expect(move?.toColumn).toBe('col-done');
    const movedId = String(move?.id ?? '').replace(/^card-/, '');
    await expect(boardColumn(page, '已完成')).toContainText(movedId, { timeout: 10_000 });

    // 切回 table：搜索定位被拖卡，状态 chip 已随会话态翻转为「已完成」
    await openViewTab(page, '全部记录', 'notion-views-table');
    await page.getByTestId('notion-search-entry').click();
    await page.getByTestId('notion-search-input').locator('input').fill(movedId);
    await expect(page.getByTestId('notion-row-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('notion-cell-status').first()).toContainText('已完成');
    expect((await readEndpointCalls(page)).Notion__moveCard).toBe(1);
  });
});

test.describe('Notion board — I11 group 切换', () => {
  test('12 I11 group switch rebuilds board columns; drag flips the new group property', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, '多视图数据库 · 产品需求库');
    await openViewTab(page, '状态看板', 'notion-views-board');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    // 初态：按状态 4 列
    await expect(page.locator('[data-slot="kanban-column-header"]')).toHaveCount(4);
    await expect(page.locator('[data-slot="kanban-column-header"]').first()).toContainText('未开始');

    // View settings → 分组属性=按分类 → 应用
    await page.getByTestId('notion-settings-trigger').click();
    await expect(page.getByTestId('notion-settings-drawer')).toBeVisible();
    await page.getByTestId('notion-settings-group').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '按分类' }).click();
    await page.getByTestId('notion-settings-apply').click();
    await expect(page.getByText('视图配置已应用').first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    // board 列集随分组属性变化（分类 4 列，列头为分类标签）
    await expect(page.locator('[data-slot="kanban-column-header"]')).toHaveCount(4, { timeout: 10_000 });
    await expect(page.locator('[data-slot="kanban-column-header"]').first()).toContainText('产品需求');

    // 分类分组下拖拽 = 改分类属性（会话态跨视图可观察）
    const sourceColumn = page.getByTestId('notion-board-kanban').locator('[data-slot="kanban-column"]').filter({
      has: page.locator('[data-slot="kanban-column-header"]', { hasText: '产品需求' }),
    });
    const targetColumn = page.getByTestId('notion-board-kanban').locator('[data-slot="kanban-column"]').filter({
      has: page.locator('[data-slot="kanban-column-header"]', { hasText: '调研探索' }),
    });
    await sourceColumn.locator('[data-slot="kanban-card"]').first().dragTo(targetColumn.locator('[data-slot="kanban-column-body"]'));
    const move = await page.evaluate(
      () => (window as unknown as { __notionTestHooks: { lastMove?: Record<string, unknown> } }).__notionTestHooks.lastMove,
    );
    expect(move?.toColumn).toBe('col-调研探索');
    const movedId = String(move?.id ?? '').replace(/^card-/, '');

    // table 视图分类 chip 已翻转
    await openViewTab(page, '全部记录', 'notion-views-table');
    await page.getByTestId('notion-search-entry').click();
    await page.getByTestId('notion-search-input').locator('input').fill(movedId);
    await expect(page.getByTestId('notion-row-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('notion-cell-category').first()).toContainText('调研探索');
    expect((await readEndpointCalls(page)).Notion__updateViewConfig).toBe(1);
  });
});

test.describe('Notion calendar + 显式裁决静态锁定', () => {
  test('13 calendar hover + opens the wired create dialog (button-face wiring; date prefill adjudicated)', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, '多视图数据库 · 产品需求库');
    await openViewTab(page, '排期月历', 'notion-views-calendar');

    // hover 当日出 `+`（纯 CSS :hover → 计算透明度轮询断言）
    const addGlyph = page.getByTestId('notion-cal-add').first();
    expect(await revealOpacity(addGlyph)).toBe('0');
    await page.getByTestId('notion-cal-day').first().hover();
    await expect.poll(() => revealOpacity(addGlyph), { timeout: 2000 }).toBe('1');

    // `+` → 新建记录 dialog（与表底/右上同一接线链路）
    await addGlyph.click({ force: true });
    await expect(page.getByTestId('notion-record-dialog')).toBeVisible();
    await page.getByTestId('notion-record-input-title').locator('input').fill('日历加号新建样本');
    await page.getByTestId('notion-record-submit').click();
    await expect(page.getByText('记录已创建')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Notion__createRecord).toBe(1);
  });

  test('14 I2 new-view and I13 tab-display stay statically adjudicated (no fake branches)', async ({ page }) => {
    await openPage(page, '多视图数据库 · 产品需求库');

    // I2：类型清单静态 + 显式裁决注记（无真实新建分支）
    await page.getByTestId('notion-new-view-trigger').click();
    const newView = page.getByTestId('notion-new-view-dialog');
    await expect(newView).toBeVisible();
    expect(await page.getByTestId('notion-new-view-option').count()).toBe(7);
    await expect(page.getByTestId('notion-new-view-note')).toContainText('显式裁决');
    await page.keyboard.press('Escape');
    await expect(newView).not.toBeVisible();

    // I13：三态 select 静态样本 + tab 定制注记维持（原语缺口 G-C/G-B2）
    await page.getByTestId('notion-settings-trigger').click();
    await expect(page.getByTestId('notion-settings-display').first()).toContainText('三态');
    await page.keyboard.press('Escape');
    // tab 三态静态样本（图标+名称）保持
    await expect(page.getByTestId('notion-tab-display-note')).toContainText('图标+名称');
  });
});

test.describe('Notion settings — I1 随动 + I3 筛选 + I4 排序', () => {
  test('06 I4 single-key sort applies to the table view only (per-view config)', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('notion-settings-trigger').click();
    const drawer = page.getByTestId('notion-settings-drawer');
    await expect(drawer).toBeVisible();
    await page.getByTestId('notion-settings-sort-select').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '工作量升序' }).click();
    await page.getByTestId('notion-settings-apply').click();

    await expect(page.getByText('视图配置已应用')).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // table 首/末行工作量升序（首页 10 行内单调）
    const numbers = await page.getByTestId('notion-cell-number').allInnerTexts();
    const parsed = numbers.map((n) => parseInt(n, 10));
    expect(parsed.length).toBe(10);
    for (let i = 1; i < parsed.length; i += 1) {
      expect(parsed[i]).toBeGreaterThanOrEqual(parsed[i - 1]);
    }
    expect((await readEndpointCalls(page)).Notion__updateViewConfig).toBe(1);

    // I1 随动：board 视图不受 table 覆写影响（仍为 4 状态列）
    await openViewTab(page, '状态看板', 'notion-views-board');
    await expect(page.locator('[data-slot="kanban-column-header"]')).toHaveCount(4);
    await openViewTab(page, '全部记录', 'notion-views-table');
    // 切回 table：覆写随会话配置保持生效
    const restored = await page.getByTestId('notion-cell-number').allInnerTexts();
    const restoredParsed = restored.map((n) => parseInt(n, 10));
    expect(restoredParsed[0]).toBe(parsed[0]);
  });

  test('07 I3 condition-builder filter narrows the view; empty rule locks the empty copy', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('notion-settings-trigger').click();
    await expect(page.getByTestId('notion-settings-drawer')).toBeVisible();

    const builder = page.getByTestId('notion-settings-filter-builder');

    // 构建器：添加条件 → 字段=状态 → 值=已完成（op 默认「等于」）
    await page.getByRole('button', { name: '添加条件' }).first().click();
    await builder.getByRole('combobox', { name: '条件字段' }).first().click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '状态' }).first().click();
    await builder.locator('[data-slot="select-trigger"]').last().click();
    await page.locator('[data-slot="select-item"]', { hasText: '已完成' }).first().click();

    await page.getByTestId('notion-settings-apply').click();
    await expect(page.getByText('视图配置已应用').first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    // 仅已完成行（11 条状态样本中首页为已完成行）
    await expect(page.getByText('当前筛选条件下没有记录')).not.toBeVisible({ timeout: 10_000 });
    const statusCells = page.getByTestId('notion-cell-status');
    const count = await statusCells.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await expect(statusCells.nth(i)).toContainText('已完成');
    }
    expect((await readEndpointCalls(page)).Notion__updateViewConfig).toBe(1);

    // nt-filter-empty 对称面：无值条件判不命中 → 空态文案
    await page.getByTestId('notion-settings-trigger').click();
    await page.getByRole('button', { name: '添加条件' }).first().click();
    await builder.getByRole('combobox', { name: '条件字段' }).first().click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '分类' }).first().click();
    await page.getByTestId('notion-settings-apply').click();
    await expect(page.getByText('视图配置已应用').first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(page.getByText('当前筛选条件下没有记录').first()).toBeVisible({ timeout: 10_000 });
  });

  test('08 I1 five-tab walkthrough keeps per-view session state and data intact', async ({ page }) => {
    await openPage(page);
    for (const [tabTitle, branchTestId] of [
      ['状态看板', 'notion-views-board'],
      ['封面墙', 'notion-views-gallery'],
      ['排期月历', 'notion-views-calendar'],
      ['进行清单', 'notion-views-list'],
      ['全部记录', 'notion-views-table'],
    ] as const) {
      await openViewTab(page, tabTitle, branchTestId);
    }
    await expect(page.getByTestId('notion-row-title').first()).toContainText('首页信息流');
    expect(await page.getByTestId('notion-row-title').count()).toBe(10);
  });
});
