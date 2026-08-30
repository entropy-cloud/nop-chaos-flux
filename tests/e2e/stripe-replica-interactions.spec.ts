/**
 * 金融数据面板复刻页交互接线测试（plan 2026-08-30-1333-1 P7b Phase 2/3）。
 *
 * 承载分析篇 §4 交互清单处置表（I1–I11）的接线/锁定用例（初屏结构见
 * stripe-replica-visual.spec.ts）。pass/fail 全部为程序化断言（testid
 * 可见性、mock 会话态可观察变化、端点计数、aria-sort、getComputedStyle）；
 * 截图仅作视觉证据附件。
 *
 * 显式裁决不模拟项（处置表落字，以锁定断言或注记承载）：I1 筛选状态写入
 * URL（runtime/壳层能力候选，D1 输入池）、I3 语法搜索解析器（§6.2 降级
 * 维持）、I8 密度档切换（原版无此控件，P6b A9 机制证据已承载）、I9 真实
 * CSV 下载通道（RendererEnv 无 download 通道，语义模拟为终态）、I11 批量
 * 栏（原版无此件，G-B3 对照维持）。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/stripe-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/complex-pages/stripe-payments', { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText('金融数据面板 · 支付流水', {
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Opt-in mock observation: mirrors the airtable endpoint-counter hook pattern. */
async function trackEndpointCalls(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __stripeEndpointCalls: Record<string, number> }).__stripeEndpointCalls = {};
    (window as unknown as { __stripeTestHooks: Record<string, unknown> }).__stripeTestHooks = {};
  });
}

async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __stripeEndpointCalls?: Record<string, number> }).__stripeEndpointCalls ?? {},
  );
}

test.describe('Stripe replica — I3 搜索参数化', () => {
  test('01 I3 keyword search filters live from the search dialog; miss empty state and restore', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    expect(await page.getByTestId('stripe-cell-amount').count()).toBe(10);

    await page.getByTestId('stripe-search').click();
    const dialog = page.getByTestId('stripe-search-dialog');
    await expect(dialog).toBeVisible();
    const input = page.getByTestId('stripe-search-input').locator('input');

    // 输入即过滤（form submitOnChange + setValue 页面 scope → url 物化 → dependsOn 刷新）
    await input.fill('云帆');
    await expect(page.getByTestId('stripe-cell-amount')).toHaveCount(3, { timeout: 10_000 });
    await expect(page.getByTestId('stripe-cell-date').first()).toBeVisible();

    // 邮箱属性值命中（非客户名域）
    await input.fill('yunfan');
    await expect(page.getByTestId('stripe-cell-amount')).toHaveCount(6, { timeout: 10_000 });

    // st-payments-miss：零命中 → 空态文案不报错
    await input.fill('zzz绝不存在的关键词');
    await expect(page.getByText('当前筛选条件下没有交易')).toBeVisible({ timeout: 10_000 });

    // 清空恢复全量（首页 10 行）
    await input.fill('');
    await expect(page.getByTestId('stripe-cell-amount')).toHaveCount(10, { timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect((await readEndpointCalls(page)).Stripe__payments).toBeGreaterThanOrEqual(4);
    await snap(page, 'i01-search.png');
  });
});

test.describe('Stripe replica — I1 筛选 chip 增删/组合收窄', () => {
  test('02 I1 filter dialog narrows by status then amount; chip removal restores the remaining combination', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    // 初始双 chip 固定态 + 全量（首页 10 行）
    await expect(page.getByTestId('stripe-chip-status')).toBeVisible();
    await expect(page.getByTestId('stripe-chip-amount')).toBeVisible();
    expect(await page.getByTestId('stripe-cell-amount').count()).toBe(10);

    // 筛选 dialog：状态=已失败 → 列表 6 行 pill 全「已失败」
    await page.getByTestId('stripe-filter-button').click();
    const dialog = page.getByTestId('stripe-filter-dialog');
    await expect(dialog).toBeVisible();
    await page.getByTestId('stripe-filter-status').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '已失败' }).click();
    await page.getByTestId('stripe-filter-submit').click();
    await expect(page.getByTestId('stripe-filter-dialog')).not.toBeVisible();
    await expect(page.getByTestId('stripe-cell-status')).toHaveCount(6, { timeout: 10_000 });
    await expect(page.getByTestId('stripe-cell-status').first()).toContainText('已失败');
    expect((await readEndpointCalls(page)).Stripe__payments).toBeGreaterThanOrEqual(2);

    // 组合叠加收窄：金额 ≥ 100 → 5 行
    await page.getByTestId('stripe-filter-button').click();
    await page.getByTestId('stripe-filter-min').locator('input').fill('100');
    await page.getByTestId('stripe-filter-submit').click();
    await expect(page.getByTestId('stripe-cell-status')).toHaveCount(5, { timeout: 10_000 });

    // 移除金额 chip → 剩余状态组合维持 6 行
    await page.getByTestId('stripe-chip-amount-remove').click();
    await expect(page.getByTestId('stripe-chip-amount')).not.toBeVisible();
    await expect(page.getByTestId('stripe-cell-status')).toHaveCount(6, { timeout: 10_000 });

    // 移除状态 chip → 全量恢复（首页 10 行）
    await page.getByTestId('stripe-chip-status-remove').click();
    await expect(page.getByTestId('stripe-chip-status')).not.toBeVisible();
    await expect(page.getByTestId('stripe-cell-status')).toHaveCount(10, { timeout: 10_000 });
    await snap(page, 'i02-chips.png');
  });
});

