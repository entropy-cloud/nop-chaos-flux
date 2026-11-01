/**
 * Business-replication MES mock backend (plan 809; D3 §4.1 one-domain-one-
 * fetcher-surface — `/r/ReplMes__*`). M1 (mes-shopfloor-board) ships the M1
 * subset of the D3 §4.4 mes endpoint table: ONE aggregate read endpoint,
 * `dashboardKpi` (评审 MAJ-3 erratum: the M1 page has no 组态 endpoint — the
 * scada canvas is static injection via PAGE_DATA — so the KPI/trend/abnormality/
 * downtime aggregate is the single endpoint the whole page consumes).
 *
 * Endpoint:
 * - get `dashboardKpi` — single flat object `{planned, completed, scrapped,
 *   completionRate, *Delta, plannedSpark, trendLabels, trendOutputs, trend24h,
 *   abnormalities, abnormalityTexts, downtimes, downtimeMinutes, phase}`
 *   (§4.5 ReplMesDashboardKpi shape; `trendLabels`/`trendOutputs` are the
 *   echarts-ready projections of `trend24h`, `abnormalityTexts` is the
 *   notice-bar carousel text array). Error branch: `__replMesTestHooks.
 *   failNextMutation` (D3 §4.6 given name; its only M1 consumer is this GET —
 *   consume-once) flips the read to `{status:1, msg:'KPI_UNAVAILABLE'}`.
 *
 * Polling second-face mechanism (评审 MIN-1): the handler advances a PHASE
 * counter per fetch WAVE and returns phase-N data — phase 1 is the initFetch
 * first frame, phase 2 is what the 15s interval (or the page's 手动刷新
 * button → refreshSource) observes. All fixtures are deterministic
 * pure functions of the phase index (D1 §2 L49: no runtime random drift); the
 * KPI numbers are chosen so phase 1 → 1,020/85.0% and phase 2 → 1,056/88.0%
 * give the e2e exact thousand-formatted / decimals-1 faces to assert.
 *
 * Opt-in e2e observation: specs pre-create `window.__replMesCalls` +
 * `window.__replMesTestHooks` via addInitScript; production never sets them,
 * so both stay no-ops (replica-kit precedent).
 *
 * Plan 810 (M2 mes-work-reporting): the write-side subset — `jobCardFindPage` /
 * `jobCardMutation` / `reportWork` — lives in mock-backend-repl-mes-reporting.ts
 * and is delegated below (W2→stock split precedent). Plan 811 (M3
 * mes-andon-material): the andon subset — `andonFindPage` / `andonCreate` /
 * `andonEscalate` / `materialIssueUpdate` / `uploadAndonPhoto` — lives in
 * mock-backend-repl-mes-andon.ts and is delegated the same way. The
 * `__replMesTestHooks` global is shared; the M2/M3 hook surfaces are declared
 * in their modules and merged into `ReplMesTestHooks` here.
 */

