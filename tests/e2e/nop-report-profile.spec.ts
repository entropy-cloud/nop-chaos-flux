import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 753 (NRP-5): the host demo is assembled from the nop-report profile —
// real-shape envelope seed via the composed codec, provider-backed field panel,
// byProfile XPT inspector, profile preview adapter. Programmatic assertions only.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

async function openHostDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/report-designer-host', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Report Designer Host Playground', level: 1 }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-slot="report-designer-host"]')).toBeVisible({ timeout: 15000 });
  await assertTrackedPageErrors(page);
}

test('seeds from the nop-report envelope and loads provider-backed field sources', async ({
  page,
}) => {
  await openHostDemo(page);

  // 信封种子（经组合 codec 导入）：canvas 保留信封 workbook 值
  await expect(page.locator('td.ss-cell[data-row="0"][data-col="0"]')).toContainText('Alpha');
  await expect(page.locator('td.ss-cell[data-row="1"][data-col="0"]')).toContainText('Beta');

  // provider-backed 字段面板（nop-report-datasets provider 实际加载）
  await expect(page.locator('[data-slot="report-field-panel-item"]')).toHaveCount(4, {
    timeout: 15000,
  });
  await expect(
    page.locator('[data-slot="report-field-panel-item"][data-field-id="orders.orderId"]'),
  ).toContainText('Order ID');
});

test('inspector renders the byProfile XPT schema for a bound cell', async ({ page }) => {
  await openHostDemo(page);

  // A2 在信封中带 xpt model {field:'orderId', ds:'orders'}
  await page.locator('td.ss-cell[data-row="1"][data-col="0"]').click();

  const form = page.locator('.nop-form').first();
  await expect(form).toBeVisible({ timeout: 15000 });

  // byProfile 解析出的 XPT 字段（Basic: 前缀 + 13 个 XPT 字段的代表性子集）
  await expect(form.locator('.nop-field[data-field="xpt.field"]')).toBeVisible();
  await expect(form.locator('.nop-field[data-field="xpt.ds"]')).toBeVisible();
  // rowParent/colParent 经 withNopReportFieldKinds 改写为引用选择器组件（NRP-4 消费路径）
  await expect(form.locator('[data-slot="nop-report-reference-value"]')).toHaveCount(2);
  await expect(form.locator('.nop-field[data-field="basic.value"]')).toBeVisible();
});

test('editing XPT fields and committing dispatches updateMeta (dirty)', async ({ page }) => {
  await openHostDemo(page);

  await page.locator('td.ss-cell[data-row="1"][data-col="0"]').click();
  const form = page.locator('.nop-form').first();
  await expect(form).toBeVisible({ timeout: 15000 });
  await expect(form.locator('.nop-field[data-field="xpt.field"]')).toBeVisible({
    timeout: 15000,
  });

  const dirtyProbe = page.locator('[data-testid="host-dirty-probe"]');
  await expect(dirtyProbe).toHaveAttribute('data-dirty', 'false');

  // 通过 Update 按钮提交 namespaced action → report-designer:updateMeta → metadata 变更
  const xptField = form.locator('.nop-field[data-field="xpt.field"] input');
  await xptField.fill('amount');
  const xptDs = form.locator('.nop-field[data-field="xpt.ds"] input');
  await xptDs.fill('orders');
  await form.getByRole('button', { name: /Update|更新/ }).click();

  await expect(dirtyProbe).toHaveAttribute('data-dirty', 'true', { timeout: 15000 });
});
