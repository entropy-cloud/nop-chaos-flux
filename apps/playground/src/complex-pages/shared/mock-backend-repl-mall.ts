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
   * refreshSource goodsDetail afterwards so `${promo.seckillEndAt}`
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#6366f1"/><text x="48" y="54" font-size="13" text-anchor="middle" fill="white" font-family="monospace">G${seed}</text></svg>`;
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
  return session.seckillEndAt - (asNumber(window.sessionStorage.getItem(MALL_CLOCK_OFFSET_KEY)) ?? 0);
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

/* ── The /r/ReplMall__ fetcher branch ───────────────────────────────────── */

export function createReplMallFetcherBranch(): ReplicaFetcherBranch {
  const session = createReplMallSession();

  const countEndpointCall = createEndpointCounter({
    countersKey: '__replMallCalls',
    prefix: 'ReplMall__',
    hooksKey: '__replMallTestHooks',
  });

  return function handleReplMallBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
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

    return null;
  };
}

/** includeScope payloads wrap form values directly on the body; tolerate a
 * preserved-literal envelope should the action layer ever wrap it. */
function bodyView(input: ReplicaBranchInput): Record<string, unknown> {
  const raw = input.body as Record<string, unknown> | undefined;
  if (raw && raw.__nopPreserveLiteral === true && typeof raw.value === 'object' && raw.value !== null) {
    return raw.value as Record<string, unknown>;
  }
  return raw ?? {};
}

export function createReplMallFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplMall__', createReplMallFetcherBranch()]];
}
