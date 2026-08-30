/**
 * Notion 风格多视图数据库复刻页初屏结构测试（plan 2026-08-30-0040-2 P5a）。
 *
 * 覆盖 notion-database 单页：视图 tab 条 + table/board/gallery/calendar/list
 * 五视图分支 + View settings 抽屉 + 记录展开 peek 双形态（side 抽屉 /
 * center 弹窗）+ 列头菜单 / 新建视图 / 搜索 / 新建记录静态浮层。pass/fail
 * 全部为程序化断言（testid 可见性、关键文案、mock 端点数据、tabs 分支
 * 可见性、:hover 显隐、getComputedStyle 令牌解析、无品牌字样）；截图仅作
 * 视觉证据附件。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/notion-replica';

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

async function openViewTab(
  page: import('@playwright/test').Page,
  tabTitle: string,
  branchTestId: string,
) {
  await page.getByTestId('notion-view-tabs').getByText(tabTitle, { exact: true }).click();
  await expect(page.getByTestId(branchTestId)).toBeVisible();
}

/**
 * Hover-reveal probes: opacity:0 elements still count as "visible" for
 * Playwright, so the pure-CSS :hover controls are asserted via computed
 * opacity of their reveal group (`.nt-row-tools` / `.nt-card-tools` /
 * `.nt-cal-add` ancestors).
 */
async function revealOpacity(locator: import('@playwright/test').Locator): Promise<string> {
  return locator.evaluate((el) => {
    let cur: HTMLElement | null = el as HTMLElement;
    while (cur) {
      if (
        cur.classList.contains('nt-row-tools') ||
        cur.classList.contains('nt-card-tools') ||
        cur.classList.contains('nt-cal-add')
      ) {
        return getComputedStyle(cur).opacity;
      }
      cur = cur.parentElement;
    }
    return 'unknown';
  });
}

