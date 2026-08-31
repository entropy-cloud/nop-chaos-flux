/**
 * Ant Design Pro 复刻页初屏结构测试（plan 2026-08-29-1240-1 P2a）。
 *
 * 覆盖 9 个 antdpro-* 复刻页的初屏结构断言：页头/查询区/表格/分页/表单
 * 布局/详情分组/图表/结果页。pass/fail 全部为程序化断言（testid 可见性、
 * 关键文案、mock 端点数据、getComputedStyle 令牌解析）；截图仅作视觉证据。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/antdpro-replica';

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

test.describe('AntdPro replica — initial-screen structure', () => {
  test('01 list — page header + query area + table rows from mock + pagination + adp tokens', async ({
    page,
  }) => {
    await openPage(page, 'antdpro-list', 'AntD Pro 订单列表');

    // PageHeader 区：面包屑 + 标题 + extra 按钮组
    await expect(page.getByTestId('antdpro-breadcrumb')).toContainText('订单管理');
    await expect(page.getByTestId('antdpro-page-title')).toContainText('订单列表');
    await expect(page.getByTestId('antdpro-list-new')).toBeVisible();
    await expect(page.getByTestId('antdpro-list-export')).toBeVisible();

    // 查询区：3 字段 + 展开/收起入口
    await expect(page.getByTestId('antdpro-query-keyword')).toBeVisible();
    await expect(page.getByTestId('antdpro-query-status').first()).toBeVisible();
    await expect(page.getByTestId('antdpro-query-channel').first()).toBeVisible();
    await expect(
      page.getByTestId('antdpro-list-crud').locator('[data-slot="crud-query-collapse"]'),
    ).toBeVisible();

    // 表格区：数据来自 AntdPro__orders（首页 10 行 + 已知首行记录）
    const crud = page.getByTestId('antdpro-list-crud');
    await expect(crud).toBeVisible();
    const rows = crud.locator('table tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(crud).toContainText('SO2026080100');
    await expect(crud).toContainText('杭州云澈服饰有限公司');

    // 状态标签 + 令牌解析证明（Phase 1 @import 生效：--adp-* 在复刻页子树可解析）
    const tag = crud.locator('.adp-tag').first();
    await expect(tag).toBeVisible();
    const tagBg = await tag.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(tagBg).not.toBe('rgba(0, 0, 0, 0)');
    const primary = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('[data-testid="antdpro-list-crud"]')!)
          .getPropertyValue('--adp-primary')
          .trim(),
    );
    expect(primary).toBe('#1677ff');
    const radius = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('[data-testid="antdpro-list-page"]')!)
          .getPropertyValue('--adp-radius')
          .trim(),
    );
    expect(radius).toBe('8px');

    // 分页：36 条 @10/页 = 4 页（分页总数 ≥31）
    const pagination = crud.locator('[data-slot="table-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText('4');

    // 行操作列静态 link 按钮
    await expect(page.getByTestId('antdpro-op-view').first()).toBeVisible();
    await expect(page.getByTestId('antdpro-op-delete').first()).toBeVisible();

    await snap(page, '01-list.png');
  });

  test('02 form-basic — single-column form + bottom action bar', async ({ page }) => {
    await openPage(page, 'antdpro-form-basic', 'AntD Pro 基础表单');

    await expect(page.getByTestId('antdpro-form-basic-title')).toContainText('新建任务');
    await expect(page.getByTestId('antdpro-basic-title-input')).toBeVisible();
    await expect(page.getByTestId('antdpro-basic-form')).toBeVisible();

    const form = page.getByTestId('antdpro-basic-form');
    await expect(form).toContainText('任务名称');
    await expect(form).toContainText('执行时间段');
    await expect(form).toContainText('目标描述');

    await expect(page.getByTestId('antdpro-basic-reset')).toBeVisible();
    await expect(page.getByTestId('antdpro-basic-submit')).toBeVisible();
    const submit = page.getByTestId('antdpro-basic-submit');
    expect(await submit.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/22, 119, 255/);

    await snap(page, '02-form-basic.png');
  });

  test('03 form-grouped — fieldset groups + card groups', async ({ page }) => {
    await openPage(page, 'antdpro-form-grouped', 'AntD Pro 分组表单');

    await expect(page.getByTestId('antdpro-form-grouped-title')).toContainText('入库登记');

    const inlineForm = page.getByTestId('antdpro-grouped-inline-form');
    await expect(inlineForm).toContainText('入库基信');
    await expect(inlineForm).toContainText('人员信息');

    await expect(page.getByTestId('antdpro-grouped-card-desc-title')).toContainText('任务描述');
    await expect(page.getByTestId('antdpro-grouped-card-owner-title')).toContainText('责任信息');
    await expect(page.getByTestId('antdpro-grouped-submit')).toBeVisible();

    await snap(page, '03-form-grouped.png');
  });

  test('04 form-dialog — trigger opens modal with embedded form', async ({ page }) => {
    await openPage(page, 'antdpro-form-dialog', 'AntD Pro 弹窗表单');

    await expect(page.getByTestId('antdpro-form-dialog-title')).toContainText('新建订单');
    await expect(page.getByTestId('antdpro-dialog-open')).toBeVisible();

    await page.getByTestId('antdpro-dialog-open').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('antdpro-form-dialog-surface')).toBeVisible();
    await expect(page.getByTestId('antdpro-dialog-customer')).toBeVisible();
    await expect(page.getByTestId('antdpro-dialog-form')).toContainText('订单金额');
    await expect(page.getByTestId('antdpro-dialog-cancel')).toBeVisible();
    await expect(page.getByTestId('antdpro-dialog-confirm')).toBeVisible();

    await snap(page, '04-form-dialog.png');
  });

  test('05 form-step — wizard with 3 steps visible', async ({ page }) => {
    await openPage(page, 'antdpro-form-step', 'AntD Pro 分步表单');

    await expect(page.getByTestId('antdpro-form-step-title')).toContainText('分步录入');
    const wizard = page.getByTestId('antdpro-step-wizard');
    await expect(wizard).toBeVisible();
    await expect(wizard).toContainText('填写付款信息');
    await expect(wizard).toContainText('确认付款信息');
    await expect(wizard).toContainText('完成');
    await expect(wizard.locator('[data-slot="wizard-step-nav-item"]')).toHaveCount(3);
    await expect(page.getByTestId('antdpro-step1-payee')).toBeVisible();
    await expect(page.getByTestId('antdpro-step1-form')).toContainText('付款金额');

    await snap(page, '05-form-step.png');
  });

  test('06 detail-basic — descriptions card with grouped fields from mock', async ({ page }) => {
    await openPage(page, 'antdpro-detail-basic', 'AntD Pro 基础详情');

    await expect(page.getByTestId('antdpro-detail-basic-title')).toContainText('订单详情');
    await expect(page.getByTestId('antdpro-detail-basic-back')).toBeVisible();
    await expect(page.getByTestId('antdpro-detail-basic-print')).toBeVisible();

    await expect(page.getByTestId('antdpro-detail-basic-group-basic')).toContainText('基本信息');
    await expect(page.getByTestId('antdpro-detail-basic-group-customer')).toContainText('客户信息');
    await expect(page.getByTestId('antdpro-detail-basic-group-payment')).toContainText('结算信息');

    await expect(page.getByTestId('antdpro-detail-basic-order-no')).toContainText('SO2026080100');
    await expect(page.getByTestId('antdpro-detail-basic-customer')).toContainText('杭州云澈服饰有限公司');
    const amount = page.getByTestId('antdpro-detail-basic-amount');
    await expect(amount).toContainText('¥');
    expect(await amount.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain('tabular-nums');

    await snap(page, '06-detail-basic.png');
  });

  test('07 detail-advanced — steps progress + tabs + approval actions', async ({ page }) => {
    await openPage(page, 'antdpro-detail-advanced', 'AntD Pro 高级详情');

    await expect(page.getByTestId('antdpro-detail-advanced-title')).toContainText('订单详情');

    // steps 步骤条（进度态：A1001 = done → progressKey completed → index 3，由 mock 数据驱动）
    const steps = page.getByTestId('antdpro-detail-steps');
    await expect(steps).toBeVisible();
    await expect(steps.locator('[data-slot="steps-item"]')).toHaveCount(4);
    await expect(steps).toHaveAttribute('data-current-index', '3');

    // tabs 分组（3 组）
    const tabs = page.getByTestId('antdpro-detail-tabs');
    await expect(tabs.locator('[role="tab"]')).toHaveCount(3);
    await expect(tabs).toContainText('订单信息');

    await expect(page.getByTestId('antdpro-detail-advanced-order-no')).toContainText('SO2026080100');
    await expect(page.getByTestId('antdpro-detail-advanced-approver')).toContainText('周砚秋');

    // 审批操作组
    await expect(page.getByTestId('antdpro-detail-approve-group')).toBeVisible();
    await expect(page.getByTestId('antdpro-approve-approve')).toBeVisible();
    await expect(page.getByTestId('antdpro-approve-reject')).toBeVisible();

    await snap(page, '07-detail-advanced.png');
  });

  test('08 dashboard — 4 KPI values + line/pie charts + Top10 table', async ({ page }) => {
    await openPage(page, 'antdpro-dashboard', 'AntD Pro 数据看板');

    await expect(page.getByTestId('antdpro-dashboard-title')).toContainText('分析页');

    // KPI×4（数值来自 AntdPro__dashboard：todaySales 11800 / totalOrders 36）
    await expect(page.getByTestId('antdpro-kpi-today-sales-value')).toContainText('11800');
    await expect(page.getByTestId('antdpro-kpi-month-sales-value')).toContainText('126200');
    await expect(page.getByTestId('antdpro-kpi-total-orders-value')).toContainText('36');
    await expect(page.getByTestId('antdpro-kpi-pending-orders-value')).not.toContainText('undefined');

    // 图表节点存在（折线 + 饼图）
    await expect(
      page.locator('[data-testid="antdpro-dashboard-trend-chart"] [data-slot="chart-canvas"]'),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-testid="antdpro-dashboard-channel-chart"] [data-slot="chart-canvas"]'),
    ).toBeVisible();

    // Top10 排行卡：10 行、rank pill 语义色
    const topTable = page.getByTestId('antdpro-dashboard-top-table');
    await expect(topTable.locator('table tbody tr')).toHaveCount(10);
    await expect(topTable).toContainText('云雾绿茶礼盒');
    const rankPill = topTable.locator('.adp-top-rank-1');
    await expect(rankPill).toBeVisible();
    expect(await rankPill.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/22, 119, 255/);

    await snap(page, '08-dashboard.png');
  });

  test('09 result — success graphic + description + action group', async ({ page }) => {
    await openPage(page, 'antdpro-result', 'AntD Pro 提交结果页');

    await expect(page.getByTestId('antdpro-result-icon-wrap')).toBeVisible();
    await expect(page.getByTestId('antdpro-result-success-title')).toContainText('订单提交成功');
    await expect(page.getByTestId('antdpro-result-description')).toContainText('SO2026080136');

    await expect(page.getByTestId('antdpro-result-primary')).toBeVisible();
    await expect(page.getByTestId('antdpro-result-secondary')).toBeVisible();
    const primary = page.getByTestId('antdpro-result-primary');
    expect(await primary.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/22, 119, 255/);

    await snap(page, '09-result.png');
  });

  test('10 list — keyword no-match shows empty state; bulk delete disabled without selection', async ({
    page,
  }) => {
    await openPage(page, 'antdpro-list', 'AntD Pro 订单列表');

    // 禁用态成对可见：未选择时批量删除禁用
    const bulkDelete = page.getByTestId('antdpro-list-bulk-delete');
    await expect(bulkDelete).toBeDisabled();

    // adp-list-empty：关键字无匹配 → 空态（不报错；空态渲染为单行占位 tr）
    await page.getByTestId('antdpro-query-keyword').locator('input').fill('绝对不存在的关键词');
    await page.getByRole('button', { name: '搜索' }).click();
    const crud = page.getByTestId('antdpro-list-crud');
    await expect(crud.locator('table tbody tr')).toHaveCount(1, { timeout: 5_000 });
    await expect(crud).toContainText('暂无数据');
    await snap(page, '10-list-empty.png');
  });
});
