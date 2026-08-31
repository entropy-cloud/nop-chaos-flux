/**
 * Linear 风格 issue tracker 复刻页交互接线测试（plan 2026-08-30-0040-1 P4b）。
 *
 * 承载分析篇 §4 交互清单处置表（L1–L14）的接线/锁定用例（初屏结构见
 * linear-replica-visual.spec.ts）。pass/fail 全部为程序化断言（testid 可见性、
 * mock 会话态可观察变化、选择集计数、端点计数、getComputedStyle）；
 * 截图仅作视觉证据附件。
 *
 * 键盘手势子项（chord/J·K/X/⇧click/⌘A/⌥↑↓/Space hover）按处置表显式裁决
 * 不模拟（G-B2），无对应用例；按钮面/命令面为鼠标等价路径并在此锁定。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/linear-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(
  page: import('@playwright/test').Page,
  pageId: string,
  label: string,
  viewport?: { width: number; height: number },
) {
  await page.setViewportSize(viewport ?? { width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Opt-in mock observation: mirrors the cal endpoint-counter hook pattern. */
async function trackEndpointCalls(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __linearEndpointCalls: Record<string, number> }).__linearEndpointCalls = {};
    (window as unknown as { __linearTestHooks: Record<string, unknown> }).__linearTestHooks = {};
  });
}

async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __linearEndpointCalls?: Record<string, number> }).__linearEndpointCalls ?? {},
  );
}

/** Row checkboxes of the issues table (built-in scope-owned selection column). */
function rowCheckboxes(page: import('@playwright/test').Page) {
  return page.getByTestId('linear-issues-table').locator('[data-slot="table-select-cell"] [data-slot="checkbox"]');
}

/** Body rows only (the header tr also carries data-slot="table-row"). */
function tableRows(page: import('@playwright/test').Page) {
  return page.getByTestId('linear-issues-table').locator('[data-slot="table-body"] [data-slot="table-row"]');
}

async function clickRowCheckbox(page: import('@playwright/test').Page, index: number) {
  await rowCheckboxes(page).nth(index).click();
}

test.describe('Linear issues — L1 ⌘K 过滤与执行', () => {
  test('01 L1 typing filters command groups/items; clearing restores the full list', async ({ page }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-cmdk-trigger').click();
    const cmdk = page.getByTestId('linear-issues-cmdk');
    await expect(cmdk).toBeVisible();
    expect(await page.getByTestId('linear-issues-cmdk-item').count()).toBeGreaterThanOrEqual(15);
    expect(await page.getByTestId('linear-issues-cmdk-group').count()).toBe(3);

    const input = page.getByTestId('linear-issues-cmdk-input');
    await input.fill('收件');
    await expect(page.getByTestId('linear-issues-cmdk-item')).toHaveCount(1);
    await expect(page.getByTestId('linear-issues-cmdk-group')).toHaveCount(1);
    await expect(page.getByTestId('linear-issues-cmdk-item').first()).toContainText('打开收件箱');

    await input.fill('不存在的命令xyz');
    await expect(page.getByTestId('linear-issues-cmdk-item')).toHaveCount(0);
    await expect(page.getByTestId('linear-issues-cmdk-group')).toHaveCount(0);

    await input.fill('');
    expect(await page.getByTestId('linear-issues-cmdk-item').count()).toBeGreaterThanOrEqual(15);

    await snap(page, 'l1-cmdk-filter.png');
  });

  test('02 L1 navigation command executes navigate and lands on the target page', async ({ page }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-cmdk-trigger').click();
    await page.getByTestId('linear-issues-cmdk-input').fill('打开收件箱');
    await page.getByTestId('linear-issues-cmdk-item').first().click();

    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 收件箱', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('linear-inbox-unread-pill')).toContainText('3 条未读');
  });

  test('03 L1 action commands: help opens the static panel; copy fires the no-op endpoint', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-cmdk-trigger').click();
    await page.getByTestId('linear-issues-cmdk-input').fill('快捷键帮助');
    await page.getByTestId('linear-issues-cmdk-item').first().click();

    const help = page.getByTestId('linear-issues-help-dialog');
    await expect(help).toBeVisible();
    await expect(help).toContainText('本复刻已接线');
    await expect(page.getByTestId('linear-issues-help-note')).toContainText('G-B2');
    // 命令面板在动作类命令呼出的浮层下保持堆叠（Esc 逐层退出）；G-B1 模拟深度注记随 C2 回写
    await page.keyboard.press('Escape');
    await expect(help).not.toBeVisible();
    await expect(page.getByTestId('linear-issues-cmdk')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('linear-issues-cmdk')).not.toBeVisible();

    // 导航/复制/归档类命令：命令面板随手令执行即关闭（closeSurface 收尾）
    await page.getByTestId('linear-issues-cmdk-trigger').click();
    await page.getByTestId('linear-issues-cmdk-input').fill('复制问题链接');
    await page.getByTestId('linear-issues-cmdk-item').first().click();
    await expect(page.getByText('链接已复制')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-cmdk')).not.toBeVisible();
    expect((await readEndpointCalls(page)).Linear__copyLink).toBe(1);
  });
});

