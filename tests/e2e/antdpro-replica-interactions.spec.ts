/**
 * Ant Design Pro 复刻页交互接线测试（plan 2026-08-29-1413-1 P2b）。
 *
 * 承载分析篇 §4 交互清单的接线/锁定用例（初屏结构见 antdpro-replica-visual.spec.ts）。
 * pass/fail 全部为程序化断言（testid 可见性、mock db 可观察变化、aria 属性、
 * 输入值）；截图仅作视觉证据附件。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/antdpro-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function openList(page: import('@playwright/test').Page) {
  await openPage(page, 'antdpro-list', 'AntD Pro 订单列表');
}

test.describe('AntdPro list — I5 批量操作', () => {
  test('01 select-all shows count + 取消选择; bulk delete removes rows db-observably', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');

    const bulkDelete = page.getByTestId('antdpro-list-bulk-delete');
    await expect(bulkDelete).toBeDisabled();
    await expect(page.getByTestId('antdpro-list-selection-count')).toBeHidden();

    await crud.locator('thead').getByRole('checkbox').click();
    await expect(page.getByTestId('antdpro-list-selection-count')).toContainText('已选择 10 项');
    await expect(bulkDelete).toBeEnabled();
    await expect(page.getByTestId('antdpro-list-clear-selection')).toBeVisible();

    await bulkDelete.click();
    await expect(crud.locator('table tbody tr')).toHaveCount(10, { timeout: 10_000 });
    await expect(crud).toContainText('SO2026080110');
    await expect(crud).not.toContainText('SO2026080100');
    await expect(page.getByTestId('antdpro-list-selection-count')).toBeHidden();
    await expect(bulkDelete).toBeDisabled();

    await snap(page, 'i5-bulk-delete.png');
  });

  test('02 取消选择 clears selection and restores disabled gating', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');

    await crud.locator('tbody tr').first().getByRole('checkbox').click();
    await expect(page.getByTestId('antdpro-list-selection-count')).toContainText('已选择 1 项');
    await expect(page.getByTestId('antdpro-list-bulk-delete')).toBeEnabled();

    await page.getByTestId('antdpro-list-clear-selection').click();
    await expect(page.getByTestId('antdpro-list-selection-count')).toBeHidden();
    await expect(page.getByTestId('antdpro-list-bulk-delete')).toBeDisabled();
    await expect(page.getByTestId('antdpro-list-clear-selection')).toBeHidden();
  });
});

test.describe('AntdPro list — I6 行操作', () => {
  test('03 op-view navigates to detail-basic showing the clicked row (session pointer)', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');

    await crud.locator('tbody tr').nth(1).getByTestId('antdpro-op-view').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 基础详情', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('antdpro-detail-basic-order-no')).toContainText('SO2026080101', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('antdpro-detail-basic-customer')).toContainText('南京青禾文创工作室');

    await snap(page, 'i6-op-view-detail.png');
  });

  test('04 op-edit opens prefilled dialog; save persists and list refreshes', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');

    await crud.locator('tbody tr').first().getByTestId('antdpro-op-edit').click();
    const dialog = page.getByTestId('antdpro-edit-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toContainText('编辑订单');
    const customerInput = page.getByTestId('antdpro-edit-customer').locator('input');
    await expect(customerInput).toHaveValue('杭州云澈服饰有限公司');

    await customerInput.fill('变更客户丁');
    await page.getByTestId('antdpro-edit-confirm').click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    await expect(crud).toContainText('变更客户丁', { timeout: 10_000 });
    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080100');

    await snap(page, 'i6-op-edit-saved.png');
  });
});

test.describe('AntdPro list — I7 删除确认', () => {
  test('05 cancel/Esc keep the row; confirm deletes exactly that row', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const firstRowDelete = crud.locator('tbody tr').first().getByTestId('antdpro-op-delete');

    await firstRowDelete.click();
    const dialog = page.getByTestId('antdpro-delete-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('antdpro-delete-message')).toContainText('SO2026080100');

    await page.getByTestId('antdpro-delete-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(crud).toContainText('SO2026080100');

    await firstRowDelete.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(crud).toContainText('SO2026080100');

    await firstRowDelete.click();
    await expect(dialog).toBeVisible();
    await page.getByTestId('antdpro-delete-confirm').click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    await expect(crud).not.toContainText('SO2026080100', { timeout: 10_000 });
    await expect(crud).toContainText('SO2026080101');
    await expect(crud.locator('table tbody tr')).toHaveCount(10);

    await snap(page, 'i7-delete-confirmed.png');
  });
});

test.describe('AntdPro list — I14 新建', () => {
  test('06 new-order dialog submit lands the new row on the first screen', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');

    await page.getByTestId('antdpro-list-new').click();
    const dialog = page.getByTestId('antdpro-new-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('antdpro-new-customer').locator('input').fill('新客户新单戊');
    await page.getByTestId('antdpro-new-confirm').click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    const firstRow = crud.locator('table tbody tr').first();
    await expect(firstRow).toContainText('新客户新单戊', { timeout: 10_000 });
    await expect(crud.locator('table tbody tr')).toHaveCount(10);

    await snap(page, 'i14-new-row-first.png');
  });
});

test.describe('AntdPro list — I4 工具栏 options', () => {
  test('07 native column settings toggles column visibility', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const settings = crud.locator('[data-slot="table-column-settings"]');
    await expect(settings).toBeVisible();

    await settings.getByRole('button', { name: '列设置' }).click();
    const customerItem = page.getByRole('menuitemcheckbox', { name: '客户名称' });
    await expect(customerItem).toBeVisible();
    await customerItem.click();
    await expect(crud.locator('thead')).not.toContainText('客户名称', { timeout: 5_000 });
    await page.keyboard.press('Escape');

    await settings.getByRole('button', { name: '列设置' }).click();
    await page.getByRole('menuitemcheckbox', { name: '客户名称' }).click();
    await expect(crud.locator('thead')).toContainText('客户名称', { timeout: 5_000 });

    await snap(page, 'i4-column-settings.png');
  });
});

test.describe('AntdPro list — I1/I3/I8/I9 既有内建锁定', () => {
  // 已登记已知噪声（plan 2026-08-29-1413-1 Phase 2 实测发现）：分页/排序触发的
  // reactive loadAction 重派发在无 crud scope 投影的上下文求值
  // `${query.keyword ?? ''}`，每次重派发抛一条 "[showcase] action error"。
  // 实际加载由 effect 派发完成，页面行为正确；renderer 侧修复归 D1 候选。
  const KNOWN_REACTIVE_DISPATCH_THROWS = 2;

  test('08 I1 query area collapse/expand toggles field visibility', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const collapse = crud.locator('[data-slot="crud-query-collapse"]');
    const keyword = page.getByTestId('antdpro-query-keyword');
    await expect(keyword).toBeVisible();

    await collapse.locator('button').click();
    await expect(keyword).toBeHidden();
    await expect(collapse).toHaveAttribute('data-collapsed', 'true');

    await collapse.locator('button').click();
    await expect(keyword).toBeVisible();
    await expect(page.getByTestId('antdpro-query-status').first()).toBeVisible();
  });

  test('09 I3 keyword search from page 2 resets pagination to page 1', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(KNOWN_REACTIVE_DISPATCH_THROWS);
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const pagination = crud.locator('[data-slot="table-pagination"]');

    await pagination.locator('a', { hasText: /^2$/ }).click();
    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080110', { timeout: 10_000 });

    await page.getByTestId('antdpro-query-keyword').locator('input').fill('云澈');
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080100', { timeout: 10_000 });
    await expect(crud).toContainText('共');
    await expect(crud.locator('table tbody tr')).toHaveCount(3);
  });

  test('10 I8 pagination page switch refetches rows', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(KNOWN_REACTIVE_DISPATCH_THROWS);
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const pagination = crud.locator('[data-slot="table-pagination"]');

    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080100');
    await pagination.locator('a', { hasText: /^4$/ }).click();
    await expect(crud.locator('table tbody tr')).toHaveCount(6, { timeout: 10_000 });
    await expect(crud).toContainText('SO2026080135');
    await expect(crud).not.toContainText('SO2026080100');
  });

  test('11 I9 orderNo column sort flips first-row order', async ({ page, allowConsoleErrors }) => {
    allowConsoleErrors(KNOWN_REACTIVE_DISPATCH_THROWS);
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const orderNoHead = crud.locator('th[data-slot="table-head"]', { hasText: '订单号' });
    await expect(orderNoHead).toHaveAttribute('aria-sort', 'none');

    await orderNoHead.locator('button').click();
    await expect(orderNoHead).toHaveAttribute('aria-sort', 'ascending');
    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080100');

    await orderNoHead.locator('button').click();
    await expect(orderNoHead).toHaveAttribute('aria-sort', 'descending');
    await expect(crud.locator('table tbody tr').first()).toContainText('SO2026080109', { timeout: 10_000 });
  });
});

test.describe('AntdPro forms — I12/I11/I14/I17/I18 提交链路与校验', () => {
  async function trackEndpointCalls(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
      (window as unknown as { __antdproEndpointCalls: Record<string, number> }).__antdproEndpointCalls = {};
    });
  }

  async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
    return page.evaluate(
      () => (window as unknown as { __antdproEndpointCalls?: Record<string, number> }).__antdproEndpointCalls ?? {},
    );
  }

  async function openTrackedPage(page: import('@playwright/test').Page, pageId: string, label: string) {
    await trackEndpointCalls(page);
    await openPage(page, pageId, label);
  }

  test('12 I12 form-basic submit posts to AntdPro__submitForm then lands on result', async ({ page }) => {
    await openTrackedPage(page, 'antdpro-form-basic', 'AntD Pro 基础表单');

    await page.getByTestId('antdpro-basic-title-input').locator('input').fill('Q3 渠道拓展目标');
    await page.getByTestId('antdpro-basic-owner').locator('input').fill('林知夏');
    await page.getByTestId('antdpro-basic-submit').click();

    await expect(page.getByText('任务已提交，即将跳转')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 提交结果页', { timeout: 10_000 });
    expect((await readEndpointCalls(page)).AntdPro__submitForm).toBe(1);
  });

  test('13 I12 form-basic reset clears values and validation state', async ({ page, allowConsoleErrors }) => {
    // 已登记已知噪声：故意空提交触发校验失败，playground 宿主 onActionError 会
    // 记一条 "[showcase] action error"（render-host.tsx，host 层日志通道）。
    allowConsoleErrors(1);
    await openTrackedPage(page, 'antdpro-form-basic', 'AntD Pro 基础表单');
    const titleInput = page.getByTestId('antdpro-basic-title-input').locator('input');

    await page.getByTestId('antdpro-basic-submit').click();
    await expect(page.getByTestId('antdpro-basic-title-input')).toHaveAttribute('data-field-invalid', '');

    await titleInput.fill('临时草稿');
    await page.getByTestId('antdpro-basic-reset').click();
    await expect(titleInput).toHaveValue('');
    await expect(page.getByTestId('antdpro-basic-title-input')).not.toHaveAttribute('data-field-invalid', '');
    await expect(page.getByTestId('antdpro-basic-title-input').locator('[data-slot="field-error"]')).toBeHidden();
  });

  test('14 I12 form-grouped owner-form submit posts payload then lands on result; reset empties', async ({ page }) => {
    await openTrackedPage(page, 'antdpro-form-grouped', 'AntD Pro 分组表单');
    const dept = page.getByTestId('antdpro-grouped-owner-dept').locator('input');
    const person = page.getByTestId('antdpro-grouped-owner-person').locator('input');

    await dept.fill('仓储运营部');
    await person.fill('顾北辰');
    await page.getByTestId('antdpro-grouped-submit').click();

    await expect(page.getByText('入库登记已提交，即将跳转')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 提交结果页', { timeout: 10_000 });
    expect((await readEndpointCalls(page)).AntdPro__submitForm).toBe(1);

    await trackEndpointCalls(page);
    await openPage(page, 'antdpro-form-grouped', 'AntD Pro 分组表单');
    await page.getByTestId('antdpro-grouped-owner-person').locator('input').fill('临时责任人');
    await page.getByTestId('antdpro-grouped-reset').click();
    await expect(page.getByTestId('antdpro-grouped-owner-person').locator('input')).toHaveValue('');
  });

  test('15 I11 form-step validation gates advance, retains data across steps, submits on finish', async ({ page }) => {
    await openTrackedPage(page, 'antdpro-form-step', 'AntD Pro 分步表单');
    const wizard = page.getByTestId('antdpro-step-wizard');
    const next = page.getByTestId('wizard-next');
    const prev = page.getByTestId('wizard-prev');
    const payee = page.getByTestId('antdpro-step1-payee').locator('input');

    await expect(wizard).toHaveAttribute('data-current-step-index', '0');
    await next.click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '0');
    await expect(wizard.locator('[data-slot="wizard-step-error"]')).toBeVisible();
    await expect(page.getByTestId('antdpro-step1-payee')).toHaveAttribute('data-field-invalid', '');

    await payee.fill('杭州云澈服饰对公户');
    await page.getByTestId('antdpro-step1-account').locator('input').fill('6222020200098765432');
    await next.click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '1');
    await expect(wizard).toContainText('杭州云澈服饰对公户');

    await prev.click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '0');
    await expect(payee).toHaveValue('杭州云澈服饰对公户');

    await next.click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '1');
    await next.click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '2');
    await next.click();

    await expect(page.getByText('结算单已提交，即将跳转')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 提交结果页', { timeout: 10_000 });
    expect((await readEndpointCalls(page)).AntdPro__submitForm).toBe(1);
  });

  test('16 I14 form-dialog submit posts payload and closes the dialog', async ({ page }) => {
    await openTrackedPage(page, 'antdpro-form-dialog', 'AntD Pro 弹窗表单');

    await page.getByTestId('antdpro-dialog-open').click();
    const dialog = page.getByTestId('antdpro-form-dialog-surface');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('antdpro-dialog-customer').locator('input').fill('Dialog客户巳');
    await page.getByTestId('antdpro-dialog-confirm').click();

    await expect(page.getByText('订单已创建')).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    expect((await readEndpointCalls(page)).AntdPro__submitForm).toBe(1);
  });

  test('17 I17 empty submit shows field errors, stays on page, sends no write request', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：故意空提交触发校验失败，playground 宿主 onActionError 会
    // 记一条 "[showcase] action error"（render-host.tsx，host 层日志通道）。
    allowConsoleErrors(1);
    await openTrackedPage(page, 'antdpro-form-basic', 'AntD Pro 基础表单');
    const titleField = page.getByTestId('antdpro-basic-title-input');

    await page.getByTestId('antdpro-basic-submit').click();

    await expect(titleField).toHaveAttribute('data-field-invalid', '');
    await expect(titleField.locator('[data-slot="field-error"]')).toBeVisible();
    await expect(titleField.locator('[data-slot="field-error"]')).toContainText('任务名称');
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 基础表单');
    expect((await readEndpointCalls(page)).AntdPro__submitForm ?? 0).toBe(0);
  });

  test('18 I18 Escape closes the open form dialog', async ({ page }) => {
    await openPage(page, 'antdpro-form-dialog', 'AntD Pro 弹窗表单');
    await page.getByTestId('antdpro-dialog-open').click();
    const dialog = page.getByTestId('antdpro-form-dialog-surface');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });
});

test.describe('AntdPro detail/result — 审批、导航与行级一致性', () => {
  async function trackEndpointCalls(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
      (window as unknown as { __antdproEndpointCalls: Record<string, number> }).__antdproEndpointCalls = {};
    });
  }

  async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
    return page.evaluate(
      () => (window as unknown as { __antdproEndpointCalls?: Record<string, number> }).__antdproEndpointCalls ?? {},
    );
  }

  async function hashNavigate(page: import('@playwright/test').Page, pageId: string) {
    await page.evaluate((id) => {
      window.location.hash = `#/complex-pages/${id}`;
    }, pageId);
  }

  test('19 approve flips A1002 to done on detail steps and in the list', async ({ page }) => {
    await trackEndpointCalls(page);
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    await crud.locator('tbody tr').nth(1).getByTestId('antdpro-op-view').click();
    await expect(page.getByTestId('antdpro-detail-basic-order-no')).toContainText('SO2026080101', { timeout: 10_000 });

    await hashNavigate(page, 'antdpro-detail-advanced');
    await expect(page.getByTestId('antdpro-detail-advanced-title')).toBeVisible({ timeout: 10_000 });
    const steps = page.getByTestId('antdpro-detail-steps');
    await expect(steps).toHaveAttribute('data-current-index', '1');

    await page.getByTestId('antdpro-approve-approve').click();
    await expect(page.getByText('审批通过')).toBeVisible({ timeout: 5_000 });
    await expect(steps).toHaveAttribute('data-current-index', '3', { timeout: 10_000 });
    expect((await readEndpointCalls(page)).AntdPro__approveOrder).toBe(1);

    await hashNavigate(page, 'antdpro-list');
    await expect(page.getByTestId('antdpro-page-title')).toBeVisible({ timeout: 10_000 });
    const row = page.getByTestId('antdpro-list-crud').locator('tbody tr', { hasText: 'SO2026080101' });
    await expect(row).toContainText('已完成', { timeout: 10_000 });
  });

  test('20 reject flips A1003 to cancelled on detail tags and in the list', async ({ page }) => {
    await trackEndpointCalls(page);
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    await crud.locator('tbody tr').nth(2).getByTestId('antdpro-op-view').click();
    await expect(page.getByTestId('antdpro-detail-basic-order-no')).toContainText('SO2026080102', { timeout: 10_000 });
    await expect(page.getByTestId('antdpro-detail-basic-status-pending')).toBeVisible();

    await hashNavigate(page, 'antdpro-detail-advanced');
    await expect(page.getByTestId('antdpro-detail-advanced-title')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('antdpro-approve-reject').click();
    await expect(page.getByText('已驳回，订单关闭')).toBeVisible({ timeout: 5_000 });
    expect((await readEndpointCalls(page)).AntdPro__approveOrder).toBe(1);

    await hashNavigate(page, 'antdpro-detail-basic');
    await expect(page.getByTestId('antdpro-detail-basic-status-cancelled')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('antdpro-detail-basic-status-pending')).toBeHidden();

    await hashNavigate(page, 'antdpro-list');
    await expect(page.getByTestId('antdpro-page-title')).toBeVisible({ timeout: 10_000 });
    const row = page.getByTestId('antdpro-list-crud').locator('tbody tr', { hasText: 'SO2026080102' });
    await expect(row).toContainText('已关闭', { timeout: 10_000 });
  });

  test('21 I13 result primary navigates to list, secondary back to form-basic', async ({ page }) => {
    await openPage(page, 'antdpro-result', 'AntD Pro 提交结果页');

    await page.getByTestId('antdpro-result-primary').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 订单列表', { timeout: 10_000 });

    await hashNavigate(page, 'antdpro-result');
    await expect(page.getByTestId('antdpro-result-title')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('antdpro-result-secondary').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 基础表单', { timeout: 10_000 });
  });

  test('22 detail-basic back navigates to the list page', async ({ page }) => {
    await openList(page);
    await page.getByTestId('antdpro-list-crud').locator('tbody tr').first().getByTestId('antdpro-op-view').click();
    await expect(page.getByTestId('antdpro-detail-basic-title')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('antdpro-detail-basic-back').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('AntD Pro 订单列表', { timeout: 10_000 });
  });

  test('23 op-view detail fields equal the clicked row values (amount precision)', async ({ page }) => {
    await openList(page);
    const crud = page.getByTestId('antdpro-list-crud');
    const row = crud.locator('tbody tr').first();
    const rowOrderNo = (await row.locator('td').nth(1).innerText()).trim();
    const rowCustomer = (await row.locator('td').nth(2).innerText()).trim();
    const rowAmount = (await row.locator('.adp-mono').innerText()).trim();

    await row.getByTestId('antdpro-op-view').click();
    await expect(page.getByTestId('antdpro-detail-basic-order-no')).toContainText(rowOrderNo, { timeout: 10_000 });
    await expect(page.getByTestId('antdpro-detail-basic-customer')).toContainText(rowCustomer);
    await expect(page.getByTestId('antdpro-detail-basic-amount')).toHaveText(rowAmount);
  });
});
