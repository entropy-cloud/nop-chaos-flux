import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 816 — V1 IoT 设备遥测详情页 focused e2e (D4 §5 V1 断言清单 ①-④ +
// focus ①②). Pillar one (programmatic interactions, __replIotCalls evidence
// + write mirrors) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A desktop registration).
//
// Polling discipline (D4 §5 V1 ① / D6 MIN-6): the mock phase only moves on the
// tickTelemetry() hook — never per request — so the spec ticks once and then
// asserts the DATA face (tile text = the advanced-phase value) with a timeout
// above interval (5000) + margin, instead of a narrow "changed within Ns" window.

const COUNTERS_KEY = '__replIotCalls';
const HOOKS_KEY = '__replIotTestHooks';
const POLL_TIMEOUT = 9_000;
const TREND_INSTANCE_KEY = '__flux_echarts_iot-telemetry-device-trend-chart';

/* Fixture mirror of mock-backend-repl-iot.ts telemetryValue (latest = index 287). */
const BASE: Record<string, Record<string, number>> = {
  'DEV-1001': { temperature: 24, humidity: 55, voltage: 220 },
  'DEV-1002': { temperature: 28, humidity: 62, voltage: 218 },
  'DEV-1003': { temperature: 33, humidity: 70, voltage: 212 },
};
const AMPLITUDE: Record<string, number> = { temperature: 3, humidity: 6, voltage: 4 };
function latest(device: string, metric: string, phase: number): string {
  const value = BASE[device][metric] + AMPLITUDE[metric] * Math.sin((287 + phase * 6) / 18);
  return (Math.round(value * 10) / 10).toFixed(1);
}

function tile(page: Page, metric: string) {
  return page.getByTestId(`iot-telemetry-device-latest-tile-${metric}`).locator('[data-slot="stat-tile-value"]');
}

function alarmRows(page: Page) {
  return page.getByTestId('iot-telemetry-device-alarms').locator('tbody tr');
}

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replIotTestHooks ?? {},
  );
}

async function openV1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'iot-telemetry-device', { title: 'IoT 设备遥测详情页' });
  await expect(tile(page, 'temperature')).toHaveText(latest('DEV-1001', 'temperature', 0), { timeout: 30_000 });
}

async function openAlarm(page: Page, alarmId: string) {
  await alarmRows(page).filter({ hasText: alarmId }).locator('td').nth(1).click();
  const dialog = page.locator('[role="dialog"]', { hasText: `告警 ${alarmId}` });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  return dialog;
}