import {
  createEndpointCounter,
  createUrlParamReader,
  readOptInHooks,
  withOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';
import {
  createReplMesReportingSession,
  handleReplMesReportingBranch,
  type ReplMesReportingTestHooks,
} from './mock-backend-repl-mes-reporting';
import {
  createReplMesAndonSession,
  handleReplMesAndonBranch,
  type ReplMesAndonTestHooks,
} from './mock-backend-repl-mes-andon';

/* ── Opt-in hooks ───────────────────────────────────────────────────────── */

export interface ReplMesTestHooks extends ReplMesReportingTestHooks, ReplMesAndonTestHooks {
  /** Consume-once: the NEXT `dashboardKpi` read returns the
   * `KPI_UNAVAILABLE` failure envelope (D3 §4.4 error branch); later calls
   * succeed again so interval polling self-heals. Name follows D3 §4.6
   * verbatim (`failNextMutation` — no MES mutation endpoint existed in the
   * M1 subset; plan 810 adds the M2 write faces + their own hook surface,
   * declared in ReplMesReportingTestHooks). */
  failNextMutation?: boolean;
}

function readReplMesTestHooks(): ReplMesTestHooks | undefined {
  return readOptInHooks<ReplMesTestHooks>('__replMesTestHooks');
}

/* ── Deterministic fixtures (pure functions of the phase index) ─────────── */

export interface ReplMesAbnormality {
  id: string;
  type: string;
  station: string;
  level: 'critical' | 'warning';
  /** Trend x-category this abnormality belongs to (drill filter key). */
  hour: string;
  raisedLabel: string;
  message: string;
}

export interface ReplMesDowntime {
  id: string;
  device: string;
  reason: string;
  startedLabel: string;
  durationMins: number;
  statusLabel: '进行中' | '已完成';
}

/** `planned` is the invariant denominator; `completed` advances 36/phase so
 * phase 1 = 1,020 (85.0%) and phase 2 = 1,056 (88.0%). */
export const MES_PLANNED = 1200;
const MES_COMPLETED_BASE = 1020;
const MES_COMPLETED_STEP = 36;
const MES_SCRAPPED_BASE = 30;
const MES_SCRAPPED_STEP = 6;

/** 24h × 48 half-hour grid (D3 §4.5 trend24h), deterministic ladder. */
const TREND_POINTS = 48;

function trendLabel(i: number): string {
  const minutes = i * 30;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function trendOutput(i: number, phase: number): number {
  return 18 + Math.round(10 * Math.sin(i / 5)) + ((i * 7) % 9) + (phase - 1) * 4;
}

/** Unclosed abnormalities are phase-invariant (alarms persist across polls);
 * two of them share hour `08:00` so the §5.4 drill row count (2) differs from
 * the total (4) — the drill dialog row count is hour-dependent evidence. */
const MES_ABNORMALITIES: readonly ReplMesAbnormality[] = [
  { id: 'AB-2301', type: '设备报警', station: 'SMT-01 贴片线', level: 'critical', hour: '08:00', raisedLabel: '08:00', message: '供料器卡料，停机待处理' },
  { id: 'AB-2302', type: '质量预警', station: 'AOI-02 检测站', level: 'warning', hour: '08:00', raisedLabel: '08:12', message: '焊点偏移率超阈值' },
  { id: 'AB-2303', type: '设备报警', station: 'CNC-05 加工中心', level: 'critical', hour: '14:30', raisedLabel: '14:30', message: '主轴温度超限报警' },
  { id: 'AB-2304', type: '物料短缺', station: 'ASM-03 组装线', level: 'warning', hour: '21:00', raisedLabel: '21:05', message: '端子料料位低于安全库存' },
];

const MES_DOWNTIMES: readonly ReplMesDowntime[] = [
  { id: 'DT-0901', device: '注塑机 IM-02', reason: '模具更换', startedLabel: '09:12', durationMins: 45, statusLabel: '进行中' },
  { id: 'DT-1104', device: '输送线 CV-07', reason: '光电故障', startedLabel: '11:40', durationMins: 18, statusLabel: '进行中' },
  { id: 'DT-0602', device: '空压机 AC-01', reason: '计划保养', startedLabel: '06:00', durationMins: 120, statusLabel: '已完成' },
];

/** In-progress downtime minutes only (已完成 maintenance is not 当前停机). */
function downtimeMinutes(rows: readonly ReplMesDowntime[]): number {
  return rows
    .filter((row) => row.statusLabel === '进行中')
    .reduce((sum, row) => sum + row.durationMins, 0);
}

/** Work-order four-stage progress (D3 §2.4 片段 2 / R2 M1 要素③; plan 819
 * P1 F1-1): progressBand full ≥100% / half ≥50% / low >0% / zero 0%. */
const MES_WORK_ORDERS = [
  { woNo: 'WO-2026-1101', product: '变速箱壳体', plannedQty: 400, completedQty: 400 },
  { woNo: 'WO-2026-1102', product: '主轴法兰', plannedQty: 300, completedQty: 210 },
  { woNo: 'WO-2026-1103', product: '齿轮坯', plannedQty: 500, completedQty: 120 },
  { woNo: 'WO-2026-1104', product: '轴承座', plannedQty: 260, completedQty: 0 },
  { woNo: 'WO-2026-1105', product: '端盖', plannedQty: 180, completedQty: 96 },
];

export function workOrderBand(progress: number): 'full' | 'half' | 'low' | 'zero' {
  if (progress >= 100) return 'full';
  if (progress >= 50) return 'half';
  if (progress > 0) return 'low';
  return 'zero';
}

function buildWorkOrders() {
  return MES_WORK_ORDERS.map((order) => {
    const progress = Math.round((order.completedQty / order.plannedQty) * 100);
    return { ...order, progress, progressBand: workOrderBand(progress) };
  });
}

export function buildDashboardKpi(phase: number): Record<string, unknown> {
  const completed = MES_COMPLETED_BASE + (phase - 1) * MES_COMPLETED_STEP;
  const scrapped = MES_SCRAPPED_BASE + (phase - 1) * MES_SCRAPPED_STEP;
  const completionRate = Math.round((completed / MES_PLANNED) * 1000) / 10;
  const trendLabels: string[] = [];
  const trendOutputs: number[] = [];
  const trend24h: Array<{ ts: string; output: number }> = [];
  for (let i = 0; i < TREND_POINTS; i += 1) {
    const ts = trendLabel(i);
    const output = trendOutput(i, phase);
    trendLabels.push(ts);
    trendOutputs.push(output);
    trend24h.push({ ts, output });
  }
  // §5.4 「notice-bar 文本含未关闭异常条数」：条数摘要在每条播报文本上重复——
  // 轮播任意相位可见（跑马灯单时刻只渲染 currentIndex 一条，断言不依赖轮转窗口）。
  const summary = `未关闭异常 ${MES_ABNORMALITIES.length} 条（严重 ${MES_ABNORMALITIES.filter((a) => a.level === 'critical').length} 条）`;
  const abnormalityTexts = [
    `${summary} · 请值班长关注`,
    ...MES_ABNORMALITIES.map(
      (a) => `${summary} ·【${a.type}】${a.raisedLabel} ${a.station}：${a.message}`,
    ),
  ];
  return {
    phase,
    planned: MES_PLANNED,
    completed,
    scrapped,
    completionRate,
    plannedDelta: { value: 0, label: '持平', direction: 'neutral' },
    completedDelta: { value: 4.2, label: '+4.2%', direction: 'up' },
    scrappedDelta: { value: -2.5, label: '-2.5%', direction: 'down' },
    plannedSpark: [46, 52, 49, 58, 55, 63, 60, 68],
    trendLabels,
    trendOutputs,
    trend24h,
    abnormalities: MES_ABNORMALITIES.map((row) => ({ ...row })),
    abnormalityCount: MES_ABNORMALITIES.length,
    abnormalityTexts,
    downtimes: MES_DOWNTIMES.map((row) => ({ ...row })),
    downtimeMinutes: downtimeMinutes(MES_DOWNTIMES),
    workOrders: buildWorkOrders(),
  };
}

/* ── Module export ──────────────────────────────────────────────────────── */

/**
 * The `/r/ReplMes__` fetcher branch. Returns null for unknown endpoints so
 * the replica-kit dispatch loop can continue (showcase-env serves its own
 * fallback afterwards). The dashboardKpi phase counter lives in the factory
 * closure: one session = one phase sequence (fresh per test page). Calls
 * landing within `PHASE_WAVE_WINDOW_MS` of the previous one coalesce into the
 * SAME phase — dev StrictMode double-mounts the page (two initFetch waves
 * ~ms apart) and the "first frame" must stay phase 1; real polls (15s) and
 * the 手动刷新 button are always a fresh wave.
 */
export function createReplMesFetcherBranch(): ReplicaFetcherBranch {
  const PHASE_WAVE_WINDOW_MS = 1500;
  let phase = 0;
  let lastCallAt = 0;
  // plan 810 — the M2 work-reporting session (job cards) shares the branch
  // closure lifetime: one browser page session = one mutable card list.
  const reportingSession = createReplMesReportingSession();
  // plan 811 — the M3 andon/material session (task rows) shares it too.
  const andonSession = createReplMesAndonSession();

  const countEndpointCall = createEndpointCounter({
    countersKey: '__replMesCalls',
    prefix: 'ReplMes__',
    hooksKey: '__replMesTestHooks',
  });

  function handleReplMesBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplMes__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();

    if (input.url.includes('/r/ReplMes__dashboardKpi') && method === 'get') {
      const now = Date.now();
      if (now - lastCallAt > PHASE_WAVE_WINDOW_MS) {
        phase += 1;
      }
      lastCallAt = now;
      const hooks = readReplMesTestHooks();
      if (hooks?.failNextMutation === true) {
        hooks.failNextMutation = false;
        return { status: 1, data: { msg: 'KPI_UNAVAILABLE' } as unknown as T };
      }
      return { status: 0, data: buildDashboardKpi(Math.max(phase, 1)) as unknown as T };
    }

    // ----- M2 work-reporting subset (plan 810): jobCardFindPage /
    // jobCardMutation / reportWork — the counter above already counted the
    // call. -----
    const reportingHandled = handleReplMesReportingBranch<T>({
      url: input.url,
      method,
      params: input.params,
      body: input.body,
      read: createUrlParamReader(input.url, input.params, input.body),
      session: reportingSession,
      hooks: readReplMesTestHooks(),
    });
    if (reportingHandled) return reportingHandled;

    // ----- M3 andon subset (plan 811): andonFindPage / andonCreate /
    // andonEscalate / materialIssueUpdate / uploadAndonPhoto. -----
    const andonHandled = handleReplMesAndonBranch<T>({
      url: input.url,
      method,
      params: input.params,
      body: input.body,
      read: createUrlParamReader(input.url, input.params, input.body),
      session: andonSession,
      hooks: readReplMesTestHooks(),
    });
    if (andonHandled) return andonHandled;

    return null;
  }

  // Opt-in hook lifecycle: the spec owns the global and recreates it per test
  // (W-module precedent) — nothing to reset here.
  withOptInHooks<ReplMesTestHooks>('__replMesTestHooks', () => {});

  return handleReplMesBranch;
}

/**
 * Extension point for the replication domain family (plan 809): the MES
 * `[prefix, handler]` pair consumed by showcase-env's createReplicaBranches
 * (same pattern as the WMS/CRM/ITAM/AI module faces).
 */
export function createReplMesFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplMes__', createReplMesFetcherBranch()]];
}
