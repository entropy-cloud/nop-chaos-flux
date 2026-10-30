/**
 * Business-replication ITAM mock backend — I2 depreciation-dashboard endpoint
 * subset (plan 805; D2 §4.3 itam table I2 rows). Split from
 * `mock-backend-repl-itam.ts` under the oversized-file gate, same
 * delegate-module pattern as the W3 stock subset
 * (`mock-backend-repl-wms-stock.ts`) and the C3 sales subset
 * (`mock-backend-repl-crm-c3.ts`): the `/r/ReplItam__` fetcher branch itself
 * stays in the main module (single endpoint-counter call site per request),
 * and the branch hands unmatched I2 urls over to `handleReplItamDepreciationBranch`.
 *
 * Endpoints (D2 §4.3 original six I2 names; W3 同族勘误 mandatory-apply):
 * - get `depreciationKpi`      — {kpis:{originalValue, accumulatedDepreciation,
 *                                netBookValue, periodDepreciation, cipBalance}}
 *                                flat map (W3 勘误 9 live lesson, C3 同款: the
 *                                Kpi[] array shape has no expression-
 *                                consumption precedent). Unknown period →
 *                                status:1 `invalid period` (D2 §4.3 error
 *                                branch).
 * - get `depreciationTrend`    — {months, periodDepreciation, accumulated,
 *                                trend}. The three D2 §4.3 arrays are kept
 *                                verbatim; `trend` is the server-side zip face
 *                                ({month, periodDepreciation, accumulated}[]
 *                                — buildDiffFace-style derived view) because
 *                                no registered renderer consumes parallel
 *                                arrays and the formula language has no zip.
 * - get `categoryDistribution` — {items:[{category, value}]}; unknown period
 *                                falls back to the 全部期间 face (D2 §4.3
 *                                defines no error branch here).
 * - get `depreciationPivot`    — {records:PivotRecord[]}; `year` filter ('' =
 *                                全部年度). Unknown year → status:1
 *                                `invalid year` (D2 §4.3 error branch).
 * - get `depreciationAlerts`   — {items:AlertRow[], total}: the IN_SERVICE
 *                                assets without an EXECUTED depreciation move,
 *                                derived from the live asset registry
 *                                (server-derived face) and cloned per request
 *                                (I1 勘误 5: same-reference rows let table
 *                                memos skip the refreshSource re-render).
 * - get `depreciationReport`   — {url, filename, rowCount} (download-action
 *                                live contract: the runtime reads `data.url` —
 *                                W3 勘误 7; D2 §4.3 wrote `{downloadUrl}`,
 *                                live wins). CSV is backend-built from the
 *                                pivot records. format ∉ {xlsx, pdf} →
 *                                status:1 `unsupported format` (D2 §4.3 G6
 *                                error branch).
 *
 * Import-clean of the main module (deps-baseline no-cycle, wms-stock/c3
 * precedent): the asset registry travels in through the structural `session`
 * subset of `ReplItamDepreciationBranchInput`, and the delegate declares its
 * own hooks subset (`ReplItamDepreciationHooks`) — the main module's wider
 * `ReplItamTestHooks` stays structurally assignable to it.
 *
 * Seed math (deterministic, e2e-recomputable):
 * - KPI flat map per period — period-distinct values so the 一键刷新 cascade
 *   assertion observes the KPI text UPDATE (D2 §5 ①), not just the refetch
 *   count. categoryDistribution values sum exactly to the period's
 *   originalValue (类别分布 ⇄ KPI 原值 same source of truth).
 * - trend months '2025-11'..'2026-10' (12 slots); periodDepreciation[i] =
 *   30000 + i*250; accumulated[i] = 950000 + (i+1)*3000.
 * - pivot records: years 2025/2026 × categories ×4 × quarters Q1..Q4 (16
 *   records/year, 32 total). originalValue(y,c,q) = (yIdx+1)*100000 +
 *   cIdx*25000 + qIdx*5000; periodDepreciation = (yIdx+1)*4000 + cIdx*800 +
 *   qIdx*200; accumulated = (yIdx+1)*40000 + cIdx*9000 + qIdx*2500;
 *   netBookValue = originalValue - accumulated. First 2026 cell
 *   (IT设备×Q1×originalValue) = 200000; its 2025 counterpart = 100000.
 * - alerts: assets with i%4===1 (i is the 1-based asset index) that are
 *   IN_SERVICE under the main module's status cycle → i ∈ {1,13,25},
 *   3 rows（closure audit Minor-1 勘误：原注释集合与行数错误）; lastDepreciationPeriod = `2026-${pad((i%8)+1)}`.
 */

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

