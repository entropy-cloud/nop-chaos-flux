/**
 * Business-replication ITAM mock backend (plan 804; D1-决策③ one-domain-one-
 * fetcher-surface + D2 §4.3 itam module design). I1 (itam-asset-inventory)
 * ships the endpoint subset its schema consumes — the D2 §4.3 original six
 * `assetFindPage` / `stockTakeGet` / `stockTakeStart` / `stockTakeScan` /
 * `stockTakeComplete` / `stockTakeDiff`, plus `repairCreate`, an explicit
 * adjudicated supplement: D2 §2.7 authors the 报修 drawer as button+form but
 * §4.3 defines no submit endpoint (drillRows precedent — registered here and
 * flagged back to the design doc).
 *
 * Envelopes (D1 §2): queries `{status:0, data:{...}}`, mutations
 * `{status:0, data:{...}}`, error paths `{status:1, msg}` (D2 §4.3 error
 * branches keep their original message names). Session state (asset registry,
 * the stock take + its scan log, the repair log) lives in the factory closure.
 *
 * Session seed math (deterministic, e2e-recomputable):
 * - 28 assets `IT-2026-0001..0028`; every field is a pure function of the
 *   row index (name cycles 10 IT names → keyword 笔记本 hits rows 1/11/21).
 * - Take `ST-2026-001` opens DRAFT covering 27 of the 28 assets — asset 9
 *   (IT-2026-0009) is NOT on the book lines, so scanning it is the 账外
 *   盘盈 path (the scan guard validates against the registry, appends a
 *   bookQty-0 line). bookQty is 1 everywhere.
 * - Four lines are pre-scanned (assets 2/7/12/20, scannedCount 4) — the
 *   mid-take state. After startTake + scanning asset 9 + complete:
 *   rows 28 = 4 even + 1 surplus + 23 loss; complete.differences (non-zero
 *   subset) = 24; stockTakeDiff.differencesCount mirrors it.
 * - Unscanned lines settle as 盘亏 at complete (盘点未覆盖即盘亏) — mock
 *   adjudication, keeps differenceQuantity server-derived (D2 §4.3).
 *
 * Scan guards: DONE take → `invalid state transition`; unknown code (or the
 * `scanMiss` hook) → `asset barcode not found`; already-scanned code (or the
 * `duplicateScan` hook) → `duplicate scan`. DRAFT and CONFIRMED both accept
 * scans so §5 ① stays decoupled from the startTake step. Complete requires
 * the dialog's secondary-confirmation flag on the body — a bare call (or the
 * `forceCompleteGuard` hook) gets `secondary confirmation required`.
 *
 * Opt-in e2e observation (D1 §2 / D2 §4.4): specs pre-create
 * `window.__replItamCalls` + `window.__replItamTestHooks` via addInitScript;
 * production never sets them, so both stay no-ops. Hooks (D2 §4.4 original
 * names + the plan's `lastRepairBody` addition): `scanMiss`, `duplicateScan`,
 * `forceCompleteGuard`, `lastScanBody`, `lastRepairBody`.
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

/* ── Entities (D2 §4.3 实体字段) ─────────────────────────────────────────── */

export type ReplItamAssetStatus = 'IN_SERVICE' | 'IN_STOCK' | 'MAINTENANCE' | 'RETIRED';

export interface ReplItamAsset {
  assetCode: string;
  name: string;
  model: string;
  serialNo: string;
  ownerName: string;
  location: string;
  leaseEndDate: string;
  status: ReplItamAssetStatus;
  category: string;
}

export interface ReplItamStockTakeLine {
  assetCode: string;
  bookQty: number;
  actualQty: number;
  scannedAt: string | null;
}

export interface ReplItamDiffRow {
  assetCode: string;
  name: string;
  bookQty: number;
  actualQty: number;
  differenceQuantity: number;
  direction: 'surplus' | 'loss' | 'even';
}

