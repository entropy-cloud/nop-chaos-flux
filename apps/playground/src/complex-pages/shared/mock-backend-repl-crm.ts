/**
 * Business-replication CRM mock backend (plan 801; D1-决策③ one-domain-one-
 * fetcher-surface + D2 §4.2 crm module design). C1 (crm-opportunity-kanban)
 * ships the endpoint subset its schema consumes — `stageFindPage` /
 * `opportunityBoard` / `moveStage` / `updateRevenue` / `funnelSummary`
 * (D2 §4.2 original names). C2/C3 endpoints join this module later (same
 * line-gate pattern as the WMS stock delegation).
 *
 * Envelopes (D1 §2): queries `{status:0, data:{items,total}}` (funnelSummary
 * and opportunityBoard return their aggregate/board shapes directly, per the
 * D2 §4.2 返回形状 column), mutations `{status:0, data:{...}}`, error paths
 * `{status:1, msg}`. Session state (stage list + lead board) lives in the
 * factory closure, so `moveStage` / `updateRevenue` mutations are observable
 * across pages within one session.
 *
 * Live-shape notes (D2 §2.4/§4.2 errata, M3 evidence — see plan 801 report):
 * - `opportunityBoard` returns `{ board, leads }`: `board` is the flat kanban
 *   BoardData the kanban renderer consumes (live `columnsConfig` does NOT
 *   drive columns — it is only read for controlled-collapse state — so the
 *   stage columns are emitted here, sequence-sorted, W2 precedent), and
 *   `leads` is the row-array projection the quick-edit table binds to.
 * - `moveStage` request body is `{ leadId, fromStageId, toStageId }` (the
 *   `${cardId}/${fromColumnId}/${toColumnId}` live-variable precedent, G2).
 *
 * Opt-in e2e observation (D1 §2 / D2 §4.4): specs pre-create
 * `window.__replCrmCalls` + `window.__replCrmTestHooks` via addInitScript;
 * production never sets them, so both stay no-ops. Hooks: `moveStageReject`
 * ('rollback' | 'won' guard force), `forceKpiError` (funnelSummary failure
 * face), plus the last-request-body mirrors `lastMoveStageBody` (G2 义务③c
 * C1 field-by-field assertion) and `lastUpdateRevenueBody` (quick-edit body
 * mirror, W-module 落地增补 pattern).
 */

