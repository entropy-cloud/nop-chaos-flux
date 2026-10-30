import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 805 — I2 ITAM 折旧仪表盘页 focused e2e (D2 §5 I2 断言清单 ①-④ 忠实转写
// + 本计划补充断言〔KPI 数值 / pie 渲染 / line 渲染——出处 D2 §2.8 树 + R1 I2
// 要素②③，非 §5 原文，如实标注〕 + 预警行操作 dialog 焦点往返〔§5 focus③，
// 树未绘 dialog 由 plan 805 M3 预登记补绘〕 + focus ①②). Pillar one
// (programmatic interactions, __replItamCalls 计数证据) + pillar three
// (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — desktop page, pure JSON SchemaPage).
//
// Seed math (mock-backend-repl-itam-depreciation deterministic fixtures,
// fresh session per test):
//   KPI flat map   '': 2860000/1144000/1716000/35750/420000
//                '2026-09': 2640000/1056000/1584000/33000/380000
//   categoryDistribution '' sums to 2860000 (4 slices); per-period faces.
//   trend 12 months '2025-11'..'2026-10', two series (本期/累计).
//   pivot records year 2025/2026 × category ×4 × quarter Q1..Q4;
//   originalValue(y,c,q) = (yIdx+1)*100000 + cIdx*25000 + qIdx*5000 →
//   2026 first cell (IT设备×Q1) = 200000; grand row aggregates per COLUMN:
//   Q1 column totals 2026 = originalValue 950000 / periodDepreciation 36800 /
//   netBookValue 576000;
//   2025 first cell = 100000.
//   alerts: i%4===1 ∩ IN_SERVICE (status cycle index 0..2 ⇔ i%6 ∈ {0,1,2})
//   → assets 0001/0013/0025 (3 rows, 0001 first, lastPeriod 2026-02).
//   depreciationReport error branch: format ∉ {xlsx,pdf} → `unsupported format`.

const COUNTERS_KEY = '__replItamCalls';
const HOOKS_KEY = '__replItamTestHooks';
const PIVOT_INSTANCE_KEY = '__flux_pivot_itam-depreciation-dashboard-pivot';


/** D2 §5 ①: the 一键刷新 cascade re-fetches exactly these five I2 sources. */
const I2_ENDPOINTS = [
  'ReplItam__depreciationKpi',
  'ReplItam__depreciationTrend',
  'ReplItam__categoryDistribution',
  'ReplItam__depreciationPivot',
  'ReplItam__depreciationAlerts',
] as const;

/** stat-tile numeric slot (prefix renders in a sibling slot). */
function kpiValue(page: Page, testid: string) {
  return page.getByTestId(testid).locator('[data-slot="stat-tile-value"]');
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replItamTestHooks ?? {},
  );
}

interface PivotHeaderPath {
  dimensionKey?: string;
  value?: string;
  indicatorKey?: string;
}

/**
 * Locate a pivot data cell by its header paths (W3 probePivot precedent,
 * adapted: one row dimension at col 0, data columns start at col 1) and read
 * its numeric value. Also returns the grand-total row's per-indicator values.
 */
