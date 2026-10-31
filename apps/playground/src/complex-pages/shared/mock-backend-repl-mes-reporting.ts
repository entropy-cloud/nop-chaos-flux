/**
 * Business-replication MES mock backend — M2 work-reporting subset (plan 810;
 * D3 §4.4 mes endpoint table M2 rows, 逐名对齐). Delegated from
 * mock-backend-repl-mes.ts exactly like the W2/W3 stock-subset delegate split
 * (mock-backend-repl-wms.ts → mock-backend-repl-wms-stock.ts): the M1 module
 * owns the `/r/ReplMes__` prefix + the endpoint counter, and hands every URL
 * its own dashboardKpi branch did not consume to `handleReplMesReportingBranch`
 * below.
 *
 * Endpoints (D3 §4.4 names verbatim):
 * - get `jobCardFindPage` — 作业卡列表, 26 deterministic rows across all 8
 *   statuses (评审 M-3 ≥25 行多状态). With a `cardId` param it narrows to the
 *   single-card lookup face the report dialog's form loadAction consumes
 *   (设计勘误建议: §4.4 table does not name the lookup face — registered).
 * - post `jobCardMutation` — startJob / holdJob / resumeJob / submitJob /
 *   completeJob (评审 M-2: exactly these five names). The transition table is
 *   RELEASED→startJob→RUNNING, RUNNING→holdJob→ON_HOLD,
 *   ON_HOLD→resumeJob→RUNNING, RUNNING→submitJob→SUBMITTED,
 *   SUBMITTED→completeJob→COMPLETED; any other (fromStatus × mutation) pair →
 *   status:1 `{msg:'ILLEGAL_TRANSITION'}` + the row keeps its status.
 * - post `reportWork` — 报工提交 with the two endpoint guards (D5 MAJ-7
 *   勘误口径): GUARD_CONSERVATION when any line breaks completed+scrapped ≤
 *   plannedQty (D3 §8 L118 强制项), GUARD_HOUR_RATIO when any line's
 *   (setupMins+runMins)/stdMins exceeds 1.2 (display marks red already at >1,
 *   the hard guard trips at a wider threshold — both constants exported).
 *   Success writes Σ line quantities back onto the card (回写 completedQuantity)
 *   and the list refresh surfaces it.
 *
 *   前端半边 note (设计勘误建议): the D3 §2.5/§5.5 「item 区内字段 validate」
 *   mechanism is a documented live gap for input-table row fields — the async
 *   rule compiles onto the phantom static path `lines.<field>` (B3.2 V6
 *   裁定 B family: no per-row path binding, roadmap B7 successor), so the row
 *   value never reaches it. The page carries the front half as schema
 *   expressions instead: the submit button is `disabled` and a warning text
 *   becomes `visible` while COUNT(ARRAYFILTER(lines, l => completed+scrapped >
 *   planned)) > 0 — 提交计数 0 语义 preserved, no mock endpoint involved.
 *
 * Session state (job cards) lives in the factory closure: one browser page
 * session = one mutable card list, same lifetime model as the M1 phase
 * counter. All fixtures are deterministic (D1 §2 L49 no runtime random drift).
 *
 * Opt-in e2e observation (D3 §4.6): specs pre-create `window.__replMesCalls` +
 * `window.__replMesTestHooks` via addInitScript; production never sets them.
 * Hook surface added by this subset: `forceConservationError` /
 * `forceIllegalTransition` (consume-once error-face flips named in D3 §4.6)
 * plus the write mirrors `lastJobCardMutationBody` / `lastMutationResult` /
 * `lastReportWorkBody` (W2 lastWaveMoveBody precedent). The branch is fully
 * synchronous, so two same-tick UI dispatches land in dispatch order — the
 * ILLEGAL_TRANSITION spec fires a second real click while the first is still
 * in flight and the second (fromStatus already advanced) hits the guard.
 */