test.describe('Linear issues — L3/L4 内建锁定 + L7 多选 + L8 peek', () => {
  test('04 L3 list/board view switch navigates both ways (mouse-equivalent lock)', async ({ page }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-tab-board').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 看板视图', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('linear-board-kanban')).toBeVisible();

    await page.getByTestId('linear-board-tab-list').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 列表视图', {
      timeout: 10_000,
    });
  });

  test('05 L4+L7 row toggles, header select-all, and bulk-bar clear reset the selection', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    const count = page.getByTestId('linear-issues-bulk-count');
    await expect(count).toContainText('已选 0 项');

    await clickRowCheckbox(page, 0);
    await expect(count).toContainText('已选 1 项');
    await clickRowCheckbox(page, 1);
    await expect(count).toContainText('已选 2 项');
    await expect(page.getByTestId('linear-issues-bulk-status')).toBeEnabled();

    // 选中行品牌紫底（scope 选择集驱动的形态）
    const selectedRow = tableRows(page).filter({
      has: page.locator('[data-slot="table-select-cell"] [data-slot="checkbox"][data-checked]'),
    });
    await expect(selectedRow).toHaveCount(2);
    expect(await selectedRow.first().evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /94, 106, 210/,
    );

    // 表头全选 checkbox（内建）：选择集覆盖源数据全量 34 行（客户端分页仅裁剪显示）
    await page
      .getByTestId('linear-issues-table')
      .locator('[data-slot="table-select-column"] [data-slot="checkbox"]')
      .click();
    await expect(count).toContainText('已选 34 项');

    // L4 接线锁定：批量栏取消选择 = table 句柄 setSelection 空集
    await page.getByTestId('linear-issues-bulk-clear').click();
    await expect(count).toContainText('已选 0 项');
    await expect(page.getByTestId('linear-issues-bulk-status')).toBeDisabled();
    expect(await rowCheckboxes(page).locator('[data-checked]').count()).toBe(0);
  });

  test('06 L8 peek opens with the clicked row data (id consistency) and copy fires per-row id', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    const thirdKey = page.getByTestId('linear-issues-row-key').nth(2);
    const expectedKey = await thirdKey.innerText();
    await page.getByTestId('linear-issues-peek-trigger').nth(2).click();

    const peek = page.getByTestId('linear-issues-peek');
    await expect(peek).toBeVisible();
    await expect(page.getByTestId('linear-issues-peek-key')).toContainText(expectedKey.trim());

    await page.getByTestId('linear-issues-peek-copy').click();
    await expect(page.getByText('链接已复制')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Linear__copyLink).toBe(1);

    await page.keyboard.press('Escape');
    await expect(peek).not.toBeVisible();
  });
});