test.describe('Stripe replica — I2 日期范围预设档', () => {
  test('03 I2 date-range presets refresh the list live; out-of-range presets serve the empty state', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    await expect(page.getByTestId('stripe-daterange-lastmonth')).toHaveClass(/st-seg-item-active/);
    expect(await page.getByTestId('stripe-cell-amount').count()).toBe(10);

    // 切「本月至今」（样本数据月 2026-08 之外）→ 空态文案
    await page.getByTestId('stripe-daterange-mtd').click();
    await expect(page.getByTestId('stripe-daterange-mtd')).toHaveClass(/st-seg-item-active/, {
      timeout: 5000,
    });
    await expect(page.getByTestId('stripe-daterange-lastmonth')).not.toHaveClass(/st-seg-item-active/);
    await expect(page.getByText('当前筛选条件下没有交易')).toBeVisible({ timeout: 10_000 });

    // 切「此前各月」→ 同为空态
    await page.getByTestId('stripe-daterange-prev').click();
    await expect(page.getByTestId('stripe-daterange-prev')).toHaveClass(/st-seg-item-active/, {
      timeout: 5000,
    });
    await expect(page.getByText('当前筛选条件下没有交易')).toBeVisible({ timeout: 10_000 });

    // 切回「上月」→ 全量恢复
    await page.getByTestId('stripe-daterange-lastmonth').click();
    await expect(page.getByTestId('stripe-cell-amount')).toHaveCount(10, { timeout: 10_000 });
    expect((await readEndpointCalls(page)).Stripe__payments).toBeGreaterThanOrEqual(4);
    await snap(page, 'i03-daterange.png');
  });
});

test.describe('Stripe replica — I9 导出链路', () => {
  test('05 I9 export confirm creates a semantic export task; zero columns keeps the dialog open', async ({
    page,
    allowConsoleErrors,
  }) => {
    // st-export-empty 失败分支经真实端点返回，宿主记录一条 action error 噪声
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('stripe-export-trigger').click();
    const dialog = page.getByTestId('stripe-export-dialog');
    await expect(dialog).toBeVisible();

    // 全部取消勾选 → 确认 → 失败提示 + dialog 保持打开（st-export-empty）
    for (const key of ['amount', 'date', 'status']) {
      await page
        .getByTestId(`stripe-export-col-${key}`)
        .locator('[data-slot="checkbox"][role="checkbox"]')
        .click();
    }
    await page.getByTestId('stripe-export-confirm').click();
    await expect(page.getByText('导出失败：请至少勾选一列')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toBeVisible();

    // 恢复勾选（金额+状态）→ 确认 → 成功提示 + dialog 关闭 + 端点计数
    await page
      .getByTestId('stripe-export-col-amount')
      .locator('[data-slot="checkbox"][role="checkbox"]')
      .click();
    await page
      .getByTestId('stripe-export-col-status')
      .locator('[data-slot="checkbox"][role="checkbox"]')
      .click();
    await page.getByTestId('stripe-export-confirm').click();
    await expect(page.getByText('导出任务已创建')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).not.toBeVisible();
    expect((await readEndpointCalls(page)).Stripe__exportPayments).toBe(2);
    await snap(page, 'i05-export.png');
  });
});

test.describe('Stripe replica — I10 图表-日期范围联动', () => {
  test('06 I10 KPI and curve follow the date-range preset; out-of-range serves the empty payload', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    await expect(page.getByTestId('stripe-kpi-netvolume-value')).toHaveText('CN¥486,210.75');
    expect(
      await page.getByTestId('stripe-netvolume-chart').locator('svg .recharts-line').count(),
    ).toBeGreaterThanOrEqual(2);

    // 切「本月至今」（样本数据月之外）→ 空载荷（KPI 归零 + 空曲线）
    await page.getByTestId('stripe-daterange-mtd').click();
    await expect(page.getByTestId('stripe-kpi-netvolume-value')).toHaveText('CN¥0.00', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('stripe-kpi-charges-value')).toHaveText('0', { timeout: 10_000 });
    await expect(
      page.getByTestId('stripe-netvolume-chart').locator('svg .recharts-line'),
    ).toHaveCount(0, { timeout: 10_000 });

    // 切回「上月」→ 恢复
    await page.getByTestId('stripe-daterange-lastmonth').click();
    await expect(page.getByTestId('stripe-kpi-netvolume-value')).toHaveText('CN¥486,210.75', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Stripe__overview).toBeGreaterThanOrEqual(4);
    await snap(page, 'i06-overview-range.png');
  });
});

