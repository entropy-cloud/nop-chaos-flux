/**
 * mock-backend-replica-kit — shared skeleton primitives for the seven
 * replica mock-backend branches (airtable / notion / stripe / linear /
 * antdpro / cal / sundial) and showcase-env (plan 599 CX-19).
 *
 * The seven branch families previously carried verbatim-twin skeleton
 * blocks: query-read closures ×6, paginators in two shapes ×5, asNumber ×3,
 * endpoint counters ×6 (two forms), opt-in e2e hooks (flag-reset ×4 /
 * function-injection), patch/record unwraps ×5+1, placeholder records
 * ×3+1, orderId extraction ×6, STATUS_LABELS consumption, and the
 * [prefix, handler] dispatch loop. This kit single-sources those blocks.
 *
 * Zero-behavior-change posture: fallback semantics stay per-slot at each
 * branch's CURRENT values (see `ReplicaFallbackFace` / `faceResponse`);
 * cross-domain unification is an adjudicated Deferred item — the pins in
 * `mock-backend-replica-kit-pins.test.ts` are the flip vehicle.
 */

/* ── Branch registry: the [prefix, handler] loop ────────────────────────── */

export interface ReplicaBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

export type ReplicaFetcherBranch = <T>(input: ReplicaBranchInput) => { status: number; data: T } | null;

/**
 * Absorb the `[prefix, handler]` loop idiom from showcase-env: the first
 * matching prefix gets first crack; a null return continues the loop; an
 * exhausted loop returns null (the caller serves its own fallback).
 */
export function createReplicaBranches(
  branches: ReadonlyArray<readonly [string, ReplicaFetcherBranch]>,
): ReplicaFetcherBranch {
  return function dispatchReplicaBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    for (const [prefix, handleBranch] of branches) {
      if (input.url.includes(prefix)) {
        const handled = handleBranch<T>(input);
        if (handled) return handled;
      }
    }
    return null;
  };
}

/* ── Read-closure primitive (six verbatim twins) ────────────────────────── */

/** Parse the query string of a mock endpoint url (`''` when none). */
export function parseUrlQuery(url: string): URLSearchParams {
  return url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
}

/**
 * The replica read closure: `params ?? body ?? qs.get(key)`, nullish →
 * undefined, stringified. Query string is parsed from the url once.
 */
export function createUrlParamReader(
  url: string,
  params: Record<string, unknown>,
  body: Record<string, unknown>,
): (key: string) => string | undefined {
  const qs = parseUrlQuery(url);
  return (key) => {
    const value = params[key] ?? body[key] ?? qs.get(key);
    return value === undefined || value === null ? undefined : String(value);
  };
}

/* ── paginateRows: the two live paginator shapes ────────────────────────── */

export interface PaginateRowsOptions<In, Out = In> {
  /** Echo key: shape A echoes `pageSize`, shape B echoes `perPage`. */
  sizeKey: 'pageSize' | 'perPage';
  /**
   * Shape A clamps `pages` to ≥1 (empty rows → pages: 1); shape B keeps the
   * raw ceil (empty rows → pages: 0). Page/size always clamp at 1.
   */
  clampPages: boolean;
  /** Shape-B-only row projection applied to the page slice. */
  project?: (row: In) => Out;
}

export function paginateRows<In, Out = In>(
  rows: In[],
  page: number,
  size: number,
  options: PaginateRowsOptions<In, Out> & { sizeKey: 'pageSize' },
): { items: Out[]; total: number; page: number; pageSize: number; pages: number };
export function paginateRows<In, Out = In>(
  rows: In[],
  page: number,
  size: number,
  options: PaginateRowsOptions<In, Out> & { sizeKey: 'perPage' },
): { items: Out[]; total: number; page: number; perPage: number; pages: number };
export function paginateRows<In, Out = In>(
  rows: In[],
  page: number,
  size: number,
  options: PaginateRowsOptions<In, Out>,
):
  | { items: Out[]; total: number; page: number; pageSize: number; pages: number }
  | { items: Out[]; total: number; page: number; perPage: number; pages: number } {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, size);
  const start = (safePage - 1) * safeSize;
  const slice = rows.slice(start, start + safeSize);
  const items = (options.project ? slice.map(options.project) : slice) as Out[];
  const pages = options.clampPages
    ? Math.max(1, Math.ceil(rows.length / safeSize))
    : Math.ceil(rows.length / safeSize);
  if (options.sizeKey === 'pageSize') {
    return { items, total: rows.length, page: safePage, pageSize: safeSize, pages };
  }
  return { items, total: rows.length, page: safePage, perPage: safeSize, pages };
}

/* ── unwrapPatch: `.patch` canonical body vs `.record` variant ──────────── */

/**
 * Unwrap the nested write body: `key: 'patch'` rejects arrays (the five
 * verbatim `.patch` twins); `key: 'record'` keeps the variant's looser
 * object check (showcase-env `.record` sites). Falls back to the input.
 */
