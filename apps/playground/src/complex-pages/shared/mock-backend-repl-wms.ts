/**
 * Business-replication WMS mock backend (plan 798; D1-决策③ one-domain-one-
 * fetcher-surface + D2 §4.1 wms module design).
 *
 * Owns the full `/r/ReplWms__*` fetcher surface so `showcase-env.ts` stays
 * under the 700-line hard gate. W1 (wms-pda-receiving) ships the endpoint
 * subset its schema consumes — `asnFindPage` / `asnGet` / `asnReceive` /
 * `putawaySubmit` / `taskRecords` (D2 §4.1 original names; `validate` is a
 * barcode-input schema property, not an endpoint). W2 (`wave*`, `picking*`)
 * and W3 (`stock*`, `ledgerReport`, `reconCheck`) endpoints land with their
 * pages and extend `createReplFetcherBranches`.
 *
 * Envelopes (D1 §2): queries `{status:0, data:{items,total}}`, mutations
 * `{status:0, data:{...}}`, error paths `{status:1, msg}`. Session state
 * (idempotency registry + task-record log) lives in the factory closure, so
 * mutations are observable across pages within one session.
 *
 * Opt-in e2e observation (D1 §2 / D2 §4.4): specs pre-create
 * `window.__replWmsCalls` + `window.__replWmsTestHooks` via addInitScript;
 * production never sets them, so both stay no-ops (airtable precedent).
 * Hooks: `asnMiss`, `duplicateIdempotencyKey`, `forceOffline` plus the
 * last-request-body mirrors `lastAsnReceiveBody` / `lastPutawayBody`.
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

interface ReplWmsTestHooks {
  asnMiss?: boolean;
  duplicateIdempotencyKey?: boolean;
  forceOffline?: boolean;
  /** Force the putaway `invalid location` guard (e2e drives the error branch
   * without dragging the wheel-cascader). */
  forcePutawayInvalid?: boolean;
  lastAsnReceiveBody?: Record<string, unknown>;
  lastPutawayBody?: Record<string, unknown>;
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

/* ── Module export ──────────────────────────────────────────────────────── */

export interface ReplWmsSessionState {
  asns: ReplWmsAsn[];
  taskRecords: ReplWmsTaskRecord[];
  usedIdempotencyKeys: Set<string>;
}

export function createReplWmsSession(): ReplWmsSessionState {
  return {
    asns: createAsnRows(),
    taskRecords: createSeedTaskRecords(),
    usedIdempotencyKeys: new Set<string>(),
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

    // W2/W3 endpoints (`wave*`, `pickingTasks`, `stock*`, `ledgerReport`,
    // `reconCheck`) are NOT implemented yet — fall through so the caller's
    // unknown-endpoint face applies (they land with their own pages).
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
