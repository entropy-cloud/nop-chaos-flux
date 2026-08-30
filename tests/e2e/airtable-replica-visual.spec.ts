/**
 * 网格任务跟踪复刻页初屏结构测试（plan 2026-08-30-0614-2 P6a）。
 *
 * 覆盖 airtable-grid 单页：工具栏 + 视图栏（视图 switcher 选中态 / 隐藏字段
 * 入口 / 行高四档控件形态 / 搜索筛选入口）+ 高密度网格主视图（20 字段型别
 * 分派静态样本 + 行 hover 展开入口 + 选中单元格蓝框样本 + 底部插行形态）+
 * summary bar + 分组态样本（group= 参数化）+ 行高四档密度样本 + 浮层族
 * （列头菜单 dialog / 隐藏字段抽屉 / 记录展开 modal）。pass/fail 全部为程序
 * 化断言（testid 可见性、关键文案、mock 端点数据、:hover 计算透明度、
 * getComputedStyle 令牌与行高解析、无品牌字样）；截图仅作视觉证据附件。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/airtable-replica';

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

/**
 * Hover-reveal probes: opacity:0 elements still count as "visible" for
 * Playwright, so the pure-CSS :hover controls are asserted via the computed
 * opacity of their reveal group (`.at-row-tools` ancestors).
 */
async function revealOpacity(locator: import('@playwright/test').Locator): Promise<string> {
  return locator.evaluate((el) => {
    let cur: HTMLElement | null = el as HTMLElement;
    while (cur) {
      if (cur.classList.contains('at-row-tools')) {
        return getComputedStyle(cur).opacity;
      }
      cur = cur.parentElement;
    }
    return 'unknown';
  });
}

