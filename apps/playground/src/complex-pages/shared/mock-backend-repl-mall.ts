/**
 * Business-replication mall mock backend (plan 812; D4 §4.1 mall endpoint
 * table, 逐名对齐). Owns the `/r/ReplMall__` prefix + the endpoint counter
 * (`__replMallCalls`), wired through createReplicaBranches in showcase-env
 * exactly like the WMS/CRM/AI/MES domains.
 *
 * Endpoints (D4 §4.1 names verbatim):
 * - get `goodsDetail` — goods{title, images:[{image}×4] (CarouselItemSchema
 *   shape — string[] silently renders empty frames), price, seckillPrice,
 *   stock, purchaseLimit} + skuMatrix (3 colors × 3 sizes, one row sold out)
 *   + promo{seckillEndAt}. `seckillEndAt` is a closure epoch-ms baseline that
 *   the `advanceFlashSaleClock` hook shifts forward (D6 MIN-3: specs must
 *   refreshSource goodsDetail afterwards so `${promo.seckillEndAt}`
 *   re-evaluates and countdown re-arms).
 * - get `flashSaleSession` — 3 sessions (ended|active|upcoming) with
 *   progressPercent; counting this endpoint is the 切态 assertion face.
 * - get `goodsFeed` — 27 deterministic product cards, page/pageSize pagination
 *   (≥3 pages; §5 交互⑤ asserts ≥2 pages of growth).
 * - post `addToCart` — sold-out SKU → REPL_MALL_SOLD_OUT; success decrements
 *   session stock and returns {cartItemId}. Payload = includeScope form values
 *   (plan 812 Major-1 contract): tolerate extra form keys, read skuId/quantity.
 * - post `placeOrder` — 秒杀直购: sold-out → SOLD_OUT, quantity >
 *   purchaseLimit → REPL_MALL_LIMIT_EXCEEDED, `forcePlaceOrderError(msg)`
 *   hook wins; success returns {orderId}.
 * - post `skuLocate` — formula-fallback spare (§3.3 ③); the successful page
 *   never calls it (求交 skuLocate=0 assertion) — the counter face is the point.
 *
 * S2 distribution segment (plan 813):
 * - get `commissionPage` — 27 deterministic commission rows (orderNo/payoutId/
 *   distributorName/level 1-3/rate/commissionAmount/status), page/pageSize
 *   pagination + level/status/distributor filters; `lastCommissionPageParams`
 *   hook mirror is the filter evidence face.
 * - post `commissionExport` — filtered row set → CSV data:url payload
 *   {url, downloadUrl, filename, rowCount} (dual field names: url feeds the
 *   runtime download form-3 face, downloadUrl feeds the D4 then-chain);
 *   empty set (filters matching nothing, or the consume-once
 *   `forceExportEmpty` hook) → REPL_MALL_EXPORT_EMPTY.
 * - get `distPivot` — level×distributor aggregates for the pivot-table source.
 * - get `distTree` — three-level distributor tree {tree:[{id,name,level,children}]}.
 * - get/post `commissionRules` — GET returns the 3-row rule set (sums = 100);
 *   POST validates each row L1+L2+L3 = 100 → REPL_MALL_RULE_INVALID.
 * - post `payoutAudit` — {payoutId, auditResult, reason}; rejected with empty
 *   reason → REPL_MALL_PAYOUT_REJECTED_REQUIRED (server-side fallback behind
 *   the UI required rule).
 *
 * Opt-in e2e observation: specs pre-create `window.__replMallCalls` +
 * `window.__replMallTestHooks` via addInitScript; production never sets them.
 * Hook surface: `advanceFlashSaleClock(deltaMs)`, `forcePlaceOrderError(msg)`
 * (consume-once), plus the write mirrors `lastAddToCartBody` /
 * `lastPlaceOrderBody`.
 */