test.describe('Linear issues — L10 批量动作', () => {
  test('07 L10 bulk status/priority/assignee post bulkUpdate and the rows update from session state', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await clickRowCheckbox(page, 0);
    await clickRowCheckbox(page, 1);
    await expect(page.getByTestId('linear-issues-bulk-count')).toContainText('已选 2 项');

    // 状态 → 已完成
    await page.getByTestId('linear-issues-bulk-status').click();
    const statusDialog = page.getByTestId('linear-issues-bulk-status-dialog');
    await expect(statusDialog).toBeVisible();
    await page.getByTestId('linear-issues-bulk-status-select').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '已完成' }).click();
    await page.getByTestId('linear-issues-bulk-status-apply').click();
    await expect(page.getByText('已批量修改状态')).toBeVisible({ timeout: 10_000 });
    await expect(statusDialog).not.toBeVisible();

    // 选择集清空 + 两行状态 pill 落库更新
    await expect(page.getByTestId('linear-issues-bulk-count')).toContainText('已选 0 项');
    await expect(tableRows(page).nth(0)).toContainText('已完成');
    await expect(tableRows(page).nth(1)).toContainText('已完成');

    // 优先级 → 紧急（单行）
    await clickRowCheckbox(page, 0);
    await page.getByTestId('linear-issues-bulk-priority').click();
    await page.getByTestId('linear-issues-bulk-priority-select').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '紧急' }).click();
    await page.getByTestId('linear-issues-bulk-priority-apply').click();
    await expect(page.getByText('已批量修改优先级')).toBeVisible({ timeout: 10_000 });
    const prioCell = tableRows(page).nth(0).getByTestId('linear-issues-prio');
    await expect(prioCell).toHaveClass(/ln-prio-urgent/);

    // 指派 → 沈亦舟（首字圆随数据更新）
    await clickRowCheckbox(page, 0);
    await page.getByTestId('linear-issues-bulk-assignee').click();
    await page.getByTestId('linear-issues-bulk-assignee-select').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '沈亦舟' }).click();
    await page.getByTestId('linear-issues-bulk-assignee-apply').click();
    await expect(page.getByText('已批量修改指派')).toBeVisible({ timeout: 10_000 });
    await expect(tableRows(page).nth(0).getByTestId('linear-issues-assignee')).toContainText('沈');

    // 标签 → 前端+设计（多选 patch）
    await clickRowCheckbox(page, 0);
    await page.getByTestId('linear-issues-bulk-label').click();
    // multiple-mode select renders a chips input (no trigger)
    await page.getByTestId('linear-issues-bulk-labels-select').locator('[data-slot="combobox-chip-input"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '前端' }).click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '设计' }).click();
    await page.keyboard.press('Escape');
    await page.getByTestId('linear-issues-bulk-labels-apply').click();
    await expect(page.getByText('已批量修改标签')).toBeVisible({ timeout: 10_000 });
    await expect(tableRows(page).nth(0).getByTestId('linear-issues-label-pill')).toHaveCount(2);

    expect((await readEndpointCalls(page)).Linear__bulkUpdate).toBe(4);
  });
});