test.describe('V1 IoT 设备遥测详情页 (#/complex-pages/iot-telemetry-device)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：三 tile 首相位值 + sparkline + echarts 三曲线 + 质量位 GOOD + 告警按设备 4 行 + 端点计数', async ({ page }) => {
    await openV1(page);

    for (const metric of ['temperature', 'humidity', 'voltage']) {
      await expect(tile(page, metric)).toHaveText(latest('DEV-1001', metric, 0));
    }
    await expect(page.getByTestId('iot-telemetry-device-latest-tile-temperature').locator('[data-slot="stat-tile-sparkline"]')).toBeVisible();
    await expect(page.getByTestId('iot-telemetry-device-quality-status')).toContainText('GOOD');
    await expect(page.getByTestId('iot-telemetry-device-quality-mapping')).toContainText('数据可信');

    // echarts instance (exposed as __flux_echarts_<componentId>, W1 勘误 5
    // observation anchor) carries the three structured series × 288 points.
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const chart = (
            window as unknown as Record<string, { chart?: { getOption: () => { series: Array<{ name: string; data: unknown[] }> } } }>
          )[key]?.chart;
          return chart ? chart.getOption().series.map((s) => [s.name, s.data.length]) : null;
        }, TREND_INSTANCE_KEY),
      )
      .toEqual([
        ['温度', 288],
        ['湿度', 288],
        ['电压', 288],
      ]);

    await expect(alarmRows(page)).toHaveCount(4);
    await expect(page.getByTestId('iot-telemetry-device-alarms')).toContainText('ALM-001');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__telemetryQuery', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__alarmPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① tickTelemetry 推进相位 → 下一轮询温度 tile = 推进后相位值（数据面断言，D6 MIN-6）', async ({ page }) => {
    await openV1(page);
    const before = (await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__telemetryQuery'] ?? 0;

    await page.evaluate(() => {
      (window as unknown as Record<string, { tickTelemetry?: () => void }>).__replIotTestHooks?.tickTelemetry?.();
    });

    await expect(tile(page, 'temperature')).toHaveText(latest('DEV-1001', 'temperature', 1), { timeout: POLL_TIMEOUT });
    await expect(tile(page, 'voltage')).toHaveText(latest('DEV-1001', 'voltage', 1), { timeout: POLL_TIMEOUT });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__telemetryQuery', { atLeast: before + 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互② 告警行点击 → dialog → 确认 → alarmAck +1 + 载荷 + 行状态 待处理→已确认', async ({ page }) => {
    await openV1(page);
    await expect(alarmRows(page).filter({ hasText: 'ALM-001' })).toContainText('待处理');

    const dialog = await openAlarm(page, 'ALM-001');
    await expect(dialog.getByTestId('iot-telemetry-device-alarm-detail')).toContainText('设备 DEV-1001');
    await dialog.getByTestId('iot-telemetry-device-alarm-ack').click();

    await expect(page.getByText('告警已确认')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__alarmAck', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastAlarmAckBody: { alarmId: 'ALM-001' } });
    await expect(dialog).toHaveCount(0);
    await expect(alarmRows(page).filter({ hasText: 'ALM-001' })).toContainText('已确认', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互③ forceAlarmAckError → ACK_FAILED toast；已关闭告警再关闭 → ALREADY_CLOSED toast', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(2);
    await openV1(page);

    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replIotTestHooks;
      if (hooks) hooks.forceAlarmAckError = true;
    });
    let dialog = await openAlarm(page, 'ALM-007');
    await dialog.getByTestId('iot-telemetry-device-alarm-ack').click();
    await expect(page.getByText('确认失败（REPL_IOT_ALARM_ACK_FAILED）')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(alarmRows(page).filter({ hasText: 'ALM-007' })).toContainText('待处理');

    dialog = await openAlarm(page, 'ALM-004');
    await expect(dialog.getByTestId('iot-telemetry-device-alarm-ack')).toHaveCount(0);
    await dialog.getByTestId('iot-telemetry-device-alarm-close').click();
    await expect(page.getByText('关闭失败（REPL_IOT_ALARM_ALREADY_CLOSED）')).toBeVisible({ timeout: 10_000 });
    expect(await hooksData(page)).toMatchObject({ lastAlarmCloseBody: { alarmId: 'ALM-004' } });
  });

  test('交互④ 切换设备 → telemetryQuery +1 + tile 更新 + 质量位 BAD + 告警按新设备过滤', async ({ page }) => {
    await openV1(page);
    const before = await readEndpointCalls(page, COUNTERS_KEY);

    await page.getByTestId('iot-telemetry-device-filter-device').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: /DEV-1003/ }).click();

    await expect(tile(page, 'temperature')).toHaveText(latest('DEV-1003', 'temperature', 0), { timeout: 10_000 });
    await expect(page.getByTestId('iot-telemetry-device-quality-status')).toContainText('BAD');
    await expect(page.getByTestId('iot-telemetry-device-quality-mapping')).toContainText('数据不可用');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__telemetryQuery', {
      atLeast: (before['ReplIot__telemetryQuery'] ?? 0) + 1,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__alarmPage', {
      atLeast: (before['ReplIot__alarmPage'] ?? 0) + 1,
    });
    await expect(alarmRows(page)).toHaveCount(4);
    for (const id of ['ALM-003', 'ALM-006', 'ALM-009', 'ALM-012']) {
      await expect(page.getByTestId('iot-telemetry-device-alarms')).toContainText(id);
    }
    await expect(page.getByTestId('iot-telemetry-device-alarms')).not.toContainText('ALM-001');
    await assertTrackedPageErrors(page);
  });

  test('focus ① 过滤 form 首控件为页面 Tab 首站（设备下拉）', async ({ page }) => {
    await openV1(page);

    const landedOn = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="iot-telemetry-device-root"]');
        if (!active || !root || !root.contains(active)) return null;
        return active.closest('[data-testid]')?.getAttribute('data-testid') ?? active.tagName;
      });
    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await landedOn();
    }
    expect(landed).toBe('iot-telemetry-device-filter-device');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 告警 dialog 焦点落入、Esc 关闭后焦点回文档', async ({ page }) => {
    await openV1(page);
    const dialog = await openAlarm(page, 'ALM-010');

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
