import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 817 — V2 IoT OTA 灰度管理页 focused e2e (D4 §5 V2 断言清单 ①-⑤ +
// focus ①②). Pillar one (programmatic interactions, __replIotCalls evidence +
// write mirrors) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A desktop registration).
//
// Live-completed faces (D4 §2.6「V2 实现勘误」逐名 ①-⑥):
// - 步骤 1/2 门禁 = form 宿主 checkbox-group/batchSize required + step formId
//   校验（非 table selection / onStepCommit——勘误 ④）。
// - 门控失败 gate 数据经 error.responseData.gate（信封 data 字段，勘误 ⑥）
//   写入 scope 由 alert 呈现；steps FAILED 行显式 status:'error'（勘误 ⑥/Mn-5）。

const COUNTERS_KEY = '__replIotCalls';
const HOOKS_KEY = '__replIotTestHooks';

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replIotTestHooks ?? {},
  );
}

function wizard(page: Page) {
  return page.getByTestId('iot-ota-rollout-wizard');
}

function matrix(page: Page) {
  return page.getByTestId('iot-ota-rollout-matrix');
}

async function openV2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'iot-ota-rollout', { title: 'IoT OTA 灰度管理页' });
  await expect(matrix(page).locator('tbody tr')).toHaveCount(4, { timeout: 30_000 });
}

/** Walk the assignment wizard: firmware + devices → batch size → 确认下发. */
async function assignDevices(page: Page, devices: string[], batchSize: string): Promise<void> {
  await page.getByTestId('iot-ota-rollout-select-package').locator('[data-slot="combobox-trigger"]').click();
  await page.getByRole('option', { name: /PKG-2026-10 v1\.4\.0/ }).click();
  for (const device of devices) {
    await page
      .getByTestId('iot-ota-rollout-select-devices')
      .first()
      .locator('label', { hasText: device })
      .click();
  }
  await wizard(page).getByRole('button', { name: '下一步' }).click();

  await page.getByTestId('iot-ota-rollout-batch-size').locator('[data-slot="combobox-trigger"]').click();
  await page.getByRole('option', { name: `每批 ${batchSize} 台` }).click();
  await wizard(page).getByRole('button', { name: '下一步' }).click();

  await page.getByTestId('iot-ota-rollout-assign-submit').click();
  await expect(page.getByText(/已创建灰度任务 RO-\d{4}/)).toBeVisible({ timeout: 15_000 });
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__assignBatched', { atLeast: 1 });
}