/** Structural asset-row face consumed by the alerts projection (the full
 * `ReplItamAsset` stays in the main module — keeps this delegate module
 * import-clean of it, deps-baseline no-cycle wms-stock/c3 precedent). */
export interface ReplItamDepreciationAssetFace {
  assetCode: string;
  name: string;
  status: string;
  category: string;
}

/** Filterable periods ('' = 全部期间). Anything else → `invalid period`. */
const DEPRECIATION_PERIODS = ['', '2026-09', '2026-10'] as const;

export interface ReplItamDepreciationKpis {
  originalValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  periodDepreciation: number;
  cipBalance: number;
}

/**
 * KPI flat map per period (D2 §2.8 KPI 阵列: 原值/累计折旧/净值/本期折旧/在建工程).
 */
const DEPRECIATION_KPI_BY_PERIOD: Record<string, ReplItamDepreciationKpis> = {
  '': {
    originalValue: 2860000,
    accumulatedDepreciation: 1144000,
    netBookValue: 1716000,
    periodDepreciation: 35750,
    cipBalance: 420000,
  },
  '2026-09': {
    originalValue: 2640000,
    accumulatedDepreciation: 1056000,
    netBookValue: 1584000,
    periodDepreciation: 33000,
    cipBalance: 380000,
  },
  '2026-10': {
    originalValue: 2750000,
    accumulatedDepreciation: 1100000,
    netBookValue: 1650000,
    periodDepreciation: 34500,
    cipBalance: 400000,
  },
};

/** Category 原值 distribution per period (sums match the period KPI). */
const CATEGORY_DISTRIBUTION_BY_PERIOD: Record<string, Array<{ category: string; value: number }>> = {
  '': [
    { category: 'IT设备', value: 1150000 },
    { category: '网络设备', value: 860000 },
    { category: '办公设备', value: 570000 },
    { category: '外设', value: 280000 },
  ],
  '2026-09': [
    { category: 'IT设备', value: 1060000 },
    { category: '网络设备', value: 800000 },
    { category: '办公设备', value: 530000 },
    { category: '外设', value: 250000 },
  ],
  '2026-10': [
    { category: 'IT设备', value: 1100000 },
    { category: '网络设备', value: 830000 },
    { category: '办公设备', value: 550000 },
    { category: '外设', value: 270000 },
  ],
};

/** Trailing-12-month window (近 12 月趋势). */
const DEPRECIATION_TREND_MONTHS = [
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
] as const;

const DEPRECIATION_TREND_PERIOD = DEPRECIATION_TREND_MONTHS.map((_, i) => 30000 + i * 250);
const DEPRECIATION_TREND_ACCUMULATED = DEPRECIATION_TREND_MONTHS.map((_, i) => 950000 + (i + 1) * 3000);

export interface ReplItamDepreciationPivotRecord {
  year: string;
  quarter: string;
  category: string;
  originalValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  periodDepreciation: number;
}

const PIVOT_YEARS = ['2025', '2026'] as const;
const PIVOT_CATEGORIES = ['IT设备', '网络设备', '办公设备', '外设'] as const;
const PIVOT_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