import {
  asNumber,
  createEndpointCounter,
  createUrlParamReader,
  paginateRows,
  readOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';

/* ── Opt-in hooks ───────────────────────────────────────────────────────── */

export interface ReplMallTestHooks {
  /** Shift the closure flash-sale deadline forward by deltaMs. Specs must
   * refreshSource goodsDetail afterwards (D6 MIN-3 propagation path). */
  advanceFlashSaleClock?: (deltaMs: number) => void;
  /** Consume-once: the NEXT `placeOrder` fails with this message. */
  forcePlaceOrderError?: string;
  /** Mirror: last `addToCart` request body (includeScope form values). */
  lastAddToCartBody?: Record<string, unknown>;
  /** Mirror: last `placeOrder` request body. */
  lastPlaceOrderBody?: Record<string, unknown>;
  /** S2 consume-once: the NEXT `commissionExport` sees an empty row set
   * (REPL_MALL_EXPORT_EMPTY branch). */
  forceExportEmpty?: boolean;
  /** S2 mirror: last `commissionPage` query params (filter evidence). */
  lastCommissionPageParams?: Record<string, unknown>;
  /** S2 mirror: last successful `commissionExport` payload. */
  lastCommissionExportData?: {
    url: string;
    downloadUrl: string;
    filename: string;
    rowCount: number;
  };
  /** S2 mirror: last `commissionRules` POST body. */
  lastCommissionRulesBody?: Record<string, unknown>;
  /** S2 mirror: last `payoutAudit` POST body. */
  lastPayoutAuditBody?: Record<string, unknown>;
}

function readReplMallTestHooks(): ReplMallTestHooks | undefined {
  return readOptInHooks<ReplMallTestHooks>('__replMallTestHooks');
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

export const MALL_COLORS = ['曜石黑', '冰川白', '霞光紫'] as const;
export const MALL_SIZES = ['128G', '256G', '512G'] as const;
/** The sold-out combination (交互① 缺货标识 face): 白色 512G. */
export const MALL_SOLD_OUT_COLOR = '冰川白';
export const MALL_SOLD_OUT_SIZE = '512G';
/** purchaseLimit (placeOrder 超限分支阈值，与 goods.purchaseLimit 同值). */
export const MALL_PURCHASE_LIMIT = 2;

export interface MallSkuRow {
  skuId: string;
  specs: { color: string; size: string };
  price: number;
  stock: number;
  image: string;
}

export function mallSkuImage(seed: number): string {
  // 商品感占位图三代（plan 856 G1）：移植对照页（_tmp/pdd-reference）的
  // 棚拍质感绘制——浅灰影棚底 + 光斑氛围 + 金属中框深色机身 + 斜向反光 +
  // 后摄模组（三摄镜片/闪光灯）+ 地面投影；kind 1/2 保留器形变体。
  const kind = seed % 3;
  const studio =
    '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f2f4f7"/><stop offset="0.48" stop-color="#e6eaf0"/><stop offset="1" stop-color="#dde2ea"/></linearGradient>' +
    '<linearGradient id="body" x1="0" y1="0" x2="0.3" y2="1">' +
    '<stop offset="0" stop-color="#3c4048"/><stop offset="0.34" stop-color="#17191d"/><stop offset="0.6" stop-color="#0c0d10"/><stop offset="0.88" stop-color="#26292f"/><stop offset="1" stop-color="#101216"/></linearGradient>' +
    '<linearGradient id="frame" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#9aa2ad"/><stop offset="0.3" stop-color="#e8edf3"/><stop offset="0.6" stop-color="#6b737e"/><stop offset="1" stop-color="#d6dce4"/></linearGradient>' +
    '<radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">' +
    '<stop offset="0" stop-color="rgba(30,40,60,0.32)"/><stop offset="1" stop-color="rgba(30,40,60,0)"/></radialGradient>' +
    '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>' +
    '</defs>' +
    '<rect width="480" height="480" fill="url(#bg)"/>' +
    '<circle cx="60" cy="120" r="150" fill="rgba(255,150,80,0.14)" filter="url(#soft)"/>' +
    '<circle cx="430" cy="380" r="170" fill="rgba(90,140,255,0.12)" filter="url(#soft)"/>';
  const phone =
    '<ellipse cx="240" cy="404" rx="130" ry="24" fill="url(#floor)" filter="url(#soft)"/>' +
    '<g transform="rotate(-8 240 240)">' +
    '<rect x="152" y="62" width="176" height="356" rx="32" fill="url(#frame)"/>' +
    '<rect x="156" y="66" width="168" height="348" rx="29" fill="url(#body)"/>' +
    '<rect x="150" y="88" width="60" height="6" rx="3" fill="rgba(255,255,255,0.35)" transform="rotate(24 180 91)"/>' +
    '<rect x="176" y="82" width="76" height="80" rx="24" fill="#1d2127" stroke="rgba(255,255,255,0.14)"/>' +
    '<circle cx="200" cy="106" r="15" fill="#16243c" stroke="#1a1e25" stroke-width="3"/>' +
    '<circle cx="197" cy="103" r="5" fill="rgba(140,170,210,0.5)"/>' +
    '<circle cx="228" cy="106" r="15" fill="#16243c" stroke="#1a1e25" stroke-width="3"/>' +
    '<circle cx="225" cy="103" r="5" fill="rgba(140,170,210,0.5)"/>' +
    '<circle cx="200" cy="136" r="15" fill="#16243c" stroke="#1a1e25" stroke-width="3"/>' +
    '<circle cx="197" cy="133" r="5" fill="rgba(140,170,210,0.5)"/>' +
    '<circle cx="232" cy="140" r="7" fill="#e8cf8a"/>' +
    '<rect x="206" y="230" width="150" height="10" rx="5" fill="rgba(255,255,255,0.10)" transform="rotate(-24 281 235)"/>' +
    '<rect x="196" y="300" width="170" height="7" rx="3.5" fill="rgba(255,255,255,0.06)" transform="rotate(-24 281 303)"/>' +
    '</g>';
  const laptop =
    '<ellipse cx="240" cy="398" rx="150" ry="24" fill="url(#floor)" filter="url(#soft)"/>' +
    '<g transform="rotate(-4 240 240)">' +
    '<rect x="110" y="118" width="260" height="162" rx="12" fill="url(#body)"/>' +
    '<rect x="122" y="130" width="236" height="138" rx="6" fill="url(#frame)" opacity="0.4"/>' +
    '<path d="M86 292 h308 l20 28 a8 8 0 0 1 -8 10 h-332 a8 8 0 0 1 -8 -10 z" fill="rgba(255,255,255,0.42)"/>' +
    '<rect x="150" y="150" width="120" height="8" rx="4" fill="rgba(255,255,255,0.14)" transform="rotate(-18 210 154)"/>' +
    '</g>';
  const buds =
    '<ellipse cx="240" cy="396" rx="130" ry="24" fill="url(#floor)" filter="url(#soft)"/>' +
    '<path d="M158 234 a82 82 0 0 1 164 0" stroke="url(#body)" stroke-width="24" fill="none" stroke-linecap="round"/>' +
    '<rect x="126" y="226" width="60" height="98" rx="26" fill="url(#body)"/>' +
    '<rect x="294" y="226" width="60" height="98" rx="26" fill="url(#body)"/>' +
    '<rect x="138" y="240" width="36" height="70" rx="17" fill="rgba(255,255,255,0.24)"/>' +
    '<rect x="306" y="240" width="36" height="70" rx="17" fill="rgba(255,255,255,0.24)"/>';
  const product = kind === 0 ? phone : kind === 1 ? laptop : buds;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480">' +
    studio +
    product +
    '<text x="26" y="52" font-size="26" fill="rgba(30,40,60,0.4)" font-family="monospace">G' +
    seed +
    '</text></svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildMallSkuMatrix(): MallSkuRow[] {
  const rows: MallSkuRow[] = [];
  let n = 0;
  for (const color of MALL_COLORS) {
    for (const size of MALL_SIZES) {
      n += 1;
      const soldOut = color === MALL_SOLD_OUT_COLOR && size === MALL_SOLD_OUT_SIZE;
      rows.push({
        skuId: `sku-${String(n).padStart(3, '0')}`,
        specs: { color, size },
        price: 3999 + n * 100,
        stock: soldOut ? 0 : 20 - n,
        image: mallSkuImage(n),
      });
    }
  }
  return rows;
}

export interface ReplMallSession {
  /** Closure flash-sale deadline baseline (epoch-ms) — advanceFlashSaleClock
   * shifts this; goodsDetail re-reads it. */
  seckillEndAt: number;
  goodsStock: number;
}

export function createReplMallSession(): ReplMallSession {
  // Wall-clock baseline 1h out (the countdown always ticks; determinism comes
  // from the ADVANCE hook, not a frozen epoch — M1 phase windows precedent).
  return { seckillEndAt: Date.now() + 3_600_000, goodsStock: 66 };
}

export interface MallGoodsDetail {
  goods: {
    goodsId: string;
    title: string;
    images: { image: string }[];
    price: number;
    seckillPrice: number;
    stock: number;
    purchaseLimit: number;
  };
  skuMatrix: MallSkuRow[];
  promo: { seckillEndAt: number };
}

/** sessionStorage key for the accumulated simulated-clock advance (opt-in
 * only — production never writes it; offset 0 = real-time countdown). */
const MALL_CLOCK_OFFSET_KEY = '__replMallClockAdvance';

/** Effective flash-sale deadline = closure baseline minus the accumulated
 * simulated-clock advance (the advance PULLS the deadline closer). */
export function effectiveSeckillEndAt(session: ReplMallSession): number {
  if (typeof window === 'undefined') return session.seckillEndAt;
  return (
    session.seckillEndAt - (asNumber(window.sessionStorage.getItem(MALL_CLOCK_OFFSET_KEY)) ?? 0)
  );
}

export function buildGoodsDetail(session: ReplMallSession): MallGoodsDetail {
  return {
    goods: {
      goodsId: 'goods-0001',
      title: 'Nop Phone 12 Pro（秒杀场）',
      images: [1, 2, 3, 4].map((n) => ({ image: mallSkuImage(40 + n) })),
      price: 4999,
      seckillPrice: 3799,
      stock: session.goodsStock,
      purchaseLimit: MALL_PURCHASE_LIMIT,
    },
    skuMatrix: buildMallSkuMatrix(),
    promo: { seckillEndAt: effectiveSeckillEndAt(session) },
  };
}

const MALL_FEED_TOTAL = 27;

export interface MallFeedCard {
  goodsId: string;
  title: string;
  image: string;
  price: number;
  seckillPrice: number;
  sold: number;
}

export function buildMallFeedCards(): MallFeedCard[] {
  return Array.from({ length: MALL_FEED_TOTAL }, (_, i) => {
    const n = i + 1;
    return {
      goodsId: `feed-${String(n).padStart(3, '0')}`,
      title: `秒杀好物 #${n}（限时直降）`,
      image: mallSkuImage(60 + n),
      price: 199 + ((n * 17) % 800),
      seckillPrice: 99 + ((n * 7) % 100),
      sold: 300 + ((n * 53) % 700),
    };
  });
}

function buildFlashSaleSessions() {
  return {
    sessions: [
      { sessionId: 'session-001', name: '10:00 场', state: 'ended', progressPercent: 100 },
      { sessionId: 'session-002', name: '14:00 场', state: 'active', progressPercent: 72 },
      { sessionId: 'session-003', name: '20:00 场', state: 'upcoming', progressPercent: 0 },
    ],
  };
}

/** Resolve a scalar from an includeScope payload (the wheel-picker confirm
 * writes arrays via form.setValue(name, value[])). */
function unwrapArrayValue(raw: unknown): string | undefined {
  return Array.isArray(raw) ? (raw[0] as string | undefined) : (raw as string | undefined);
}

/* ── S2 distribution fixtures (plan 813; D4 §4.1 S2 rows) ───────────────── */

export const MALL_DISTRIBUTORS: Array<{ name: string; level: 1 | 2 | 3 }> = [
  { name: '星辉传媒', level: 1 },
  { name: '蓝海优选', level: 1 },
  { name: '橙意供应链', level: 2 },
  { name: '云集市', level: 2 },
  { name: '快马分销', level: 2 },
  { name: '优选家', level: 3 },
  { name: '汇客来', level: 3 },
  { name: '小鹿严选', level: 3 },
];

const MALL_LEVEL_RATE: Record<number, number> = { 1: 0.05, 2: 0.03, 3: 0.02 };

export interface MallCommissionRow {
  orderNo: string;
  payoutId: string;
  distributorName: string;
  level: number;
  rate: number;
  commissionAmount: number;
  status: 'pending' | 'settled' | 'rejected';
}

const MALL_COMMISSION_TOTAL = 27;

export function buildCommissionRows(): MallCommissionRow[] {
  return Array.from({ length: MALL_COMMISSION_TOTAL }, (_, i) => {
    const n = i + 1;
    const dist = MALL_DISTRIBUTORS[(n * 3) % MALL_DISTRIBUTORS.length];
    // Statuses cycle pending→settled with a rejected tail; row 1 stays
    // pending so交互⑤'s audit flow always has a live first row.
    const status: MallCommissionRow['status'] =
      n === 1 ? 'pending' : n % 7 === 0 ? 'rejected' : n % 2 === 0 ? 'settled' : 'pending';
    const rate = MALL_LEVEL_RATE[dist.level];
    return {
      orderNo: `ORD-2026-${String(1000 + n)}`,
      payoutId: `payout-${String(n).padStart(3, '0')}`,
      distributorName: dist.name,
      level: dist.level,
      rate,
      commissionAmount: 50 + ((n * 37) % 400),
      status,
    };
  });
}

function filterCommissionRows(
  rows: MallCommissionRow[],
  filters: Record<string, unknown>,
): MallCommissionRow[] {
  let out = rows;
  const level = asNumber(filters.level);
  if (level) out = out.filter((r) => r.level === level);
  const status = typeof filters.status === 'string' ? filters.status : '';
  if (status) out = out.filter((r) => r.status === status);
  const distributor = typeof filters.distributor === 'string' ? filters.distributor.trim() : '';
  if (distributor) out = out.filter((r) => r.distributorName.includes(distributor));
  return out;
}

function buildDistPivotItems() {
  const byKey = new Map<
    string,
    { level: number; distributorName: string; commissionAmount: number; orderCount: number }
  >();
  for (const row of buildCommissionRows()) {
    const key = `${row.level}|${row.distributorName}`;
    const entry = byKey.get(key) ?? {
      level: row.level,
      distributorName: row.distributorName,
      commissionAmount: 0,
      orderCount: 0,
    };
    entry.commissionAmount += row.commissionAmount;
    entry.orderCount += 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort(
    (a, b) => a.level - b.level || b.commissionAmount - a.commissionAmount,
  );
}

function buildDistTree() {
  const roots = MALL_DISTRIBUTORS.filter((d) => d.level === 1);
  const level2 = MALL_DISTRIBUTORS.filter((d) => d.level === 2);
  const level3 = MALL_DISTRIBUTORS.filter((d) => d.level === 3);
  return roots.map((root, i) => ({
    id: `dist-l1-${i + 1}`,
    name: root.name,
    level: 1,
    children: level2.slice(i % 2, (i % 2) + 2).map((mid, j) => ({
      id: `dist-l2-${i + 1}-${j + 1}`,
      name: mid.name,
      level: 2,
      children: [
        {
          id: `dist-l3-${i + 1}-${j + 1}-1`,
          name: level3[(i + j) % level3.length].name,
          level: 3,
          children: [],
        },
      ],
    })),
  }));
}

export interface MallCommissionRule {
  category: string;
  minAmount: number;
  L1Rate: number;
  L2Rate: number;
  L3Rate: number;
}

export function defaultCommissionRules(): MallCommissionRule[] {
  return [
    { category: '数码家电', minAmount: 0, L1Rate: 50, L2Rate: 30, L3Rate: 20 },
    { category: '服饰鞋包', minAmount: 0, L1Rate: 40, L2Rate: 35, L3Rate: 25 },
    { category: '美妆个护', minAmount: 199, L1Rate: 45, L2Rate: 30, L3Rate: 25 },
  ];
}

/* ── The /r/ReplMall__ fetcher branch ───────────────────────────────────── */

export function createReplMallFetcherBranch(): ReplicaFetcherBranch {
  const session = createReplMallSession();

  const countEndpointCall = createEndpointCounter({
    countersKey: '__replMallCalls',
    prefix: 'ReplMall__',
    hooksKey: '__replMallTestHooks',
  });

  return function handleReplMallBranch<T>(
    input: ReplicaBranchInput,
  ): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplMall__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const hooks = readReplMallTestHooks();
    // advanceFlashSaleClock is a branch-PROVIDED function (spec→branch flag
    // reads are consume-once globals; the clock lives in this closure) —
    // publish it onto the opt-in global so specs can drive the baseline.
    // Advancing simulated time PULLS the deadline closer (subtract). The
    // accumulated offset persists in sessionStorage because a spec reload
    // re-executes this module and would otherwise reset the closure baseline.
    if (hooks && !hooks.advanceFlashSaleClock) {
      hooks.advanceFlashSaleClock = (deltaMs: number) => {
        const prev = asNumber(window.sessionStorage.getItem(MALL_CLOCK_OFFSET_KEY)) ?? 0;
        window.sessionStorage.setItem(MALL_CLOCK_OFFSET_KEY, String(prev + deltaMs));
      };
    }
    const read = createUrlParamReader(input.url, input.params, input.body);

    if (input.url.includes('/r/ReplMall__goodsDetail') && method === 'get') {
      return { status: 0, data: buildGoodsDetail(session) as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__flashSaleSession') && method === 'get') {
      return { status: 0, data: buildFlashSaleSessions() as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__goodsFeed') && method === 'get') {
      const page = asNumber(read('page')) ?? 1;
      const pageSize = asNumber(read('pageSize')) ?? 9;
      const result = paginateRows(buildMallFeedCards(), page, pageSize, {
        sizeKey: 'pageSize',
        clampPages: true,
      });
      return { status: 0, data: JSON.parse(JSON.stringify(result)) as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__addToCart') && method === 'post') {
      if (hooks) hooks.lastAddToCartBody = JSON.parse(JSON.stringify(bodyView(input)));
      const skuId = unwrapArrayValue(input.body?.skuId) ?? '';
      const row = buildMallSkuMatrix().find((entry) => entry.skuId === skuId);
      if (!row || row.stock <= 0) {
        return { status: 1, data: { msg: 'REPL_MALL_SOLD_OUT', skuId } as unknown as T };
      }
      session.goodsStock = Math.max(0, session.goodsStock - 1);
      return { status: 0, data: { cartItemId: `cart-${session.goodsStock}` } as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__placeOrder') && method === 'post') {
      if (hooks) hooks.lastPlaceOrderBody = JSON.parse(JSON.stringify(bodyView(input)));
      const skuId = unwrapArrayValue(input.body?.skuId) ?? '';
      const quantity = asNumber(input.body?.quantity) ?? 1;
      if (hooks?.forcePlaceOrderError) {
        const msg = hooks.forcePlaceOrderError;
        hooks.forcePlaceOrderError = undefined;
        return { status: 1, data: { msg } as unknown as T };
      }
      const row = buildMallSkuMatrix().find((entry) => entry.skuId === skuId);
      if (!row || row.stock <= 0) {
        return { status: 1, data: { msg: 'REPL_MALL_SOLD_OUT', skuId } as unknown as T };
      }
      if (quantity > MALL_PURCHASE_LIMIT) {
        return { status: 1, data: { msg: 'REPL_MALL_LIMIT_EXCEEDED', quantity } as unknown as T };
      }
      session.goodsStock = Math.max(0, session.goodsStock - quantity);
      return { status: 0, data: { orderId: `order-${session.goodsStock}` } as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__skuLocate') && method === 'post') {
      // Formula-fallback spare (§3.3 ③) — the successful page never calls it;
      // the counter face is the assertion.
      return { status: 0, data: { sku: null } as unknown as T };
    }

    // ── S2 distribution segment (plan 813; D4 §4.1 S2 endpoints verbatim) ──
    if (input.url.includes('/r/ReplMall__commissionPage') && method === 'get') {
      if (hooks) {
        hooks.lastCommissionPageParams = {
          page: read('page'),
          pageSize: read('pageSize'),
          level: read('level'),
          status: read('status'),
          distributor: read('distributor'),
        };
      }
      const page = asNumber(read('page')) ?? 1;
      const pageSize = asNumber(read('pageSize')) ?? 10;
      const filtered = filterCommissionRows(buildCommissionRows(), {
        level: read('level'),
        status: read('status'),
        distributor: read('distributor'),
      });
      const result = paginateRows(filtered, page, pageSize, {
        sizeKey: 'pageSize',
        clampPages: true,
      });
      return { status: 0, data: JSON.parse(JSON.stringify(result)) as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__commissionExport') && method === 'post') {
      const forceEmpty = hooks?.forceExportEmpty === true;
      if (hooks && forceEmpty) hooks.forceExportEmpty = undefined;
      const filtered = forceEmpty
        ? []
        : filterCommissionRows(buildCommissionRows(), {
            level: input.body?.level,
            status: input.body?.status,
            distributor: input.body?.distributor,
          });
      if (filtered.length === 0) {
        return { status: 1, data: { msg: 'REPL_MALL_EXPORT_EMPTY' } as unknown as T };
      }
      const header = 'orderNo,distributorName,level,rate,commissionAmount,status';
      const csv = [
        header,
        ...filtered.map(
          (r) =>
            `${r.orderNo},${r.distributorName},${r.level},${r.rate},${r.commissionAmount},${r.status}`,
        ),
      ].join('\n');
      const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      const payload = {
        url,
        downloadUrl: url,
        filename: '佣金明细.csv',
        rowCount: filtered.length,
      };
      if (hooks) hooks.lastCommissionExportData = JSON.parse(JSON.stringify(payload));
      return { status: 0, data: payload as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__distPivot') && method === 'get') {
      return { status: 0, data: { items: buildDistPivotItems() } as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__distTree') && method === 'get') {
      return { status: 0, data: { tree: buildDistTree() } as unknown as T };
    }

    if (input.url.includes('/r/ReplMall__commissionRules')) {
      if (method === 'get') {
        return { status: 0, data: { items: defaultCommissionRules() } as unknown as T };
      }
      if (method === 'post') {
        if (hooks) hooks.lastCommissionRulesBody = JSON.parse(JSON.stringify(bodyView(input)));
        const rules = (input.body?.rules ?? input.body?.items) as MallCommissionRule[] | undefined;
        if (
          Array.isArray(rules) &&
          rules.some(
            (rule) =>
              Math.round((rule?.L1Rate ?? 0) + (rule?.L2Rate ?? 0) + (rule?.L3Rate ?? 0)) !== 100,
          )
        ) {
          return { status: 1, data: { msg: 'REPL_MALL_RULE_INVALID' } as unknown as T };
        }
        return {
          status: 0,
          data: { saved: Array.isArray(rules) ? rules.length : 0 } as unknown as T,
        };
      }
    }

    if (input.url.includes('/r/ReplMall__payoutAudit') && method === 'post') {
      if (hooks) hooks.lastPayoutAuditBody = JSON.parse(JSON.stringify(bodyView(input)));
      const auditResult = typeof input.body?.auditResult === 'string' ? input.body.auditResult : '';
      const reason = typeof input.body?.reason === 'string' ? input.body.reason.trim() : '';
      if (auditResult === 'rejected' && !reason) {
        // Server-side fallback; the UI required rule blocks the empty case first
        // (K3 口径 — the e2e hits this branch via whitespace-only input).
        return { status: 1, data: { msg: 'REPL_MALL_PAYOUT_REJECTED_REQUIRED' } as unknown as T };
      }
      const payoutId = typeof input.body?.payoutId === 'string' ? input.body.payoutId : '';
      return {
        status: 0,
        data: {
          payoutId,
          status: auditResult === 'rejected' ? 'rejected' : 'settled',
        } as unknown as T,
      };
    }

    return null;
  };
}

/** includeScope payloads wrap form values directly on the body; tolerate a
 * preserved-literal envelope should the action layer ever wrap it. */
function bodyView(input: ReplicaBranchInput): Record<string, unknown> {
  const raw = input.body as Record<string, unknown> | undefined;
  if (
    raw &&
    raw.__nopPreserveLiteral === true &&
    typeof raw.value === 'object' &&
    raw.value !== null
  ) {
    return raw.value as Record<string, unknown>;
  }
  return raw ?? {};
}

export function createReplMallFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplMall__', createReplMallFetcherBranch()]];
}