export function unwrapPatch(
  input: Record<string, unknown>,
  options: { key: 'patch' | 'record' },
): Record<string, unknown> {
  const raw = input[options.key];
  const nested = raw !== null && raw !== undefined && typeof raw === 'object'
    && (options.key === 'patch' ? !Array.isArray(raw) : true);
  return nested ? (raw as Record<string, unknown>) : input;
}

/* ── orderId extraction (six uniform sites) ─────────────────────────────── */

/**
 * `const orderId = ...` extraction: body-only when `params` is omitted
 * (OrderItem__findPage), body-then-params with body precedence otherwise.
 */
export function readOrderId(body?: Record<string, unknown>, params?: Record<string, unknown>): string {
  if (body && typeof body.orderId === 'string') return body.orderId;
  if (params && typeof params.orderId === 'string') return params.orderId;
  return '';
}

/* ── STATUS_LABELS shared consts + labelOf ──────────────────────────────── */

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: '待审批', approved: '已通过', rejected: '已驳回',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  success: '成功', pending: '处理中', failed: '失败',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  alipay: '支付宝', wechat: '微信', card: '银行卡', balance: '余额',
};

/**
 * Dict lookup with optional raw-value fallback. Without `fallbackToRaw` an
 * unknown key yields undefined (the Dashboard__approvals :479 consumption);
 * with it the raw value passes through (the other four consumption sites).
 */
export function labelOf(
  map: Record<string, string>,
  key: string | undefined,
  options?: { fallbackToRaw?: boolean },
): string | undefined {
  const label = key === undefined ? undefined : map[key];
  if (label !== undefined) return label;
  return options?.fallbackToRaw ? key : undefined;
}

/* ── Placeholder records (3+1 variants) ─────────────────────────────────── */

/** `{ ...fallback, id, ...overrides }` — the shared miss-path record shape. */
export function placeholderFrom<F>(fallback: F, id: string, overrides: Record<string, unknown>): F {
  return { ...fallback, id, ...overrides } as F;
}

/* ── asNumber (three verbatim twins) ────────────────────────────────────── */

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

/* ── Opt-in e2e hooks (endpoint counters + test hooks) ──────────────────── */

/**
 * Opt-in endpoint counter (named-helper ×4 and inline ×2 forms share this):
 * production never pre-creates the counters global, so this stays a no-op.
 * `prefix` is the slice anchor (e.g. `'Airtable__'`); the name strips the
 * query string. `hooksKey` opts into the stripe-style lastUrl recording.
 */
export function createEndpointCounter(options: {
  countersKey: string;
  prefix: string;
  hooksKey?: string;
}): (url: string) => void {
  return (url) => {
    const counters = (globalThis as Record<string, unknown>)[options.countersKey] as
      | Record<string, number>
      | undefined;
    if (!counters) return;
    const name = url.slice(url.indexOf(options.prefix)).split('?')[0];
    counters[name] = (counters[name] ?? 0) + 1;
    if (options.hooksKey) {
      const hooks = (globalThis as Record<string, unknown>)[options.hooksKey] as
        | { lastUrl?: string }
        | undefined;
      if (hooks) hooks.lastUrl = url;
    }
  };
}

export function readOptInHooks<T>(hooksKey: string): T | undefined {
  return (globalThis as Record<string, unknown>)[hooksKey] as T | undefined;
}

/** Run `apply` only when the opt-in hooks global exists (production no-op). */
export function withOptInHooks<T>(hooksKey: string, apply: (hooks: T) => void): void {
  const hooks = readOptInHooks<T>(hooksKey);
  if (hooks) apply(hooks);
}

/* ── Unknown-endpoint fallback faces (per-slot, current values) ─────────── */

/**
 * One unknown-endpoint fallback face: RPC status + `ok` flag + error copy.
 * The three axes drift per branch (write/method/read slots); each branch
 * passes its CURRENT values — cross-domain unification is Deferred.
 */
export interface ReplicaFallbackFace {
  status: number;
  ok: boolean;
  error: string;
}

export function faceResponse<T>(face: ReplicaFallbackFace): { status: number; data: T } {
  return { status: face.status, data: { ok: face.ok, error: face.error } as T };
}

/* ── showcase-env watch #2: unknown-endpoint warn-once ──────────────────── */

const WARNED_UNKNOWN_PATTERNS = new Set<string>();

/** Warn once per unknown URL pattern (query string stripped). */
export function warnUnknownEndpointOnce(url: string): void {
  const pattern = url.split('?')[0];
  if (WARNED_UNKNOWN_PATTERNS.has(pattern)) return;
  WARNED_UNKNOWN_PATTERNS.add(pattern);
  console.warn(`[showcase-env] no mock endpoint matched ${url} — serving {status:0, data:null}`);
}
