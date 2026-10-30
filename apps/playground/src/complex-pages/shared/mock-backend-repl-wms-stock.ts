/**
 * Business-replication WMS mock backend — W3 stock-ledger endpoint subset
 * (plan 800; D2 §4.1 wms module `stock*` / `ledgerReport` / `reconCheck`).
 *
 * Owns the five W3 endpoints as a delegate module: the `/r/ReplWms__` fetcher
 * branch itself stays in `mock-backend-repl-wms.ts` (single endpoint-counter
 * call site per request, 700-line oversized-file gate), and the branch hands
 * unmatched W3 urls over to `handleReplWmsStockBranch`.
 *
 * Endpoints (D2 §4.1 W3 rows):
 * - get `/r/ReplWms__stockLedgerRows` — {items, total}, warehouse exact +
 *   batchNo LIKE filters (the pivot/detail feed, ≥25 multi-dimensional rows).
 * - get `/r/ReplWms__stockKpi`        — {kpis:{...}} (getDashboardKpi
 *   范式: the KPI aggregate map, computed from the same session rows).
 * - get `/r/ReplWms__batchTrace`      — {items, total, matched}; batchNo
 *   miss → empty set face (not an error envelope; waveLines precedent).
 * - get `/r/ReplWms__ledgerReport`    — {url, filename, rowCount} where url
 *   is a `data:text/csv` object the `download` action form-3 path saves
 *   directly (built-in-actions download case); illegal format → status:1
 *   `unsupported format` (G6 error branch).
 * - get `/r/ReplWms__reconCheck`      — {consistent, driftCount, message};
 *   the `forceReconDrift` hook flips it to the drifted face (G7).
 */

import type { ReplWmsTestHooks } from './mock-backend-repl-shared-types';

/* ── W3 entities (D2 §4.1 实体字段) ──────────────────────────────────────── */

export interface ReplWmsStockLedgerRow {
  warehouse: string;
  locationCode: string;
  materialCode: string;
  materialName: string;
  batchNo: string;
  month: string;
  qtyIn: number;
  qtyOut: number;
  qtyBalance: number;
}

export interface ReplWmsMoveRecord {
  moveNo: string;
  direction: 'IN' | 'OUT';
  qty: number;
  occurredAt: string;
}

export interface ReplWmsStockKpis {
  totalInQty: number;
  totalOutQty: number;
  totalBalanceQty: number;
  batchCount: number;
}

export interface ReplWmsLedgerReportData {
  url: string;
  filename: string;
  rowCount: number;
}

export interface ReplWmsReconResult {
  consistent: boolean;
  driftCount: number;
  message: string;
}

