/**
 * Business-replication CRM mock backend — C3 sales-dashboard endpoint subset
 * (plan 803; D2 §4.2 crm table C3 rows). Split from `mock-backend-repl-crm.ts`
 * under the 700-line oversized-file gate, same delegate-module pattern as the
 * C2 customer-360 subset (`mock-backend-repl-crm-c2.ts`): the `/r/ReplCrm__`
 * fetcher branch itself stays in the main module (single endpoint-counter call
 * site per request), and the branch hands unmatched C3 urls over to the
 * handler that `createReplCrmC3Surface` returns.
 *
 * Endpoints (D2 §4.2 crm table C3 rows; `funnelSummary` is the C1/C3 shared
 * endpoint and stays in the main module):
 * - get `dashboardKpi`      — {kpis:{funnelAmount,conversion,forecastRate,
 *                             quotaRate}} flat map (W3 勘误 9 live lesson: the
 *                             Kpi[] array shape has no expression-consumption
 *                             precedent — W3 landed `{kpis:{...}}` and so does
 *                             C3). Unknown periodId → status:1
 *                             `invalid period` (D2 §4.2 error branch).
 * - get `dashboardTrend`    — {months, amounts, funnelStages:[{name, value}]};
 *                             funnelStages derive from the live session board
 *                             (sequence DESC = funnel order, G1 bar 近似 source).
 * - get `drillRows`         — {items, total} filtered by `month` (the echarts
 *                             onClick drill target, D2 §5 ②); unknown/missing
 *                             month → empty set face (batchTrace precedent,
 *                             not an error envelope).
 * - get `forecastAccuracy`  — {forecast, actual, accuracy}.
 * - get `reportDownload`    — {url, filename} (download-action live contract:
 *                             the runtime reads `data.url` — W3 勘误 7; D2
 *                             §4.2 wrote `{downloadUrl}`, live wins). The CSV
 *                             is backend-built from the session stages. 
 *                             Unknown report → status:1 `unknown report`
 *                             (D2 §4.2 G6 error branch).
 *
 * Import-clean of the main module (deps-baseline no-cycle, C2/wms-stock
 * precedent): the shared C1 name pools arrive via `createReplCrmC3Surface`,
 * and the board state travels in through the structural `session` subset of
 * `ReplCrmC3BranchInput`.
 */

/* ── Delegate input (structural subsets, c2/wms-stock pattern) ──────────── */

/** C3 hook surface: the two mirror writes are the only hooks the delegate
 * touches (the full `ReplCrmTestHooks` stays in the main module). */
export interface ReplCrmC3Hooks {
  /** Drill mirror: last `drillRows` request month (D2 §5 ② 参数命中载体). */
  lastDrillRowsMonth?: string;
  /** Download mirror: last `reportDownload` query params (report/format). */
  lastReportDownloadQuery?: Record<string, unknown>;
}

export interface ReplCrmC3BranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the crm session state — keeps this delegate module
   * import-clean of `mock-backend-repl-crm.ts` (deps-baseline cycle, c2
   * precedent). Mutations are out of scope for C3 (read-only page). */
  session: {
    stages: ReadonlyArray<{ id: string; name: string; sequence: number }>;
    leads: ReadonlyArray<{ stageId: string; expectedRevenue: number }>;
  };
  hooks: ReplCrmC3Hooks | undefined;
}

/** Name pools shared with the C1 fixture pool (passed in, not imported). */
export interface ReplCrmC3SurfaceInput {
  customers: readonly string[];
  owners: readonly string[];
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

/** Trend months (echarts line x categories AND the drill month domain). */
export const C3_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] as const;

/** Line amounts ladder (万元), index-aligned with C3_MONTHS. */
const C3_TREND_AMOUNTS = [320, 450, 380, 510, 460, 590];

/** Filterable periods ('' = 全部). Anything else → `invalid period`. */
const C3_PERIODS = ['', '2026-08', '2026-09', '2026-10'] as const;

/**
 * KPI flat map per period (D2 §2.6 KPI 阵列: 漏斗总额/转化率/预测达成/配额完成).
 * Period-distinct values so the 查询 cascade assertion can observe the KPI
 * text UPDATE (D2 §5 ①), not just the refetch count.
 */
const C3_KPI_BY_PERIOD: Record<string, { funnelAmount: number; conversion: number; forecastRate: number; quotaRate: number }> = {
  '': { funnelAmount: 1950, conversion: 32, forecastRate: 86, quotaRate: 92 },
  '2026-08': { funnelAmount: 580, conversion: 28, forecastRate: 84, quotaRate: 90 },
  '2026-09': { funnelAmount: 720, conversion: 35, forecastRate: 89, quotaRate: 96 },
  '2026-10': { funnelAmount: 650, conversion: 33, forecastRate: 85, quotaRate: 93 },
};

const C3_FORECAST_ACCURACY = { forecast: 2400, actual: 2064, accuracy: 86 };

const C3_DRILL_STAGES = ['需求确认', '方案报价', '商务谈判'];