/** year 非法 → `invalid year` (D2 §4.3); '' = 全部年度. */
const DEPRECIATION_PIVOT_YEARS = ['', ...PIVOT_YEARS] as const;

export function createDepreciationPivotRecords(): ReplItamDepreciationPivotRecord[] {
  const records: ReplItamDepreciationPivotRecord[] = [];
  for (const [yIdx, year] of PIVOT_YEARS.entries()) {
    for (const [cIdx, category] of PIVOT_CATEGORIES.entries()) {
      for (const [qIdx, quarter] of PIVOT_QUARTERS.entries()) {
        const originalValue = (yIdx + 1) * 100000 + cIdx * 25000 + qIdx * 5000;
        const accumulatedDepreciation = (yIdx + 1) * 40000 + cIdx * 9000 + qIdx * 2500;
        records.push({
          year,
          quarter,
          category,
          originalValue,
          accumulatedDepreciation,
          netBookValue: originalValue - accumulatedDepreciation,
          periodDepreciation: (yIdx + 1) * 4000 + cIdx * 800 + qIdx * 200,
        });
      }
    }
  }
  return records;
}

export interface ReplItamDepreciationAlertRow {
  assetCode: string;
  name: string;
  status: 'IN_SERVICE';
  lastDepreciationPeriod: string;
}

/**
 * 折旧未计提预警行集 (D2 §2.8: IN_SERVICE 无 EXECUTED): assets on the
 * i%4===1 missing-run whose live status is IN_SERVICE. Derived from the
 * session registry so the face stays a server projection, cloned per request.
 */
export function buildDepreciationAlerts(assets: ReadonlyArray<ReplItamDepreciationAssetFace>): ReplItamDepreciationAlertRow[] {
  const rows: ReplItamDepreciationAlertRow[] = [];
  assets.forEach((asset, index) => {
    const i = index + 1;
    if (i % 4 !== 1 || asset.status !== 'IN_SERVICE') return;
    rows.push({
      assetCode: asset.assetCode,
      name: asset.name,
      status: 'IN_SERVICE',
      lastDepreciationPeriod: `2026-0${(i % 8) + 1}`,
    });
  });
  return rows;
}

/** Backend-built 折旧报表 CSV (G6, W3 buildLedgerReport precedent). */
function buildDepreciationReportCsv(records: ReadonlyArray<ReplItamDepreciationPivotRecord>): string {
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ['year', 'quarter', 'category', 'originalValue', 'accumulatedDepreciation', 'netBookValue', 'periodDepreciation'];
  return [
    header.join(','),
    ...records.map((row) => header.map((key) => escape(row[key as keyof ReplItamDepreciationPivotRecord])).join(',')),
  ].join('\n');
}

/* ── Branch delegate ─────────────────────────────────────────────────────── */

/** I2 hook surface: the mirrors the delegate writes (the full
 * `ReplItamTestHooks` stays in the main module — structural subset, no
 * import cycle). */
export interface ReplItamDepreciationHooks {
  /** Pivot mirror: last `depreciationPivot` request year (D2 §5 ② 参数命中载体). */
  lastDepreciationPivotYear?: string;
  /** Download mirror: last `depreciationReport` query params (report/format). */
  lastDepreciationReportQuery?: Record<string, unknown>;
  /** Download mirror: last successful `depreciationReport` payload. */
  lastDepreciationReportData?: Record<string, unknown>;
}

export interface ReplItamDepreciationBranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the itam session state — keeps this delegate module
   * import-clean of `mock-backend-repl-itam.ts` (deps-baseline no-cycle,
   * wms-stock/c3 precedent). I2 is a read-only page. */
  session: { assets: ReadonlyArray<ReplItamDepreciationAssetFace> };
  hooks: ReplItamDepreciationHooks | undefined;
}

/** Shared pivot fixture set — pure data, safe to hand out read-only. */
const PIVOT_RECORDS = createDepreciationPivotRecords();