test.describe('Airtable replica — initial-screen structure', () => {
  test('01 grid — toolbar + view bar + typed-cell grid from mock + hover expand + tokens + density', async ({
    page,
  }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    // 工具栏 + 表名
    const toolbar = page.getByTestId('airtable-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(page.getByTestId('airtable-table-title')).toContainText('任务清单');

    // 视图栏：switcher 选中态 + 隐藏字段入口 + 行高档位控件形态 + 搜索/筛选入口形态
    const viewbar = page.getByTestId('airtable-viewbar');
    await expect(viewbar).toBeVisible();
    await expect(page.getByTestId('airtable-view-pill-grid')).toContainText('网格视图');
    await expect(page.getByTestId('airtable-hide-fields-trigger')).toBeVisible();
    await expect(page.getByTestId('airtable-rowheight-control')).toBeVisible();
    await expect(page.getByTestId('airtable-rowheight-short')).toContainText('短');
    await expect(page.getByTestId('airtable-rowheight-extra')).toContainText('超高');
    await expect(page.getByTestId('airtable-search-entry')).toBeVisible();
    await expect(page.getByTestId('airtable-filter-entry')).toBeVisible();

    // 网格主视图：列头（glyph + 字段名 + 菜单入口形态）
    const grid = page.getByTestId('airtable-grid');
    await expect(grid).toBeVisible();
    for (const head of [
      'autoNo',
      'title',
      'notes',
      'category',
      'tags',
      'date',
      'amount',
      'score',
      'progress',
      'done',
      'attachments',
      'owner',
      'email',
      'site',
      'phone',
      'duration',
      'rating',
      'barcode',
      'createdAt',
      'modifiedAt',
    ]) {
      await expect(page.getByTestId(`airtable-colhead-${head}`)).toBeVisible();
    }

    // 记录行：首页 10 行来自 Airtable__records（客户端分页 pageSize 10 / 总量 33）
    await expect(page.getByTestId('airtable-rowno').first()).toHaveText('1');
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText(
      '首页信息流卡片双列布局切换',
    );
    expect(await page.getByTestId('airtable-cell-title').count()).toBe(10);

    // 型别分派静态样本逐列可辨识
    await expect(page.getByTestId('airtable-cell-category').first()).toBeVisible();
    const chip = page.getByTestId('airtable-cell-category').first();
    expect(await chip.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.getByTestId('airtable-cell-tag').first()).toBeVisible();
    await expect(page.getByTestId('airtable-cell-date').first()).toContainText('2026年');
    await expect(page.getByTestId('airtable-cell-amount').first()).toContainText('¥');
    await expect(page.getByTestId('airtable-cell-progress').first()).toContainText('%');
    await expect(page.locator('[data-testid="airtable-cell-done"]:visible').first()).toBeVisible();
    await expect(page.getByTestId('airtable-cell-thumb').first()).toBeVisible();
    await expect(page.getByTestId('airtable-cell-avatar').first()).toBeVisible();
    await expect(page.getByTestId('airtable-cell-email').first()).toContainText('@');
    await expect(page.getByTestId('airtable-cell-site').first()).toContainText('https://');
    await expect(page.getByTestId('airtable-cell-duration').first()).toContainText(':');
    await expect(page.getByTestId('airtable-cell-rating').first()).toContainText('★');
    await expect(page.getByTestId('airtable-cell-barcode').first()).toContainText('AT-');
    // 只读自动字段灰显（创建时间列）
    const readonlyCell = page.getByTestId('airtable-cell-created').first();
    expect(await readonlyCell.evaluate((el) => getComputedStyle(el).color)).not.toBe(
      'rgb(51, 51, 51)',
    );

    // 选中单元格蓝框静态样本（首行任务名称）
    const selected = page.getByTestId('airtable-cell-title').first();
    expect(await selected.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('inset');

    // 行 hover 出展开入口（纯 CSS :hover → 计算透明度轮询断言）
    const expand = page.getByTestId('airtable-row-expand').first();
    expect(await revealOpacity(expand)).toBe('0');
    await page.getByTestId('airtable-cell-title').first().hover();
    await expect.poll(() => revealOpacity(expand), { timeout: 2000 }).toBe('1');

    // 底部插行形态行 + summary bar（mock 预计算）
    await expect(page.getByTestId('airtable-grid-new-row')).toBeVisible();
    const summary = page.getByTestId('airtable-summary');
    await expect(summary).toBeVisible();
    await expect(page.getByTestId('airtable-summary-count')).toHaveText('共 33 条记录');
    await expect(page.getByTestId('airtable-summary-amount')).toContainText('¥');
    await expect(page.getByTestId('airtable-summary-progress')).toContainText('%');
    await expect(summary).toContainText('已交付');
    await expect(page.getByTestId('airtable-summary-done')).toContainText(/\d/);
    await expect(page.getByTestId('airtable-summary-rating')).toBeVisible();

    // 令牌解析证明：--at-* 在 .at-root 子树可解析 + Short 档行高 ≈32px
    const pageEl = page.getByTestId('airtable-grid-page');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--at-blue').trim()),
    ).toBe('#2d7ff9');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--at-row-short').trim()),
    ).toBe('32px');
    expect(await pageEl.evaluate((el) => getComputedStyle(el).fontSize)).toBe('13px');
    const rowHeight = await grid
      .locator('tbody [data-slot="table-row"]')
      .first()
      .evaluate((el) => getComputedStyle(el).height);
    expect(parseInt(rowHeight, 10)).toBeLessThanOrEqual(34);

    // 零品牌资产：复刻页子树不含 "Airtable" 名称
    const replicaText = await page.getByTestId('airtable-page').innerText();
    expect(replicaText).not.toContain('Airtable');
    await snap(page, '01-grid.png');
  });

  test('02 grouped sample + row-height density samples + gap notes', async ({ page }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    // 分组态样本（group= 参数化）：4 组头 = 分组值 chip + 组内计数 + 折叠形态 + 组内 summary
    const section = page.getByTestId('airtable-group-section');
    await expect(section).toBeVisible();
    await expect(page.getByTestId('airtable-group-note')).toContainText('归 P6b');
    const heads = page.getByTestId('airtable-group-head');
    await expect(heads).toHaveCount(4);
    await expect(page.getByTestId('airtable-group-chip').first()).toContainText('需求评审');
    const counts = page.getByTestId('airtable-group-count');
    expect(await counts.count()).toBe(4);
    let total = 0;
    for (let i = 0; i < 4; i += 1) {
      const raw = await counts.nth(i).innerText();
      total += parseInt(raw, 10);
    }
    expect(total).toBe(33);
    await expect(page.getByTestId('airtable-group-amount').first()).toContainText('¥');
    await expect(page.getByTestId('airtable-group-summary').first()).toContainText('已交付');
    // 组内样本行来自 mock
    await expect(page.getByTestId('airtable-group-row').first()).toBeVisible();
    expect(await page.getByTestId('airtable-group-row').count()).toBeGreaterThanOrEqual(8);

    // 行高四档密度样本（📊 32/48/80/160px getComputedStyle 实测）
    await expect(page.getByTestId('airtable-density-note')).toContainText('G-E');
    const tierPx: Record<string, number> = {
      short: 32,
      medium: 48,
      tall: 80,
      extra: 160,
    };
    for (const [tier, px] of Object.entries(tierPx)) {
      const row = page.getByTestId(`airtable-density-${tier}`);
      await expect(row).toBeVisible();
      const height = await row.evaluate((el) => getComputedStyle(el).height);
      expect(Math.abs(parseInt(height, 10) - px)).toBeLessThanOrEqual(2);
    }
    await snap(page, '02-group-density.png');
  });
});

