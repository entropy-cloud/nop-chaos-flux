import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 753 (NRP-5): the host demo is assembled from the nop-report profile —
 * real-shape envelope seed via the composed codec, provider-backed field panel,
 * byProfile XPT inspector, profile preview adapter. Programmatic assertions only.
 *
 * Migrated from tests/e2e/nop-report-profile.spec.ts (E3 batch 1, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling with the
 * same timeouts; old serial-mode/60s-timeout config folded into per-assertion
 * timeoutMs). Per-case isolation via resetRoute(): each old Playwright test ran
 * on a fresh page; here we bounce through '/#/' with a stability gate so the
 * host demo remounts (ft.reload() is unusable — it destroys the CDP evaluation
 * context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="report-designer-host"]')).not.toBeVisible();
}

async function openHostDemo(ft: FtGlobal): Promise<void> {
  // flux-test runner defaults to a 756px viewport, below the workbench
  // breakpoint where the inspector column collapses to display:none — force
  // the desktop viewport the original Playwright config used.
  await ft.setViewportSize(1280, 800);
  await resetRoute(ft);
  await ft.goto('/#/report-designer-host');
  await ft.expectWeb(
    ft.getByRole('heading', { name: 'Report Designer Host Playground', level: 1 }),
  ).toBeVisible({ timeoutMs: 30_000 });
  await ft.expectWeb(ft.locator('[data-slot="report-designer-host"]')).toBeVisible({ timeoutMs: 15_000 });
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 30_000 });
  await expectNoPageErrors(ft, 'nop-report-profile:open');
}

export default async function nopReportProfile(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: seeds from the nop-report envelope and loads provider-backed field sources
  await openHostDemo(ft);

  // 信封种子（经组合 codec 导入）：canvas 保留信封 workbook 值
  await ft.expectWeb(ft.locator('td.ss-cell[data-row="0"][data-col="0"]')).toContainText('Alpha');
  await ft.expectWeb(ft.locator('td.ss-cell[data-row="1"][data-col="0"]')).toContainText('Beta');

  // provider-backed 字段面板（nop-report-datasets provider 实际加载）
  await ft.expectWeb(ft.locator('[data-slot="report-field-panel-item"]')).toHaveCount(4, {
    timeoutMs: 15_000,
  });
  await ft.expectWeb(
    ft.locator('[data-slot="report-field-panel-item"][data-field-id="orders.orderId"]'),
  ).toContainText('Order ID');

  // Case 2: inspector renders the byProfile XPT schema for a bound cell
  await openHostDemo(ft);

  // A2 在信封中带 xpt model {field:'orderId', ds:'orders'}
  await ft.locator('td.ss-cell[data-row="1"][data-col="0"]').click();

  const form = ft.locator('.nop-form').first();
  await ft.expectWeb(form).toBeVisible({ timeoutMs: 15_000 });

  // byProfile 解析出的 XPT 字段（Basic: 前缀 + 13 个 XPT 字段的代表性子集）
  await ft.expectWeb(form.locator('.nop-field[data-field="xpt.field"]')).toBeVisible();
  await ft.expectWeb(form.locator('.nop-field[data-field="xpt.ds"]')).toBeVisible();
  // rowParent/colParent 经 withNopReportFieldKinds 改写为引用选择器组件（NRP-4 消费路径）
  await ft.expectWeb(form.locator('[data-slot="nop-report-reference-value"]')).toHaveCount(2);
  await ft.expectWeb(form.locator('.nop-field[data-field="basic.value"]')).toBeVisible();

  // Case 3: editing XPT fields and committing dispatches updateMeta (dirty)
  await openHostDemo(ft);

  const cellA2 = ft.locator('td.ss-cell[data-row="1"][data-col="0"]');
  await cellA2.waitFor('visible', { timeoutMs: 15_000 });
  await cellA2.click();
  const editForm = ft.locator('.nop-form').first();
  await ft.expectWeb(editForm).toBeVisible({ timeoutMs: 30_000 });
  await ft.expectWeb(editForm.locator('.nop-field[data-field="xpt.field"]')).toBeVisible({
    timeoutMs: 15_000,
  });

  const dirtyProbe = ft.locator('[data-testid="host-dirty-probe"]');
  await ft.expectWeb(dirtyProbe).toHaveAttribute('data-dirty', 'false');

  // 通过 Update 按钮提交 namespaced action → report-designer:updateMeta → metadata 变更
  const xptField = editForm.locator('.nop-field[data-field="xpt.field"] input');
  await xptField.fill('amount');
  const xptDs = editForm.locator('.nop-field[data-field="xpt.ds"] input');
  await xptDs.fill('orders');
  // locator.getByRole is not in the driver API; the Update submit button is
  // unique on this page so the page-level role locator is equivalent
  await ft.getByRole('button', { name: /Update|更新/ }).click();

  await ft.expectWeb(dirtyProbe).toHaveAttribute('data-dirty', 'true', { timeoutMs: 15_000 });

  await expectNoPageErrors(ft, 'nop-report-profile:update-meta');

  return { cases: 3 };
}