async function probePivot(
  page: Page,
  want: { category: string; quarter: string; indicator: string },
): Promise<{ cell: number | null; grand: Record<string, number>; found: boolean }> {
  return page.evaluate(
    ({ instanceKey, want }) => {
      const instance = (
        window as unknown as Record<string, { instance?: {
          colCount: number;
          rowCount: number;
          getCellValue: (col: number, row: number) => string | number | null;
          getCellHeaderPaths: (col: number, row: number) => {
            colHeaderPaths?: PivotHeaderPath[];
            rowHeaderPaths?: PivotHeaderPath[];
          };
        } | undefined }>
      )[instanceKey]?.instance;
      if (!instance) {
        throw new Error('pivot instance not exposed');
      }
      let cell: number | null = null;
      const grand: Record<string, number> = {};
      let found = false;
      for (let row = 2; row < instance.rowCount; row += 1) {
        // Grand-total row: the row-dimension corner cell reads the 总计 label
        // (W3 probePivot precedent). Grand cells aggregate per COLUMN — the
        // cell at (quarter, indicator) sums the categories of that quarter
        // only (W3 GRAND_QTY_IN_BY_MONTH precedent), so the probe samples the
        // want.quarter column.
        if (instance.getCellValue(0, row) === '总计') {
          for (let col = 1; col < instance.colCount; col += 1) {
            const paths = instance.getCellHeaderPaths(col, row);
            if (paths.colHeaderPaths?.[0]?.value !== want.quarter) continue;
            const indicator = paths.colHeaderPaths?.[1]?.indicatorKey;
            if (indicator) {
              const value = instance.getCellValue(col, row);
              if (value !== null) grand[indicator] = Number(value);
            }
          }
          continue;
        }
        if (found) continue;
        const rowPaths = instance.getCellHeaderPaths(0, row);
        if (rowPaths.rowHeaderPaths?.[0]?.value !== want.category) continue;
        for (let col = 1; col < instance.colCount; col += 1) {
          const paths = instance.getCellHeaderPaths(col, row);
          if (
            paths.colHeaderPaths?.[0]?.value === want.quarter &&
            paths.colHeaderPaths?.[1]?.indicatorKey === want.indicator
          ) {
            const value = instance.getCellValue(col, row);
            cell = value === null ? null : Number(value);
            found = true;
            break;
          }
        }
      }
      return { cell, grand, found };
    },
    { instanceKey: PIVOT_INSTANCE_KEY, want },
  );
}

async function openI2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'itam-depreciation-dashboard', {
    title: 'ITAM 折旧仪表盘页',
  });
  // Pivot instance mounted (canvas attached + observation anchor ready) — the
  // cell probes (交互②/②b) depend on the handle.
  await expect(
    page.locator('[data-testid="itam-depreciation-dashboard-pivot"] [data-slot="pivot-canvas"] canvas').first(),
  ).toBeAttached({ timeout: 30_000 });
  await expect
    .poll(async () => page.evaluate((key) => Boolean((window as unknown as Record<string, unknown>)[key]), PIVOT_INSTANCE_KEY))
    .toBe(true);
}