test.describe('Airtable replica — overlay family', () => {
  test('03 column header menu dialog — trim-annotated items open from typed headers', async ({
    page,
  }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    // 从「阶段」列头打开菜单（单选型别）
    await page.getByTestId('airtable-colhead-category').click();
    const menu = page.getByTestId('airtable-column-menu');
    await expect(menu).toBeVisible();
    // 八条目（隐藏字段/编辑字段/换型别/排序 A→Z/排序 Z→A/左插/右插/删除）
    expect(await page.getByTestId('airtable-column-menu-item').count()).toBe(8);
    await expect(menu).toContainText('隐藏字段');
    await expect(menu).toContainText('删除字段');
    // 换型别 = 型别清单只读形态（G-D 列菜单缺口）
    await expect(page.getByTestId('airtable-column-menu-type')).toContainText('单选');
    // 条目裁剪注记
    await expect(page.getByTestId('airtable-column-menu-note')).toContainText('popover');
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();

    // 主字段列头菜单展示其型别（单行文本）
    await page.getByTestId('airtable-colhead-title').click();
    await expect(page.getByTestId('airtable-column-menu-type')).toContainText('单行文本');
    await page.keyboard.press('Escape');
    await snap(page, '03-column-menu.png');
  });

  test('04 hide-fields drawer — search + toggle rows from mock + primary-lock note', async ({
    page,
  }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    await page.getByTestId('airtable-hide-fields-trigger').click();
    const drawer = page.getByTestId('airtable-hide-fields-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('airtable-hide-fields-search')).toBeVisible();
    await expect(page.getByTestId('airtable-hide-fields-hideall')).toBeVisible();
    await expect(page.getByTestId('airtable-hide-fields-showall')).toBeVisible();
    await expect(page.getByTestId('airtable-hide-fields-note')).toContainText('主字段不可隐藏');

    // 20 字段行来自 mock 端点（glyph + 名称 + 型别 + toggle 形态）
    const rows = page.getByTestId('airtable-field-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBe(20);
    await expect(page.getByTestId('airtable-field-label').first()).toContainText('任务名称');
    await expect(page.getByTestId('airtable-field-type').first()).toContainText('单行文本');
    // 主字段不可隐藏注记（首行 lockNote 来自 mock）
    await expect(page.getByTestId('airtable-field-lock').first()).toContainText('主字段不可隐藏');
    await expect(page.getByTestId('airtable-field-toggle')).toHaveCount(20);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await snap(page, '04-hide-fields.png');
  });

  test('05 record modal — typed field sections from record endpoint + prev/next nav shape', async ({
    page,
  }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    // 行展开入口（hover 显隐 + 打开类最小静态动作）
    await page.getByTestId('airtable-cell-title').first().hover();
    await page.getByTestId('airtable-row-expand').first().click();
    const modal = page.getByTestId('airtable-record-modal');
    await expect(modal).toBeVisible();

    // 数据经 Airtable__record?id= 端点（首行记录字段值）
    await expect(page.getByTestId('airtable-record-value-title')).toContainText(
      '首页信息流卡片双列布局切换',
    );
    await expect(page.getByTestId('airtable-record-value-category')).toContainText('需求评审');
    await expect(page.getByTestId('airtable-record-value-amount')).toContainText('¥');
    await expect(page.getByTestId('airtable-record-avatar')).toBeVisible();
    await expect(page.getByTestId('airtable-record-rating')).toContainText('★');
    await expect(page.getByTestId('airtable-record-value-barcode')).toContainText('AT-');
    // 只读系统字段灰显
    const readonly = page.getByTestId('airtable-record-value-created');
    expect(await readonly.evaluate((el) => getComputedStyle(el).color)).not.toBe(
      'rgb(51, 51, 51)',
    );

    // 四字段分区 + 键盘导航缺口注记 + 上一条/下一条导航形态
    await expect(page.getByTestId('airtable-record-section-basic')).toContainText('基本信息');
    await expect(page.getByTestId('airtable-record-section-numeric')).toContainText('数值与进度');
    await expect(page.getByTestId('airtable-record-section-people')).toContainText('人员与联系');
    await expect(page.getByTestId('airtable-record-section-system')).toContainText('系统字段');
    await expect(page.getByTestId('airtable-record-kbd-note')).toContainText('G-B2');
    await expect(page.getByTestId('airtable-record-prev')).toContainText('上一条');
    await expect(page.getByTestId('airtable-record-next')).toContainText('下一条');
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await snap(page, '05-record-modal.png');
  });

  test('06 overlay walkthrough — menu → drawer → modal in sequence, grid zero regression', async ({
    page,
  }) => {
    await openPage(page, 'airtable-grid', '网格任务跟踪 · 电子表格网格');

    await page.getByTestId('airtable-colhead-amount').click();
    await expect(page.getByTestId('airtable-column-menu-type')).toContainText('货币');
    await page.keyboard.press('Escape');

    await page.getByTestId('airtable-hide-fields-trigger').click();
    await expect(page.getByTestId('airtable-hide-fields-drawer')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('airtable-cell-title').first().hover();
    await page.getByTestId('airtable-row-expand').first().click();
    await expect(page.getByTestId('airtable-record-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('airtable-record-modal')).not.toBeVisible();

    // 走查后网格零回归：数据仍来自 mock 端点
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText(
      '首页信息流卡片双列布局切换',
    );
    expect(await page.getByTestId('airtable-cell-title').count()).toBe(10);
  });
});
