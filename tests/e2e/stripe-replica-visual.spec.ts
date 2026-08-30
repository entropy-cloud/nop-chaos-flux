/**
 * 金融数据面板复刻页初屏结构测试（plan 2026-08-30-0953-2 P7a）。
 *
 * 覆盖 stripe-payments 单页：分组导航 shell（blurple 选中态样本）+ 筛选 chip
 * 条/日期范围预设档/搜索降级形态 + 高密度交易表格（36 行 mock 流动/客户端
 * 分页/状态 pill 四语义色阶对/金额等宽右对齐/排序 chevron 形态）+ 交易明细
 * 抽屉（摘要/时间线/元数据）+ 导出模态 + 图表卡区（KPI/净额曲线/widget 勾选
 * dialog）。pass/fail 全部为程序化断言（testid 可见性、关键文案、mock 端点
 * 数据、getComputedStyle 令牌与行密度与 tabular-nums 解析、pill 色阶对辨识、
 * 无品牌字样）；截图仅作视觉证据附件。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/stripe-replica';

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

test.describe('Stripe replica — payments list initial screen', () => {
  test('01 nav shell + filter bar + high-density table from mock + pill ladder + tokens + density', async ({
    page,
  }) => {
    await openPage(page, 'stripe-payments', '金融数据面板 · 支付流水');

    // 导航 shell：分组标题 + 条目 + blurple 选中态样本（「交易」项）
    const nav = page.getByTestId('stripe-nav');
    await expect(nav).toBeVisible();
    await expect(page.getByTestId('stripe-nav-group-overview')).toContainText('总览');
    await expect(page.getByTestId('stripe-nav-group-shortcuts')).toContainText('快捷入口');
    await expect(page.getByTestId('stripe-nav-group-recent')).toContainText('最近');
    await expect(page.getByTestId('stripe-nav-group-products')).toContainText('产品');
    await expect(page.getByTestId('stripe-nav-transactions')).toContainText('交易');
    await expect(page.getByTestId('stripe-nav-more')).toContainText('更多');
    const active = page.getByTestId('stripe-nav-transactions');
    expect(await active.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(99, 91, 255)');
    await expect(page.getByTestId('stripe-nav-note')).toContainText('零动作');

    // 页头：标题 + 日期范围预设档（上月默认选中）+ 搜索降级形态 + 导出入口
    await expect(page.getByTestId('stripe-page-title')).toContainText('交易');
    await expect(page.getByTestId('stripe-daterange-lastmonth')).toBeVisible();
    await expect(page.getByTestId('stripe-daterange-lastmonth')).toContainText('上月');
    await expect(page.getByTestId('stripe-daterange-custom')).toContainText('自定义');
    await expect(page.getByTestId('stripe-search')).toContainText('搜索');
    await expect(page.getByTestId('stripe-export-trigger')).toBeVisible();

    // 筛选 chip 条：2 chip + 单个移除按钮形态 + Filter 按钮形态 + 零生效注记
    await expect(page.getByTestId('stripe-chip-status')).toContainText('已成功');
    await expect(page.getByTestId('stripe-chip-amount')).toContainText('金额');
    await expect(page.getByTestId('stripe-chip-status-remove')).toBeVisible();
    await expect(page.getByTestId('stripe-chip-amount-remove')).toBeVisible();
    await expect(page.getByTestId('stripe-filter-button')).toContainText('筛选');
    await expect(page.getByTestId('stripe-chip-note')).toContainText('P7b');

    // 高密度表格：列头（金额右对齐/日期/状态/客户/支付方式/风险）+ 排序 chevron 形态
    for (const head of ['金额', '日期', '状态', '客户', '支付方式', '风险']) {
      await expect(page.getByTestId('stripe-table')).toContainText(head);
    }
    await expect(page.getByTestId('stripe-sort-amount')).toBeVisible();
    await expect(page.getByTestId('stripe-sort-date')).toBeVisible();
    await expect(page.getByTestId('stripe-sort-note')).toContainText('I4');

    // 记录行：首页 10 行来自 Stripe__payments（客户端分页 pageSize 10 / 总量 36）
    const amounts = page.getByTestId('stripe-cell-amount');
    await expect(amounts.first()).toBeVisible();
    await expect(amounts.first()).toHaveText('CN¥18.00');
    expect(await amounts.count()).toBe(10);
    await expect(page.getByTestId('stripe-cell-date').first()).toContainText('8月');
    await expect(page.getByTestId('stripe-cell-method').first()).toContainText('••••');

    // 状态 pill 四语义色阶对：首页 10 行四语义齐现，bg 色两两不同（色阶对可辨识）
    const statuses = page.getByTestId('stripe-cell-status');
    expect(await statuses.count()).toBe(10);
    const bgColors = new Set<string>();
    for (let i = 0; i < 10; i += 1) {
      const bg = await statuses
        .nth(i)
        .evaluate((el) => getComputedStyle(el as HTMLElement).backgroundColor);
      bgColors.add(bg);
    }
    expect(bgColors.size).toBeGreaterThanOrEqual(4);
    const firstPillBg = await statuses
      .first()
      .evaluate((el) => getComputedStyle(el as HTMLElement).backgroundColor);
    expect(firstPillBg).not.toBe('rgba(0, 0, 0, 0)');

    // 金额列等宽排版：tabular-nums + 右对齐（金融表格硬约束）
    const money = await amounts.first().evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement);
      return { variant: style.fontVariantNumeric, align: style.textAlign };
    });
    expect(money.variant).toContain('tabular-nums');
    expect(money.align).toBe('right');

    // 行密度默认档 ≈40px（--st-row-default）
    const rowHeight = await page
      .locator('[data-testid="stripe-table"] tbody [data-slot="table-row"]')
      .first()
      .evaluate((el) => getComputedStyle(el).height);
    expect(parseInt(rowHeight, 10)).toBeGreaterThanOrEqual(38);
    expect(parseInt(rowHeight, 10)).toBeLessThanOrEqual(42);

    // 令牌解析证明：--st-* 在 .st-root 子树可解析
    const pageEl = page.getByTestId('stripe-payments-page');
    expect(
      await pageEl.evaluate((el) => getComputedStyle(el).getPropertyValue('--st-blue').trim()),
    ).toBe('#635bff');
    expect(
      await pageEl.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--st-row-default').trim(),
      ),
    ).toBe('40px');

    // 无批量栏声明（I11——G-B3 对照素材）
    await expect(page.getByTestId('stripe-no-batch-note')).toContainText('无批量');

    // 密度三档样本落位（Phase 3 实测数值）
    await expect(page.getByTestId('stripe-density-compact')).toBeVisible();
    await expect(page.getByTestId('stripe-density-default')).toBeVisible();
    await expect(page.getByTestId('stripe-density-relaxed')).toBeVisible();

    // 零品牌资产：复刻页子树不含 "Stripe" 名称
    const replicaText = await page.getByTestId('stripe-payments-page').innerText();
    expect(replicaText).not.toContain('Stripe');
    await snap(page, '01-payments-list.png');
  });

  test('02 detail drawer — summary/timeline/metadata sections from record endpoint', async ({
    page,
  }) => {
    await openPage(page, 'stripe-payments', '金融数据面板 · 支付流水');

    // 行点击打开（打开类最小静态动作：客户列链接）
    await page.getByTestId('stripe-row-open').first().click();
    const drawer = page.getByTestId('stripe-payment-drawer');
    await expect(drawer).toBeVisible();

    // 摘要分区：金额/状态 pill/描述来自 Stripe__payment?id= 端点
    await expect(page.getByTestId('stripe-detail-amount')).toHaveText('CN¥18.00');
    await expect(page.getByTestId('stripe-detail-status')).toContainText('已成功');
    const pillBg = await page
      .getByTestId('stripe-detail-status')
      .evaluate((el) => getComputedStyle(el as HTMLElement).backgroundColor);
    expect(pillBg).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('stripe-detail-description')).toContainText('年度会员订阅');

    // 元数据分区（四行）+ 操作按钮形态 + 零生效注记
    await expect(page.getByTestId('stripe-detail-row-method')).toContainText('••••');
    await expect(page.getByTestId('stripe-detail-risk-chip')).toContainText('正常');
    await expect(page.getByTestId('stripe-detail-refund')).toContainText('退款');
    await expect(page.getByTestId('stripe-detail-recapture')).toContainText('再次收款');
    await expect(page.getByTestId('stripe-detail-actions-note')).toContainText('零生效');

    // 金额格式化双轨对比：表达式轨 toFixed 可承载（无千分位/按币种小数位表达力差异见单测对照）
    await expect(page.getByTestId('stripe-detail-expr-value')).toHaveText('CN¥18.00');

    // 时间线分区（已成功 = 3 事件）+ 元数据 loop（4 行）
    const timeline = page.getByTestId('stripe-detail-timeline');
    await expect(timeline.first()).toBeVisible();
    expect(await timeline.count()).toBe(3);
    await expect(page.getByTestId('stripe-detail-timeline-label').first()).toContainText(
      '交易创建',
    );
    expect(await page.getByTestId('stripe-detail-metadata').count()).toBe(4);

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await snap(page, '02-payment-drawer.png');
  });

  test('03 export dialog — timezone/range/column checks static shape', async ({ page }) => {
    await openPage(page, 'stripe-payments', '金融数据面板 · 支付流水');

    await page.getByTestId('stripe-export-trigger').click();
    const dialog = page.getByTestId('stripe-export-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('stripe-export-timezone')).toContainText('账户时区');
    await expect(page.getByTestId('stripe-export-range')).toContainText('上月');
    expect(await page.getByTestId('stripe-export-columns').locator('.st-check').count()).toBe(5);
    await expect(page.getByTestId('stripe-export-col-amount')).toContainText('金额');
    await expect(page.getByTestId('stripe-export-confirm')).toContainText('导出');
    await expect(page.getByTestId('stripe-export-note')).toContainText('P7b');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await snap(page, '03-export-dialog.png');
  });
});

test.describe('Stripe replica — chart card area + overlay walkthrough', () => {
  test('04 chart area — KPI from mock + net-volume curve + widget dialog + density ladder measured', async ({
    page,
  }) => {
    await openPage(page, 'stripe-payments', '金融数据面板 · 支付流水');

    // KPI 卡 ×4：值经 Stripe__overview 端点流动（mock 预计算聚合）
    await expect(page.getByTestId('stripe-kpi-row')).toBeVisible();
    await expect(page.getByTestId('stripe-kpi-netvolume-value')).toHaveText('CN¥486,210.75');
    await expect(page.getByTestId('stripe-kpi-netvolume-delta')).toContainText('+12.4%');
    await expect(page.getByTestId('stripe-kpi-charges-value')).toHaveText('1286');
    await expect(page.getByTestId('stripe-kpi-charges-delta')).toContainText('+8.2%');
    await expect(page.getByTestId('stripe-kpi-avg-value')).toHaveText('CN¥378.15');
    await expect(page.getByTestId('stripe-kpi-refunds-value')).toHaveText('CN¥12,930.00');

    // 净额曲线：recharts line 渲染（svg + 双 series 图例）
    const chart = page.getByTestId('stripe-netvolume-chart');
    await expect(chart).toBeVisible();
    expect(await chart.locator('svg').count()).toBeGreaterThanOrEqual(1);
    expect(await chart.locator('svg .recharts-line').count()).toBeGreaterThanOrEqual(2);
    await expect(chart).toContainText('本期');
    await expect(chart).toContainText('上期');

    // widget 增删形态：「添加 widget」入口 → 勾选列表 dialog + Apply/Edit 按钮形态零生效
    await page.getByTestId('stripe-widget-trigger').click();
    const widgetDialog = page.getByTestId('stripe-widget-dialog');
    await expect(widgetDialog).toBeVisible();
    expect(await page.getByTestId('stripe-widget-list').locator('.st-check').count()).toBe(6);
    await expect(page.getByTestId('stripe-widget-item-netvolume')).toContainText('净额走势');
    await expect(page.getByTestId('stripe-widget-item-payouts')).toContainText('入账记录');
    await expect(page.getByTestId('stripe-widget-apply')).toContainText('Apply');
    await expect(page.getByTestId('stripe-widget-edit')).toContainText('Edit');
    await expect(page.getByTestId('stripe-widget-note')).toContainText('P7b');
    await page.keyboard.press('Escape');
    await expect(widgetDialog).not.toBeVisible();

    // 行密度三档实测（G-E 参照值：32/40/48px ±2px getComputedStyle）
    const tierPx: Record<string, number> = {
      compact: 32,
      default: 40,
      relaxed: 48,
    };
    for (const [tier, px] of Object.entries(tierPx)) {
      const sample = page.getByTestId(`stripe-density-${tier}`);
      await expect(sample).toBeVisible();
      const height = await sample.evaluate((el) => getComputedStyle(el).height);
      expect(Math.abs(parseInt(height, 10) - px)).toBeLessThanOrEqual(2);
    }
    await expect(page.getByTestId('stripe-density-note')).toContainText('G-E');
    await snap(page, '04-chart-area.png');
  });

  test('05 overlay walkthrough — chips → date range → search → export → widget → drawer, list zero regression', async ({
    page,
  }) => {
    await openPage(page, 'stripe-payments', '金融数据面板 · 支付流水');

    // chip 区 → 日期范围 → 搜索（静态形态走查，零生效不崩）
    await expect(page.getByTestId('stripe-chip-status')).toBeVisible();
    await page.getByTestId('stripe-chip-status-remove').click();
    await page.getByTestId('stripe-daterange-lastmonth').click();
    await page.getByTestId('stripe-search').click();

    // 导出模态 → Esc 关闭
    await page.getByTestId('stripe-export-trigger').click();
    await expect(page.getByTestId('stripe-export-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stripe-export-dialog')).not.toBeVisible();

    // widget dialog → Esc 关闭
    await page.getByTestId('stripe-widget-trigger').click();
    await expect(page.getByTestId('stripe-widget-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stripe-widget-dialog')).not.toBeVisible();

    // 明细 drawer → 端点数据 → Esc 关闭
    await page.getByTestId('stripe-row-open').first().click();
    await expect(page.getByTestId('stripe-payment-drawer')).toBeVisible();
    await expect(page.getByTestId('stripe-detail-amount')).toHaveText('CN¥18.00');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stripe-payment-drawer')).not.toBeVisible();

    // 走查后列表零回归：数据仍来自 mock 端点（首页 10 行 + 首行金额）
    await expect(page.getByTestId('stripe-cell-amount').first()).toHaveText('CN¥18.00');
    expect(await page.getByTestId('stripe-cell-amount').count()).toBe(10);
    expect(await page.getByTestId('stripe-cell-status').count()).toBe(10);
  });
});
