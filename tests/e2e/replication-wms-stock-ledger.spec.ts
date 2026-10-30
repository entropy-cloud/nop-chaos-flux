import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 800 — W3 WMS 库存台账页 focused e2e (D2 §5 W3 断言清单 ①-④ + G7 对账
// 不一致态切换 + focus ①-③). Pillar one (programmatic interactions,
// __replWmsCalls evidence) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A single registration — W3 is a desktop
// page, pure JSON SchemaPage, no host override).
//
// G7 (D2 §2.3 对账提示): the recon banner reads the reconCheck source; the
// forceReconDrift hook is read at FETCH time, so flipping it mid-session and
// clicking 重新对账 (refreshSource) must switch the banner success→error.
//
// Cell-click param chain (D2 §2.3 fragment, live-completed): pivot:cell-click
// payload → setValue traceBatchNo (cellHeaderPaths.rowHeaderPaths[3].value,
// batchNo is the leaf row dimension) → then refreshSource batchTrace (fetch
// params re-evaluate with the new value) → then openDialog 批次追溯. The chain
// is asserted end-to-end: request param (lastBatchTraceBatchNo hook), dialog
// title (page-scope expression), and trace rows (batch-derived mock data).

const COUNTERS_KEY = '__replWmsCalls';
const HOOKS_KEY = '__replWmsTestHooks';
const PIVOT_INSTANCE_KEY = '__flux_pivot_wms-stock-ledger-pivot';

/** Fixture math mirrors mock-backend-repl-wms-stock.ts createStockLedgerRows. */
const TOTAL_ROWS = 30;
const MONTHS = ['2026-08', '2026-09', '2026-10'];
const MATERIALS = [
  '蓝牙网关',
  '温湿度传感器',
  '条码扫描枪',
  '工业平板',
  'RFID 标签包',
  '货架标签卷',
  '托盘感应器',
  '门磁报警器',
  '盘点终端',
  '充电底座',
];

function ledgerRow(i: number) {
  const qtyIn = 20 + (i % 7) * 5;
  const qtyOut = 4 + (i % 5) * 3;
  return {
    warehouse: i % 2 === 1 ? 'WH-A' : 'WH-B',
    materialName: MATERIALS[(i * 7) % MATERIALS.length],
    batchNo: `B2026-${String(i).padStart(3, '0')}`,
    month: MONTHS[i % 3],
    qtyIn,
    qtyOut,
    qtyBalance: qtyIn - qtyOut,
  };
}

/** Σ qtyIn = 1035, split per month column: 2026-09 → 330, 2026-10 → 345, 2026-08 → 360
 * (the grand-total row aggregates per COLUMN — one cell per month × indicator). */
const GRAND_QTY_IN_BY_MONTH = [330, 345, 360];
const ROW1 = ledgerRow(1); // first WH-A record → first pivot leaf (B2026-001)
/** Filter batch: row 15 → WH-A/A-02-01/货架标签卷/B2026-015/2026-08, qtyIn 25. */
const FILTER_ROW = ledgerRow(15);

interface PivotHeaderPath {
  dimensionKey?: string;
  value?: string;
  indicatorKey?: string;
}

interface PivotGrandProbe {
  colCount: number;
  layoutRows: number;
  grandRow: number;
  firstLeafRow: number;
  firstLeafBatch: string | number | null;
  grandQtyIn: number[];
}

/**
 * Layout scan over the exposed VTable instance (pivot-table-demo.spec.ts
 * precedent: body starts at row 2, col 0..3 are the row-dimension headers,
 * data columns start at col 4; leaf cells carry the batchNo at col 3).
 */
async function probePivot(page: Page): Promise<PivotGrandProbe> {
  return page.evaluate((instanceKey) => {
    const instance = (window as unknown as Record<string, { instance?: {
      colCount: number;
      rowCount: number;
      getLayoutRowTreeCount: () => number;
      getCellValue: (col: number, row: number) => string | number | null;
      getCellHeaderPaths: (col: number, row: number) => {
        colHeaderPaths?: PivotHeaderPath[];
        rowHeaderPaths?: PivotHeaderPath[];
      };
    } | undefined }>)[instanceKey]?.instance;
    if (!instance) {
      throw new Error('pivot instance not exposed');
    }
    const rows = instance.getLayoutRowTreeCount();
    let firstLeafRow = -1;
    let grandRow = -1;
    // getLayoutRowTreeCount counts BODY rows (33 = 30 leaves + 2 subtotals +
    // 1 grand total); the absolute table rows add the 2 header rows, so the
    // scan bound is instance.rowCount (= 35 here).
    for (let row = 2; row < instance.rowCount; row += 1) {
      const batch = instance.getCellValue(3, row);
      if (firstLeafRow === -1 && batch !== null && String(batch).startsWith('B2026-')) {
        firstLeafRow = row;
      }
      const dim0 = instance.getCellValue(0, row);
      if (grandRow === -1 && dim0 === '总计') {
        grandRow = row;
      }
    }
    // Grand-total row × every qtyIn data column carries Σ qtyIn (one entry
    // per month column when several months are mounted).
    const grandQtyIn: number[] = [];
    if (grandRow >= 0) {
      for (let col = 4; col < instance.colCount; col += 1) {
        const paths = instance.getCellHeaderPaths(col, grandRow);
        if (paths.colHeaderPaths?.[1]?.indicatorKey === 'qtyIn') {
          const value = instance.getCellValue(col, grandRow);
          if (value !== null) grandQtyIn.push(Number(value));
        }
      }
    }
    return {
      colCount: instance.colCount,
      layoutRows: rows,
      grandRow,
      firstLeafRow,
      firstLeafBatch: firstLeafRow >= 0 ? instance.getCellValue(3, firstLeafRow) : null,
      grandQtyIn,
    };
  }, PIVOT_INSTANCE_KEY);
}
/** First-leaf anchor detail: batchNo + month×qtyIn header paths + cell value. */
async function probeFirstLeaf(page: Page): Promise<{
  batch: string | number | null;
  month: string | undefined;
  indicator: string | undefined;
  rowPathLen: number;
  value: number | null;
}> {
  return page.evaluate((instanceKey) => {
    const instance = (window as unknown as Record<string, { instance?: {
      getCellValue: (col: number, row: number) => string | number | null;
      getCellHeaderPaths: (col: number, row: number) => {
        colHeaderPaths?: PivotHeaderPath[];
        rowHeaderPaths?: PivotHeaderPath[];
      };
    } | undefined }>)[instanceKey]?.instance;
    if (!instance) {
      throw new Error('pivot instance not exposed');
    }
    const row = 2;
    const paths = instance.getCellHeaderPaths(4, row);
    const value = instance.getCellValue(4, row);
    return {
      batch: instance.getCellValue(3, row),
      month: paths.colHeaderPaths?.[0]?.value,
      indicator: paths.colHeaderPaths?.[1]?.indicatorKey,
      rowPathLen: paths.rowHeaderPaths?.length ?? 0,
      value: value === null ? null : Number(value),
    };
  }, PIVOT_INSTANCE_KEY);
}

/** Locate the qtyIn data cell of `batchNo`'s leaf row and real-mouse-click it. */
async function clickPivotBatchCell(page: Page, batchNo: string): Promise<void> {
  await page.locator('[data-testid="wms-stock-ledger-pivot"]').scrollIntoViewIfNeeded();
  const point = await page.evaluate(
    ({ instanceKey, targetBatch }) => {
      const instance = (window as unknown as Record<string, { instance?: {
        colCount: number;
        getLayoutRowTreeCount: () => number;
        getCellValue: (col: number, row: number) => string | number | null;
        getCellHeaderPaths: (col: number, row: number) => {
          colHeaderPaths?: PivotHeaderPath[];
        };
        getCellRect: (col: number, row: number) => { left: number; top: number; width: number; height: number };
      } | undefined }>)[instanceKey]?.instance;
      if (!instance) {
        throw new Error('pivot instance not exposed');
      }
      const rows = instance.getLayoutRowTreeCount();
      for (let row = 2; row < rows; row += 1) {
        if (instance.getCellValue(3, row) !== targetBatch) continue;
        for (let col = 4; col < instance.colCount; col += 1) {
          if (instance.getCellHeaderPaths(col, row).colHeaderPaths?.[1]?.indicatorKey !== 'qtyIn') continue;
          const canvas = document.querySelector('[data-testid="wms-stock-ledger-pivot"] canvas');
          if (!canvas) throw new Error('pivot canvas not found');
          const box = canvas.getBoundingClientRect();
          const rect = instance.getCellRect(col, row);
          return { x: box.left + rect.left + rect.width / 2, y: box.top + rect.top + rect.height / 2 };
        }
      }
      return null;
    },
    { instanceKey: PIVOT_INSTANCE_KEY, targetBatch: batchNo },
  );
  expect(point, `pivot leaf row for ${batchNo} with a qtyIn column must exist`).toBeTruthy();
  await page.mouse.click(point!.x, point!.y);
  await page.waitForTimeout(300);
}

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replWmsTestHooks ?? {},
  );
}

