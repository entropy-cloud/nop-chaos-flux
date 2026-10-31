/**
 * Business-replication MES mock backend — M3 andon/material subset (plan 811;
 * D3 §4.4 mes endpoint table M3 rows, 逐名对齐). Delegated from
 * mock-backend-repl-mes.ts exactly like the M2 write-side split
 * (mock-backend-repl-mes-reporting.ts): the M1 module owns the `/r/ReplMes__`
 * prefix + the endpoint counter, and hands every URL its own dashboardKpi
 * branch and the M2 reporting branch did not consume to
 * `handleReplMesAndonBranch` below.
 *
 * Endpoints (D3 §4.4 names verbatim):
 * - get `andonFindPage` — 异常/叫料任务列表, 26 deterministic rows mixing both
 *   types (评审 M-3 ≥25 行口径), `type` filter (ANDON|MATERIAL), page/pageSize
 *   pagination via paginateRows (shape A). MATERIAL rows carry the
 *   `materialIssue` face {docNo, lines} (D3 §4.5 ReplMesAndon). A fixed pair
 *   of rows carries an already-elapsed `respondDeadline` (deterministic past
 *   epoch-ms) + derived `expired` boolean — the §5.6 超时标红 fixture face
 *   (formula has no NOW(); the row red face reads `expired` directly, so the
 *   ladder pins exactly one expired row on page 1 and two overall).
 * - post `andonCreate` — 发起异常/叫料. ANDON → `AD-2026-xxxx` docNo;
 *   MATERIAL → 联动生成 MaterialIssue `MI-2026-xxxx` (D3 §4.4 L66 ②⑤). The
 *   created row is prepended to the session list so the next list read
 *   surfaces it (pull-refresh re-sync precedent).
 * - post `andonEscalate` — 催单升级: escalationLevel+1 (L66 ⑦). Unknown id →
 *   status:1 `ANDON_NOT_FOUND`.
 * - post `materialIssueUpdate` — 叫料明细录入/关闭 (L66 ⑤): `op:'close'`
 *   flips the row to CLOSED; `issuedQty`+`lineNo` records an issued quantity
 *   onto the materialIssue line.
 * - post `uploadAndonPhoto` — 拍照上传 (input-image uploadAction, L66 ③):
 *   returns `{url, name}` with a deterministic inline-SVG data URL so the
 *   thumbnail/viewer render offline (e2e drives the real file-injection path,
 *   G14 §6.3 accept-only 口径).
 *
 * Session state lives in the factory closure: one browser page session = one
 * mutable task list, same lifetime model as the M1 phase counter / M2 job
 * cards. All fixtures are deterministic (D1 §2 L49 no runtime random drift).
 *
 * Opt-in e2e observation (D3 §4.6): specs pre-create `window.__replMesCalls` +
 * `window.__replMesTestHooks` via addInitScript; production never sets them.
 * This subset adds write mirrors only (lastAndonCreateBody /
 * lastEscalateBody / lastIssueUpdateBody — W2 lastWaveMoveBody precedent);
 * the M3 endpoints carry no error-branch guard in D3 §4.4, so no force-*
 * flips are added.
 */

import { asNumber, paginateRows, type ReplicaBranchInput } from './mock-backend-replica-kit';

/* ── Opt-in hooks (shared `__replMesTestHooks` global with M1/M2 faces) ──── */

export interface ReplMesAndonTestHooks {
  /** Mirror: last `andonCreate` request body (field-by-field evidence). */
  lastAndonCreateBody?: Record<string, unknown>;
  /** Mirror: last `andonEscalate` request body (the +1 result surfaces via
   * the row re-render after refresh — 行级即时写回为 B7 缺口). */
  lastEscalateBody?: Record<string, unknown>;
  /** Mirror: last `materialIssueUpdate` request body. */
  lastIssueUpdateBody?: Record<string, unknown>;
}

/* ── Deterministic fixtures (D3 §4.5 ReplMesAndon shape) ─────────────────── */

