/**
 * Sundial 复刻页视觉回归测试。
 *
 * 本 spec 基于当前 HEAD base（plan 457 交互接线完成状态；plan 458 改动
 * 因存在 nested-dialog scope 缺陷已整体撤销，等待独立 plan 重做）。
 * 验证 5 个 sundial 复刻页初屏 + plan 457 关键交互接线 + plan 459
 * （controlled dialog X 关闭）的视觉表现，并把整页截图保存到
 * `tests/e2e/artifacts/sundial-replica/` 作视觉证据。
 *
 * 截图产物配合 closure audit evidence 使用。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/sundial-replica';

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function snap(page: import('@playwright/test').Page, file: string) {
  await ensureDir(ARTIFACTS_DIR);
  await page.screenshot({
    path: join(ARTIFACTS_DIR, file),
    fullPage: false,
  });
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  // Wait for the page title rendered by ComplexPagesShowcase to confirm we landed on the right page.
  await expect(
    page.getByTestId('complex-page-title'),
  ).toContainText(label, { timeout: 15_000 });
  // Settle any post-mount animation / async data-source fetch.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

test.describe('Sundial replica — visual snapshots', () => {
  test('01 workbench — sidebar + pressure rail + 5 collapse groups', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await expect(page.getByTestId('sundial-sidebar')).toBeVisible();
    await expect(page.getByTestId('sundial-pressure-card')).toBeVisible();
    await expect(page.getByTestId('sundial-section-overdue')).toBeVisible();
    await expect(page.getByTestId('sundial-section-today')).toBeVisible();
    await snap(page, '01-workbench.png');
  });

  test('02 workbench — nav/view selection switching (plan 457 C1)', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await page.getByTestId('sundial-view-today').click();
    await expect(page.getByTestId('sundial-view-today')).toHaveAttribute('data-selected', 'true', {
      timeout: 5_000,
    });
    await expect(page.getByTestId('sundial-view-all')).toHaveAttribute('data-selected', 'false');
    await snap(page, '02-workbench-view-today.png');
  });

  test('03 workbench — task row click opens detail dialog (plan 457 C14 + 460 P4)', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await page.getByTestId('sundial-task-today-1').click();
    await expect(page.getByText('打开详情')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-task-detail-dialog')).toBeVisible({ timeout: 5_000 });
    await snap(page, '03-workbench-task-detail.png');
  });

  test('04 analytics — KPI cards + 3 charts + output structure', async ({ page }) => {
    await openPage(page, 'sundial-analytics', 'Sundial 分析');
    await expect(page.getByTestId('sundial-kpi-today')).toBeVisible();
    await expect(page.getByTestId('sundial-trend-chart')).toBeVisible();
    await expect(page.getByTestId('sundial-energy-chart')).toBeVisible();
    await expect(page.getByTestId('sundial-pressure-chart')).toBeVisible();
    await snap(page, '04-analytics.png');
  });

  test('05 detail — status row + 4 field rows + subtasks', async ({ page }) => {
    await openPage(page, 'sundial-detail', 'Sundial 待办详情');
    await expect(page.getByTestId('sundial-detail-panel')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-status-row')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-row-date')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-row-recurrence')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-row-flag')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-row-list')).toBeVisible();
    await expect(page.getByTestId('sundial-detail-subtask-1')).toBeVisible();
    await snap(page, '05-detail.png');
  });

  test('06 detail — recurrence row opens picker dialog (plan 457 C3)', async ({ page }) => {
    await openPage(page, 'sundial-detail', 'Sundial 待办详情');
    await page.getByTestId('sundial-detail-row-recurrence').click();
    await expect(page.getByText('重复').first()).toBeVisible({ timeout: 5_000 });
    await snap(page, '06-detail-recur-picker.png');
  });

  test('07 settings — sync section (mode cards + connection info)', async ({ page }) => {
    await openPage(page, 'sundial-settings', 'Sundial 设置');
    await expect(page.getByTestId('sundial-mode-local')).toBeVisible();
    await expect(page.getByTestId('sundial-mode-supabase')).toBeVisible();
    await expect(page.getByTestId('sundial-status-card')).toBeVisible();
    await snap(page, '07-settings-sync.png');
  });

  test('08 settings — mode card to connection info link (plan 457 C7)', async ({ page }) => {
    await openPage(page, 'sundial-settings', 'Sundial 设置');
    await page.getByTestId('sundial-mode-supabase').click();
    await expect(page.getByTestId('sundial-connection-info')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-connection-info')).toContainText('Supabase 项目 URL');
    await snap(page, '08-settings-mode-supabase.png');
  });

  test('09 todo-dialog — entry button opens the 360dp dialog', async ({ page }) => {
    await openPage(page, 'sundial-todo-dialog', 'Sundial 新建待办');
    await page.getByTestId('sundial-open-todo-dialog').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await snap(page, '09-todo-dialog-open.png');
  });

  test('10 todo-dialog — cancel button closes dialog', async ({ page }) => {
    await openPage(page, 'sundial-todo-dialog', 'Sundial 新建待办');
    await page.getByTestId('sundial-open-todo-dialog').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 5_000 });
  });

  test('11 detail — X close button closes the date picker dialog (plan 459 B1)', async ({ page }) => {
    await openPage(page, 'sundial-detail', 'Sundial 待办详情');
    await page.getByTestId('sundial-open-date-dialog').click();
    const dateDialog = page.locator('[role="dialog"]');
    await expect(dateDialog).toBeVisible({ timeout: 5_000 });
    await snap(page, '11-detail-date-dialog-open.png');

    const closeBtn = dateDialog.locator('[data-slot="dialog-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // plan 459 B1: X close must tear the surface down (dialog unmounts)
    await expect(dateDialog).toHaveCount(0, { timeout: 5_000 });
  });

  test('12 detail — dialog drag handle is hidden (plan 459 B2)', async ({ page }) => {
    await openPage(page, 'sundial-detail', 'Sundial 待办详情');
    await page.getByTestId('sundial-open-date-dialog').click();
    const dateDialog = page.locator('[role="dialog"]');
    await expect(dateDialog).toBeVisible({ timeout: 5_000 });

    // The 6-dot grip handle must not be visible (CSS hides it), while the
    // dialog remains fully rendered.
    const handle = dateDialog.locator('[data-slot="dialog-drag-handle"]');
    await expect(handle).toBeHidden();
    await snap(page, '12-detail-date-dialog-no-grip.png');
  });
});

test.describe('Sundial replica — plan 460 interactions', () => {
  test('13 workbench — completed view shows dedicated panel', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await page.getByTestId('sundial-view-completed').click();
    await expect(page.getByTestId('sundial-board-completed')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-task-completed-7')).toContainText('更新团队共享日历');
    await snap(page, '13-workbench-completed.png');
  });

  test('14 workbench — trash view shows trash panel', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await page.getByTestId('sundial-view-trash').click();
    await expect(page.getByTestId('sundial-board-trash')).toBeVisible({ timeout: 5_000 });
    await snap(page, '14-workbench-trash.png');
  });

  test('15 workbench — task row opens detail dialog (plan 460 P4)', async ({ page }) => {
    await openPage(page, 'sundial-workbench', 'Sundial 工作台');
    await page.getByTestId('sundial-task-today-1').click();
    await expect(page.getByTestId('sundial-task-detail-dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-detail-title-text')).toContainText('撰写季度复盘报告');
    await snap(page, '15-workbench-task-detail.png');
  });

  test('16 settings — switch to lists section (plan 460 P6)', async ({ page }) => {
    await openPage(page, 'sundial-settings', 'Sundial 设置');
    await page.getByTestId('sundial-settings-lists').click();
    await expect(page.getByTestId('sundial-panel-lists')).toBeVisible({ timeout: 5_000 });
    const rows = page.getByTestId('sundial-list-row');
    await expect(rows.first()).toContainText('工作', { timeout: 5_000 });
    await snap(page, '16-settings-lists.png');
  });

  test('17 settings — about section (plan 460 P6)', async ({ page }) => {
    await openPage(page, 'sundial-settings', 'Sundial 设置');
    await page.getByTestId('sundial-settings-about').click();
    await expect(page.getByTestId('sundial-panel-about')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-about-version-value')).toContainText('0.10.0');
    await snap(page, '17-settings-about.png');
  });

  test('18 todo-dialog — date row opens picker via openDialog + owner writeback (plan 460 P1)', async ({ page }) => {
    await openPage(page, 'sundial-todo-dialog', 'Sundial 新建待办');
    await page.getByTestId('sundial-open-todo-dialog').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-todo-date-value')).toContainText('无');

    await page.getByTestId('sundial-todo-date-row').click();
    await expect(page.getByText('明天')).toBeVisible({ timeout: 5_000 });
    await page
      .locator('label[data-slot="radio-group-item"]')
      .filter({ hasText: '明天' })
      .click();
    await page.getByTestId('sundial-todo-date-submit').click();

    // Picker closes; field row value updated via onSubmitSuccess owner-scope writeback
    await expect(page.getByTestId('sundial-todo-date-value')).toContainText('明天', { timeout: 5_000 });
    await snap(page, '18-todo-date-writeback.png');
  });

  test('19 analytics — chart drill-down focus card (plan 460 P13)', async ({ page }) => {
    await openPage(page, 'sundial-analytics', 'Sundial 分析');
    const trendCanvas = page.locator('[data-testid="sundial-trend-chart"] [data-slot="chart-canvas"]');
    await expect(trendCanvas).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-chart-focus-card')).toBeHidden();
    await trendCanvas.click();
    await expect(page.getByTestId('sundial-chart-focus-card')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-chart-focus')).toContainText('完成趋势');
    await snap(page, '19-analytics-drilldown.png');
  });

  test('20 detail — subtask chevron opens subtask dialog (plan 460 P8)', async ({ page }) => {
    await openPage(page, 'sundial-detail', 'Sundial 待办详情');
    await page.getByTestId('sundial-subtask-open-1').click();
    await expect(page.getByTestId('sundial-subtask-dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('sundial-subtask-title-text')).toContainText('收集销售数据');
    await snap(page, '20-detail-subtask-dialog.png');
  });
});