import { asNumber, type ReplicaBranchInput } from './mock-backend-replica-kit';

/* ── Opt-in hooks (shared `__replMesTestHooks` global with the M1 face) ──── */

export interface ReplMesReportingTestHooks {
  /** Consume-once: the NEXT `reportWork` POST returns GUARD_CONSERVATION
   * regardless of the payload (D3 §4.6 given name; reuses the same endpoint
   * error branch — D3 §5.5 forceConservationError 断言). */
  forceConservationError?: boolean;
  /** Consume-once: the NEXT `jobCardMutation` POST returns
   * ILLEGAL_TRANSITION regardless of legality (D3 §4.6 given name). */
  forceIllegalTransition?: boolean;
  /** Mirror: last `jobCardMutation` request body (field-by-field evidence). */
  lastJobCardMutationBody?: Record<string, unknown>;
  /** Mirror: the last write face result — '' on success, otherwise the error
   * code (ILLEGAL_TRANSITION / GUARD_*). Covers jobCardMutation AND
   * reportWork rejections. */
  lastMutationResult?: string;
  /** Mirror: last `reportWork` request body (field-by-field evidence). */
  lastReportWorkBody?: Record<string, unknown>;
}

/* ── Deterministic fixtures (D3 §4.5 ReplMesJobCard shape + lines) ───────── */

/** 8-state JobCard lifecycle (D3 §2.5 片段 2 statuses + 2 预留死状态,
 * R2 L70 ② "JobCard 8 态含 2 个预留死状态"; PLANNED is pre-release 排产 —
 * its release mutation is upstream of the M2 five and out of scope). */