export type ReplMesAndonType = 'ANDON' | 'MATERIAL';

export type ReplMesAndonStatus = 'OPEN' | 'RESPONDING' | 'CLOSED';

export const MES_ANDON_STATUS_LABELS: Record<ReplMesAndonStatus, string> = {
  OPEN: '待响应',
  RESPONDING: '响应中',
  CLOSED: '已关闭',
};

export interface ReplMesMaterialIssueLine {
  material: string;
  requiredQty: number;
  issuedQty: number;
  location: string;
}

export interface ReplMesMaterialIssue {
  docNo: string;
  lines: ReplMesMaterialIssueLine[];
}

export interface ReplMesAndon {
  id: string;
  type: ReplMesAndonType;
  typeLabel: string;
  station: string;
  description: string;
  photos: string[];
  level: 'critical' | 'major' | 'minor';
  /** epoch-ms (D3 §4.5/D6 MIN-3: countdown targetTime 契约 number). */
  raisedAt: number;
  /** epoch-ms; already-elapsed for the 超时 fixture rows. */
  respondDeadline: number;
  status: ReplMesAndonStatus;
  statusLabel: string;
  escalationLevel: number;
  materialIssue?: ReplMesMaterialIssue;
  /** Derived at build time (formula has no NOW()): true for the fixed-past
   * deadline rows — the §5.6 行标红 face reads this boolean. */
  expired: boolean;
}

const MES_ANDON_STATIONS = ['SMT-01 贴片线', 'AOI-02 检测站', 'CNC-05 加工中心', 'ASM-03 组装线'];

const MES_ANDON_TYPES: { type: ReplMesAndonType; label: string }[] = [
  { type: 'ANDON', label: '设备异常' },
  { type: 'MATERIAL', label: '缺料叫料' },
];

const MES_ANDON_LEVELS: ReplMesAndon['level'][] = ['critical', 'major', 'minor'];

/** Fixed past epoch-ms: 2026-10-30T08:30:00Z — always elapsed at run time. */
const MES_ANDON_EXPIRED_DEADLINE = Date.UTC(2026, 9, 30, 8, 30, 0);
/** Fixed future epoch-ms: 2027-01-01T00:00:00Z — the ticking countdown face. */
const MES_ANDON_FUTURE_DEADLINE = Date.UTC(2027, 0, 1, 0, 0, 0);

/** 26-row ladder: both types + all three levels + two materialIssue shapes;
 * expired rows pinned at ordinals 3 (page 1) and 23 (page 3) — 首页恰 1 条
 * 已过期，全 ladder 共 2 条 (plan 811 draft-review Minor-2 lock). */
export const MES_ANDON_TOTAL = 26;

/** ordinals (1-based) whose respondDeadline is already elapsed. */
const MES_ANDON_EXPIRED_ORDINALS = new Set([3, 23]);

const MES_MATERIAL_NAMES = ['贴片电阻 0402 10kΩ', 'MLCC 0603 100nF', '连接器 HDR-2x5', '屏蔽罩 24x18'];
const MES_LOCATIONS = ['A-01-01', 'B-02-03', 'C-03-02', 'D-04-01'];