test.describe('I2 ITAM 折旧仪表盘页 (#/complex-pages/itam-depreciation-dashboard)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：五源取数 + KPI 五 tile 初始值（全部期间基线面）+ pie/line 渲染 + 预警 3 行 + 下载不预取', async ({
    page,
  }) => {
    await openI2(page);

    // KPI 阵列 ← depreciationKpi flat map（'' 全部期间基线）。
    const kpiExpectations: Array<[string, string]> = [
      ['itam-depreciation-dashboard-kpi-original', '2,860,000'],
      ['itam-depreciation-dashboard-kpi-accumulated', '1,144,000'],
      ['itam-depreciation-dashboard-kpi-net', '1,716,000'],
      ['itam-depreciation-dashboard-kpi-period', '35,750'],
      ['itam-depreciation-dashboard-kpi-cip', '420,000'],
    ];
    for (const [testid, text] of kpiExpectations) {
      await expect(kpiValue(page, testid)).toHaveText(text, { timeout: 15_000 });
    }
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationKpi', { atLeast: 1 });

    // 补充断言（非 §5 原文，出处 §2.8 树）：类别分布 pie 渲染——4 切片（=4
    // 类别），fill 非空为程序化"渲染"证明（C3 漏斗 bar 同款纪律）。
    const pie = page.getByTestId('itam-depreciation-dashboard-pie');
    await expect(pie.locator('.recharts-pie-sector')).toHaveCount(4, { timeout: 15_000 });
    const sectorPaths = pie.locator('.recharts-pie-sector path');
    await expect(sectorPaths.first()).toBeVisible();
    await expect(sectorPaths.first()).toHaveAttribute('fill', /.+/);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__categoryDistribution', { atLeast: 1 });

    // 补充断言（出处 §2.8 树）：近 12 月趋势 line 渲染——两条 series 曲线。
    const line = page.getByTestId('itam-depreciation-dashboard-line');
    await expect(line.locator('.recharts-line')).toHaveCount(2, { timeout: 15_000 });
    const curves = line.locator('.recharts-line-curve');
    await expect(curves).toHaveCount(2);
    await expect(curves.nth(0)).toHaveAttribute('stroke', /.+/);
    await expect(curves.nth(1)).toHaveAttribute('stroke', /.+/);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationTrend', { atLeast: 1 });

    // §5 ③ 初始面：预警行数 = 3（i%4===1 ∩ IN_SERVICE → 0001/0013/0025），首行
    // status=IN_SERVICE（在用徽章，success 语义色）。
    const alerts = page.getByTestId('itam-depreciation-dashboard-alerts');
    await expect(alerts.locator('tbody tr')).toHaveCount(3, { timeout: 15_000 });
    await expect(alerts.locator('tbody tr').first()).toContainText('IT-2026-0001');
    await expect(
      alerts.locator('tbody tr').first().locator('[data-slot="status-badge"]'),
    ).toHaveAttribute('data-level', 'success');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationAlerts', { atLeast: 1 });

    // 下载为动作驱动（非 mount 取数）。
    expect(await callCount(page, 'ReplItam__depreciationReport')).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① 期间变更 + 一键刷新 → 5 端点计数各 +1 + KPI 文本更新（2026-09 面）', async ({
    page,
  }) => {
    await openI2(page);

    const before = await readEndpointCalls(page, COUNTERS_KEY);

    await page.getByTestId('itam-depreciation-dashboard-filter-period').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: '2026-09' }).click();
    await page.getByTestId('itam-depreciation-dashboard-refresh').click();

    // D2 §5 ①: 五源计数各 +1（refreshSource 顶层 targetId then 链 ×5）。
    for (const endpoint of I2_ENDPOINTS) {
      await expectEndpointCall(page, COUNTERS_KEY, endpoint, {
        atLeast: (before[endpoint] ?? 0) + 1,
      });
    }

    // KPI 文本更新：2026-09 面。
    const kpiExpectations: Array<[string, string]> = [
      ['itam-depreciation-dashboard-kpi-original', '2,640,000'],
      ['itam-depreciation-dashboard-kpi-accumulated', '1,056,000'],
      ['itam-depreciation-dashboard-kpi-net', '1,584,000'],
      ['itam-depreciation-dashboard-kpi-period', '33,000'],
      ['itam-depreciation-dashboard-kpi-cip', '380,000'],
    ];
    for (const [testid, text] of kpiExpectations) {
      await expect(kpiValue(page, testid)).toHaveText(text, { timeout: 15_000 });
    }
    await assertTrackedPageErrors(page);
  });

  test('交互② 透视首单元格 = mock 聚合值（2026 基线：IT设备×Q1×原值 200000）+ 总计行 Σ 命中', async ({
    page,
  }) => {
    await openI2(page);

    const probe = await probePivot(page, { category: 'IT设备', quarter: 'Q1', indicator: 'originalValue' });
    expect(probe.found, 'IT设备×Q1×originalValue cell must exist').toBe(true);
    expect(probe.cell).toBe(200000);

    // 总计行按列聚合（grand totals, showGrandTotals）：Q1 列三指标 = 各类别
    // Q1 之和（950000 = Σ_c (200000+25000c)；36800 = Σ_c (8000+800c)；
    // 576000 = Σ_c (120000+16000c)）。
    expect(probe.grand).toMatchObject({
      originalValue: 950000,
      periodDepreciation: 36800,
      netBookValue: 576000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationPivot', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastDepreciationPivotYear: '2026' });
    await assertTrackedPageErrors(page);
  });

  test('交互②b 年度过滤变更 → depreciationPivot 重取 +1 + 透视首单元格数据变化（2026→2025）', async ({
    page,
  }) => {
    await openI2(page);

    const before = await callCount(page, 'ReplItam__depreciationPivot');

    await page.getByTestId('itam-depreciation-dashboard-filter-year').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: '2025', exact: true }).click();
    await page.getByTestId('itam-depreciation-dashboard-refresh').click();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationPivot', { atLeast: before + 1 });
    expect(await hooksData(page)).toMatchObject({ lastDepreciationPivotYear: '2025' });

    await expect
      .poll(
        async () =>
          (await probePivot(page, { category: 'IT设备', quarter: 'Q1', indicator: 'originalValue' })).cell,
        { timeout: 15_000 },
      )
      .toBe(100000);
    await assertTrackedPageErrors(page);
  });

  test('交互③ 预警 crud 首行 status=IN_SERVICE + 行操作 dialog 命中行字段（§5 ③）', async ({
    page,
  }) => {
    await openI2(page);

    const alerts = page.getByTestId('itam-depreciation-dashboard-alerts');
    await expect(alerts.locator('tbody tr')).toHaveCount(3, { timeout: 15_000 });
    await expect(alerts.locator('tbody tr').first()).toContainText('IT-2026-0001');
    await expect(
      alerts.locator('tbody tr').first().locator('[data-slot="status-badge"]'),
    ).toHaveAttribute('data-level', 'success');

    // 行操作 dialog（plan 805 M3 预登记补绘）：处置 → dialog 标题/正文命中行记录。
    await alerts.locator('tbody tr').first().getByTestId('itam-depreciation-dashboard-alert-deal').click();
    const dialog = page.getByTestId('itam-depreciation-dashboard-alert-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText('IT-2026-0001');
    await expect(page.getByTestId('itam-depreciation-dashboard-alert-dialog-summary')).toContainText(
      '自 2026-02 起未生成折旧计提记录',
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互④ 导出折旧报表 → download 动作 + depreciationReport +1 + {url,filename} live 形状（G6）', async ({
    page,
  }) => {
    await openI2(page);

    await page.getByTestId('itam-depreciation-dashboard-export').click();

    await expect(page.getByText('折旧报表已生成并开始下载')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationReport', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastDepreciationReportQuery: { report: 'depreciationSummary', format: 'xlsx', year: '2026' },
    });
    // G6 shape: server-built CSV arrives as a data: URL the download action
    // saves directly (built-in-actions download form-3 path, W3/C3 同款).
    const report = (await hooksData(page)).lastDepreciationReportData as
      | { url?: unknown; filename?: unknown; rowCount?: unknown }
      | undefined;
    expect(String(report?.url ?? '')).toMatch(/^data:text\/csv/);
    expect(report?.filename).toBe('depreciation-report-2026-xlsx.csv');
    expect(report?.rowCount).toBe(16);
    await assertTrackedPageErrors(page);
  });

  test('交互④b 非法格式演练 → mock `unsupported format` 分支 → 拒绝 toast', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected download reports through onActionError (console.error) —
    // expected noise (W3 ③b / C3 ④b precedent).
    allowConsoleErrors(1);
    await openI2(page);

    await page.getByTestId('itam-depreciation-dashboard-export-invalid').click();
    await expect(page.getByText('折旧报表导出失败（不支持的格式）')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationReport', { atLeast: 1 });
    // The hook mirror only records SUCCESSFUL reports — the rejected format
    // never publishes a download payload.
    expect((await hooksData(page)).lastDepreciationReportData).toBeUndefined();
  });

  test('focus ① 期间 select 可达（Tab 首站落入期间下拉）', async ({ page }) => {
    await openI2(page);

    const activeInside = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="itam-depreciation-dashboard-root"]');
        if (!active || !root || !root.contains(active)) return null;
        if (active.closest('[data-slot="combobox-trigger"]')) return 'period-filter';
        return active.getAttribute('data-testid') ?? active.tagName;
      });

    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed).toBe('period-filter');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 一键刷新后 activeElement 不逃逸（驻留刷新按钮、留在页根内）', async ({ page }) => {
    await openI2(page);

    const refresh = page.getByTestId('itam-depreciation-dashboard-refresh');
    await refresh.click();
    await expect(refresh).toBeFocused();

    // 刷新级联（五源 then 链）完成后焦点仍不逃逸：activeElement 驻留页根内。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__depreciationAlerts', { atLeast: 2 });
    const focusInsideRoot = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const root = document.querySelector('[data-testid="itam-depreciation-dashboard-root"]');
      return !!active && !!root && root.contains(active);
    });
    expect(focusInsideRoot).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 预警行操作 dialog 焦点入 + Esc 返回触发按钮（§5 focus③，行按钮为可焦 trigger）', async ({
    page,
  }) => {
    await openI2(page);

    const alerts = page.getByTestId('itam-depreciation-dashboard-alerts');
    await expect(alerts.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const deal = alerts.locator('tbody tr').first().getByTestId('itam-depreciation-dashboard-alert-deal');
    await assertDialogFocusRoundTrip(page, deal);
    await assertTrackedPageErrors(page);
  });
});