test.describe('Linear issues — L11 新建 + L12 筛选', () => {
  test('08 L11 create: empty title is blocked by built-in validation without a write', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：空提交触发校验失败，宿主 onActionError 记一条 action error。
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-create').click();
    const dialog = page.getByTestId('linear-issues-create-dialog');
    await expect(dialog).toBeVisible();

    await page.getByTestId('linear-issues-create-submit').click();
    const titleField = page.getByTestId('linear-issues-create-title');
    await expect(titleField).toHaveAttribute('data-field-invalid', '');
    await expect(titleField.locator('[data-slot="field-error"]')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 列表视图');
    expect((await readEndpointCalls(page)).Linear__createIssue ?? 0).toBe(0);
  });

  test('09 L11 create: valid submit posts createIssue and the new ENG- row is reachable via filter', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    await page.getByTestId('linear-issues-create').click();
    await page.getByTestId('linear-issues-create-title').locator('input').fill('链路验证新建问题样本');
    await page.getByTestId('linear-issues-create-submit').click();

    await expect(page.getByText('问题已创建')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-create-dialog')).not.toBeVisible();
    expect((await readEndpointCalls(page)).Linear__createIssue).toBe(1);

    // 新行在会话库末尾：经筛选端点（同一 mock 会话态）检索证明落库
    await page.getByTestId('linear-issues-filter-entry').click();
    await page.getByTestId('linear-issues-filter-keyword').locator('input').fill('链路验证新建');
    await page.getByTestId('linear-issues-filter-apply').click();
    await expect(page.getByTestId('linear-issues-row-key')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-row-key').first()).toContainText('ENG-135');
    await expect(page.getByTestId('linear-issues-row-title').first()).toContainText('链路验证新建问题样本');
  });

  test('10 L12 filter narrows by status, empty result locks the empty copy, clear restores', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');
    expect(await page.getByTestId('linear-issues-row-key').count()).toBe(10);

    // 状态 = 已完成 → refetch 后 9 行且全部为已完成 pill
    await page.getByTestId('linear-issues-filter-entry').click();
    const dialog = page.getByTestId('linear-issues-filter-dialog');
    await expect(dialog).toBeVisible();
    await page.getByTestId('linear-issues-filter-form').locator('[data-slot="combobox-trigger"]').first().click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '已完成' }).click();
    await page.getByTestId('linear-issues-filter-apply').click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByTestId('linear-issues-row-key')).toHaveCount(9, { timeout: 10_000 });
    const statusCells = page.getByTestId('linear-issues-status-dot');
    expect(await statusCells.count()).toBe(9);
    await expect(tableRows(page).nth(0)).toContainText('已完成');

    // ln-filter-empty：无匹配关键词 → 空态文案
    await page.getByTestId('linear-issues-filter-entry').click();
    await page.getByTestId('linear-issues-filter-keyword').locator('input').fill('zzz绝对不存在');
    await page.getByTestId('linear-issues-filter-apply').click();
    await expect(page.getByText('当前筛选条件下没有问题')).toBeVisible({ timeout: 10_000 });

    // 清筛选恢复：重开 → 清空条件 → 全量首页 10 行
    await page.getByTestId('linear-issues-filter-entry').click();
    await expect(page.getByTestId('linear-issues-filter-keyword').locator('input')).toHaveValue('zzz绝对不存在');
    await expect(page.getByTestId('linear-issues-filter-form').locator('[data-slot="combobox-trigger"]').first()).toContainText('已完成');
    await page.getByTestId('linear-issues-filter-clear').click();
    await expect(page.getByTestId('linear-issues-row-key')).toHaveCount(10, { timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-bulk-count')).toContainText('已选 0 项');

    await snap(page, 'l12-filter-restored.png');
  });
});