/** Drill rows for month index k: k+1 rows (2026-05 → 1 … 2026-10 → 6), so the
 * dialog row count itself is month-dependent evidence. */
function drillRowsFor(monthIndex: number, input: ReplCrmC3SurfaceInput): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const month = C3_MONTHS[monthIndex];
  for (let i = 0; i <= monthIndex; i += 1) {
    rows.push({
      dealNo: `DL-${month}-${i + 1}`,
      customerName: `${input.customers[(monthIndex + i) % input.customers.length]}·D${monthIndex + 1}${i + 1}`,
      stageName: C3_DRILL_STAGES[(monthIndex + i) % C3_DRILL_STAGES.length],
      amount: 60 + ((monthIndex * 17 + i * 23) % 140),
      ownerName: input.owners[(monthIndex + i) % input.owners.length],
      closeDate: `${month}-${String(12 + i * 3).padStart(2, '0')}`,
    });
  }
  return rows;
}

/** Backend-built stage report CSV (G6, W3 buildLedgerReport precedent): the
 * server assembles the file and hands over a data: URL the download action
 * saves directly. */
function buildStageReportCsv(
  session: ReplCrmC3BranchInput['session'],
): string {
  const totalLeads = session.leads.length;
  const rows = session.stages
    .slice()
    .sort((a, b) => b.sequence - a.sequence)
    .map((stage) => {
      const stageLeads = session.leads.filter((lead) => lead.stageId === stage.id);
      const amount = stageLeads.reduce((sum, lead) => sum + lead.expectedRevenue, 0);
      const conversion = totalLeads === 0 ? 0 : Math.round((stageLeads.length / totalLeads) * 100);
      return [stage.name, String(stageLeads.length), String(amount), `${conversion}%`];
    });
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [
    '阶段,商机数,金额（万元）,转化率',
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');
}

/* ── Module export ──────────────────────────────────────────────────────── */

export interface ReplCrmC3Surface {
  /** C3 endpoint delegate. Returns null for non-C3 urls so the main branch
   * continues (the endpoint counter stays in the main branch — one count per
   * request, regardless of which module answers it). */
  handleBranch<T>(branch: ReplCrmC3BranchInput): { status: number; data: T } | null;
}

export function createReplCrmC3Surface(input: ReplCrmC3SurfaceInput): ReplCrmC3Surface {
  return {
    handleBranch<T>(branch: ReplCrmC3BranchInput): { status: number; data: T } | null {
      const { url, method, read, session, hooks } = branch;
      if (method !== 'get') {
        return null;
      }

      if (url.includes('/r/ReplCrm__dashboardKpi')) {
        const periodId = read('periodId') ?? '';
        // Error branch (D2 §4.2): unknown periodId → failure envelope.
        if (!(C3_PERIODS as readonly string[]).includes(periodId)) {
          return { status: 1, data: { msg: 'invalid period' } as unknown as T };
        }
        return { status: 0, data: { kpis: C3_KPI_BY_PERIOD[periodId] } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__dashboardTrend')) {
        // Funnel stages derive from the live board: sequence DESC = funnel
        // order (G1 bar 近似, same ordering rule as funnelSummary in the main
        // module).
        const funnelStages = session.stages
          .slice()
          .sort((a, b) => b.sequence - a.sequence)
          .map((stage) => ({
            name: stage.name,
            value: session.leads
              .filter((lead) => lead.stageId === stage.id)
              .reduce((sum, lead) => sum + lead.expectedRevenue, 0),
          }));
        return {
          status: 0,
          data: { months: [...C3_MONTHS], amounts: [...C3_TREND_AMOUNTS], funnelStages } as unknown as T,
        };
      }

      if (url.includes('/r/ReplCrm__drillRows')) {
        const month = read('month') ?? String(branch.body.month ?? '');
        if (hooks) hooks.lastDrillRowsMonth = month;
        const monthIndex = (C3_MONTHS as readonly string[]).indexOf(month);
        // D2 §4.2: name miss → empty set face (not an error envelope).
        const items = monthIndex === -1 ? [] : drillRowsFor(monthIndex, input);
        return { status: 0, data: { items, total: items.length } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__forecastAccuracy')) {
        return { status: 0, data: { ...C3_FORECAST_ACCURACY } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__reportDownload')) {
        const report = read('report') ?? '';
        const format = read('format') ?? 'xlsx';
        if (hooks) hooks.lastReportDownloadQuery = { report, format };
        // Error branch (D2 §4.2 G6): unknown report → failure envelope.
        if (report !== 'stageFunnel') {
          return { status: 1, data: { msg: 'unknown report' } as unknown as T };
        }
        const csv = buildStageReportCsv(session);
        return {
          status: 0,
          data: {
            url: `data:text/csv;charset=utf-8,${encodeURIComponent(`\ufeff${csv}`)}`,
            filename: `sales-report-${format}.csv`,
          } as unknown as T,
        };
      }

      return null;
    },
  };
}