export function buildAndonRow(ordinal: number): ReplMesAndon {
  const kind = MES_ANDON_TYPES[ordinal % MES_ANDON_TYPES.length];
  const expired = MES_ANDON_EXPIRED_ORDINALS.has(ordinal);
  const id = `andon-${String(ordinal).padStart(4, '0')}`;
  const status: ReplMesAndonStatus = ordinal % 7 === 0 ? 'CLOSED' : ordinal % 3 === 0 ? 'RESPONDING' : 'OPEN';
  const row: ReplMesAndon = {
    id,
    type: kind.type,
    typeLabel: kind.label,
    station: MES_ANDON_STATIONS[ordinal % MES_ANDON_STATIONS.length],
    description:
      kind.type === 'ANDON'
        ? `工位告警：${ordinal % 2 === 0 ? '贴装头抛料频发' : '轨道卡料需人工干预'}（#${ordinal}）`
        : `线边缺料：${MES_MATERIAL_NAMES[ordinal % MES_MATERIAL_NAMES.length]} 不足半小时用量（#${ordinal}）`,
    photos: [],
    level: MES_ANDON_LEVELS[ordinal % MES_ANDON_LEVELS.length],
    raisedAt: MES_ANDON_EXPIRED_DEADLINE - (MES_ANDON_TOTAL - ordinal) * 60_000,
    respondDeadline: expired ? MES_ANDON_EXPIRED_DEADLINE : MES_ANDON_FUTURE_DEADLINE + ordinal * 60_000,
    status,
    statusLabel: MES_ANDON_STATUS_LABELS[status],
    escalationLevel: ordinal % 3,
    expired,
  };
  if (kind.type === 'MATERIAL') {
    row.materialIssue = {
      docNo: `MI-2026-${String(5000 + ordinal).padStart(4, '0')}`,
      lines: [
        {
          material: MES_MATERIAL_NAMES[ordinal % MES_MATERIAL_NAMES.length],
          requiredQty: 200 + (ordinal * 10) % 300,
          issuedQty: (ordinal * 5) % 120,
          location: MES_LOCATIONS[ordinal % MES_LOCATIONS.length],
        },
      ],
    };
  }
  return row;
}

/** Deterministic inline-SVG photo (data URL) — renders offline in the
 * thumbnail and the viewer without any binary fixture. */
export function andonPhotoDataUrl(seed: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#38bdf8"/><text x="48" y="52" font-size="14" text-anchor="middle" fill="white" font-family="monospace">P${seed}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ReplMesAndonSession {
  rows: ReplMesAndon[];
  adSeq: number;
  miSeq: number;
  photoSeq: number;
}

export function createReplMesAndonSession(): ReplMesAndonSession {
  return {
    rows: Array.from({ length: MES_ANDON_TOTAL }, (_, i) => buildAndonRow(i + 1)),
    adSeq: 0,
    miSeq: 0,
    photoSeq: 0,
  };
}

/* ── Delegate branch ─────────────────────────────────────────────────────── */

export interface ReplMesAndonBranchInput extends ReplicaBranchInput {
  /** Pre-parsed single-param reader (createUrlParamReader product). */
  read: (key: string) => string | undefined;
  session: ReplMesAndonSession;
  hooks: ReplMesAndonTestHooks | undefined;
}