test.describe('W3 WMS 库存台账页 (#/complex-pages/wms-stock-ledger)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function openW3(page: Page): Promise<void> {
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await openReplicationPage(page, 'wms-stock-ledger', {
      title: 'WMS 库存台账页',
    });
    await expect(
      page.locator('[data-testid="wms-stock-ledger-pivot"] [data-slot="pivot-canvas"] canvas').first(),
    ).toBeAttached({ timeout: 30_000 });
    await expect
      .poll(async () => await page.evaluate((key) => !!(window as unknown as Record<string, unknown>)[key], PIVOT_INSTANCE_KEY))
      .toBe(true);
  }

  test('前置：pivot 四维透视渲染 + 行列维/聚合值抽验 + KPI 四 tile = stockKpi 值 + 明细 30 行', async ({
    page,
  }) => {
    await openW3(page);

    const probe = await probePivot(page);
    // 4 row dimensions + 3 months × 3 indicators = 13 columns; 30 leaves +
    // 2 WH subtotals + 1 grand total = 33 body rows.
    expect(probe.colCount).toBe(13);
    expect(probe.layoutRows).toBe(33);

    // Aggregation spot-checks: first leaf = row 1 (B2026-001) with its own
    // qtyIn on the month×qtyIn column.
    const leaf = await probeFirstLeaf(page);
    expect(leaf.batch).toBe(ROW1.batchNo);
    expect(leaf.month).toBe(ROW1.month);
    expect(leaf.indicator).toBe('qtyIn');
    expect(leaf.rowPathLen).toBe(4);
    expect(leaf.value).toBe(ROW1.qtyIn);

    expect(probe.firstLeafBatch).toBe(ROW1.batchNo);
    expect(probe.grandRow).toBeGreaterThan(0);
    expect(probe.grandQtyIn).toEqual(GRAND_QTY_IN_BY_MONTH);

    // KPI tiles read the stockKpi aggregate map (1,035 / 300 / 735 / 30).
    const kpiExpectations: Array<[string, string]> = [
      ['wms-stock-ledger-kpi-in', '1,035'],
      ['wms-stock-ledger-kpi-out', '300'],
      ['wms-stock-ledger-kpi-balance', '735'],
      ['wms-stock-ledger-kpi-batches', '30'],
    ];
    for (const [testid, text] of kpiExpectations) {
      await expect(page.getByTestId(testid).locator('[data-slot="stat-tile-value"]')).toHaveText(text, {
        timeout: 15_000,
      });
    }

    // Detail table mirrors the raw ledger rows; batchTrace is NOT fetched
    // before a cell click (initFetch: false — the drill fetch belongs to the
    // click chain only).
    await expect(page.getByTestId('wms-stock-ledger-detail-table').locator('tbody tr')).toHaveCount(TOTAL_ROWS, {
      timeout: 15_000,
    });
    const calls = await readEndpointCalls(page, COUNTERS_KEY);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__stockLedgerRows', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__stockKpi', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__reconCheck', { atLeast: 1 });
    expect(calls['ReplWms__batchTrace'] ?? 0).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① 批次过滤 → stockLedgerRows 重取 +1，透视首行值变化、明细表收缩、总计按过滤集重算', async ({
    page,
  }) => {
    await openW3(page);

    const rowsBefore = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__stockLedgerRows'] ?? 0;
    await page.getByTestId('wms-stock-ledger-filter-batch').locator('input').fill(FILTER_ROW.batchNo);

    // dependsOn ledgerFilter → the source refetches with batchNo=B2026-015.
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__stockLedgerRows', {
      atLeast: rowsBefore + 1,
    });

    // Detail table collapses to the single matching row.
    await expect(page.getByTestId('wms-stock-ledger-detail-table').locator('tbody tr')).toHaveCount(1, {
      timeout: 15_000,
    });

    // D2 §5 ①: the pivot FIRST leaf row changes (B2026-001 → B2026-015) and
    // the grand total recomputes over the filtered set (25).
    await expect
      .poll(async () => (await probePivot(page)).firstLeafBatch, { timeout: 15_000 })
      .toBe(FILTER_ROW.batchNo);
    await expect
      .poll(async () => (await probePivot(page)).grandQtyIn, { timeout: 15_000 })
      .toEqual([FILTER_ROW.qtyIn]);    await assertTrackedPageErrors(page);
  });

  test('交互② pivot:cell-click → 参数链 setValue→refreshSource→openDialog：请求参数、dialog 标题、追溯行全链命中', async ({
    page,
  }) => {
    await openW3(page);

    await clickPivotBatchCell(page, ROW1.batchNo);

    // Chain step 2 evidence: the batchTrace fetch carried the clicked batchNo.
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__batchTrace', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastBatchTraceBatchNo: ROW1.batchNo });

    // Chain step 3: the drill dialog title evaluated the page-scope variable.
    const dialog = page.getByTestId('wms-stock-ledger-trace-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText(`批次追溯 ${ROW1.batchNo}`);

    // Dialog table renders the batch-derived move records (IN + OUT).
    const traceTable = page.getByTestId('wms-stock-ledger-trace-table');
    await expect(traceTable.locator('tbody tr')).toHaveCount(2, { timeout: 10_000 });
    await expect(traceTable).toContainText(`MOV-${ROW1.batchNo}-IN`);
    await expect(traceTable).toContainText(String(ROW1.qtyIn));
    await expect(traceTable).toContainText(`MOV-${ROW1.batchNo}-OUT`);
    await expect(traceTable).toContainText(String(ROW1.qtyOut));

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互③ 导出台账报表 → download 动作 + ledgerReport +1，downloadUrl 形状命中（G6）', async ({
    page,
  }) => {
    await openW3(page);

    await page.getByTestId('wms-stock-ledger-export').click();

    await expect(page.getByText('台账报表已生成并开始下载')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__ledgerReport', { atLeast: 1 });

    // G6 shape: the server-built CSV arrives as a data: URL the download
    // action saves directly (built-in-actions download form-3 path).
    const report = (await hooksData(page)).lastLedgerReportData as
      | { url?: unknown; filename?: unknown; rowCount?: unknown }
      | undefined;
    expect(String(report?.url ?? '')).toMatch(/^data:text\/csv/);
    expect(report?.filename).toBe('stock-ledger-xlsx.csv');
    expect(report?.rowCount).toBe(TOTAL_ROWS);
    await assertTrackedPageErrors(page);
  });

  test('交互③b 导出非法格式 → mock unsupported format 分支 → 拒绝 toast', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Expected rejection noise: the failed download action reports through
    // onActionError (W1 ②b / W2 ② precedent).
    allowConsoleErrors(1);
    await openW3(page);

    await page.getByTestId('wms-stock-ledger-export-invalid').click();
    await expect(page.getByText('台账报表导出失败（不支持的格式）')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__ledgerReport', { atLeast: 1 });
    // The hook mirror only records SUCCESSFUL reports — the rejected format
    // never publishes a download payload.
    expect((await hooksData(page)).lastLedgerReportData).toBeUndefined();
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejection's console entry.
  });

  test('交互④（G7）对账提示渲染 + forceReconDrift 钩子切换不一致态', async ({ page }) => {
    await openW3(page);

    // Initial face: reconCheck consistent → success badge + 一致 message.
    const badge = page
      .getByTestId('wms-stock-ledger-recon-status')
      .locator('[data-slot="status-badge"]');
    await expect(badge).toHaveAttribute('data-level', 'success', { timeout: 15_000 });
    await expect(page.getByTestId('wms-stock-ledger-recon-status')).toContainText('账实一致');
    await expect(page.getByTestId('wms-stock-ledger-recon-message')).toContainText('完全一致');

    const before = (await readEndpointCalls(page, COUNTERS_KEY))['ReplWms__reconCheck'] ?? 0;

    // The hook is read at fetch time: flip it, then refresh the source.
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replWmsTestHooks;
      if (hooks) hooks.forceReconDrift = true;
    });
    await page.getByTestId('wms-stock-ledger-recon-refresh').click();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__reconCheck', { atLeast: before + 1 });
    await expect(badge).toHaveAttribute('data-level', 'error', { timeout: 15_000 });
    await expect(page.getByTestId('wms-stock-ledger-recon-status')).toContainText('账实不平');
    await expect(page.getByTestId('wms-stock-ledger-recon-message')).toContainText('3 条批次差异');

    // The badge face flips success → destructive semantics (Tailwind v4 renders
    // oklch, so the color assertion keys on the semantic utility classes).
    await expect(badge).toHaveClass(/text-destructive/);
    await assertTrackedPageErrors(page);
  });

  test('focus ① 过滤区首控件可达（Tab 首站落入仓库下拉）', async ({ page }) => {
    await openW3(page);

    const activeInside = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="wms-stock-ledger-root"]');
        if (!active || !root || !root.contains(active)) return null;
        if (active.closest('[data-slot="combobox-trigger"]')) return 'warehouse-filter';
        return active.getAttribute('data-testid') ?? active.tagName;
      });

    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed).toBe('warehouse-filter');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 追溯 dialog 焦点入面板、Esc 关闭', async ({ page }) => {
    await openW3(page);

    await clickPivotBatchCell(page, ROW1.batchNo);
    const dialog = page.getByTestId('wms-stock-ledger-trace-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Focus lands inside the opened dialog surface (Base UI focuses the popup
    // or its first focusable) — assertDialogFocusRoundTrip's first half; the
    // canvas cell click is not a focusable trigger, so the return-leg asserts
    // focus moved back into the document instead of onto the trigger.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const surfaces = document.querySelectorAll('[data-slot="dialog-surface"]');
          const top = surfaces[surfaces.length - 1];
          const active = document.activeElement;
          return !!top && !!active && (active === top || top.contains(active));
        }),
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const focusBackInDocument = await page.evaluate(
      () => !!document.activeElement && document.activeElement !== document.body,
    );
    expect(focusBackInDocument).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 导出按钮键盘可达，Enter 触发导出', async ({ page }) => {
    await openW3(page);

    const exportButton = page.getByTestId('wms-stock-ledger-export');
    await exportButton.focus();
    await expect(exportButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText('台账报表已生成并开始下载')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplWms__ledgerReport', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });
});
