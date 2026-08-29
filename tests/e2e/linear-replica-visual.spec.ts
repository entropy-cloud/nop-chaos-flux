/**
 * Linear 风格 issue tracker 复刻页初屏结构测试（plan 2026-08-29-1819-2 P4a）。
 *
 * 覆盖 linear-issues / linear-board / linear-inbox / linear-detail /
 * linear-projects / linear-settings 六张复刻页的初屏结构断言。pass/fail
 * 全部为程序化断言（testid 可见性、关键文案、mock 端点数据、
 * getComputedStyle 令牌解析、无品牌字样）；截图仅作视觉证据附件。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/linear-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({
    path: join(ARTIFACTS_DIR, file),
    fullPage: false,
  });
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

test.describe('Linear replica — initial-screen structure', () => {
  test('01 issues — three-pane skeleton + high-density rows from mock + bulk bar + overlays + tokens', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    // 三栏骨架：侧边栏（工作区切换形态 + 导航组 + 收藏组）
    const sidebar = page.getByTestId('linear-issues-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('问题工作台');
    await expect(page.getByTestId('linear-issues-nav')).toContainText('收件箱');
    await expect(page.getByTestId('linear-issues-nav')).toContainText('活跃问题');
    await expect(page.getByTestId('linear-issues-fav-group')).toContainText('平台重构');

    // 顶栏：视图切换 tabs + 筛选 / Display 入口 / 命令按钮
    const topbar = page.getByTestId('linear-issues-topbar');
    await expect(topbar).toBeVisible();
    await expect(page.getByTestId('linear-issues-tab-list')).toContainText('列表');
    await expect(page.getByTestId('linear-issues-tab-board')).toContainText('看板');
    await expect(page.getByTestId('linear-issues-filter-entry')).toContainText('筛选');
    await expect(page.getByTestId('linear-issues-display-trigger')).toContainText('显示');

    // 高密度 issue 表：字段全部来自 Linear__issues mock（首页 10 行）
    const table = page.getByTestId('linear-issues-table');
    await expect(table).toBeVisible();
    await expect(page.getByTestId('linear-issues-row-key').first()).toContainText('ENG-101');
    await expect(page.getByTestId('linear-issues-row-title').first()).toContainText(
      '工作区切换器在多团队视图下出现重复条目',
    );
    expect(await page.getByTestId('linear-issues-row-key').count()).toBe(10);
    await expect(page.getByTestId('linear-issues-label-pill').first()).toBeVisible();
    await expect(page.getByTestId('linear-issues-prio').first()).toBeVisible();
    await expect(page.getByTestId('linear-issues-assignee').first()).toContainText('林');
    await expect(page.getByTestId('linear-issues-due').nth(1)).toContainText('2026-09');
    // 状态 pill 文本来自 mock（状态分组覆盖）
    await expect(table).toContainText('进行中');
    await expect(table).toContainText('已完成');

    // 左缘 checkbox 浮出形态 + 选中行静态样本（品牌紫底）
    expect(await page.getByTestId('linear-issues-row-check').count()).toBe(9);
    const checkOn = page.getByTestId('linear-issues-row-check-on');
    await expect(checkOn).toHaveCount(1);
    expect(await checkOn.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const selectedRow = page.locator('tr', { has: page.getByTestId('linear-issues-row-check-on') });
    await expect(selectedRow).toHaveCount(1);
    expect(await selectedRow.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /94, 106, 210/,
    );

    // 底部批量操作栏静态形态（G-B3）
    const bulkBar = page.getByTestId('linear-issues-bulk-bar');
    await expect(bulkBar).toBeVisible();
    await expect(page.getByTestId('linear-issues-bulk-count')).toContainText('已选 3 项');
    await expect(page.getByTestId('linear-issues-bulk-status')).toContainText('状态');
    await expect(page.getByTestId('linear-issues-bulk-priority')).toContainText('优先级');
    await expect(page.getByTestId('linear-issues-bulk-assignee')).toContainText('指派');
    await expect(page.getByTestId('linear-issues-bulk-label')).toContainText('标签');

    // Display Options 抽屉（drawer 载体 + Grouping/Ordering + Manual 前置说明）
    await page.getByTestId('linear-issues-display-trigger').click();
    const drawer = page.getByTestId('linear-issues-display-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('分组');
    await expect(drawer).toContainText('排序');
    await expect(page.getByTestId('linear-issues-display-grouping').first()).toBeVisible();
    await expect(page.getByTestId('linear-issues-display-manual-note')).toContainText('手动排序');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // ⌘K 壳（dialog 载体 + 搜索输入 + 命令清单来自 Linear__commands + 分组标签）
    await page.getByTestId('linear-issues-cmdk-trigger').click();
    const cmdk = page.getByTestId('linear-issues-cmdk');
    await expect(cmdk).toBeVisible();
    await expect(page.getByTestId('linear-issues-cmdk-input')).toBeVisible();
    await expect(cmdk).toContainText('跳转');
    await expect(cmdk).toContainText('动作');
    await expect(cmdk).toContainText('搜索');
    expect(await page.getByTestId('linear-issues-cmdk-item').count()).toBeGreaterThanOrEqual(12);
    expect(await page.getByTestId('linear-issues-cmdk-kbd').count()).toBeGreaterThanOrEqual(8);
    await expect(cmdk).toContainText('打开收件箱');
    await page.keyboard.press('Escape');
    await expect(cmdk).not.toBeVisible();

    // peek 浮层（行级 dialog：标题/状态/描述摘要/属性侧栏形态，数据经 Linear__issue 按行加载）
    await page.getByTestId('linear-issues-peek-trigger').nth(4).click();
    const peek = page.getByTestId('linear-issues-peek');
    await expect(peek).toBeVisible();
    await expect(page.getByTestId('linear-issues-peek-key')).toContainText('ENG-105');
    await expect(page.getByTestId('linear-issues-peek-title')).toContainText('命令面板搜索结果缺少最近访问分组');
    await expect(page.getByTestId('linear-issues-peek-status')).toContainText('待办');
    await expect(page.getByTestId('linear-issues-peek-desc')).toContainText('复现路径');
    await expect(page.getByTestId('linear-issues-peek-props')).toContainText('优先级');
    await expect(page.getByTestId('linear-issues-peek-props')).toContainText('周砚秋');
    await page.keyboard.press('Escape');
    await expect(peek).not.toBeVisible();

    // 令牌解析证明（Phase 1 @import 生效）：--ln-* 在 .ln-root 子树可解析
    const pageEl = page.getByTestId('linear-issues-page');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--ln-brand').trim()),
    ).toBe('#5e6ad2');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--ln-bg').trim()),
    ).toBe('#08090a');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--ln-radius').trim()),
    ).toBe('6px');
    // 深色画布实刷（dark-only 裁定）
    expect(await pageEl.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/8, 9, 10/);

    // 零品牌资产：复刻页子树不含 "Linear" 名称
    const replicaText = await page.getByTestId('linear-issues-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '01-issues.png');
  });

  test('02 board — status columns + column counts + card fields from mock + tokens', async ({ page }) => {
    await openPage(page, 'linear-board', '问题追踪 · 看板视图');

    // 三栏骨架：侧边栏 + 顶栏 tabs（列表可跳转回列表视图）
    await expect(page.getByTestId('linear-board-sidebar')).toBeVisible();
    await expect(page.getByTestId('linear-board-tab-board')).toContainText('看板');
    await expect(page.getByTestId('linear-board-tab-list')).toContainText('列表');

    // 看板列集：5 个状态列，列头标题与计数来自 mock（Linear__issues?view=board）
    const kanban = page.getByTestId('linear-board-kanban');
    await expect(kanban).toBeVisible();
    for (const title of ['待定', '待办', '进行中', '已完成', '已取消']) {
      await expect(kanban).toContainText(title);
    }
    // 列头计数徽章：状态分布 mock 断言值（backlog 7 / todo 8 / in_progress 7 / done 9 / cancelled 3）
    const counts = kanban.locator('[data-slot="kanban-column-header"] > span + span');
    await expect(counts).toHaveCount(5);
    await expect(counts.filter({ hasText: /^7$/ })).toHaveCount(2);
    await expect(counts.filter({ hasText: /^8$/ })).toHaveCount(1);
    await expect(counts.filter({ hasText: /^9$/ })).toHaveCount(1);
    await expect(counts.filter({ hasText: /^3$/ })).toHaveCount(1);

    // 卡片字段（kanban 默认卡面承载）：标题 / 标识符·估算行 / 标签 pill / 指派首字圆 / 优先级色点
    const cards = kanban.locator('[data-slot="kanban-card"]');
    expect(await cards.count()).toBe(34);
    const firstCard = cards.first();
    await expect(firstCard).toContainText('ENG-');
    await expect(firstCard).toContainText('估算');
    await expect(kanban).toContainText('工作区切换器在多团队视图下出现重复条目');
    await expect(firstCard.locator('.nop-kanban-card-member').first()).toBeVisible();
    // 指派首字圆渲染成员缩写（中文姓名取前两字）
    await expect(firstCard.locator('.nop-kanban-card-member').first()).toContainText('苏');
    // 优先级色点（语义色等效裁定）随卡面可见
    const colorDot = firstCard.locator('.nop-kanban-card-color-dot');
    await expect(colorDot).toBeVisible();

    // 卡片暗色形态抽查：--ln-* 令牌 + 卡片背景为面板色（dark 令牌）
    const pageEl = page.getByTestId('linear-board-page');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--ln-bg-panel').trim()),
    ).toBe('#0f1011');
    expect(await cards.first().evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /15, 16, 17/,
    );

    // 拖拽不接线注记落字（P4b 边界）
    await expect(page.getByTestId('linear-board-dnd-note')).toContainText('不可拖拽');

    // 零品牌资产
    const replicaText = await page.getByTestId('linear-board-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '02-board.png');
  });

  test('03 inbox — grouped notification stream + unread samples + per-item and bulk actions', async ({
    page,
  }) => {
    await openPage(page, 'linear-inbox', '问题追踪 · 收件箱');

    // 顶栏：标题 + 未读 pill + 批量已读栏形态（数据来自 Linear__inbox）
    await expect(page.getByTestId('linear-inbox-title')).toContainText('收件箱');
    await expect(page.getByTestId('linear-inbox-unread-pill')).toContainText('3 条未读');
    await expect(page.getByTestId('linear-inbox-bulk-read')).toContainText('全部标为已读');
    await expect(page.getByTestId('linear-inbox-bulk-archive')).toContainText('归档所选');
    await expect(page.getByTestId('linear-inbox-nav-unread')).toContainText('3');

    // 分组流：今天/本周/更早 三组（loop 为结构节点无 DOM，testid 落在组块上）
    const groups = page.getByTestId('linear-inbox-group-block');
    await expect(groups).toHaveCount(3);
    await expect(page.getByTestId('linear-inbox-group-label').nth(0)).toContainText('今天');
    await expect(page.getByTestId('linear-inbox-group-label').nth(1)).toContainText('本周');
    await expect(page.getByTestId('linear-inbox-group-label').nth(2)).toContainText('更早');

    // 通知行：未读点 / 类型 / 标题 / 摘要 / 时间 / 逐条已读归档按钮形态
    const items = page.getByTestId('linear-inbox-item');
    await expect(items).toHaveCount(9);
    await expect(page.getByTestId('linear-inbox-item-dot')).toHaveCount(3);
    await expect(page.getByTestId('linear-inbox-item-kind').first()).toContainText('指派了问题');
    await expect(page.getByTestId('linear-inbox-item-title').first()).toContainText('沈亦舟');
    await expect(page.getByTestId('linear-inbox-item-excerpt').first()).toContainText('筛选条件');
    await expect(page.getByTestId('linear-inbox-item-time').first()).toContainText('14:20');
    await expect(page.getByTestId('linear-inbox-item-archive').first()).toContainText('已读归档');

    // 未读点形态抽查：品牌紫圆点
    expect(
      await page
        .getByTestId('linear-inbox-item-dot')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toMatch(/94, 106, 210/);

    // 零品牌资产
    const replicaText = await page.getByTestId('linear-inbox-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '03-inbox.png');
  });

  test('04 detail — six sections from mock: title / description / sub-issues / relations / activity / props', async ({
    page,
  }) => {
    await openPage(page, 'linear-detail', '问题追踪 · 问题详情');

    // 标题区：标识符 + 状态 pill（数据来自 Linear__issue?id=ENG-105）
    await expect(page.getByTestId('linear-detail-key')).toContainText('ENG-105');
    await expect(page.getByTestId('linear-detail-status')).toContainText('待办');
    await expect(page.getByTestId('linear-detail-title')).toContainText('命令面板搜索结果缺少最近访问分组');

    // 描述区：纯文本多段承载（Phase 1 富文本裁定）
    const desc = page.getByTestId('linear-detail-description');
    await expect(desc).toBeVisible();
    await expect(page.getByTestId('linear-detail-desc-block').first()).toContainText('例行巡检');
    expect(await page.getByTestId('linear-detail-desc-block').count()).toBeGreaterThanOrEqual(3);

    // 子问题列表：3 条（ENG-108 / ENG-119 / ENG-130）
    await expect(page.getByTestId('linear-detail-sub-issue')).toHaveCount(3);
    await expect(page.getByTestId('linear-detail-sub-issue').first()).toContainText('ENG-108');

    // 关系区：阻塞 + 关联
    await expect(page.getByTestId('linear-detail-relation')).toHaveCount(2);
    await expect(page.getByTestId('linear-detail-relation-type').first()).toContainText('阻塞');

    // 活动流：创建/状态/指派/评论四类时间线条目
    expect(await page.getByTestId('linear-detail-activity-item').count()).toBe(4);
    await expect(page.getByTestId('linear-detail-activity-text').first()).toContainText('登记问题');

    // 属性侧栏：状态/优先级/指派/标签/周期/项目 字段形态
    const props = page.getByTestId('linear-detail-props');
    await expect(props).toBeVisible();
    await expect(page.getByTestId('linear-detail-prop-status')).toContainText('待办');
    await expect(page.getByTestId('linear-detail-prop-priority')).toContainText('低');
    await expect(page.getByTestId('linear-detail-prop-assignee')).toContainText('周砚秋');
    await expect(page.getByTestId('linear-detail-prop-cycle')).toContainText('周期 24');
    await expect(page.getByTestId('linear-detail-prop-project')).toContainText('移动端体验');
    await expect(page.getByTestId('linear-detail-prop-estimate')).toContainText('估算');
    await expect(page.getByTestId('linear-detail-prop-due')).toContainText('2026-09');

    // 优先级 pill 语义色（low = text-3 灰）
    await expect(props).toContainText('优先级');

    // 零品牌资产
    const replicaText = await page.getByTestId('linear-detail-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '04-detail.png');
  });

  test('05 projects — project cards with progress + cycle overview rows from mock', async ({ page }) => {
    await openPage(page, 'linear-projects', '问题追踪 · 项目周期');

    // 顶栏：标题 + 项目计数（数据来自 Linear__projects）
    await expect(page.getByTestId('linear-projects-title')).toContainText('项目与周期');
    await expect(page.getByTestId('linear-projects-count')).toContainText('3 个项目');

    // 项目卡：名称 + 状态 pill + 负责人头像 + 分组摘要 + 进度条
    await expect(page.getByTestId('linear-projects-card')).toHaveCount(3);
    await expect(page.getByTestId('linear-projects-card-name').first()).toContainText('平台重构');
    await expect(page.getByTestId('linear-projects-card-status').first()).toContainText('进行中');
    await expect(page.getByTestId('linear-projects-card-lead').first()).toContainText('沈');
    await expect(page.getByTestId('linear-projects-card-summary').first()).toContainText('分层重构');
    await expect(page.getByTestId('linear-projects-card-progress').first()).toContainText('62%');

    // 进度条填充宽度来自 mock（62% 平台重构）
    expect(
      await page
        .getByTestId('linear-projects-card-progress-fill')
        .first()
        .evaluate((el) => getComputedStyle(el).width),
    ).toMatch(/px$/);
    const fill = page.getByTestId('linear-projects-card-progress-fill').first();
    const track = fill.locator('xpath=..');
    const fillWidth = await fill.evaluate((el) => el.getBoundingClientRect().width);
    const trackWidth = await track.evaluate((el) => el.getBoundingClientRect().width);
    expect(fillWidth / trackWidth).toBeGreaterThan(0.5);
    expect(fillWidth / trackWidth).toBeLessThan(0.75);

    // 周期概览行：周期名/时间窗/进度/状态 pill（活跃/即将开始/已完成三态样本）
    const cycles = page.getByTestId('linear-projects-cycle');
    expect(await cycles.count()).toBe(7);
    await expect(page.getByTestId('linear-projects-cycle-name').first()).toContainText('周期 23');
    await expect(page.getByTestId('linear-projects-cycle-window').first()).toContainText('8月4日');
    await expect(page.getByTestId('linear-projects-cycle-progress').first()).toContainText('100%');
    await expect(page.getByTestId('linear-projects-cycle-status').first()).toContainText('已完成');
    const cycleStatusText = await page.getByTestId('linear-projects-cycle-status').allInnerTexts();
    expect(cycleStatusText).toContain('活跃');
    expect(cycleStatusText).toContain('即将开始');
    expect(cycleStatusText).toContain('已完成');

    // 品牌紫进度条（--ln-brand 令牌抽查）
    expect(
      await fill.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toMatch(/94, 106, 210/);

    // 零品牌资产
    const replicaText = await page.getByTestId('linear-projects-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '05-projects.png');
  });

  test('06 settings — sub-nav + tabbed form sections + preference switches (static, no submit)', async ({
    page,
  }) => {
    await openPage(page, 'linear-settings', '问题追踪 · 设置');

    // 左侧子导航
    await expect(page.getByTestId('linear-settings-subnav')).toBeVisible();
    await expect(page.getByTestId('linear-settings-nav-workspace')).toContainText('工作区');
    await expect(page.getByTestId('linear-settings-nav-preferences')).toContainText('偏好');
    await expect(page.getByTestId('linear-settings-nav-notifications')).toContainText('通知');
    await expect(page.getByTestId('linear-settings-nav-members')).toContainText('成员');

    // tabs 分节：常规/外观/工作流，默认常规选中
    const tabs = page.getByTestId('linear-settings-tabs');
    await expect(tabs).toBeVisible();
    await expect(tabs).toContainText('常规');
    await expect(tabs).toContainText('外观');
    await expect(tabs).toContainText('工作流');
    await expect(tabs.locator('[role="tab"][data-active]')).toContainText('常规');

    // 表单区：工作区名/图标形态 + fieldset 分组
    await expect(page.getByTestId('linear-settings-fieldset-workspace')).toContainText('工作区信息');
    await expect(page.getByTestId('linear-settings-icon-row')).toBeVisible();
    await expect(page.getByTestId('linear-settings-workspace-name')).toBeVisible();
    await expect(page.getByTestId('linear-settings-workspace-slug')).toBeVisible();
    await expect(page.getByTestId('linear-settings-workspace-desc')).toBeVisible();

    // 偏好开关组（静态形态）
    await expect(page.getByTestId('linear-settings-fieldset-preferences')).toContainText('偏好开关');
    await expect(page.getByTestId('linear-settings-switch-digest')).toBeVisible();
    await expect(page.getByTestId('linear-settings-switch-kbd')).toBeVisible();
    await expect(page.getByTestId('linear-settings-switch-quiet')).toBeVisible();
    await expect(page.getByTestId('linear-settings-static-note')).toContainText('零写提交');

    // 零品牌资产
    const replicaText = await page.getByTestId('linear-settings-main').innerText();
    expect(replicaText).not.toContain('Linear');

    await snap(page, '06-settings.png');
  });
});
