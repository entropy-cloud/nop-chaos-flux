/**
 * Business-replication WMS mock backend (plan 798; D1-决策③ one-domain-one-
 * fetcher-surface + D2 §4.1 wms module design).
 *
 * Owns the full `/r/ReplWms__*` fetcher surface so `showcase-env.ts` stays
 * under the 700-line hard gate. W1 (wms-pda-receiving) ships the endpoint
 * subset its schema consumes — `asnFindPage` / `asnGet` / `asnReceive` /
 * `putawaySubmit` / `taskRecords` (D2 §4.1 original names; `validate` is a
 * barcode-input schema property, not an endpoint). W2 (plan 799) adds the
 * wave subset — `waveFindPage` / `waveBoard` / `waveMove` / `waveRelease` /
 * `waveLines` / `pickingTasks`. W3 (`stock*`, `ledgerReport`, `reconCheck`)
 * endpoints land with their page and extend `createReplFetcherBranches`.
 *
 * Envelopes (D1 §2): queries `{status:0, data:{items,total}}`, mutations
 * `{status:0, data:{...}}`, error paths `{status:1, msg}`. Session state
 * (idempotency registry + task-record log) lives in the factory closure, so
 * mutations are observable across pages within one session.
 *
 * Opt-in e2e observation (D1 §2 / D2 §4.4): specs pre-create
 * `window.__replWmsCalls` + `window.__replWmsTestHooks` via addInitScript;
 * production never sets them, so both stay no-ops (airtable precedent).
 * Hooks: `asnMiss`, `duplicateIdempotencyKey`, `forceOffline`, the
 * last-request-body mirrors `lastAsnReceiveBody` / `lastPutawayBody`, plus
 * the W2 mirrors `lastWaveMoveBody` (G2 field-by-field assertion, D2 §3.3 ③)
 * and `lastWaveReleaseBody`.
 */