const STOCK_LEDGER_ROW_COUNT = 30;
const STOCK_WAREHOUSES = ['WH-A', 'WH-B'];
const STOCK_MONTHS = ['2026-08', '2026-09', '2026-10'];
/** Shared with the W1/W2 fixture pool (same LOCATIONS/SKU_NAMES in the main module). */
const STOCK_LOCATIONS = ['A-01-01', 'A-01-02', 'A-02-01', 'B-02-01', 'B-02-02', 'C-03-01'];
const STOCK_MATERIALS = [
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

/**
 * Deterministic multi-dimensional ledger fixtures (仓库×库位×物料×批次×月份,
 * D2 §4.1 StockLedgerRow). Every field is a pure function of the row index so
 * the e2e can recompute expected aggregates (W2 spec TOTAL_WAVES precedent):
 * qtyIn(i) = 20 + (i % 7) * 5, qtyOut(i) = 4 + (i % 5) * 3,
 * qtyBalance = qtyIn - qtyOut ≥ 4 (never negative).
 */
export function createStockLedgerRows(): ReplWmsStockLedgerRow[] {
  const rows: ReplWmsStockLedgerRow[] = [];
  for (let i = 1; i <= STOCK_LEDGER_ROW_COUNT; i += 1) {
    const materialIndex = (i * 7) % STOCK_MATERIALS.length;
    const qtyIn = 20 + (i % 7) * 5;
    const qtyOut = 4 + (i % 5) * 3;
    rows.push({
      warehouse: STOCK_WAREHOUSES[(i - 1) % STOCK_WAREHOUSES.length],
      locationCode: STOCK_LOCATIONS[(i - 1) % STOCK_LOCATIONS.length],
      materialCode: `MAT-${String(materialIndex + 1).padStart(4, '0')}`,
      materialName: STOCK_MATERIALS[materialIndex],
      batchNo: `B2026-${String(i).padStart(3, '0')}`,
      month: STOCK_MONTHS[i % STOCK_MONTHS.length],
      qtyIn,
      qtyOut,
      qtyBalance: qtyIn - qtyOut,
    });
  }
  return rows;
}

export function buildStockKpis(rows: ReplWmsStockLedgerRow[]): ReplWmsStockKpis {
  return {
    totalInQty: rows.reduce((sum, row) => sum + row.qtyIn, 0),
    totalOutQty: rows.reduce((sum, row) => sum + row.qtyOut, 0),
    totalBalanceQty: rows.reduce((sum, row) => sum + row.qtyBalance, 0),
    batchCount: new Set(rows.map((row) => row.batchNo)).size,
  };
}

/**
 * Batch trace moves (D2 §4.1 MoveRecord): one IN + one OUT move derived from
 * the batch's ledger row, so the drill-through dialog asserts row content
 * against the same deterministic formula.
 */
export function buildBatchTrace(rows: ReplWmsStockLedgerRow[], batchNo: string): ReplWmsMoveRecord[] {
  const row = rows.find((candidate) => candidate.batchNo === batchNo);
  if (!row) {
    return [];
  }
  return [
    {
      moveNo: `MOV-${row.batchNo}-IN`,
      direction: 'IN',
      qty: row.qtyIn,
      occurredAt: `${row.month}-05 09:00`,
    },
    {
      moveNo: `MOV-${row.batchNo}-OUT`,
      direction: 'OUT',
      qty: row.qtyOut,
      occurredAt: `${row.month}-18 15:30`,
    },
  ];
}

/**
 * Server-side report build (G6): the CSV is assembled here (backend-executed
 * export, crud-views-export precedent) and handed over as a `data:text/csv`
 * URL — the runtime `download` action form-3 path saves it without a second
 * network fetch.
 */
export function buildLedgerReport(rows: ReplWmsStockLedgerRow[], format: string): ReplWmsLedgerReportData | null {
  if (format !== 'xlsx' && format !== 'pdf') {
    return null;
  }
  const header = ['warehouse', 'locationCode', 'materialCode', 'materialName', 'batchNo', 'month', 'qtyIn', 'qtyOut', 'qtyBalance'];
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [
    header.join(','),
    ...rows.map((row) => header.map((key) => escape(row[key as keyof ReplWmsStockLedgerRow])).join(',')),
  ].join('\n');
  return {
    url: `data:text/csv;charset=utf-8,${encodeURIComponent(`\ufeff${csv}`)}`,
    filename: `stock-ledger-${format}.csv`,
    rowCount: rows.length,
  };
}

export function buildReconResult(hooks: ReplWmsTestHooks | undefined): ReplWmsReconResult {
  if (hooks?.forceReconDrift === true) {
    return {
      consistent: false,
      driftCount: 3,
      message: '对账发现 3 条批次差异（台账结存 ≠ 实盘结存），请核查 B2026-007 / B2026-014 / B2026-023',
    };
  }
  return { consistent: true, driftCount: 0, message: '台账与库存实盘完全一致，无差异批次' };
}

/* ── Branch delegate ─────────────────────────────────────────────────────── */

export interface ReplWmsStockBranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the wms session state — keeps this delegate module
   * import-clean of `mock-backend-repl-wms.ts` (deps-baseline cycle, plan 820). */
  session: { stockLedgerRows: ReplWmsStockLedgerRow[] };
  hooks: ReplWmsTestHooks | undefined;
}

/**
 * W3 endpoint delegate. Returns null for non-W3 urls so the main branch
 * continues (the endpoint counter stays in the main branch — one count per
 * request, regardless of which module answers it).
 */
export function handleReplWmsStockBranch<T>(
  input: ReplWmsStockBranchInput,
): { status: number; data: T } | null {
  const { url, method, read, body, session, hooks } = input;
  if (method !== 'get') {
    return null;
  }
  const rows = session.stockLedgerRows;

  if (url.includes('/r/ReplWms__stockLedgerRows')) {
    const warehouse = read('warehouse') ?? '';
    const batchNo = read('batchNo') ?? '';
    const filtered = rows.filter(
      (row) => (!warehouse || row.warehouse === warehouse) && (!batchNo || row.batchNo.includes(batchNo)),
    );
    return { status: 0, data: { items: filtered, total: filtered.length } as unknown as T };
  }

  if (url.includes('/r/ReplWms__stockKpi')) {
    return { status: 0, data: { kpis: buildStockKpis(rows) } as unknown as T };
  }

  if (url.includes('/r/ReplWms__batchTrace')) {
    const batchNo = read('batchNo') ?? String(body.batchNo ?? '');
    if (hooks) hooks.lastBatchTraceBatchNo = batchNo;
    const moves = buildBatchTrace(rows, batchNo);
    // D2 §4.1: batchNo miss → empty set + face marker (not an error envelope).
    return { status: 0, data: { items: moves, total: moves.length, matched: moves.length > 0 } as unknown as T };
  }

  if (url.includes('/r/ReplWms__ledgerReport')) {
    const format = read('format') ?? 'xlsx';
    const report = buildLedgerReport(rows, format);
    // Error branch (D2 §4.1 G6): illegal format → failure envelope.
    if (!report) {
      return { status: 1, data: { msg: 'unsupported format' } as unknown as T };
    }
    if (hooks) {
      hooks.lastLedgerReportData = { ...report, format };
    }
    return { status: 0, data: report as unknown as T };
  }

  if (url.includes('/r/ReplWms__reconCheck')) {
    return { status: 0, data: buildReconResult(hooks) as unknown as T };
  }

  return null;
}