export interface ReplItamTestHooks {
  /** Force the scan `asset barcode not found` branch for any code. */
  scanMiss?: boolean;
  /** Force the scan `duplicate scan` branch for any code. */
  duplicateScan?: boolean;
  /** Force the complete `secondary confirmation required` branch. */
  forceCompleteGuard?: boolean;
  /** Mirror of the last `stockTakeScan` request body. */
  lastScanBody?: Record<string, unknown>;
  /** Mirror of the last `repairCreate` request body (plan 804 addition). */
  lastRepairBody?: Record<string, unknown>;
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

const ASSET_COUNT = 28;
export const REPL_ITAM_TAKE_ID = 'ST-2026-001';
/** Asset row NOT covered by the take's book lines — the 账外 盘盈 candidate. */
const UNLISTED_ASSET_INDEX = 9;
/** Rows pre-scanned by the mid-take seed (scannedCount 4). */
const PRESCANNED_INDEXES = [2, 7, 12, 20];

const IT_NAMES = [
  '笔记本计算机',
  '台式工作站',
  '网络交换机',
  '服务器主机',
  '投影仪',
  '打印机',
  '扫描仪',
  '路由器',
  '防火墙',
  '存储阵列',
];
const OWNERS = ['韩梅', '李雷', '王一', '赵敏', '陈晨', '刘洋'];
const LOCATIONS = ['3F-A-01', '3F-A-02', '3F-B-01', '2F-C-01', '2F-C-02', '1F-机房'];
const CATEGORIES = ['IT设备', '网络设备', '办公设备', '外设'];
const ASSET_STATUS_CYCLE: ReplItamAssetStatus[] = [
  'IN_SERVICE',
  'IN_SERVICE',
  'IN_SERVICE',
  'IN_STOCK',
  'MAINTENANCE',
  'RETIRED',
];

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function createAssets(): ReplItamAsset[] {
  const rows: ReplItamAsset[] = [];
  for (let i = 1; i <= ASSET_COUNT; i += 1) {
    rows.push({
      assetCode: `IT-2026-${pad(i, 4)}`,
      name: IT_NAMES[(i - 1) % IT_NAMES.length],
      model: `M-${1000 + i}`,
      serialNo: `SN${pad((i * 7919) % 100000, 5)}`,
      ownerName: OWNERS[i % OWNERS.length],
      location: LOCATIONS[i % LOCATIONS.length],
      leaseEndDate: `2027-${pad((i % 12) + 1, 2)}-15`,
      status: ASSET_STATUS_CYCLE[i % ASSET_STATUS_CYCLE.length],
      category: CATEGORIES[i % CATEGORIES.length],
    });
  }
  return rows;
}

export type ReplItamTakeStatus = 'DRAFT' | 'CONFIRMED' | 'DONE';

export interface ReplItamStockTake {
  id: string;
  status: ReplItamTakeStatus;
  lines: ReplItamStockTakeLine[];
  scannedCount: number;
  scannedCodes: Set<string>;
}

export function createReplItamStockTake(assets: ReplItamAsset[]): ReplItamStockTake {
  const listed = assets.filter((_, index) => index + 1 !== UNLISTED_ASSET_INDEX);
  const scanned = new Set(
    PRESCANNED_INDEXES.map((i) => `IT-2026-${pad(i, 4)}`),
  );
  const lines: ReplItamStockTakeLine[] = listed.map((asset) => ({
    assetCode: asset.assetCode,
    bookQty: 1,
    actualQty: scanned.has(asset.assetCode) ? 1 : 0,
    scannedAt: scanned.has(asset.assetCode) ? '2026-10-30 09:00' : null,
  }));
  return {
    id: REPL_ITAM_TAKE_ID,
    status: 'DRAFT',
    lines,
    scannedCount: scanned.size,
    scannedCodes: scanned,
  };
}

export interface ReplItamSessionState {
  assets: ReplItamAsset[];
  take: ReplItamStockTake;
  repairs: Array<Record<string, unknown>>;
}

export function createReplItamSession(): ReplItamSessionState {
  const assets = createAssets();
  return { assets, take: createReplItamStockTake(assets), repairs: [] };
}

/* ── Diff projection (server-derived differenceQuantity, D2 §4.3) ───────── */

export interface ReplItamDiffFace {
  rows: ReplItamDiffRow[];
  textDiff: { oldText: string; newText: string };
  differencesCount: number;
}

function assetNameOf(session: ReplItamSessionState, assetCode: string): string {
  return session.assets.find((asset) => asset.assetCode === assetCode)?.name ?? assetCode;
}

export function buildDiffFace(session: ReplItamSessionState): ReplItamDiffFace {
  const rows: ReplItamDiffRow[] = session.take.lines.map((line) => {
    const differenceQuantity = line.actualQty - line.bookQty;
    return {
      assetCode: line.assetCode,
      name: assetNameOf(session, line.assetCode),
      bookQty: line.bookQty,
      actualQty: line.actualQty,
      differenceQuantity,
      direction: differenceQuantity > 0 ? 'surplus' : differenceQuantity < 0 ? 'loss' : 'even',
    };
  });
  return {
    rows,
    textDiff: {
      oldText: session.take.lines
        .map((line) => `${line.assetCode} 账面 ${line.bookQty}`)
        .join('\n'),
      newText: session.take.lines
        .map((line) => `${line.assetCode} 实盘 ${line.actualQty}`)
        .join('\n'),
    },
    differencesCount: rows.filter((row) => row.differenceQuantity !== 0).length,
  };
}

/* ── Module branch ──────────────────────────────────────────────────────── */

function readReplItamTestHooks(): ReplItamTestHooks | undefined {
  return readOptInHooks<ReplItamTestHooks>('__replItamTestHooks');
}

/**
 * The `/r/ReplItam__` fetcher branch. Returns null for unknown endpoints so
 * the replica-kit dispatch loop can continue (showcase-env serves its own
 * fallback afterwards).
 */
export function createReplItamFetcherBranch(session: ReplItamSessionState = createReplItamSession()): ReplicaFetcherBranch {
  const countEndpointCall = createEndpointCounter({
    countersKey: '__replItamCalls',
    prefix: 'ReplItam__',
  });

  function handleReplItamBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplItam__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const read = createUrlParamReader(input.url, input.params, input.body);
    const hooks = readReplItamTestHooks();
    const take = session.take;

    if (input.url.includes('/r/ReplItam__assetFindPage') && method === 'get') {
      const keyword = (read('keyword') ?? '').trim().toLowerCase();
      const rows = keyword
        ? session.assets.filter(
            (asset) =>
              asset.assetCode.toLowerCase().includes(keyword) ||
              asset.name.toLowerCase().includes(keyword) ||
              asset.serialNo.toLowerCase().includes(keyword) ||
              asset.ownerName.toLowerCase().includes(keyword),
          )
        : session.assets;
      const page = Number(read('page') ?? 1) || 1;
      const perPage = Number(read('perPage') ?? 10) || 10;
      const { items, total } = paginateRows(rows, page, perPage, { sizeKey: 'perPage', clampPages: true });
      return { status: 0, data: { items, total } as unknown as T };
    }

    if (input.url.includes('/r/ReplItam__stockTakeGet') && method === 'get') {
      const takeId = read('takeId') ?? '';
      if (takeId !== take.id) {
        return { status: 1, data: { msg: 'stock take not found' } as unknown as T };
      }
      return {
        status: 0,
        data: {
          id: take.id,
          status: take.status,
          // Fresh per-request line clones: the scan handler mutates lines in
          // place, and same-identity row objects would let the table's row
          // memo skip the re-render on refreshSource.
          lines: take.lines.map((line) => ({ ...line })),
          scannedCount: take.scannedCount,
        } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplItam__stockTakeStart') && method === 'post') {
      // Error branch (D2 §4.3): only DRAFT confirms.
      if (take.status !== 'DRAFT') {
        return { status: 1, data: { msg: 'invalid state transition' } as unknown as T };
      }
      take.status = 'CONFIRMED';
      return { status: 0, data: { id: take.id, status: 'CONFIRMED' } as unknown as T };
    }

    if (input.url.includes('/r/ReplItam__stockTakeScan') && method === 'post') {
      if (hooks) hooks.lastScanBody = { ...input.body };
      const takeId = String(input.body.takeId ?? '');
      const assetBarcode = String(input.body.assetBarcode ?? '');
      if (takeId !== take.id) {
        return { status: 1, data: { msg: 'stock take not found' } as unknown as T };
      }
      // Error branch: scanning a completed take is a status guard.
      if (take.status === 'DONE') {
        return { status: 1, data: { msg: 'invalid state transition' } as unknown as T };
      }
      const asset = session.assets.find((candidate) => candidate.assetCode === assetBarcode);
      if (hooks?.scanMiss === true || !asset) {
        return { status: 1, data: { msg: 'asset barcode not found' } as unknown as T };
      }
      if (hooks?.duplicateScan === true || take.scannedCodes.has(assetBarcode)) {
        return { status: 1, data: { msg: 'duplicate scan' } as unknown as T };
      }
      const line = take.lines.find((candidate) => candidate.assetCode === assetBarcode);
      if (line) {
        line.actualQty = 1;
        line.scannedAt = '2026-10-30 10:00';
      } else {
        // 账外 asset: not on the book lines → appended with bookQty 0 (盘盈).
        take.lines.push({ assetCode: assetBarcode, bookQty: 0, actualQty: 1, scannedAt: '2026-10-30 10:00' });
      }
      take.scannedCodes.add(assetBarcode);
      take.scannedCount += 1;
      return {
        status: 0,
        data: {
          assetCode: assetBarcode,
          name: asset.name,
          scannedCount: take.scannedCount,
        } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplItam__stockTakeComplete') && method === 'post') {
      if (take.status === 'DONE') {
        return { status: 1, data: { msg: 'invalid state transition' } as unknown as T };
      }
      // Error branch (D2 §4.3): completing requires the dialog's secondary
      // confirmation flag (or the hook forces the rejection for e2e). The
      // flag arrives interpolated ("true") through the surface form template,
      // so both the boolean and its string face count.
      const confirmed = input.body.confirmed === true || input.body.confirmed === 'true';
      if (hooks?.forceCompleteGuard === true || !confirmed) {
        return { status: 1, data: { msg: 'secondary confirmation required' } as unknown as T };
      }
      take.status = 'DONE';
      const face = buildDiffFace(session);
      return {
        status: 0,
        data: {
          id: take.id,
          status: 'DONE',
          diffMoveOrderId: `DMO-${take.id}`,
          differences: face.rows.filter((row) => row.differenceQuantity !== 0),
          differencesCount: face.differencesCount,
        } as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplItam__stockTakeDiff') && method === 'get') {
      // Diffs only exist once the take settled DONE; before that the face is
      // an empty set (not an error envelope).
      if (take.status !== 'DONE') {
        return {
          status: 0,
          data: { rows: [], textDiff: { oldText: '', newText: '' }, differencesCount: 0 } as unknown as T,
        };
      }
      return { status: 0, data: buildDiffFace(session) as unknown as T };
    }

    if (input.url.includes('/r/ReplItam__repairCreate') && method === 'post') {
      if (hooks) hooks.lastRepairBody = { ...input.body };
      const content = String(input.body.content ?? '').trim();
      // Error branch (plan 804): content required 式校验 (activityCreate 同款).
      if (!content) {
        return { status: 1, data: { msg: 'content required' } as unknown as T };
      }
      const repairId = `REP-2026-${pad(session.repairs.length + 1, 3)}`;
      session.repairs.push({ repairId, ...input.body });
      return { status: 0, data: { repairId, status: 'OPEN' } as unknown as T };
    }

    return null;
  }

  // Opt-in hook lifecycle: the spec owns the global and recreates it per test.
  withOptInHooks<ReplItamTestHooks>('__replItamTestHooks', () => {});

  return handleReplItamBranch;
}

/**
 * Extension point for the replication domain family (plan 798 Phase 1):
 * `[prefix, handler]` pairs consumed by showcase-env's createReplicaBranches.
 */
export function createReplItamFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplItam__', createReplItamFetcherBranch()]];
}