export function handleReplMesAndonBranch<T>(
  input: ReplMesAndonBranchInput,
): { status: number; data: T } | null {
  const { url, method, body, read, session, hooks } = input;

  // ----- M3 read: 异常/叫料任务列表 (26 rows, type filter, 分页) -----
  if (url.includes('/r/ReplMes__andonFindPage') && method === 'get') {
    const type = read('type');
    const rows = type ? session.rows.filter((row) => row.type === type) : session.rows;
    const page = paginateRows(rows, asNumber(read('page')) ?? 1, asNumber(read('pageSize')) ?? 10, {
      sizeKey: 'pageSize',
      clampPages: true,
    });
    return { status: 0, data: JSON.parse(JSON.stringify(page)) as unknown as T };
  }

  // ----- M3 write: 发起异常/叫料 (MaterialIssue docNo 联动) -----
  if (url.includes('/r/ReplMes__andonCreate') && method === 'post') {
    if (hooks) hooks.lastAndonCreateBody = JSON.parse(JSON.stringify(body));
    // includeScope payloads carry the wheel-picker's array-valued form write
    // (form.setValue(name, value[])) — normalize to the scalar domain value.
    const rawType = Array.isArray(body.type) ? body.type[0] : body.type;
    const type = rawType === 'ANDON' ? 'ANDON' : 'MATERIAL';
    const kind = MES_ANDON_TYPES.find((entry) => entry.type === type)!;
    session.adSeq += 1;
    const id = `andon-new-${String(session.adSeq).padStart(4, '0')}`;
    let docNo = `AD-2026-${String(9000 + session.adSeq).padStart(4, '0')}`;
    const created: ReplMesAndon = {
      id,
      type,
      typeLabel: kind.label,
      station: typeof body.station === 'string' && body.station ? body.station : '未填写工位',
      description: typeof body.description === 'string' ? body.description : '',
      photos: Array.isArray(body.photos) ? body.photos.filter((p): p is string => typeof p === 'string') : [],
      level: 'major',
      raisedAt: MES_ANDON_FUTURE_DEADLINE,
      respondDeadline: MES_ANDON_FUTURE_DEADLINE + 15 * 60_000,
      status: 'OPEN',
      statusLabel: MES_ANDON_STATUS_LABELS.OPEN,
      escalationLevel: 0,
      expired: false,
    };
    if (type === 'MATERIAL') {
      session.miSeq += 1;
      docNo = `MI-2026-${String(8000 + session.miSeq).padStart(4, '0')}`;
      created.materialIssue = { docNo, lines: normalizeIssueLines(body.lines) };
    }
    session.rows.unshift(created);
    return { status: 0, data: { id, docNo } as unknown as T };
  }

  // ----- M3 write: 催单升级 (escalationLevel+1) -----
  if (url.includes('/r/ReplMes__andonEscalate') && method === 'post') {
    if (hooks) hooks.lastEscalateBody = { ...body };
    const id = typeof body.id === 'string' ? body.id : '';
    const row = session.rows.find((entry) => entry.id === id);
    if (!row) {
      return { status: 1, data: { msg: 'ANDON_NOT_FOUND', id } as unknown as T };
    }
    row.escalationLevel += 1;
    return { status: 0, data: { id, escalationLevel: row.escalationLevel } as unknown as T };
  }

  // ----- M3 write: 叫料明细录入/关闭 -----
  if (url.includes('/r/ReplMes__materialIssueUpdate') && method === 'post') {
    if (hooks) hooks.lastIssueUpdateBody = JSON.parse(JSON.stringify(body));
    const id = typeof body.id === 'string' ? body.id : '';
    const row = session.rows.find((entry) => entry.id === id);
    if (!row) {
      return { status: 1, data: { msg: 'ANDON_NOT_FOUND', id } as unknown as T };
    }
    if (body.op === 'close') {
      row.status = 'CLOSED';
      row.statusLabel = MES_ANDON_STATUS_LABELS.CLOSED;
      return { status: 0, data: { id, status: row.status } as unknown as T };
    }
    const lineNo = asNumber(body.lineNo) ?? 1;
    const issuedQty = asNumber(body.issuedQty);
    if (!row.materialIssue) {
      return { status: 1, data: { msg: 'MATERIAL_ISSUE_MISSING', id } as unknown as T };
    }
    const line =
      row.materialIssue.lines.find((entry, index) => (index + 1 === lineNo)) ??
      row.materialIssue.lines[0];
    if (line && issuedQty !== undefined) line.issuedQty = issuedQty;
    return {
      status: 0,
      data: { id, lineNo, issuedQty: line?.issuedQty ?? 0 } as unknown as T,
    };
  }

  // ----- M3 write: 拍照上传 (input-image uploadAction; G14 accept-only) -----
  if (url.includes('/r/ReplMes__uploadAndonPhoto') && method === 'post') {
    session.photoSeq += 1;
    const name = typeof body.name === 'string' ? body.name : `andon-photo-${session.photoSeq}.png`;
    return {
      status: 0,
      data: { url: andonPhotoDataUrl(session.photoSeq), name } as unknown as T,
    };
  }

  return null;
}

function normalizeIssueLines(raw: unknown): ReplMesMaterialIssueLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      material: typeof entry.material === 'string' ? entry.material : '',
      requiredQty: asNumber(entry.requiredQty) ?? 0,
      issuedQty: asNumber(entry.issuedQty) ?? 0,
      location: typeof entry.location === 'string' ? entry.location : '',
    }));
}