/**
 * I2 endpoint delegate. Returns null for non-I2 urls so the main branch
 * continues (the endpoint counter stays in the main branch — one count per
 * request, regardless of which module answers it).
 */
export function handleReplItamDepreciationBranch<T>(
  input: ReplItamDepreciationBranchInput,
): { status: number; data: T } | null {
  const { url, method, read, session, hooks } = input;
  if (method !== 'get') {
    return null;
  }

  if (url.includes('/r/ReplItam__depreciationKpi')) {
    const period = read('period') ?? '';
    // Error branch (D2 §4.3): unknown period → failure envelope.
    if (!(DEPRECIATION_PERIODS as readonly string[]).includes(period)) {
      return { status: 1, data: { msg: 'invalid period' } as unknown as T };
    }
    return { status: 0, data: { kpis: { ...DEPRECIATION_KPI_BY_PERIOD[period] } } as unknown as T };
  }

  if (url.includes('/r/ReplItam__depreciationTrend')) {
    // Trailing-window face: period-independent, cloned per request (I1 勘误 5).
    return {
      status: 0,
      data: {
        months: [...DEPRECIATION_TREND_MONTHS],
        periodDepreciation: [...DEPRECIATION_TREND_PERIOD],
        accumulated: [...DEPRECIATION_TREND_ACCUMULATED],
        trend: DEPRECIATION_TREND_MONTHS.map((month, i) => ({
          month,
          periodDepreciation: DEPRECIATION_TREND_PERIOD[i],
          accumulated: DEPRECIATION_TREND_ACCUMULATED[i],
        })),
      } as unknown as T,
    };
  }

  if (url.includes('/r/ReplItam__categoryDistribution')) {
    const period = read('period') ?? '';
    const face = CATEGORY_DISTRIBUTION_BY_PERIOD[period] ?? CATEGORY_DISTRIBUTION_BY_PERIOD[''];
    return { status: 0, data: { items: face.map((item) => ({ ...item })) } as unknown as T };
  }

  if (url.includes('/r/ReplItam__depreciationPivot')) {
    const year = read('year') ?? '';
    if (hooks) hooks.lastDepreciationPivotYear = year;
    // Error branch (D2 §4.3): unknown year → failure envelope.
    if (!(DEPRECIATION_PIVOT_YEARS as readonly string[]).includes(year)) {
      return { status: 1, data: { msg: 'invalid year' } as unknown as T };
    }
    const records = (year ? PIVOT_RECORDS.filter((record) => record.year === year) : PIVOT_RECORDS).map(
      (record) => ({ ...record }),
    );
    return { status: 0, data: { records } as unknown as T };
  }

  if (url.includes('/r/ReplItam__depreciationAlerts')) {
    const items = buildDepreciationAlerts(session.assets);
    return { status: 0, data: { items, total: items.length } as unknown as T };
  }

  if (url.includes('/r/ReplItam__depreciationReport')) {
    const format = read('format') ?? 'xlsx';
    const year = read('year') ?? '';
    if (hooks) hooks.lastDepreciationReportQuery = { report: read('report') ?? '', format, year };
    // Error branch (D2 §4.3 G6): illegal format → failure envelope.
    if (format !== 'xlsx' && format !== 'pdf') {
      return { status: 1, data: { msg: 'unsupported format' } as unknown as T };
    }
    const records = year ? PIVOT_RECORDS.filter((record) => record.year === year) : PIVOT_RECORDS;
    const csv = buildDepreciationReportCsv(records);
    const report = {
      url: `data:text/csv;charset=utf-8,${encodeURIComponent(`\ufeff${csv}`)}`,
      filename: `depreciation-report-${year || 'all'}-${format}.csv`,
      rowCount: records.length,
    };
    if (hooks) hooks.lastDepreciationReportData = { ...report };
    return { status: 0, data: report as unknown as T };
  }

  return null;
}