import {
  createEndpointCounter,
  readOptInHooks,
  withOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';

/* ── Entities (D2 §4.2 实体字段 + plan 801 isWonStage 赢单列) ─────────────── */

export type ReplCrmProbability = 'high' | 'mid' | 'low';

export interface ReplCrmStage {
  id: string;
  name: string;
  sequence: number;
  probabilityBand: ReplCrmProbability;
  isWonStage: boolean;
}

export interface ReplCrmLead {
  id: string;
  customerName: string;
  expectedRevenue: number;
  probability: ReplCrmProbability;
  stageId: string;
  ownerName: string;
}

export interface ReplCrmTestHooks {
  /** Force a moveStage guard branch ('rollback' | 'won') regardless of the
   * dragged direction, so e2e can drive the rejection faces deterministically. */
  moveStageReject?: 'rollback' | 'won';
  /** Read at `funnelSummary` fetch time — flips the read to a failure envelope. */
  forceKpiError?: boolean;
  /** G2 义务③c (D2 §3.3): mirror of the last `moveStage` request body for the
   * field-by-field assertion (leadId ↔ card id, fromStageId ↔ source column,
   * toStageId ↔ target column). */
  lastMoveStageBody?: Record<string, unknown>;
  /** Quick-edit mirror: last `updateRevenue` request body. */
  lastUpdateRevenueBody?: Record<string, unknown>;
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

export const REPL_CRM_STAGES: readonly ReplCrmStage[] = [
  { id: 'stage-0001', name: '线索录入', sequence: 1, probabilityBand: 'low', isWonStage: false },
  { id: 'stage-0002', name: '需求确认', sequence: 2, probabilityBand: 'low', isWonStage: false },
  { id: 'stage-0003', name: '方案报价', sequence: 3, probabilityBand: 'mid', isWonStage: false },
  { id: 'stage-0004', name: '商务谈判', sequence: 4, probabilityBand: 'mid', isWonStage: false },
  { id: 'stage-0005', name: '合同审批', sequence: 5, probabilityBand: 'high', isWonStage: false },
  { id: 'stage-0006', name: '赢单成交', sequence: 6, probabilityBand: 'high', isWonStage: true },
];

/** Inclusive stage ranges over the 26-lead seed: lead i lands in the stage
 * whose range contains i (6/5/5/4/3/3 across the six columns). */
const STAGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [1, 6],
  [7, 11],
  [12, 16],
  [17, 20],
  [21, 23],
  [24, 26],
];

const LEAD_COUNT = 26;

const CUSTOMERS = [
  '华东智造', '南方电网科技', '北疆矿业', '滨海航运', '中原料源',
  '西部云谷', '东南建设', '九州零售', '江海重工', '蓝天教育',
];

const OWNERS = ['韩梅', '李雷', '王工', '赵敏'];

/** Deterministic revenue ladder (万元): i → 100,70,40,110,80,50,120,90,60,30 … */
export function replCrmRevenue(i: number): number {
  return 30 + ((i * 7) % 10) * 10;
}

function stageIndexFor(i: number): number {
  const index = STAGE_RANGES.findIndex(([from, to]) => i >= from && i <= to);
  return index === -1 ? STAGE_RANGES.length - 1 : index;
}

function createLeadRows(): ReplCrmLead[] {
  const rows: ReplCrmLead[] = [];
  const probabilities: ReplCrmProbability[] = ['high', 'mid', 'low'];
  for (let i = 1; i <= LEAD_COUNT; i += 1) {
    rows.push({
      id: `lead-${String(i).padStart(4, '0')}`,
      customerName: `${CUSTOMERS[i % CUSTOMERS.length]}·${String(i).padStart(2, '0')}`,
      expectedRevenue: replCrmRevenue(i),
      probability: probabilities[(i - 1) % probabilities.length],
      stageId: REPL_CRM_STAGES[stageIndexFor(i)].id,
      ownerName: OWNERS[i % OWNERS.length],
    });
  }
  return rows;
}

interface ReplCrmBoardCardData {
  title: string;
  customerName: string;
  expectedRevenue: number;
  probability: ReplCrmProbability;
  ownerName: string;
  stageId: string;
  stageName: string;
}

/**
 * Build the flat kanban BoardData for the opportunity board: one column per
 * stage (sequence order — the mock owns the stage ordering; live
 * `columnsConfig` does not create columns), one card per lead carrying the
 * quick-edit/projection fields on `data`.
 */
export function buildReplOpportunityBoardData(
  stages: ReplCrmStage[],
  leads: ReplCrmLead[],
): Record<string, unknown> {
  const board: Record<string, unknown> = {};
  const rootChildren: string[] = [];

  for (const stage of stages) {
    const stageLeads = leads.filter((lead) => lead.stageId === stage.id);
    const cardIds: string[] = [];
    for (const lead of stageLeads) {
      const cardData: ReplCrmBoardCardData = {
        title: lead.customerName,
        customerName: lead.customerName,
        expectedRevenue: lead.expectedRevenue,
        probability: lead.probability,
        ownerName: lead.ownerName,
        stageId: stage.id,
        stageName: stage.name,
      };
      board[lead.id] = {
        id: lead.id,
        type: 'card',
        parentId: stage.id,
        children: [],
        data: cardData,
        meta: {},
      };
      cardIds.push(lead.id);
    }
    board[stage.id] = {
      id: stage.id,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: {
        title: stage.isWonStage ? `${stage.name}（赢单）` : stage.name,
        sequence: stage.sequence,
        isWonStage: stage.isWonStage,
      },
      meta: {},
    };
    rootChildren.push(stage.id);
  }

  board['root'] = { id: 'root', type: 'root', children: rootChildren, data: {}, meta: {} };
  return board;
}

/* ── Session state ──────────────────────────────────────────────────────── */

export interface ReplCrmSessionState {
  stages: ReplCrmStage[];
  leads: ReplCrmLead[];
}

export function createReplCrmSession(): ReplCrmSessionState {
  return {
    stages: REPL_CRM_STAGES.map((stage) => ({ ...stage })),
    leads: createLeadRows(),
  };
}

function readReplCrmTestHooks(): ReplCrmTestHooks | undefined {
  return readOptInHooks<ReplCrmTestHooks>('__replCrmTestHooks');
}

function findStage(session: ReplCrmSessionState, stageId: string): ReplCrmStage | undefined {
  return session.stages.find((stage) => stage.id === stageId);
}

function funnelSummary(session: ReplCrmSessionState) {
  const totalLeads = session.leads.length;
  const totalAmount = session.leads.reduce((sum, lead) => sum + lead.expectedRevenue, 0);
  const wonStage = session.stages.find((stage) => stage.isWonStage);
  const wonAmount = wonStage
    ? session.leads
        .filter((lead) => lead.stageId === wonStage.id)
        .reduce((sum, lead) => sum + lead.expectedRevenue, 0)
    : 0;
  // 阶段降序（D2 §6 G1 funnel 顺序）：won column first, pipeline order reversed.
  const stages = session.stages
    .slice()
    .sort((a, b) => b.sequence - a.sequence)
    .map((stage) => {
      const stageLeads = session.leads.filter((lead) => lead.stageId === stage.id);
      const amount = stageLeads.reduce((sum, lead) => sum + lead.expectedRevenue, 0);
      return {
        stageId: stage.id,
        label: stage.name,
        leadCount: stageLeads.length,
        amount,
        conversion: totalLeads === 0 ? 0 : Math.round((stageLeads.length / totalLeads) * 100),
      };
    });
  return { totalLeads, totalAmount, wonAmount, stages };
}

/* ── Module export ──────────────────────────────────────────────────────── */

/**
 * The `/r/ReplCrm__` fetcher branch. Returns null for unknown endpoints so
 * the replica-kit dispatch loop can continue (showcase-env serves its own
 * fallback afterwards).
 */
export function createReplCrmFetcherBranch(session: ReplCrmSessionState = createReplCrmSession()): ReplicaFetcherBranch {
  const countEndpointCall = createEndpointCounter({
    countersKey: '__replCrmCalls',
    prefix: 'ReplCrm__',
  });

  function handleReplCrmBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplCrm__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const hooks = readReplCrmTestHooks();

    // ----- C1 reads -----
    if (input.url.includes('/r/ReplCrm__stageFindPage') && method === 'get') {
      const items = session.stages
        .slice()
        .sort((a, b) => a.sequence - b.sequence);
      return { status: 0, data: { items, total: items.length } as unknown as T };
    }

    if (input.url.includes('/r/ReplCrm__opportunityBoard') && method === 'get') {
      const board = buildReplOpportunityBoardData(session.stages, session.leads);
      const leads = session.leads.map((lead) => ({
        ...lead,
        stageName: findStage(session, lead.stageId)?.name ?? '',
      }));
      return { status: 0, data: { board, leads } as unknown as T };
    }

    if (input.url.includes('/r/ReplCrm__funnelSummary') && method === 'get') {
      // Error branch (D2 §4.2): forceKpiError hook flips the aggregate read to
      // a failure envelope.
      if (hooks?.forceKpiError === true) {
        return { status: 1, data: { msg: 'funnel summary unavailable (forceKpiError)' } as unknown as T };
      }
      return { status: 0, data: funnelSummary(session) as unknown as T };
    }

    // ----- C1 writes -----
    if (input.url.includes('/r/ReplCrm__moveStage') && method === 'post') {
      if (hooks) hooks.lastMoveStageBody = { ...input.body };
      const leadId = String(input.body.leadId ?? '');
      const toStageId = String(input.body.toStageId ?? '');
      const lead = session.leads.find((candidate) => candidate.id === leadId);
      if (!lead) {
        return { status: 1, data: { msg: 'lead not found' } as unknown as T };
      }
      const fromStage = findStage(session, lead.stageId);
      const toStage = findStage(session, toStageId);
      if (!fromStage || !toStage) {
        return { status: 1, data: { msg: 'unknown stage' } as unknown as T };
      }
      // Error branches (D2 §4.2): the won column is read-only (no moves out)
      // → `won stage read-only`; backward moves → `stage rollback rejected`.
      // The `moveStageReject` hook forces either face deterministically.
      const forced = hooks?.moveStageReject;
      if (forced === 'won' || (forced !== 'rollback' && fromStage.isWonStage)) {
        return { status: 1, data: { msg: 'won stage read-only' } as unknown as T };
      }
      if (forced === 'rollback' || toStage.sequence < fromStage.sequence) {
        return { status: 1, data: { msg: 'stage rollback rejected' } as unknown as T };
      }
      lead.stageId = toStage.id;
      return {
        status: 0,
        data: { leadId: lead.id, stageId: lead.stageId, fromStageId: fromStage.id, toStageId: toStage.id } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplCrm__updateRevenue') && method === 'post') {
      if (hooks) hooks.lastUpdateRevenueBody = { ...input.body };
      const leadId = String(input.body.leadId ?? '');
      const lead = session.leads.find((candidate) => candidate.id === leadId);
      if (!lead) {
        return { status: 1, data: { msg: 'lead not found' } as unknown as T };
      }
      const amount = Number(input.body.expectedRevenue);
      // Error branch (D2 §4.2): negative / non-numeric amount → `invalid amount`.
      if (!Number.isFinite(amount) || amount < 0) {
        return { status: 1, data: { msg: 'invalid amount' } as unknown as T };
      }
      lead.expectedRevenue = amount;
      return { status: 0, data: { leadId: lead.id, expectedRevenue: lead.expectedRevenue } as unknown as T };
    }

    return null;
  }

  // Opt-in hook lifecycle: the spec owns the global and recreates it per test
  // (W-module precedent) — nothing to reset here.
  withOptInHooks<ReplCrmTestHooks>('__replCrmTestHooks', () => {});

  return handleReplCrmBranch;
}

/**
 * Extension point for the replication domain family (plan 801): the CRM
 * `[prefix, handler]` pair consumed by showcase-env's createReplicaBranches
 * (same pattern as the WMS module's createReplFetcherBranches).
 */
export function createReplCrmFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplCrm__', createReplCrmFetcherBranch()]];
}