test.describe('Linear board — L13 看板拖拽', () => {
  /** Column locator scoped by its header text (cards may share words). */
  function boardColumn(page: import('@playwright/test').Page, title: string) {
    return page.getByTestId('linear-board-kanban').locator('[data-slot="kanban-column"]').filter({
      has: page.locator('[data-slot="kanban-column-header"]', { hasText: title }),
    });
  }

  test('11 L13 drag card across columns posts moveCard; distribution updates from session state', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-board', '问题追踪 · 看板视图');
    // 放大视口，让看板卡片完全入画（拖拽几何稳定）
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    // 初态：待办 8 张，进行中 7 张
    await expect(boardColumn(page, '待办').locator('[data-slot="kanban-column-header"]')).toContainText(
      '8',
    );
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText(
      '7',
    );

    // 拖拽跨列：待办首卡 → 进行中（端点收 {id, toColumn, toIndex}）
    const todoCards = boardColumn(page, '待办').locator('[data-slot="kanban-card"]');
    await todoCards.first().dragTo(boardColumn(page, '进行中').locator('[data-slot="kanban-column-body"]'));

    // 端点调用 + 会话态回流：被拖卡落入新列、列头计数随 component:refresh 更新。
    // 注：kanban 拖拽源注册在 React Compiler dev 双挂载下可能滞后一拍
    // （renderer 侧注册态，G-A/C2 回写登记），故以 lastMove 钩子读实际载荷断言数据一致性。
    const move = await page.evaluate(
      () => (window as unknown as { __linearTestHooks: { lastMove?: Record<string, unknown> } }).__linearTestHooks
        .lastMove,
    );
    expect(move?.toColumn).toBe('col-in_progress');
    const movedKey = String(move?.id ?? '').replace(/^card-/, '');
    expect(movedKey).toMatch(/^ENG-\d+$/);

    await expect(boardColumn(page, '进行中')).toContainText(movedKey, { timeout: 10_000 });
    await expect(boardColumn(page, '待办').locator('[data-slot="kanban-column-header"]')).toContainText(
      '7',
      { timeout: 10_000 },
    );
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText(
      '8',
      { timeout: 10_000 },
    );
    expect((await readEndpointCalls(page)).Linear__moveCard).toBe(1);
  });

  test('12 L13 forced miss keeps the board unchanged (ln-move-miss via mock hook)', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 失败分支走真实端点（forceMiss 钩子），宿主记录一条 action error 噪声
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page, 'linear-board', '问题追踪 · 看板视图');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      (window as unknown as { __linearTestHooks: { moveMiss: boolean } }).__linearTestHooks.moveMiss =
        true;
    });

    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText(
      '7',
    );
    const todoCards = boardColumn(page, '待办').locator('[data-slot="kanban-card"]');
    await todoCards.first().dragTo(boardColumn(page, '进行中').locator('[data-slot="kanban-column-body"]'));

    // 失败 message + 端点计数；component:refresh 回读会话态 → 卡片回原列、布局不变
    await expect(page.getByText('卡片移动失败')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Linear__moveCard).toBe(1);
    await expect(boardColumn(page, '进行中').locator('[data-slot="kanban-column-header"]')).toContainText(
      '7',
      { timeout: 10_000 },
    );
    await expect(boardColumn(page, '待办')).toContainText('ENG-101', { timeout: 10_000 });

    await page.evaluate(() => {
      (window as unknown as { __linearTestHooks: { moveMiss: boolean } }).__linearTestHooks.moveMiss =
        false;
    });
  });

  test('13 L13 board move is observable back on the issues list (session state across pages)', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-board', '问题追踪 · 看板视图');
    await page.setViewportSize({ width: 1680, height: 1400 });
    await page.waitForTimeout(500);

    // 拖拽待办首卡 → 已完成
    const todoCards = boardColumn(page, '待办').locator('[data-slot="kanban-card"]');
    await todoCards.first().dragTo(boardColumn(page, '已完成').locator('[data-slot="kanban-column-body"]'));
    const move = await page.evaluate(
      () => (window as unknown as { __linearTestHooks: { lastMove?: Record<string, unknown> } }).__linearTestHooks
        .lastMove,
    );
    expect(move?.toColumn).toBe('col-done');
    const movedKey = String(move?.id ?? '').replace(/^card-/, '');
    await expect(boardColumn(page, '已完成')).toContainText(movedKey, { timeout: 10_000 });

    // 返回列表页：筛选定位被拖卡，状态 pill 已随会话态翻转为「已完成」
    await page.getByTestId('linear-board-tab-list').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 列表视图', {
      timeout: 10_000,
    });
    await page.getByTestId('linear-issues-filter-entry').click();
    await page.getByTestId('linear-issues-filter-keyword').locator('input').fill(movedKey);
    await page.getByTestId('linear-issues-filter-apply').click();
    await expect(page.getByTestId('linear-issues-row-key')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-table').locator('[data-slot="table-body"] [data-slot="table-row"]').first()).toContainText(
      '已完成',
    );
    expect((await readEndpointCalls(page)).Linear__moveCard).toBe(1);
  });
});