export type ReplMesJobCardStatus =
  | 'PLANNED'
  | 'RELEASED'
  | 'RUNNING'
  | 'ON_HOLD'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export const MES_JOB_CARD_STATUS_LABELS: Record<ReplMesJobCardStatus, string> = {
  PLANNED: '已排产',
  RELEASED: '已下发',
  RUNNING: '加工中',
  ON_HOLD: '已暂停',
  SUBMITTED: '已报工待完',
  COMPLETED: '已完工',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

const MES_MUTATIONS = ['startJob', 'holdJob', 'resumeJob', 'submitJob', 'completeJob'] as const;
export type ReplMesJobCardMutation = (typeof MES_MUTATIONS)[number];

/** The M2 transition table: (fromStatus × mutation) → toStatus. Anything not
 * listed → ILLEGAL_TRANSITION (D3 §4.4 error branch). */
export const MES_JOB_CARD_TRANSITIONS: Record<
  string,
  Record<ReplMesJobCardMutation, ReplMesJobCardStatus | undefined>
> = {
  RELEASED: { startJob: 'RUNNING', holdJob: undefined, resumeJob: undefined, submitJob: undefined, completeJob: undefined },
  RUNNING: { startJob: undefined, holdJob: 'ON_HOLD', resumeJob: undefined, submitJob: 'SUBMITTED', completeJob: undefined },
  ON_HOLD: { startJob: undefined, holdJob: undefined, resumeJob: 'RUNNING', submitJob: undefined, completeJob: undefined },
  SUBMITTED: { startJob: undefined, holdJob: undefined, resumeJob: undefined, submitJob: undefined, completeJob: 'COMPLETED' },
};

/** Display marks red at >1.0 (R2 L58 ui-patterns L129 工时比>1.0 标红); the
 * hard endpoint guard trips at a wider threshold (D3 §4.4 GUARD_HOUR_RATIO). */
export const MES_HOUR_RATIO_RED_THRESHOLD = 1.0;
export const MES_HOUR_RATIO_GUARD_THRESHOLD = 1.2;

export interface ReplMesJobCardLine {
  lineNo: number;
  cardId: string;
  opNo: string;
  plannedQty: number;
  stdMins: number;
  completedQty: number;
  scrappedQty: number;
  reworkQty: number;
  setupMins: number;
  runMins: number;
}

export interface ReplMesJobCard {
  id: string;
  opNo: string;
  cardNo: string;
  workCenter: string;
  plannedQty: number;
  completedQty: number;
  scrappedQty: number;
  reworkQty: number;
  stdMins: number;
  setupMins: number;
  runMins: number;
  status: ReplMesJobCardStatus;
  statusLabel: string;
  /** 报工明细行 draft (设计勘误建议: §4.5 ReplMesJobCard does not name a
   * lines field — the report dialog needs row-level plannedQty/stdMins in the
   * input-table row scope, so the card ships a deterministic 2-line draft). */
  lines: ReplMesJobCardLine[];
}

const MES_WORK_CENTERS = [
  'SMT-01 贴片线',
  'AOI-02 检测站',
  'CNC-05 加工中心',
  'ASM-03 组装线',
];

/** Status ladder: 26 cards, every one of the 8 statuses represented (评审
 * M-3), deterministic op/qty ladders. Indices are 1-based card ordinals
 * (报工/状态迁移链路全部落在加工中作业卡上):
 *   card 1  RELEASED   (状态动作显隐① 开工 only)
 *   card 2  RUNNING    (守恒前端半边: lines 60/60, 50+20=70>60 → 行字段
 *             validate 拦截 + reportWork 提交计数 0)
 *   card 3  RUNNING    (工时比 (20+20)/30 ≈ 1.33 > 1 → 列表标红样本)
 *   card 4  RUNNING    (报工提交成功链路: lines 50/50, std 15/15 → 合计
 *             50/5/26 + summaryBinding 回写 + 回写主单 + refreshNearest)
 *   card 5  RUNNING    (GUARD_HOUR_RATIO 端点守卫: 40/15 ≈ 2.67 > 1.2, 守恒通过)
 *   card 6  RUNNING    (focus ③ 提交成功焦点回触发)
 *   card 7  RUNNING    (forceConservationError 复用同端点错误分支, 合法明细+钩子)
 *   card 8  RUNNING    (holdJob 正向迁移 → ON_HOLD)
 *   card 9  RUNNING    (ILLEGAL_TRANSITION 同拍双击暂停, 第二拍 fromStatus 已推进)
 *   card 10 RUNNING    (focus ② 行内 Tab 驻留)
 *   card 13 SUBMITTED  (显隐③ 完成 only)
 *   card 14 ON_HOLD    (显隐④ 恢复 only) */
const MES_CARD_STATUS_LADDER: ReplMesJobCardStatus[] = [
  'RELEASED',
  'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING',
  'RUNNING', 'RUNNING', 'RUNNING', 'RUNNING',
  'RELEASED', 'RELEASED',
  'SUBMITTED', 'ON_HOLD', 'ON_HOLD', 'ON_HOLD',
  'SUBMITTED', 'SUBMITTED',
  'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED',
  'CLOSED', 'CLOSED', 'CANCELLED', 'PLANNED',
];

export const MES_JOB_CARD_TOTAL = MES_CARD_STATUS_LADDER.length;

function cardIdOf(ordinal: number): string {
  return `job-card-${String(ordinal).padStart(4, '0')}`;
}

export function buildJobCard(ordinal: number): ReplMesJobCard {
  const status = MES_CARD_STATUS_LADDER[ordinal - 1];
  const plannedQty = 80 + ((ordinal * 20) % 60);
  // Deterministic in-progress hours: every 3rd ordinal runs over standard so
  // the list 工时比 column carries red faces (card 3 → 40/30 ≈ 1.33).
  const setupMins = ordinal % 3 === 0 ? 20 : 0;
  const runMins = ordinal % 3 === 0 ? 20 : ordinal % 2 === 0 ? 10 : 0;
  const stdMins = 30;
  const half = Math.ceil(plannedQty / 2);
  const id = cardIdOf(ordinal);
  const opNo = `OP-${String(100 + ordinal * 10)}`;
  return {
    id,
    opNo,
    cardNo: `JC-2026-${String(ordinal).padStart(4, '0')}`,
    workCenter: MES_WORK_CENTERS[ordinal % MES_WORK_CENTERS.length],
    plannedQty,
    completedQty: status === 'COMPLETED' ? plannedQty : Math.floor(plannedQty * 0.3),
    scrappedQty: ordinal % 5,
    reworkQty: ordinal % 4,
    stdMins,
    setupMins,
    runMins,
    status,
    statusLabel: MES_JOB_CARD_STATUS_LABELS[status],
    lines: [
      {
        lineNo: 1, cardId: id, opNo,
        plannedQty: half, stdMins: Math.ceil(stdMins / 2),
        completedQty: 0, scrappedQty: 0, reworkQty: 0, setupMins: 0, runMins: 0,
      },
      {
        lineNo: 2, cardId: id, opNo,
        plannedQty: plannedQty - half, stdMins: stdMins - Math.ceil(stdMins / 2),
        completedQty: 0, scrappedQty: 0, reworkQty: 0, setupMins: 0, runMins: 0,
      },
    ],
  };
}

export interface ReplMesReportingSession {
  jobCards: ReplMesJobCard[];
}

export function createReplMesReportingSession(): ReplMesReportingSession {
  return {
    jobCards: Array.from({ length: MES_JOB_CARD_TOTAL }, (_, i) => buildJobCard(i + 1)),
  };
}

/* ── Guards ──────────────────────────────────────────────────────────────── */

interface GuardFailure {
  code: 'GUARD_CONSERVATION' | 'GUARD_HOUR_RATIO';
  detail: string;
}

function reportWorkGuardFailure(body: Record<string, unknown>): GuardFailure | null {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  for (const raw of lines) {
    if (!raw || typeof raw !== 'object') continue;
    const line = raw as Record<string, unknown>;
    const completed = asNumber(line.completedQty) ?? 0;
    const scrapped = asNumber(line.scrappedQty) ?? 0;
    const planned = asNumber(line.plannedQty);
    if (planned !== undefined && completed + scrapped > planned) {
      return {
        code: 'GUARD_CONSERVATION',
        detail: `line ${String(line.lineNo ?? '')}: ${completed}+${scrapped}>${planned}`,
      };
    }
    const setup = asNumber(line.setupMins) ?? 0;
    const run = asNumber(line.runMins) ?? 0;
    const std = asNumber(line.stdMins);
    if (std !== undefined && std > 0 && (setup + run) / std > MES_HOUR_RATIO_GUARD_THRESHOLD) {
      return {
        code: 'GUARD_HOUR_RATIO',
        detail: `line ${String(line.lineNo ?? '')}: (${setup}+${run})/${std}>${MES_HOUR_RATIO_GUARD_THRESHOLD}`,
      };
    }
  }
  return null;
}

/* ── Delegate branch ─────────────────────────────────────────────────────── */

export interface ReplMesReportingBranchInput extends ReplicaBranchInput {
  /** Pre-parsed single-param reader (createUrlParamReader product). */
  read: (key: string) => string | undefined;
  session: ReplMesReportingSession;
  hooks: ReplMesReportingTestHooks | undefined;
}

export function handleReplMesReportingBranch<T>(
  input: ReplMesReportingBranchInput,
): { status: number; data: T } | null {
  const { url, method, body, read, session, hooks } = input;

  // ----- M2 read: 作业卡列表 (26 rows × 8 statuses) -----
  if (url.includes('/r/ReplMes__jobCardFindPage') && method === 'get') {
    const cardId = read('cardId');
    if (cardId) {
      const card = session.jobCards.find((row) => row.id === cardId);
      if (!card) {
        return { status: 1, data: { msg: 'job card not found' } as unknown as T };
      }
      return { status: 0, data: JSON.parse(JSON.stringify(card)) as T };
    }
    const status = read('status');
    const rows = status
      ? session.jobCards.filter((row) => row.status === status)
      : session.jobCards;
    return {
      status: 0,
      data: {
        items: rows.map((row) => JSON.parse(JSON.stringify(row))),
        total: rows.length,
      } as unknown as T,
    };
  }

  // ----- M2 write: 五 mutation + ILLEGAL_TRANSITION 守卫 -----
  if (url.includes('/r/ReplMes__jobCardMutation') && method === 'post') {
    if (hooks) hooks.lastJobCardMutationBody = { ...body };
    const id = typeof body.id === 'string' ? body.id : '';
    const mutation = typeof body.mutation === 'string' ? body.mutation : '';
    const card = session.jobCards.find((row) => row.id === id);
    const illegal = (): { status: number; data: T } => {
      if (hooks) hooks.lastMutationResult = 'ILLEGAL_TRANSITION';
      return {
        status: 1,
        data: { msg: 'ILLEGAL_TRANSITION', id, mutation, fromStatus: card?.status ?? '' } as unknown as T,
      };
    };
    if (!MES_MUTATIONS.includes(mutation as ReplMesJobCardMutation)) return illegal();
    if (hooks?.forceIllegalTransition === true) {
      hooks.forceIllegalTransition = false;
      return illegal();
    }
    if (!card) return illegal();
    const toStatus = MES_JOB_CARD_TRANSITIONS[card.status]?.[mutation as ReplMesJobCardMutation];
    if (!toStatus) return illegal();
    const fromStatus = card.status;
    card.status = toStatus;
    card.statusLabel = MES_JOB_CARD_STATUS_LABELS[toStatus];
    if (hooks) hooks.lastMutationResult = '';
    return { status: 0, data: { id, mutation, fromStatus, toStatus } as unknown as T };
  }

  // ----- M2 write: 报工提交 (GUARD_CONSERVATION / GUARD_HOUR_RATIO) -----
  if (url.includes('/r/ReplMes__reportWork') && method === 'post') {
    if (hooks) hooks.lastReportWorkBody = JSON.parse(JSON.stringify(body));
    const rejected = (code: string, detail: string): { status: number; data: T } => {
      if (hooks) hooks.lastMutationResult = code;
      return { status: 1, data: { msg: code, detail } as unknown as T };
    };
    const cardId = typeof body.cardId === 'string' ? body.cardId : '';
    const card = session.jobCards.find((row) => row.id === cardId);
    if (!card) return rejected('GUARD_CONSERVATION', `unknown card ${cardId}`);
    if (hooks?.forceConservationError === true) {
      hooks.forceConservationError = false;
      return rejected('GUARD_CONSERVATION', 'forced by test hook');
    }
    const guard = reportWorkGuardFailure(body);
    if (guard) return rejected(guard.code, guard.detail);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    let completedTotal = 0;
    let scrappedTotal = 0;
    let reworkTotal = 0;
    for (const raw of lines) {
      if (!raw || typeof raw !== 'object') continue;
      const line = raw as Record<string, unknown>;
      completedTotal += asNumber(line.completedQty) ?? 0;
      scrappedTotal += asNumber(line.scrappedQty) ?? 0;
      reworkTotal += asNumber(line.reworkQty) ?? 0;
    }
    // 成功回写进度 (D3 §4.4): the card's quantities absorb the report; the
    // list refresh (refreshNearest) surfaces it.
    card.completedQty = completedTotal;
    card.scrappedQty = scrappedTotal;
    card.reworkQty = reworkTotal;
    if (hooks) hooks.lastMutationResult = '';
    return {
      status: 0,
      data: {
        cardId,
        completedQuantity: completedTotal,
        scrappedQuantity: scrappedTotal,
        reworkQuantity: reworkTotal,
      } as unknown as T,
    };
  }

  return null;
}