test.describe('Notion replica — initial-screen structure', () => {
  test('01 database — title bar + view tab bar + table view typed cells from mock + hover controls + tokens', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    // 库名 + emoji 图标 + 页面骨架
    const titlebar = page.getByTestId('notion-titlebar');
    await expect(titlebar).toBeVisible();
    await expect(page.getByTestId('notion-db-title')).toContainText('产品需求库');
    await expect(page.getByTestId('notion-db-icon')).toContainText('📚');

    // 视图 tab 条：五视图页签 + 新建视图入口 + 溢出 more 形态 + 右侧动作簇
    const tabs = page.getByTestId('notion-view-tabs');
    await expect(tabs).toBeVisible();
    await expect(tabs.getByText('全部记录', { exact: true })).toBeVisible();
    await expect(tabs.getByText('状态看板', { exact: true })).toBeVisible();
    await expect(tabs.getByText('封面墙', { exact: true })).toBeVisible();
    await expect(tabs.getByText('排期月历', { exact: true })).toBeVisible();
    await expect(tabs.getByText('进行清单', { exact: true })).toBeVisible();
    await expect(page.getByTestId('notion-new-view-trigger')).toBeVisible();
    await expect(page.getByTestId('notion-viewbar-more')).toBeVisible();
    await expect(page.getByTestId('notion-search-entry')).toBeVisible();
    await expect(page.getByTestId('notion-settings-trigger')).toBeVisible();
    await expect(page.getByTestId('notion-new-record-trigger')).toBeVisible();
    await expect(page.getByTestId('notion-tab-display-note')).toContainText('图标+名称');

    // table 视图（默认 active）：属性行头（型别 glyph + 名称 + 菜单入口）
    const viewTable = page.getByTestId('notion-views-table');
    await expect(viewTable).toBeVisible();
    for (const head of [
      'title',
      'category',
      'status',
      'person',
      'number',
      'tags',
      'date',
      'done',
      'url',
    ]) {
      await expect(page.getByTestId(`notion-prop-head-${head}`)).toBeVisible();
    }

    // 记录行：型别分派单元格来自 Notion__records（首页 10 行）
    const table = page.getByTestId('notion-table');
    await expect(table).toBeVisible();
    await expect(page.getByTestId('notion-row-title').first()).toContainText(
      '首页信息流卡片支持双列布局切换',
    );
    expect(await page.getByTestId('notion-row-title').count()).toBe(10);
    await expect(page.getByTestId('notion-cell-category').first()).toBeVisible();
    await expect(page.getByTestId('notion-cell-status').first()).toContainText('进行中');
    await expect(page.getByTestId('notion-cell-person').first()).toContainText('文');
    await expect(page.getByTestId('notion-cell-number').first()).toContainText('1');
    await expect(page.getByTestId('notion-cell-tag').first()).toBeVisible();
    await expect(page.getByTestId('notion-cell-date').first()).toContainText('2026-');
    await expect(page.getByTestId('notion-cell-url').first()).toContainText('https://wiki.demo');
    // checkbox 双态样本：每行恰好一个可见态（选中蓝底 / 未选空框）
    expect(await page.locator('[data-testid="notion-cell-done"]:visible').count()).toBe(10);
    await expect(page.locator('[data-testid="notion-cell-done"]:visible').first()).toContainText(
      '✓',
    );
    // chip 低饱和 pastel pill 模式（10 色盘载体）
    const chip = page.getByTestId('notion-cell-category').first();
    const chipBg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(chipBg).not.toBe('rgba(0, 0, 0, 0)');

    // 行 hover 出 OPEN + ⋮⋮ 把手（纯 CSS :hover → 计算透明度轮询断言，规避过渡帧）
    const firstRowOpen = page.getByTestId('notion-row-open').first();
    expect(await revealOpacity(firstRowOpen)).toBe('0');
    await page.getByTestId('notion-row-title').first().hover();
    await expect.poll(() => revealOpacity(firstRowOpen), { timeout: 2000 }).toBe('1');

    // 高密度行 ~33px（getComputedStyle 断言；header 行含在 table-row 标记内，故限定 tbody）
    const rowHeight = await table
      .locator('tbody [data-slot="table-row"]')
      .first()
      .evaluate((el) => getComputedStyle(el).height);
    expect(parseInt(rowHeight, 10)).toBeLessThanOrEqual(34);

    // 底部 +New 行形态
    await expect(page.getByTestId('notion-table-new-row')).toBeVisible();

    // 令牌解析证明（Phase 1 @import 生效）：--nt-* 在 .nt-root 子树可解析
    const pageEl = page.getByTestId('notion-database-page');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--nt-blue').trim()),
    ).toBe('#2383e2');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--nt-text').trim()),
    ).toBe('#37352f');
    expect(
      await pageEl.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--nt-c-red-icon').trim(),
      ),
    ).toBe('#d44c47');
    expect(await pageEl.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /255, 255, 255/,
    );

    // 零品牌资产：复刻页子树不含 "Notion" 名称
    const replicaText = await page.getByTestId('notion-page').innerText();
    expect(replicaText).not.toContain('Notion');
    await snap(page, '01-table-view.png');
  });

  test('02 table — settings drawer sections + column header menu + search + new dialogs', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    // View settings 抽屉（drawer 载体）：布局 / 属性可见性 / 筛选构建器 / 排序 / 分组 / 条件配色
    await page.getByTestId('notion-settings-trigger').click();
    const drawer = page.getByTestId('notion-settings-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('notion-settings-layout')).toContainText('布局');
    await expect(page.getByTestId('notion-settings-display').first()).toBeVisible();
    await expect(page.getByTestId('notion-settings-props')).toContainText('属性可见性');
    await expect(page.getByTestId('notion-settings-filter')).toContainText('筛选');
    await expect(page.getByTestId('notion-settings-filter-builder')).toBeVisible();
    // P5b 接线后注记：筛选经会话配置服务端预应用（替代 P5a「不生效」静态注记）
    await expect(page.getByTestId('notion-settings-filter-note')).toContainText('已接线');
    await expect(page.getByTestId('notion-settings-sort')).toContainText('排序');
    await expect(page.getByTestId('notion-settings-group-section')).toContainText('分组');
    await expect(page.getByTestId('notion-settings-cond')).toContainText('条件配色');
    // 当前视图配置集（G-C 数据载体，visible 分支按 activeView 命中 table）
    await expect(
      page.locator('[data-testid="notion-settings-viewconfig-item"]:visible'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="notion-settings-viewconfig-name"]:visible'),
    ).toContainText('全部记录');
    await expect(
      page.locator('[data-testid="notion-settings-viewconfig-filter"]:visible'),
    ).toContainText('is-not');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // 列头菜单（I7 静态条目）
    await page.getByTestId('notion-prop-head-status').click();
    const columnMenu = page.getByTestId('notion-column-menu');
    await expect(columnMenu).toBeVisible();
    expect(await page.getByTestId('notion-column-menu-item').count()).toBeGreaterThanOrEqual(8);
    await expect(columnMenu).toContainText('冻结');
    await page.keyboard.press('Escape');
    await expect(columnMenu).not.toBeVisible();

    // 搜索入口形态（I5 静态）
    await page.getByTestId('notion-search-entry').click();
    await expect(page.getByTestId('notion-search-dialog')).toBeVisible();
    await expect(page.getByTestId('notion-search-input')).toBeVisible();
    await page.keyboard.press('Escape');

    // 新建视图菜单（I2 静态：类型清单 + 裁剪注记）
    await page.getByTestId('notion-new-view-trigger').click();
    const newView = page.getByTestId('notion-new-view-dialog');
    await expect(newView).toBeVisible();
    expect(await page.getByTestId('notion-new-view-option').count()).toBe(7);
    await expect(newView).toContainText('付费功能，不在复刻清单');
    await page.keyboard.press('Escape');

    // 新建记录（I8 静态表单）
    await page.getByTestId('notion-new-record-trigger').click();
    const recordDialog = page.getByTestId('notion-record-dialog');
    await expect(recordDialog).toBeVisible();
    await expect(page.getByTestId('notion-record-input-title')).toBeVisible();
    await page.keyboard.press('Escape');
    await snap(page, '02-table-overlays.png');
  });

  test('03 board + gallery branches — tab switching, grouped columns with counts, cards with covers', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    // 切到 board 分支
    await openViewTab(page, '状态看板', 'notion-views-board');
    const boardKanban = page.getByTestId('notion-board-kanban');
    await expect(boardKanban).toBeVisible();
    // 分组列集与列头计数来自 mock（未开始/进行中/评审中/已完成）
    const headers = page.locator('[data-slot="kanban-column-header"]');
    await expect(headers).toHaveCount(4);
    await expect(headers.first()).toContainText('未开始');
    await expect(
      page.locator('[data-slot="kanban-column-header"]', { hasText: '已完成' }),
    ).toBeVisible();
    // 聚合静态条（Count/Percent 来自 mock 预计算）
    await expect(page.getByTestId('notion-board-aggregate')).toHaveCount(4);
    await expect(page.getByTestId('notion-board-aggregate').first()).toContainText('Count');
    // P5b 接线后注记：拖拽已接线（替代 P5a「draggable: false」静态注记）
    await expect(page.getByTestId('notion-board-dnd-note')).toContainText('拖拽已接线');

    // 切到 gallery 分支（board 分支保持挂载、table 分支不回归）
    await openViewTab(page, '封面墙', 'notion-views-gallery');
    await expect(page.getByTestId('notion-gallery-card').first()).toBeVisible();
    expect(await page.getByTestId('notion-gallery-card').count()).toBeGreaterThanOrEqual(8);
    await expect(page.getByTestId('notion-gallery-cover').first()).toBeVisible();
    await expect(page.getByTestId('notion-gallery-title').first()).toContainText('双列布局');
    await expect(page.getByTestId('notion-gallery-new')).toBeVisible();
    // hover 出控制条（纯 CSS :hover → 计算透明度轮询断言）
    const galleryOpen = page.getByTestId('notion-gallery-open').first();
    expect(await revealOpacity(galleryOpen)).toBe('0');
    await page.getByTestId('notion-gallery-card').first().hover();
    await expect.poll(() => revealOpacity(galleryOpen), { timeout: 2000 }).toBe('1');

    // table 视图零回归：切回后记录行仍在
    await openViewTab(page, '全部记录', 'notion-views-table');
    await expect(page.getByTestId('notion-row-title').first()).toContainText('首页信息流');
    await snap(page, '03-board-gallery.png');
  });

  test('04 calendar + list branches — self-drawn month grid, today marker, list rows', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    // calendar 分支：六周 × 七日竖向月网格（自绘裁定）
    await openViewTab(page, '排期月历', 'notion-views-calendar');
    await expect(page.getByTestId('notion-cal-month')).toContainText('2026年8月');
    expect(await page.getByTestId('notion-cal-head').count()).toBe(7);
    expect(await page.getByTestId('notion-cal-day').count()).toBe(42);
    expect(await page.getByTestId('notion-cal-today').count()).toBe(1);
    // 日期属性落格卡样本（chip 卡片来自 mock）
    await expect(page.getByTestId('notion-cal-event').first()).toBeVisible();
    await expect(page.getByTestId('notion-cal-note')).toContainText('自绘');

    // list 分支：极简单列 + 属性 chip + 底部 New（行数据经 list 视图过滤：无"已完成"行）
    await openViewTab(page, '进行清单', 'notion-views-list');
    const listRows = page.getByTestId('notion-list-row');
    await expect(listRows.first()).toBeVisible();
    expect(await listRows.count()).toBeGreaterThanOrEqual(10);
    await expect(page.getByTestId('notion-list-title').first()).toBeVisible();
    await expect(page.getByTestId('notion-list-category').first()).toBeVisible();
    await expect(page.getByTestId('notion-list-new-row')).toBeVisible();
    await snap(page, '04-calendar-list.png');
  });

  test('05 peek dual forms — side drawer (table/list/board) + center dialog (gallery/calendar) with typed property rows', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    // side peek（table 语境 → 右抽屉）
    await page.getByTestId('notion-row-title').first().hover();
    await page.getByTestId('notion-row-open').first().click();
    const sidePeek = page.getByTestId('notion-peek-side');
    await expect(sidePeek).toBeVisible();
    await expect(page.getByTestId('notion-peek-title')).toContainText(
      '首页信息流卡片支持双列布局切换',
    );
    expect(await page.getByTestId('notion-peek-prop').count()).toBeGreaterThanOrEqual(12);
    await expect(page.getByTestId('notion-peek-props')).toBeVisible();
    await expect(page.getByTestId('notion-peek-blocks-note')).toContainText('自由块区');
    await page.keyboard.press('Escape');
    await expect(sidePeek).not.toBeVisible();

    // center peek（gallery 语境 → 居中弹窗）
    await openViewTab(page, '封面墙', 'notion-views-gallery');
    await page.getByTestId('notion-gallery-card').first().hover();
    await page.getByTestId('notion-gallery-open').first().click();
    const centerPeek = page.getByTestId('notion-peek-center');
    await expect(centerPeek).toBeVisible();
    await expect(page.getByTestId('notion-peek-title')).toBeVisible();
    await expect(page.getByTestId('notion-peek-status')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(centerPeek).not.toBeVisible();

    // calendar 落格卡 → center peek（calendar 语境默认态裁定）
    await openViewTab(page, '排期月历', 'notion-views-calendar');
    await page.getByTestId('notion-cal-event').first().click();
    await expect(page.getByTestId('notion-peek-center')).toBeVisible();
    await page.keyboard.press('Escape');

    // list 行 → side peek（list 语境默认态裁定）
    await openViewTab(page, '进行清单', 'notion-views-list');
    await page.getByTestId('notion-list-row').first().click();
    await expect(page.getByTestId('notion-peek-side')).toBeVisible();
    await page.keyboard.press('Escape');
    await snap(page, '05-peek.png');
  });

  test('06 five-view walkthrough — every tab branch reachable in sequence with data intact', async ({
    page,
  }) => {
    await openPage(page, 'notion-database', '多视图数据库 · 产品需求库');

    for (const [tabTitle, branchTestId] of [
      ['状态看板', 'notion-views-board'],
      ['封面墙', 'notion-views-gallery'],
      ['排期月历', 'notion-views-calendar'],
      ['进行清单', 'notion-views-list'],
      ['全部记录', 'notion-views-table'],
    ] as const) {
      await openViewTab(page, tabTitle, branchTestId);
    }
    // 全链路走查后 table 数据仍来自 mock 端点（会话内多轮切换零回归）
    await expect(page.getByTestId('notion-row-title').first()).toContainText('首页信息流');
    expect(await page.getByTestId('notion-row-title').count()).toBe(10);
  });
});