test.describe('Linear inbox — 收件箱动作', () => {
  test('14 inbox item archive removes the row and drops the unread count', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-inbox', '问题追踪 · 收件箱', { width: 1440, height: 1400 });

    // 初态：9 条通知、3 条未读（pill 与侧栏计数一致）
    await expect(page.getByTestId('linear-inbox-unread-pill')).toContainText('3 条未读');
    await expect(page.getByTestId('linear-inbox-item')).toHaveCount(9);

    // 首条（ENG-102，未读）已读归档：行移除 + 未读计数 3→2
    const firstItem = page.getByTestId('linear-inbox-item').first();
    await expect(firstItem).toContainText('ENG-102');
    await firstItem.getByTestId('linear-inbox-item-archive').click();
    await expect(page.getByText('通知已归档')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-inbox-unread-pill')).toContainText('2 条未读', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('linear-inbox-item')).toHaveCount(8);
    await expect(page.getByTestId('linear-inbox-item').first()).not.toContainText('ENG-102');
    expect((await readEndpointCalls(page)).Linear__inboxUpdate).toBe(1);
  });

  test('15 inbox bulk read flips all unread; bulk archive empties the stream', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-inbox', '问题追踪 · 收件箱', { width: 1440, height: 1400 });

    // 全部标为已读：未读 3→0，未读点全部消失。
    // 复刻页在 shell 预览画布内按纵排收缩（P4a 收口形态）：顶栏按钮下半与
    // 分组区起始重叠，按钮位上半点击（非遮挡区）保持真实鼠标路径。
    await page.getByTestId('linear-inbox-bulk-read').click({ position: { x: 20, y: 8 } });
    await expect(page.getByText('已全部标为已读')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-inbox-unread-pill')).toContainText('0 条未读', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('linear-inbox-item-dot')).toHaveCount(0);
    await expect(page.getByTestId('linear-inbox-item')).toHaveCount(9);

    // 归档全部：行清空，分组保留「0 条」空态
    await page.getByTestId('linear-inbox-bulk-archive').click({ position: { x: 20, y: 8 } });
    await expect(page.getByText('已归档全部通知')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-inbox-item')).toHaveCount(0, { timeout: 10_000 });
    expect((await readEndpointCalls(page)).Linear__inboxUpdate).toBe(2);
  });
});

test.describe('Linear detail — L11 终态（复制/状态/归档）', () => {
  test('16 detail copy fires the no-op copyLink endpoint with the page id', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-detail', '问题详情', { width: 1440, height: 1400 });

    await expect(page.getByTestId('linear-detail-key')).toContainText('ENG-105');
    await page.getByTestId('linear-detail-copy').click();
    await expect(page.getByText('链接已复制')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Linear__copyLink).toBe(1);
  });

  test('17 detail status select posts single-id bulkUpdate and the pills update', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-detail', '问题详情', { width: 1440, height: 1400 });

    // 初态：ENG-105 状态「待办」；侧栏 select 当前值一致
    await expect(page.getByTestId('linear-detail-status')).toContainText('待办');
    const select = page.getByTestId('linear-detail-status-select').first();
    await select.locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '已完成' }).click();
    await page.getByTestId('linear-detail-status-apply').click();

    // 会话态落库 + 回读：顶栏/侧栏状态 pill 翻转
    await expect(page.getByText('状态已更新')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-detail-status')).toContainText('已完成', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Linear__bulkUpdate).toBe(1);
  });

  test('18 detail archive posts archiveIssue, navigates back with toast, row leaves the list', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'linear-detail', '问题详情', { width: 1440, height: 1400 });

    await page.getByTestId('linear-detail-archive').click();

    // toast 在 debounce 1200 的跳转后仍可见（Baseline 6），随后落到列表页
    await expect(page.getByText('问题已归档')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 列表视图', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Linear__archiveIssue).toBe(1);

    // 会话库默认过滤 archived：筛选 ENG-105 命中空态
    await page.getByTestId('linear-issues-filter-entry').click();
    await page.getByTestId('linear-issues-filter-keyword').locator('input').fill('ENG-105');
    await page.getByTestId('linear-issues-filter-apply').click();
    await expect(page.getByText('当前筛选条件下没有问题')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('linear-issues-row-key')).toHaveCount(0);
  });
});