test.describe('Stripe replica — widget 增删近似', () => {
  test('07 widget apply drives preset-block visibility via visible expressions (approximate add/remove)', async ({
    page,
  }) => {
    await openPage(page);
    await expect(page.getByTestId('stripe-kpi-refunds')).toBeVisible();

    // 取消勾选退款总额 → Apply → KPI 卡隐藏（Apply 后生效）
    await page.getByTestId('stripe-widget-trigger').click();
    const dialog = page.getByTestId('stripe-widget-dialog');
    await expect(dialog).toBeVisible();
    await page
      .getByTestId('stripe-widget-item-refunds')
      .locator('[data-slot="checkbox"][role="checkbox"]')
      .click();
    await page.getByTestId('stripe-widget-apply').click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('stripe-kpi-refunds')).not.toBeVisible({ timeout: 5000 });

    // 重新勾选 → Apply → 恢复
    await page.getByTestId('stripe-widget-trigger').click();
    await page
      .getByTestId('stripe-widget-item-refunds')
      .locator('[data-slot="checkbox"][role="checkbox"]')
      .click();
    await page.getByTestId('stripe-widget-apply').click();
    await expect(page.getByTestId('stripe-kpi-refunds')).toBeVisible({ timeout: 5000 });
    await snap(page, 'i07-widget.png');
  });
});

test.describe('Stripe replica — I5 drawer 退款语义模拟', () => {
  test('08 I5 drawer refund writes the session; the row pill follows the refresh', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('stripe-row-open').first().click();
    const drawer = page.getByTestId('stripe-payment-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('stripe-detail-amount')).toHaveText('CN¥18.00');

    await page.getByTestId('stripe-detail-refund').click();
    await expect(page.getByText('退款任务已创建')).toBeVisible({ timeout: 10_000 });
    await expect(drawer).not.toBeVisible();
    // 行 pill 随会话刷新（TX-1001 → 已退款）
    await expect(page.getByTestId('stripe-cell-status').first()).toContainText('已退款', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Stripe__refundPayment).toBe(1);
    await snap(page, 'i08-refund.png');
  });

  test('09 I5 st-refund-miss: forced miss keeps the drawer and the list unchanged', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 失败分支走真实端点（refundMiss 钩子），宿主记录一条 action error 噪声
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page);

    await page.evaluate(() => {
      (window as unknown as { __stripeTestHooks: { refundMiss: boolean } }).__stripeTestHooks.refundMiss = true;
    });
    await page.getByTestId('stripe-row-open').first().click();
    const drawer = page.getByTestId('stripe-payment-drawer');
    await expect(drawer).toBeVisible();

    await page.getByTestId('stripe-detail-refund').click();
    await expect(page.getByText('退款失败：交易不存在')).toBeVisible({ timeout: 10_000 });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(page.getByTestId('stripe-cell-status').first()).toContainText('已成功', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Stripe__refundPayment).toBe(1);

    await page.evaluate(() => {
      (window as unknown as { __stripeTestHooks: { refundMiss: boolean } }).__stripeTestHooks.refundMiss = false;
    });
  });
});

test.describe('Stripe replica — I4 列排序', () => {
  test('04 I4 built-in column sort reorders rows live with aria-sort direction state', async ({ page }) => {
    await openPage(page);

    // 金额列：第一次点击升序
    await page.getByTestId('stripe-sort-amount').click();
    const amountHead = page.locator('th', { has: page.getByTestId('stripe-sort-amount') });
    await expect(amountHead).toHaveAttribute('aria-sort', 'ascending', { timeout: 5000 });

    // 第二次点击降序 → 首行变为全集 minor 最大行（TX-1036 €345.95）
    await page.getByTestId('stripe-sort-amount').click();
    await expect(amountHead).toHaveAttribute('aria-sort', 'descending');
    await expect(page.getByTestId('stripe-cell-amount').first()).toHaveText('€345.95', { timeout: 5000 });

    // 日期列降序 → 首行 8月28日（样本最大时间戳）
    await page.getByTestId('stripe-sort-date').click();
    await page.getByTestId('stripe-sort-date').click();
    const dateHead = page.locator('th', { has: page.getByTestId('stripe-sort-date') });
    await expect(dateHead).toHaveAttribute('aria-sort', 'descending');
    await expect(page.getByTestId('stripe-cell-date').first()).toContainText('8月28日', { timeout: 5000 });

    // 金额列第三次点击清除排序 → 恢复源顺序（首行 TX-1001）
    await page.getByTestId('stripe-sort-amount').click();
    await expect(amountHead).toHaveAttribute('aria-sort', 'none');
    await expect(page.getByTestId('stripe-cell-amount').first()).toHaveText('CN¥18.00', { timeout: 5000 });
    await snap(page, 'i04-sort.png');
  });
});