import {
  createEndpointCounter,
  createUrlParamReader,
  paginateRows,
  readOptInHooks,
  withOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';

/* ── Entities (D2 §4.1 实体字段) ─────────────────────────────────────────── */

export interface ReplWmsAsnLine {
  skuBarcode: string;
  skuName: string;
  expectedQty: number;
  suggestedLocation: string;
}

export interface ReplWmsAsn {
  asnNo: string;
  supplierName: string;
  expectedQty: number;
  receivedQty: number;
  status: string;
  lines: ReplWmsAsnLine[];
}

export interface ReplWmsTaskRecord {
  id: string;
  time: string;
  type: 'RECEIVE' | 'PUTAWAY';
  asnNo: string;
  skuName: string;
  qty: number;
  locationCode: string;
  result: 'OK' | 'FAIL';
}

export type ReplWmsWaveStatus = 'PLANNED' | 'RELEASED' | 'PICKING' | 'DONE';

export interface ReplWmsWave {
  id: string;
  code: string;
  status: ReplWmsWaveStatus;
  orderCount: number;
  totalQty: number;
  zone: string;
  priority: 'HIGH' | 'MID' | 'LOW';
}

export interface ReplWmsWaveLine {
  lineNo: number;
  skuBarcode: string;
  skuName: string;
  locationCode: string;
  qty: number;
  pickedQty: number;
  unitPrice: number;
  amount: number;
}

export interface ReplWmsPickingTask {
  id: string;
  text: string;
  start: string;
  end: string;
  progress: number;
  zone: string;
}

export interface ReplWmsPickingLink {
  id: string;
  source: string;
  target: string;
  type: 'finish_to_start';
}

export const REPL_WMS_WAVE_STAGES: readonly ReplWmsWaveStatus[] = [
  'PLANNED',
  'RELEASED',
  'PICKING',
  'DONE',
];

export const REPL_WMS_WAVE_ZONES = ['Z-A', 'Z-B', 'Z-C'] as const;

interface ReplWmsTestHooks {
  asnMiss?: boolean;
  duplicateIdempotencyKey?: boolean;
  forceOffline?: boolean;
  /** Force the putaway `invalid location` guard (e2e drives the error branch
   * without dragging the wheel-cascader). */
  forcePutawayInvalid?: boolean;
  lastAsnReceiveBody?: Record<string, unknown>;
  lastPutawayBody?: Record<string, unknown>;
  /** G2 (D2 §3.3 ③): mirror of the last `waveMove` request body for the
   * field-by-field request assertion (waveId ↔ card id, fromStatus ↔ source
   * column id, toStatus ↔ target column id). */
  lastWaveMoveBody?: Record<string, unknown>;
  lastWaveReleaseBody?: Record<string, unknown>;
}

const SUPPLIERS = [
  '华东供应链',
  '南方物流园',
  '北方仓配中心',
  '西南集散点',
  '东南仓储',
  '中部转运',
  '沿海直达',
  '内陆干线',
  '口岸直发',
  '区域分拨',
];

const SKU_NAMES = [
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

const LOCATIONS = ['A-01-01', 'A-01-02', 'A-02-01', 'B-02-01', 'B-02-02', 'C-03-01'];
const ASN_COUNT = 27;
const SEED_TASK_COUNT = 26;

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function createAsnRows(): ReplWmsAsn[] {
  const rows: ReplWmsAsn[] = [];
  for (let i = 1; i <= ASN_COUNT; i += 1) {
    const lines: ReplWmsAsnLine[] = [
      {
        skuBarcode: `6901${pad(i, 4)}001`,
        skuName: SKU_NAMES[i % SKU_NAMES.length],
        expectedQty: 10 + (i % 5) * 2,
        // ASN-2026-0001's first line suggests A-01-01 — the wheel-cascader
        // default leaf — so the putaway happy path works with defaults.
        suggestedLocation: LOCATIONS[(i - 1) % LOCATIONS.length],
      },
      {
        skuBarcode: `6901${pad(i, 4)}002`,
        skuName: SKU_NAMES[(i + 3) % SKU_NAMES.length],
        expectedQty: 4 + (i % 4),
        suggestedLocation: LOCATIONS[(i + 1) % LOCATIONS.length],
      },
    ];
    rows.push({
      asnNo: `ASN-2026-${pad(i, 4)}`,
      supplierName: SUPPLIERS[i % SUPPLIERS.length],
      expectedQty: lines.reduce((sum, line) => sum + line.expectedQty, 0),
      receivedQty: 0,
      status: i % 3 === 0 ? 'RECEIVING' : 'PENDING',
      lines,
    });
  }
  return rows;
}

function createSeedTaskRecords(): ReplWmsTaskRecord[] {
  const rows: ReplWmsTaskRecord[] = [];
  for (let i = 1; i <= SEED_TASK_COUNT; i += 1) {
    const isReceive = i % 2 === 1;
    const asnIndex = (i % ASN_COUNT) + 1;
    rows.push({
      id: `task-${pad(i, 4)}`,
      time: `2026-10-30 0${8 + (i % 9)}:${pad((i * 7) % 60, 2)}`,
      type: isReceive ? 'RECEIVE' : 'PUTAWAY',
      asnNo: `ASN-2026-${pad(asnIndex, 4)}`,
      skuName: SKU_NAMES[(i + 1) % SKU_NAMES.length],
      qty: 1 + (i % 9),
      locationCode: LOCATIONS[i % LOCATIONS.length],
      result: 'OK',
    });
  }
  return rows;
}

/* ── W2 entities (D2 §4.1: Wave / WaveLine / GanttTask) ─────────────────── */

const WAVE_COUNT = 26;
const WAVE_LINES_PER_WAVE = 4;
/** Picking-path timeline window (deterministic, no runtime date drift). */
const PICKING_BASE_DAY = 2; // 2026-11-02 (Monday)
const PICKING_TASKS_PER_ZONE = 5;

const PRIORITIES: ReplWmsWave['priority'][] = ['HIGH', 'MID', 'LOW'];
const WAVE_STAGE_TITLES: Record<ReplWmsWaveStatus, string> = {
  PLANNED: '计划',
  RELEASED: '已释放',
  PICKING: '拣货中',
  DONE: '已完成',
};

function waveStatusFor(i: number): ReplWmsWaveStatus {
  // 7/7/6/6 over a 26-row cycle and wave-0001 opens in PLANNED — the first
  // card of the first column stays deterministic for the drag test.
  const cycle = (i - 1) % 4;
  return (['PLANNED', 'RELEASED', 'PICKING', 'DONE'] as const)[cycle];
}

function createWaveRows(): ReplWmsWave[] {
  const rows: ReplWmsWave[] = [];
  for (let i = 1; i <= WAVE_COUNT; i += 1) {
    rows.push({
      id: `wave-${pad(i, 4)}`,
      code: `WAVE-2026-${pad(i, 4)}`,
      status: waveStatusFor(i),
      orderCount: 3 + (i % 7),
      totalQty: 40 + (i % 9) * 10,
      zone: REPL_WMS_WAVE_ZONES[(i - 1) % REPL_WMS_WAVE_ZONES.length],
      priority: PRIORITIES[i % PRIORITIES.length],
    });
  }
  return rows;
}

/**
 * Deterministic per-wave pick lines (D2 §4.1 WaveLine). Locations are emitted
 * in ascending pick-path order (the travel sequence the gantt tab mirrors);
 * `amount = qty * unitPrice` precomputed so the input-table computed column
 * and mock summary agree.
 */
function createWaveLines(waveIndex: number): ReplWmsWaveLine[] {
  const lines: ReplWmsWaveLine[] = [];
  for (let l = 1; l <= WAVE_LINES_PER_WAVE; l += 1) {
    const seq = (waveIndex + l) % LOCATIONS.length;
    const qty = 6 + ((waveIndex + l) % 5) * 2;
    const pickedQty = (waveIndex + l) % 3 === 0 ? qty : Math.max(0, qty - 2);
    const unitPrice = 10 + ((waveIndex * 3 + l) % 7) * 5;
    const skuIndex = (waveIndex * 2 + l) % SKU_NAMES.length;
    lines.push({
      lineNo: l,
      skuBarcode: `6902${pad(waveIndex, 4)}${pad(l, 2)}`,
      skuName: SKU_NAMES[skuIndex],
      locationCode: LOCATIONS[seq],
      qty,
      pickedQty,
      unitPrice,
      amount: qty * unitPrice,
    });
  }
  return lines;
}

/**
 * Picking-path gantt tasks (D2 §4.1 GanttTask: `text` required, no
 * `name`/`sequence` field — the mock pre-sorts by the upstream sequence and
 * returns the ordered array, D5 erratum). One chained task chain per zone.
 */
function createPickingTasks(): { tasks: ReplWmsPickingTask[]; links: ReplWmsPickingLink[] } {
  const tasks: ReplWmsPickingTask[] = [];
  const links: ReplWmsPickingLink[] = [];
  let seq = 0;
  for (const zone of REPL_WMS_WAVE_ZONES) {
    let previousId: string | undefined;
    for (let t = 1; t <= PICKING_TASKS_PER_ZONE; t += 1) {
      seq += 1;
      const id = `pick-${pad(seq, 3)}`;
      const startDay = PICKING_BASE_DAY + (seq % 3);
      const endDay = startDay + 1;
      tasks.push({
        id,
        text: `${zone} · ${LOCATIONS[(seq - 1) % LOCATIONS.length]} → 出货口`,
        start: `2026-11-${pad(startDay, 2)} 08:00`,
        end: `2026-11-${pad(endDay, 2)} 12:00`,
        progress: 10 + ((seq * 17) % 90),
        zone,
      });
      if (previousId) {
        links.push({ id: `link-${pad(seq, 3)}`, source: previousId, target: id, type: 'finish_to_start' });
      }
      previousId = id;
    }
  }
  return { tasks, links };
}

interface ReplWmsBoardCardData {
  title: string;
  description: string;
  totalQty: number;
  orderCount: number;
  zone: string;
  priority: string;
}

const WAVE_PRIORITY_COLORS: Record<ReplWmsWave['priority'], string> = {
  HIGH: '#dc2626',
  MID: '#f59e0b',
  LOW: '#64748b',
};

/** Build the flat kanban BoardData (root + status columns + wave cards). */
export function buildReplWaveBoardData(waves: ReplWmsWave[], zone?: string): Record<string, unknown> {
  const board: Record<string, unknown> = {};
  const rootChildren: string[] = [];
  const filtered = zone ? waves.filter((wave) => wave.zone === zone) : waves;

  for (const stage of REPL_WMS_WAVE_STAGES) {
    const columnId = stage;
    const stageWaves = filtered.filter((wave) => wave.status === stage);
    const cardIds: string[] = [];
    for (const wave of stageWaves) {
      const cardData: ReplWmsBoardCardData = {
        title: wave.code,
        description: `${wave.zone} · ${wave.priority} · ${wave.orderCount} 单`,
        totalQty: wave.totalQty,
        orderCount: wave.orderCount,
        zone: wave.zone,
        priority: wave.priority,
      };
      board[wave.id] = {
        id: wave.id,
        type: 'card',
        parentId: columnId,
        children: [],
        data: cardData,
        meta: { color: WAVE_PRIORITY_COLORS[wave.priority] },
      };
      cardIds.push(wave.id);
    }
    board[columnId] = {
      id: columnId,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: { title: WAVE_STAGE_TITLES[stage] },
      meta: {},
    };
    rootChildren.push(columnId);
  }

  board['root'] = { id: 'root', type: 'root', children: rootChildren, data: {}, meta: {} };
  return board;
}

/* ── Module export ──────────────────────────────────────────────────────── */

export interface ReplWmsSessionState {
  asns: ReplWmsAsn[];
  taskRecords: ReplWmsTaskRecord[];
  usedIdempotencyKeys: Set<string>;
  waves: ReplWmsWave[];
  pickingTasks: ReplWmsPickingTask[];
  pickingLinks: ReplWmsPickingLink[];
}

export function createReplWmsSession(): ReplWmsSessionState {
  const picking = createPickingTasks();
  return {
    asns: createAsnRows(),
    taskRecords: createSeedTaskRecords(),
    usedIdempotencyKeys: new Set<string>(),
    waves: createWaveRows(),
    pickingTasks: picking.tasks,
    pickingLinks: picking.links,
  };
}

function readReplWmsTestHooks(): ReplWmsTestHooks | undefined {
  return readOptInHooks<ReplWmsTestHooks>('__replWmsTestHooks');
}

function findAsnByBarcode(session: ReplWmsSessionState, barcode: string): ReplWmsAsn | undefined {
  if (!barcode) return undefined;
  return session.asns.find(
    (asn) =>
      asn.asnNo === barcode ||
      asn.lines.some((line) => line.skuBarcode === barcode),
  );
}

function taskRecordPage(session: ReplWmsSessionState, page: number, pageSize: number) {
  // Newest first: the receiving log reads top-down on a PDA.
  const rows = session.taskRecords.slice().reverse();
  const { items, total } = paginateRows(rows, page, pageSize, { sizeKey: 'pageSize', clampPages: true });
  return { items, total, hasMore: page * pageSize < total };
}

/**
 * The `/r/ReplWms__` fetcher branch. Returns null for unknown endpoints so
 * the replica-kit dispatch loop can continue (showcase-env serves its own
 * fallback afterwards).
 */
export function createReplWmsFetcherBranch(session: ReplWmsSessionState = createReplWmsSession()): ReplicaFetcherBranch {
  const countEndpointCall = createEndpointCounter({
    countersKey: '__replWmsCalls',
    prefix: 'ReplWms__',
  });

  function handleReplWmsBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplWms__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const read = createUrlParamReader(input.url, input.params, input.body);
    const hooks = readReplWmsTestHooks();

    // ----- W1 reads -----
    if (input.url.includes('/r/ReplWms__asnFindPage') && method === 'get') {
      // Error branch (D2 §4.1): sentinel keyword flips the whole query to a
      // failure envelope so e2e can assert the {status:1, msg} face.
      if (read('keyword') === 'REPL-E-ASN') {
        return { status: 1, data: { msg: 'asn query failed (sentinel keyword)' } as unknown as T };
      }
      const keyword = (read('keyword') ?? '').trim().toLowerCase();
      const rows = keyword
        ? session.asns.filter(
            (asn) =>
              asn.asnNo.toLowerCase().includes(keyword) ||
              asn.supplierName.toLowerCase().includes(keyword),
          )
        : session.asns;
      const page = Number(read('page') ?? 1) || 1;
      const perPage = Number(read('perPage') ?? 10) || 10;
      const { items, total } = paginateRows(rows, page, perPage, { sizeKey: 'perPage', clampPages: true });
      return { status: 0, data: { items, total } as unknown as T };
    }

    if (input.url.includes('/r/ReplWms__asnGet') && method === 'get') {
      const barcode = read('barcode') ?? '';
      const miss = hooks?.asnMiss === true;
      const asn = miss ? undefined : findAsnByBarcode(session, barcode);
      if (!asn) {
        return { status: 1, data: { msg: 'barcode not in asn' } as unknown as T };
      }
      return {
        status: 0,
        data: {
          asnNo: asn.asnNo,
          supplierName: asn.supplierName,
          expectedQty: asn.expectedQty,
          lines: asn.lines,
        } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplWms__taskRecords') && method === 'get') {
      const page = Number(read('page') ?? 1) || 1;
      const pageSize = Number(read('pageSize') ?? 10) || 10;
      return { status: 0, data: taskRecordPage(session, page, pageSize) as unknown as T };
    }

    // ----- W1 writes -----
    if (input.url.includes('/r/ReplWms__asnReceive') && method === 'post') {
      if (hooks) hooks.lastAsnReceiveBody = { ...input.body };
      if (hooks?.forceOffline === true) {
        return { status: 1, data: { msg: 'offline queued (forceOffline)' } as unknown as T };
      }
      const key = typeof input.body.idempotencyKey === 'string' ? input.body.idempotencyKey : '';
      if (hooks?.duplicateIdempotencyKey === true || (key && session.usedIdempotencyKeys.has(key))) {
        return { status: 1, data: { msg: 'duplicate idempotency key' } as unknown as T };
      }
      const asn = findAsnByBarcode(session, String(input.body.asnNo ?? input.body.skuBarcode ?? ''));
      if (!asn) {
        return { status: 1, data: { msg: 'barcode not in asn' } as unknown as T };
      }
      const qty = Number(input.body.qty ?? 0) || 0;
      if (key) session.usedIdempotencyKeys.add(key);
      asn.receivedQty += qty;
      if (asn.receivedQty >= asn.expectedQty) asn.status = 'RECEIVED';
      const line = asn.lines.find((l) => l.skuBarcode === String(input.body.skuBarcode ?? '')) ?? asn.lines[0];
      session.taskRecords.push({
        id: `task-${pad(session.taskRecords.length + 1, 4)}`,
        time: '2026-10-30 18:00',
        type: 'RECEIVE',
        asnNo: asn.asnNo,
        skuName: line?.skuName ?? '',
        qty,
        locationCode: line?.suggestedLocation ?? '',
        result: 'OK',
      });
      return {
        status: 0,
        data: { receiptId: `R-${asn.asnNo}-${session.taskRecords.length}`, receivedQty: qty } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplWms__putawaySubmit') && method === 'post') {
      if (hooks) hooks.lastPutawayBody = { ...input.body };
      if (hooks?.forceOffline === true) {
        return { status: 1, data: { msg: 'offline queued (forceOffline)' } as unknown as T };
      }
      const asn = findAsnByBarcode(session, String(input.body.asnNo ?? input.body.skuBarcode ?? ''));
      const locationCode = String(input.body.locationCode ?? '');
      const suggested = new Set((asn?.lines ?? []).map((line) => line.suggestedLocation));
      // Error branch (D2 §4.1): the scanned slot is not in the ASN's
      // suggested set → `invalid location` (hook forces it for e2e).
      if (hooks?.forcePutawayInvalid === true || !asn || !suggested.has(locationCode)) {
        return { status: 1, data: { msg: 'invalid location' } as unknown as T };
      }
      const putawayQty = Number(input.body.putawayQty ?? 0) || 0;
      session.taskRecords.push({
        id: `task-${pad(session.taskRecords.length + 1, 4)}`,
        time: '2026-10-30 18:05',
        type: 'PUTAWAY',
        asnNo: asn.asnNo,
        skuName: asn.lines[0]?.skuName ?? '',
        qty: putawayQty,
        locationCode,
        result: 'OK',
      });
      return {
        status: 0,
        data: { taskId: `P-${asn.asnNo}-${session.taskRecords.length}`, putawayQty } as unknown as T,
      };
    }

    // ----- W2 reads (D2 §4.1 wave subset) -----
    if (input.url.includes('/r/ReplWms__waveFindPage') && method === 'get') {
      // Error branch: sentinel keyword flips the query to a failure envelope
      // (same pattern as W1's REPL-E-ASN).
      if (read('keyword') === 'REPL-E-WAVE') {
        return { status: 1, data: { msg: 'wave query failed (sentinel keyword)' } as unknown as T };
      }
      const zone = read('zone') ?? '';
      const status = read('status') ?? '';
      const rows = session.waves.filter(
        (wave) => (!zone || wave.zone === zone) && (!status || wave.status === status),
      );
      const page = Number(read('page') ?? 1) || 1;
      const perPage = Number(read('perPage') ?? 10) || 10;
      const { items, total } = paginateRows(rows, page, perPage, { sizeKey: 'perPage', clampPages: true });
      return { status: 0, data: { items, total } as unknown as T };
    }

    if (input.url.includes('/r/ReplWms__waveBoard') && method === 'get') {
      const zone = read('zone') ?? '';
      // Error branch (D2 §4.1): unknown zone sentinel → failure envelope.
      if (zone === 'REPL-E-ZONE') {
        return { status: 1, data: { msg: 'unknown zone' } as unknown as T };
      }
      const board = buildReplWaveBoardData(session.waves, zone || undefined);
      return { status: 0, data: board as unknown as T };
    }

    if (input.url.includes('/r/ReplWms__waveLines') && method === 'get') {
      const waveId = read('waveId') ?? '';
      const waveIndex = session.waves.findIndex((wave) => wave.id === waveId);
      // D2 §4.1: waveId miss → empty set + face marker (not an error envelope).
      if (waveIndex === -1) {
        return {
          status: 0,
          data: {
            lines: [],
            summary: { totalQty: 0, totalAmount: 0 },
            matched: false,
          } as unknown as T,
        };
      }
      const lines = createWaveLines(waveIndex + 1);
      return {
        status: 0,
        data: {
          lines,
          summary: {
            totalQty: lines.reduce((sum, line) => sum + line.qty, 0),
            totalAmount: lines.reduce((sum, line) => sum + line.amount, 0),
          },
          matched: true,
        } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplWms__pickingTasks') && method === 'get') {
      // Error branch: sentinel zone flips the read to a failure envelope.
      if (read('zone') === 'REPL-E-TASK') {
        return { status: 1, data: { msg: 'picking task query failed (sentinel zone)' } as unknown as T };
      }
      const zone = read('zone') ?? '';
      const tasks = zone
        ? session.pickingTasks.filter((task) => task.zone === zone)
        : session.pickingTasks;
      const links = zone
        ? session.pickingLinks.filter(
            (link) =>
              tasks.some((task) => task.id === link.source) &&
              tasks.some((task) => task.id === link.target),
          )
        : session.pickingLinks;
      return { status: 0, data: { tasks, links, zones: REPL_WMS_WAVE_ZONES } as unknown as T };
    }

    // ----- W2 writes -----
    if (input.url.includes('/r/ReplWms__waveMove') && method === 'post') {
      if (hooks) hooks.lastWaveMoveBody = { ...input.body };
      const waveId = String(input.body.waveId ?? '');
      const fromStatus = String(input.body.fromStatus ?? '');
      const toStatus = String(input.body.toStatus ?? '');
      const wave = session.waves.find((candidate) => candidate.id === waveId);
      // Error branches (D2 §4.1): unknown column → `unknown column`; the DONE
      // stage is terminal → `terminal status`.
      if (!REPL_WMS_WAVE_STAGES.includes(fromStatus as ReplWmsWaveStatus) || !REPL_WMS_WAVE_STAGES.includes(toStatus as ReplWmsWaveStatus)) {
        return { status: 1, data: { msg: 'unknown column' } as unknown as T };
      }
      if (toStatus === 'DONE') {
        return { status: 1, data: { msg: 'terminal status' } as unknown as T };
      }
      if (!wave) {
        return { status: 1, data: { msg: 'wave not found' } as unknown as T };
      }
      wave.status = toStatus as ReplWmsWaveStatus;
      return { status: 0, data: { waveId: wave.id, status: wave.status } as unknown as T };
    }

    if (input.url.includes('/r/ReplWms__waveRelease') && method === 'post') {
      if (hooks) hooks.lastWaveReleaseBody = { ...input.body };
      const planned = session.waves.filter((wave) => wave.status === 'PLANNED');
      // Error branch (D2 §4.1): nothing left in PLANNED → `wave not in PLANNED`.
      if (planned.length === 0) {
        return { status: 1, data: { msg: 'wave not in PLANNED' } as unknown as T };
      }
      for (const wave of planned) {
        wave.status = 'RELEASED';
      }
      return { status: 0, data: { releasedCount: planned.length } as unknown as T };
    }

    // W3 endpoints (`stock*`, `ledgerReport`, `reconCheck`) are NOT implemented
    // yet — fall through so the caller's unknown-endpoint face applies (they
    // land with their own page).
    return null;
  }

  // Opt-in hook lifecycle: reset one-shot flags after each page load session
  // is not needed — the spec owns the global and recreates it per test.
  withOptInHooks<ReplWmsTestHooks>('__replWmsTestHooks', () => {});

  return handleReplWmsBranch;
}

/**
 * Extension point for the replication domain family (plan 798 Phase 1):
 * `[prefix, handler]` pairs consumed by showcase-env's createReplicaBranches.
 * New domains register their own module + prefix here; new W-pages extend
 * this module instead of showcase-env.
 */
export function createReplFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplWms__', createReplWmsFetcherBranch()]];
}