test.describe('V2 IoT OTA 灰度管理页 (#/complex-pages/iot-ota-rollout)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：固件 4 行（废弃标色）+ 矩阵 4 行种子 + steps 当前项 process + firmwarePage 计数', async ({ page }) => {
    await openV2(page);

    const firmware = page.getByTestId('iot-ota-rollout-firmware');
    await expect(firmware.locator('tbody tr')).toHaveCount(4);
    await expect(firmware).toContainText('v1.2.0');
    await expect(firmware).toContainText('已废弃');

    await expect(matrix(page)).toContainText('DEV-1001');
    await expect(matrix(page)).toContainText('已完成');
    await expect(matrix(page)).toContainText('升级中');
    await expect(page.getByTestId('iot-ota-rollout-rollout-meta')).toContainText('任务 RO-0001');

    // Default view device DEV-1002 (UPDATING): current step is 升级中 = process.
    const steps = page.getByTestId('iot-ota-rollout-batch-steps');
    await expect(steps.locator('[data-slot="steps-item"][data-status="process"]')).toHaveCount(1);
    await expect(steps.locator('[data-slot="steps-item"][data-status="process"]')).toContainText('升级中');
    await expect(steps.locator('[data-slot="steps-item"][data-status="finish"]')).toHaveCount(5);
    await expect(page.getByTestId('iot-ota-rollout-assign-timeline')).toContainText('已下发');

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__firmwarePage', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__assignmentMatrix', { atLeast: 1 });
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__assignBatched'] ?? 0).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① 未选设备 next 被 formId 拦截（assignBatched 计数 0）→ 选 3 台每批 1 台 → 载荷 batches 断言', async ({ page }) => {
    await openV2(page);

    await wizard(page).getByRole('button', { name: '下一步' }).click();
    await page.waitForTimeout(500);
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__assignBatched'] ?? 0).toBe(0);
    await expect(page.getByTestId('iot-ota-rollout-select-devices').first()).toBeVisible();

    await assignDevices(page, ['DEV-1001', 'DEV-1003', 'DEV-1005'], '1');
    const body = (await hooksData(page)).lastAssignBatchedBody as {
      packageId?: string;
      deviceIds?: string[];
      batchSize?: number;
    };
    expect(body?.packageId).toBe('PKG-2026-10');
    expect([...(body?.deviceIds ?? [])].sort()).toEqual(['DEV-1001', 'DEV-1003', 'DEV-1005']);
    expect(body?.batchSize).toBe(1);
    await expect(page.getByTestId('iot-ota-rollout-assign-result')).toContainText('共 3 批');
    await expect(matrix(page).locator('tbody tr')).toHaveCount(3, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互②⑤ setAssignmentStatus FAILED → steps error 分叉 + 矩阵行 FAILED + lastError + 状态文本', async ({ page }) => {
    await openV2(page);

    await page.evaluate(() => {
      const hooks = (
        window as unknown as Record<string, { setAssignmentStatus?: (id: string, status: string) => void }>
      ).__replIotTestHooks;
      hooks?.setAssignmentStatus?.('DEV-1001', 'FAILED');
    });
    await page.getByTestId('iot-ota-rollout-refresh').click();

    const failedRow = matrix(page).locator('tbody tr', { hasText: 'DEV-1001' });
    await expect(failedRow).toContainText('失败', { timeout: 10_000 });
    await expect(failedRow).toContainText('E_VERIFY_SIGNATURE');

    const steps = page.getByTestId('iot-ota-rollout-batch-steps');
    // Switch the view to DEV-1001 to see its error fork.
    await page.getByTestId('iot-ota-rollout-view-device').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: /DEV-1001/ }).click();
    await expect(steps.locator('[data-slot="steps-item"][data-status="error"]')).toHaveCount(1, { timeout: 10_000 });
    await expect(steps.locator('[data-slot="steps-item"][data-status="error"]')).toContainText('失败');
    await assertTrackedPageErrors(page);
  });

  test('交互③ 回滚：空原因 required 拦截（rollbackPackage 计数 0）→ 填原因 → rollback +1 + 载荷 + ROLLED_BACK alert', async ({
    page,
  }) => {
    await openV2(page);

    await page.getByTestId('iot-ota-rollout-rollback-open').click();
    const dialog = page.locator('[role="dialog"]', { hasText: '回滚确认 RO-0001' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByTestId('iot-ota-rollout-rolled-back-alert')).toHaveCount(0);

    await dialog.getByTestId('iot-ota-rollout-rollback-confirm').click();
    await page.waitForTimeout(500);
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__rollbackPackage'] ?? 0).toBe(0);
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('iot-ota-rollout-rollback-reason').locator('textarea').fill('v1.4.0 灰度批次出现签名告警');
    await dialog.getByTestId('iot-ota-rollout-rollback-confirm').click();
    await expect(page.getByText('回滚已执行')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__rollbackPackage', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastRollbackBody: { rolloutId: 'RO-0001', reason: 'v1.4.0 灰度批次出现签名告警' },
    });
    await expect(dialog.getByTestId('iot-ota-rollout-rolled-back-alert')).toContainText('ROLLED_BACK', {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互④ 门控：完成率 50% → GATE_NOT_PASSED toast + gate 呈现 + 批次不推进 → DEV-1002 UPDATED 后推进至第 2 批', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openV2(page);

    // Seed gate: batch 1 = 1/2 UPDATED → 50%, not passed.
    await page.getByTestId('iot-ota-rollout-activate-next').click();
    await expect(page.getByText('门控未通过（REPL_IOT_GATE_NOT_PASSED）')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__activateNextBatch', { atLeast: 1 });
    await expect(page.getByTestId('iot-ota-rollout-gate-alert')).toContainText('完成率 50%');
    await expect(page.getByTestId('iot-ota-rollout-gate-alert')).toContainText('未通过');
    await expect(page.getByTestId('iot-ota-rollout-rollout-meta')).toContainText('当前批次 1');

    // Push DEV-1002 to UPDATED → gate passes → advance to batch 2.
    await page.evaluate(() => {
      const hooks = (
        window as unknown as Record<string, { setAssignmentStatus?: (id: string, status: string) => void }>
      ).__replIotTestHooks;
      hooks?.setAssignmentStatus?.('DEV-1002', 'UPDATED');
    });
    await page.getByTestId('iot-ota-rollout-refresh').click();
    await page.getByTestId('iot-ota-rollout-activate-next').click();
    await expect(page.getByText('已推进至第 2 批')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('iot-ota-rollout-rollout-meta')).toContainText('当前批次 2', { timeout: 10_000 });
    // Batch 2 devices left QUEUED and were initiated by the gate.
    await expect(matrix(page).locator('tbody tr', { hasText: 'DEV-1003' })).toContainText('已下发', {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('focus ① wizard 步进按钮 tab 可达，Enter 推进（formId 通过后进入分批步）', async ({ page }) => {
    await openV2(page);

    // Fill the required fields, then drive the wizard by keyboard only.
    await page.getByTestId('iot-ota-rollout-select-devices').first().locator('label', { hasText: 'DEV-1001' }).click();
    const next = wizard(page).getByRole('button', { name: '下一步' });
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('iot-ota-rollout-batch-size').first()).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('focus ② 回滚 dialog 焦点落入、Esc 关闭后焦点回文档', async ({ page }) => {
    await openV2(page);

    await page.getByTestId('iot-ota-rollout-rollback-open').click();
    const dialog = page.locator('[role="dialog"]', { hasText: '回滚确认' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const surfaces = document.querySelectorAll('[role="dialog"]');
          const top = surfaces[surfaces.length - 1];
          const active = document.activeElement;
          return !!top && !!active && (active === top || top.contains(active));
        }),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => !!document.activeElement && document.activeElement !== document.body)).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
