/**
 * Plan 599 (CX-19) Phase 1 characterization pins — mock-backend-replica-kit
 * extraction guards. All pins drive ONLY the seven branch entry modules'
 * export surface + showcase-env, so they stay green through the Phase 2
 * thin-shell extraction and go surgically red on kit behavior drift.
 *
 * Pinned surfaces (R1-verified grouping, plan §Current Baseline):
 * - 21-face unknown-endpoint fallback matrix (7 domains × write/method/read
 *   slots, exact {status, ok} or null per slot).
 * - paginate two shapes: A (clamped pages ≥1, pageSize echo ×3) vs B
 *   (unclamped pages — 0 on empty!, perPage echo, projection ×2).
 * - showcase-env inline pagination triple: exactly {items, total} — no
 *   page/pageSize/pages echo (R1 M1 envelope trap).
 * - endpoint-count opt-in hooks: named-helper ×4 (stripe variant records
 *   lastUrl) / inline ×2.
 * - e2e test hooks: flag-reset ×4 / function-injection (cal).
 * - STATUS_LABELS consumption: 4 sites keep `?? raw` fallback; :479
 *   (Dashboard__approvals) consumes WITHOUT fallback — latent (the pending
 *   filter keeps unknown statuses from reaching the map); the undefined
 *   semantic is pinned at kit level post-extraction.
 * - orderId extraction: 1 body-only + 5 body-then-params + 1 write variant.
 * - patch/record unwrap (5 verbatim `.patch` twins + `.record` variant).
 * - placeholder records (3+1 variants), asNumber ×3 twins, read-closure
 *   precedence (params ?? body ?? qs), [prefix, handler] loop dispatch.
 */

import { describe, expect, it, afterEach } from 'vitest';
import type { ApiRequestContext, ExecutableApiRequest } from '@nop-chaos/flux-core';
import {
  createAirtableDatabase,
  createAirtableFetcherBranch,
  createAirtableRecords,
  paginateAirtable,
} from '../shared/mock-backend-airtable';
import {
  createNotionDatabase,
  createNotionFetcherBranch,
  paginateNotion,
} from '../shared/mock-backend-notion';
import {
  createStripeDatabase,
  createStripeFetcherBranch,
  createStripePayments,
  paginateStPayments,
} from '../shared/mock-backend-stripe';
import {
  createLinearDatabase,
  createLinearFetcherBranch,
  createLinearIssues,
  paginateLinear,
  buildLinearIssueDetail,
} from '../shared/mock-backend-linear';
import {
  createAntdProFetcherBranch,
  createAntdProOrders,
  paginateAntdPro,
} from '../shared/mock-backend-antdpro';
import {
  CAL_DEFAULT_DATE,
  calSlotId,
  createCalEventMeta,
  createCalFetcherBranch,
} from '../shared/mock-backend-cal';
import { createSundialFetcherBranch } from '../shared/mock-backend-sundial-branch';
import {
  createMockDatabase,
  toOrderListRecord,
  toUserListRecord,
  type OrderRecord,
  type UserRecord,
} from '../shared/mock-backend';
import { createShowcaseEnv } from '../shared/showcase-env';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const fetchCtx = { scope: null } as unknown as ApiRequestContext;

async function callEnv<T>(
  env: ReturnType<typeof createShowcaseEnv>['env'],
  api: { url: string; method: string; params?: Record<string, unknown>; data?: Record<string, unknown> },
): Promise<{ status: number; data: T }> {
  const res = await env.fetcher!<T>(api as ExecutableApiRequest, fetchCtx);
  return { status: res.status, data: res.data as T };
}

interface BranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

type BranchHandler = (input: BranchInput) => { status: number; data: unknown } | null;

const HOOK_GLOBALS = [
  '__airtableEndpointCalls', '__notionEndpointCalls', '__linearEndpointCalls',
  '__stripeEndpointCalls', '__antdproEndpointCalls', '__calEndpointCalls',
  '__airtableTestHooks', '__notionTestHooks', '__linearTestHooks',
  '__stripeTestHooks', '__calTestHooks',
];

afterEach(() => {
  for (const key of HOOK_GLOBALS) delete (globalThis as Record<string, unknown>)[key];
});

function setGlobal<T>(name: string, value: T): T {
  (globalThis as Record<string, unknown>)[name] = value;
  return value;
}

/* ── 1. 21-face unknown-endpoint fallback matrix ────────────────────────── */

type Face = { status: number; ok: boolean; error?: string } | null;

const FALLBACK_MATRIX: Array<{
  domain: string;
  prefix: string;
  makeBranch: () => BranchHandler;
  knownReadUrl: string;
  write: Face;
  method: Face;
  read: Face;
}> = [
  {
    domain: 'airtable',
    prefix: '/r/Airtable__',
    makeBranch: () => createAirtableFetcherBranch(createAirtableDatabase(), clone),
    knownReadUrl: '/r/Airtable__records',
    write: { status: 1, ok: false, error: 'unknown Airtable write endpoint' },
    method: { status: 1, ok: false, error: 'unknown Airtable endpoint' },
    read: { status: 0, ok: false, error: 'unknown replica endpoint' },
  },
  {
    domain: 'notion',
    prefix: '/r/Notion__',
    makeBranch: () => createNotionFetcherBranch(createNotionDatabase(), clone),
    knownReadUrl: '/r/Notion__records',
    write: { status: 1, ok: false, error: 'unknown Notion write endpoint' },
    method: { status: 1, ok: false, error: 'unknown Notion endpoint' },
    read: { status: 0, ok: false, error: 'unknown replica endpoint' },
  },
  {
    domain: 'stripe',
    prefix: '/r/Stripe__',
    makeBranch: () => createStripeFetcherBranch(createStripeDatabase(), clone),
    knownReadUrl: '/r/Stripe__payments',
    write: { status: 1, ok: false, error: 'unknown Stripe endpoint' },
    method: { status: 1, ok: false, error: 'unknown Stripe endpoint' },
    read: { status: 0, ok: false, error: 'unknown replica endpoint' },
  },
  {
    domain: 'linear',
    prefix: '/r/Linear__',
    makeBranch: () => createLinearFetcherBranch(createLinearDatabase(), clone),
    knownReadUrl: '/r/Linear__issues',
    write: { status: 1, ok: false, error: 'unknown Linear write endpoint' },
    method: null,
    read: null,
  },
  {
    domain: 'antdpro',
    prefix: '/r/AntdPro__',
    makeBranch: () => createAntdProFetcherBranch(createAntdProOrders(), clone),
    knownReadUrl: '/r/AntdPro__orders',
    write: null,
    method: null,
    read: null,
  },
  {
    domain: 'cal',
    prefix: '/r/Cal__',
    makeBranch: () => createCalFetcherBranch(createCalEventMeta(), clone),
    knownReadUrl: '/r/Cal__slots',
    write: null,
    method: null,
    read: null,
  },
  {
    domain: 'sundial',
    prefix: '/r/Sundial__',
    makeBranch: () => createSundialFetcherBranch(createMockDatabase(), clone),
    knownReadUrl: '/r/Sundial__summary',
    write: null,
    method: null,
    read: null,
  },
];

function expectFace(actual: { status: number; data: unknown } | null, face: Face, label: string): void {
  if (face === null) {
    expect(actual, label).toBeNull();
    return;
  }
  expect(actual, label).not.toBeNull();
  expect(actual!.status, `${label} status`).toBe(face.status);
  expect((actual!.data as { ok?: unknown }).ok, `${label} ok flag`).toBe(face.ok);
  if (face.error !== undefined) {
    expect((actual!.data as { error?: unknown }).error, `${label} error`).toBe(face.error);
  }
}

describe('plan 599 Phase 1 — 21-face unknown-endpoint fallback matrix (7 domains × write/method/read)', () => {
  for (const spec of FALLBACK_MATRIX) {
    it(`${spec.domain}: write/method/read slot faces stay at their R1-verified values`, () => {
      const branch = spec.makeBranch();
      expectFace(
        branch({ url: `${spec.prefix}kitUnknownProbe`, method: 'post', params: {}, body: {} }),
        spec.write,
        `${spec.domain} write slot`,
      );
      expectFace(
        branch({ url: spec.knownReadUrl, method: 'put', params: {}, body: {} }),
        spec.method,
        `${spec.domain} method slot`,
      );
      expectFace(
        branch({ url: `${spec.prefix}kitUnknownProbe`, method: 'get', params: {}, body: {} }),
        spec.read,
        `${spec.domain} read slot`,
      );
    });
  }
});

/* ── 2. paginate two shapes ─────────────────────────────────────────────── */

interface AShapePaginate {
  <R>(rows: R[], page: number, pageSize: number): {
    items: R[]; total: number; page: number; pageSize: number; pages: number;
  };
}

describe('plan 599 Phase 1 — paginate A shape (clampPages: true semantics, ×3 verbatim twins)', () => {
  const aShapes: Array<{ name: string; paginate: AShapePaginate }> = [
    { name: 'paginateNotion', paginate: paginateNotion },
    { name: 'paginateLinear', paginate: paginateLinear },
    { name: 'paginateAntdPro', paginate: paginateAntdPro },
  ];

  it('empty rows still yield pages=1 (Math.max(1, ceil) clamp) and echo pageSize', () => {
    for (const { name, paginate } of aShapes) {
      const empty = paginate([], 5, 3);
      expect(empty.pages, name).toBe(1);
      expect(empty.page, name).toBe(5);
      expect(empty.pageSize, name).toBe(3);
      expect(empty.items, name).toEqual([]);
      expect(empty.total, name).toBe(0);
    }
  });

  it('page/size clamp at 1; pages = ceil(total/size)', () => {
    const rows = ['a', 'b', 'c'];
    for (const { name, paginate } of aShapes) {
      const paged = paginate(rows, -1, -2);
      expect(paged.page, name).toBe(1);
      expect(paged.pageSize, name).toBe(1);
      expect(paged.pages, name).toBe(3);
      expect(paged.items, name).toEqual(['a']);
    }
  });
});

describe('plan 599 Phase 1 — paginate B shape (clampPages: false semantics, ×2 verbatim twins)', () => {
  it('empty rows yield pages=0 (unclamped ceil) — the clampPages:false boundary discriminator', () => {
    const at = paginateAirtable([], 1, 10);
    expect(at.pages).toBe(0);
    expect(at.page).toBe(1);
    expect(at.perPage).toBe(10);
    expect(at.items).toEqual([]);
    expect(at.total).toBe(0);

    const st = paginateStPayments([], 3, 10);
    expect(st.pages).toBe(0);
    expect(st.page).toBe(3);
    expect(st.perPage).toBe(10);
  });

  it('page/size clamp at 1; perPage echo; rows pass through the projection', () => {
    const atRows = createAirtableRecords().slice(0, 2);
    const at = paginateAirtable(atRows, -1, -5);
    expect(at.page).toBe(1);
    expect(at.perPage).toBe(1);
    expect(at.pages).toBe(2);
    expect(at.items).toHaveLength(1);
    expect(typeof at.items[0].amountLabel).toBe('string');

    const stRows = createStripePayments().slice(0, 2);
    const st = paginateStPayments(stRows, -3, 0);
    expect(st.page).toBe(1);
    expect(st.perPage).toBe(1);
    expect(st.pages).toBe(2);
    expect(typeof st.items[0].amountLabel).toBe('string');
  });

  it('side-by-side on identical empty input: A clamps to pages=1, B stays pages=0', () => {
    expect(paginateLinear([], 1, 10).pages).toBe(1);
    expect(paginateAirtable([], 1, 10).pages).toBe(0);
  });
});

/* ── 3. showcase-env inline pagination triple envelope ──────────────────── */

describe('plan 599 Phase 1 — showcase-env inline pagination triple serves exactly {items,total} (R1 M1 envelope trap)', () => {
  it('Department__findPage + Tag__findPage (qs-driven): no page/pageSize/pages echo', async () => {
    const { env, db } = createShowcaseEnv();
    const dept = await callEnv<{ items: Array<{ id: string }>; total: number }>(
      env, { url: '/r/Department__findPage?page=2&perPage=5', method: 'get' },
    );
    expect(dept.status).toBe(0);
    expect(Object.keys(dept.data).sort()).toEqual(['items', 'total']);
    expect(dept.data.items).toHaveLength(5);
    expect(dept.data.items[0].id).toBe(db.depts[5].id);
    expect(dept.data.total).toBe(db.depts.length);

    const tag = await callEnv<{ items: Array<{ id: string }>; total: number }>(
      env, { url: '/r/Tag__findPage?page=2&perPage=4', method: 'get' },
    );
    expect(Object.keys(tag.data).sort()).toEqual(['items', 'total']);
    expect(tag.data.items[0].id).toBe(db.tags[4].id);
  });

  it('OrderItem__findPage (body-driven): exactly {items,total} — full-envelope expansion is the red discriminator', async () => {
    const { env, db } = createShowcaseEnv();
    const orderId = db.orders[2].id;
    const res = await callEnv<{ items: unknown[]; total: number }>(
      env, { url: '/r/OrderItem__findPage', method: 'post', data: { orderId, page: 2, pageSize: 2 } },
    );
    expect(res.status).toBe(0);
    expect(Object.keys(res.data).sort()).toEqual(['items', 'total']);
    expect(res.data.total).toBe(3);
    expect(res.data.items).toHaveLength(1);
  });
});

/* ── 4. endpoint-count opt-in hooks (two forms) ─────────────────────────── */

describe('plan 599 Phase 1 — endpoint-count hooks: named-helper ×4 (stripe +lastUrl) / inline ×2', () => {
  it('named-helper form: airtable/notion/linear count per sliced endpoint name, counting before dispatch', () => {
    const atCounters = setGlobal<Record<string, number>>('__airtableEndpointCalls', {});
    const atBranch = createAirtableFetcherBranch(createAirtableDatabase(), clone);
    atBranch({ url: '/r/Airtable__records?page=2', method: 'get', params: {}, body: {} });
    atBranch({ url: '/r/Airtable__records', method: 'get', params: {}, body: {} });
    atBranch({ url: '/r/Airtable__record?id=AT-101', method: 'get', params: {}, body: {} });
    atBranch({ url: '/r/Airtable__kitUnknownProbe', method: 'get', params: {}, body: {} });
    expect(atCounters).toEqual({
      Airtable__records: 2, Airtable__record: 1, Airtable__kitUnknownProbe: 1,
    });

    const ntCounters = setGlobal<Record<string, number>>('__notionEndpointCalls', {});
    createNotionFetcherBranch(createNotionDatabase(), clone)({ url: '/r/Notion__records?view=table', method: 'get', params: {}, body: {} });
    expect(ntCounters).toEqual({ Notion__records: 1 });

    const lnCounters = setGlobal<Record<string, number>>('__linearEndpointCalls', {});
    createLinearFetcherBranch(createLinearDatabase(), clone)({ url: '/r/Linear__issues?page=1', method: 'get', params: {}, body: {} });
    expect(lnCounters).toEqual({ Linear__issues: 1 });
  });

  it('stripe named-helper variant additionally records lastUrl on the test hooks', () => {
    setGlobal<Record<string, number>>('__stripeEndpointCalls', {});
    const hooks = setGlobal<{ lastUrl?: string }>('__stripeTestHooks', {});
    createStripeFetcherBranch(createStripeDatabase(), clone)({
      url: '/r/Stripe__payments?page=2', method: 'get', params: {}, body: {},
    });
    expect(hooks.lastUrl).toBe('/r/Stripe__payments?page=2');
  });

  it('inline form: antdpro/cal count inside the branch body', () => {
    const apCounters = setGlobal<Record<string, number>>('__antdproEndpointCalls', {});
    createAntdProFetcherBranch(createAntdProOrders(), clone)({ url: '/r/AntdPro__orders', method: 'get', params: {}, body: {} });
    expect(apCounters).toEqual({ AntdPro__orders: 1 });

    const calCounters = setGlobal<Record<string, number>>('__calEndpointCalls', {});
    createCalFetcherBranch(createCalEventMeta(), clone)({ url: '/r/Cal__slots', method: 'get', params: {}, body: {} });
    expect(calCounters).toEqual({ Cal__slots: 1 });
  });

  it('production no-op: absent globals stay absent and the branch still serves reads', () => {
    const branch = createAirtableFetcherBranch(createAirtableDatabase(), clone);
    const res = branch({ url: '/r/Airtable__records', method: 'get', params: {}, body: {} });
    expect(res?.status).toBe(0);
    expect((globalThis as Record<string, unknown>).__airtableEndpointCalls).toBeUndefined();
  });
});

/* ── 5. opt-in e2e test hooks (two forms) ───────────────────────────────── */

describe('plan 599 Phase 1 — e2e hooks: flag-reset ×4 / function-injection ×1', () => {
  it('flag-reset form: branch factory creation resets the forced-miss flags', () => {
    const atHooks = setGlobal<{ updateMiss?: boolean }>('__airtableTestHooks', { updateMiss: true });
    createAirtableFetcherBranch(createAirtableDatabase(), clone);
    expect(atHooks.updateMiss).toBe(false);

    const ntHooks = setGlobal<{ moveMiss?: boolean; updateMiss?: boolean }>('__notionTestHooks', { moveMiss: true, updateMiss: true });
    createNotionFetcherBranch(createNotionDatabase(), clone);
    expect(ntHooks.moveMiss).toBe(false);
    expect(ntHooks.updateMiss).toBe(false);

    const lnHooks = setGlobal<{ moveMiss?: boolean }>('__linearTestHooks', { moveMiss: true });
    createLinearFetcherBranch(createLinearDatabase(), clone);
    expect(lnHooks.moveMiss).toBe(false);

    const stHooks = setGlobal<{ refundMiss?: boolean }>('__stripeTestHooks', { refundMiss: true });
    createStripeFetcherBranch(createStripeDatabase(), clone);
    expect(stHooks.refundMiss).toBe(false);
  });

  it('airtable flag drives the forced miss through the exact endpoint path', () => {
    const hooks = setGlobal<{ updateMiss?: boolean }>('__airtableTestHooks', {});
    const branch = createAirtableFetcherBranch(createAirtableDatabase(), clone);
    hooks.updateMiss = true;
    const res = branch({ url: '/r/Airtable__updateRecord', method: 'post', params: {}, body: { id: 'AT-101' } });
    expect(res?.status).toBe(1);
    expect((res!.data as { error?: string }).error).toBe('forced update miss');
  });

  it('function-injection form: cal receives selectSlot(slotId) driving the exact endpoint path', () => {
    const hooks = setGlobal<{ selectSlot?: (slotId: string) => void }>('__calTestHooks', {});
    const branch = createCalFetcherBranch(createCalEventMeta(), clone);
    expect(typeof hooks.selectSlot).toBe('function');
    hooks.selectSlot!(calSlotId(CAL_DEFAULT_DATE, 30, '10:00'));
    const draft = branch({ url: '/r/Cal__selectedSlot', method: 'get', params: {}, body: {} });
    expect((draft!.data as { active: boolean }).active).toBe(true);
  });
});

/* ── 6. STATUS_LABELS consumption semantics ─────────────────────────────── */

describe('plan 599 Phase 1 — STATUS_LABELS consumption (4 fallback sites + :479 no-fallback latent)', () => {
  it('approval findPage keeps the ?? raw fallback for unknown statuses (:252)', async () => {
    const { env, db } = createShowcaseEnv();
    db.approvalTasks.push({
      ...db.approvalTasks[0],
      id: 't-kit-x',
      status: 'kit-unknown' as typeof db.approvalTasks[number]['status'],
    });
    const res = await callEnv<{ items: Array<{ id: string; status_label?: string }> }>(
      env, { url: '/r/ApprovalTask__findPage', method: 'get' },
    );
    expect(res.data.items.find((t) => t.id === 't-kit-x')?.status_label).toBe('kit-unknown');
    expect(res.data.items.find((t) => t.id === db.approvalTasks[0].id)?.status_label).toBe('待审批');
  });

  it('payment find keeps the ?? raw fallback for unknown status/method (:360-361)', async () => {
    const { env, db } = createShowcaseEnv();
    const orderId = db.orders[1].id;
    db.payments.push({
      ...db.payments[0], id: 'p-kit-x', orderId,
      status: 'kit-s' as typeof db.payments[number]['status'],
      method: 'kit-m' as typeof db.payments[number]['method'],
    });
    const res = await callEnv<{ items: Array<{ id: string; status_label?: string; method_label?: string }> }>(
      env, { url: '/r/Payment__find', method: 'get', params: { orderId } },
    );
    const row = res.data.items.find((p) => p.id === 'p-kit-x');
    expect(row?.status_label).toBe('kit-s');
    expect(row?.method_label).toBe('kit-m');
  });

  it('Dashboard approvals (:476-479): pending-only rows labeled from the map — the no-fallback consumption is latent because the filter pins status=pending', async () => {
    const { env } = createShowcaseEnv();
    const res = await callEnv<{ items: Array<{ status: string; status_label: string }> }>(
      env, { url: '/r/Dashboard__approvals', method: 'get' },
    );
    expect(res.data.items.length).toBeGreaterThan(0);
    for (const item of res.data.items) {
      expect(item.status).toBe('pending');
      expect(item.status_label).toBe('待审批');
    }
  });

  it('mock-backend dict label helpers keep the ?? raw fallback (:201/:225)', () => {
    const db = createMockDatabase();
    expect(toUserListRecord({
      ...db.users[0],
      status: '9' as UserRecord['status'],
      gender: '9' as UserRecord['gender'],
    })).toMatchObject({ status_label: '9', gender_label: '9' });
    expect(toOrderListRecord({
      ...db.orders[0],
      status: 'kit' as OrderRecord['status'],
      channel: 'kit' as OrderRecord['channel'],
    })).toMatchObject({ status_label: 'kit', channel_label: 'kit' });
  });
});

/* ── 7. orderId extraction forms ────────────────────────────────────────── */

describe('plan 599 Phase 1 — orderId extraction (1 body-only + 5 body-then-params + 1 write variant)', () => {
  it('OrderItem__findPage is body-only (:293): params.orderId is ignored', async () => {
    const { env, db } = createShowcaseEnv();
    const orderId = db.orders[2].id;
    const viaBody = await callEnv<{ total: number }>(
      env, { url: '/r/OrderItem__findPage', method: 'post', data: { orderId } },
    );
    expect(viaBody.data.total).toBe(3);
    const viaParams = await callEnv<{ total: number }>(
      env, { url: '/r/OrderItem__findPage', method: 'post', params: { orderId }, data: {} },
    );
    expect(viaParams.data.total).toBe(0);
  });

  it('five read endpoints are body-then-params with body precedence (:334/:341/:346/:353/:366)', async () => {
    const { env, db } = createShowcaseEnv();
    const rich = db.orders[2].id;
    const poor = db.orders[0].id;
    const paramsOnly = await callEnv<{ total: number }>(
      env, { url: '/r/OrderItem__find', method: 'get', params: { orderId: rich } },
    );
    expect(paramsOnly.data.total).toBe(3);
    const bodyWins = await callEnv<{ total: number }>(
      env, { url: '/r/OrderItem__find', method: 'get', params: { orderId: rich }, data: { orderId: poor } },
    );
    expect(bodyWins.data.total).toBe(1);

    expect((await callEnv<{ total: number }>(env, { url: '/r/OrderLog__find', method: 'get', params: { orderId: poor } })).data.total).toBe(1);
    expect((await callEnv<{ total: number }>(env, { url: '/r/Address__find', method: 'get', params: { orderId: poor } })).data.total).toBe(1);
    const paidOrder = db.orders.find((o) => o.status === 'paid')!.id;
    expect((await callEnv<{ total: number }>(env, { url: '/r/Payment__find', method: 'get', params: { orderId: paidOrder } })).data.total).toBe(1);
    const doneOrder = db.orders.find((o) => o.status === 'done')!.id;
    expect((await callEnv<{ total: number }>(env, { url: '/r/Shipment__find', method: 'get', params: { orderId: doneOrder } })).data.total).toBe(1);
  });

  it('write-path variant (:318): OrderItem__save takes source.orderId ?? body.orderId', async () => {
    const { env, db } = createShowcaseEnv();
    const orderId = db.orders[2].id;
    await callEnv(env, {
      url: '/r/OrderItem__save', method: 'post',
      data: { orderId, record: { name: 'kit 增补明细', sku: 'SKU-KIT', qty: 1, price: 9.9 } },
    });
    const items = await callEnv<{ total: number }>(
      env, { url: '/r/OrderItem__find', method: 'get', params: { orderId } },
    );
    expect(items.data.total).toBe(4);
  });
});

/* ── 8. patch/record unwrap ─────────────────────────────────────────────── */

describe('plan 599 Phase 1 — unwrapPatch: 5 verbatim .patch twins + .record variant', () => {
  it('patch key: nested patch wins over flat keys; flat body works; array patch falls back to body (empty patch)', () => {
    const db = createAirtableDatabase();
    const branch = createAirtableFetcherBranch(db, clone);
    const post = (body: Record<string, unknown>) =>
      branch({ url: '/r/Airtable__updateRecord', method: 'post', params: {}, body })!;
    expect(post({ id: 'AT-101', title: '扁平标题', patch: { title: '嵌套标题' } }).status).toBe(0);
    expect(db.records.find((r) => r.id === 'AT-101')!.title).toBe('嵌套标题');
    expect(post({ id: 'AT-101', title: '扁平标题2' }).status).toBe(0);
    expect(db.records.find((r) => r.id === 'AT-101')!.title).toBe('扁平标题2');
    const arrayPatch = post({ id: 'AT-101', patch: ['not', 'an', 'object'] });
    expect(arrayPatch.status).toBe(1);
    expect((arrayPatch.data as { error?: string }).error).toBe('empty patch');
  });

  it('record key (showcase-env variant): record wins over body at OrderItem__save and Budget__save', async () => {
    const { env, db } = createShowcaseEnv();
    const target = db.orderItems[0];
    await callEnv(env, {
      url: '/r/OrderItem__save', method: 'post',
      data: { id: target.id, name: '外层名', record: { id: target.id, name: '内层名' } },
    });
    const found = await callEnv<{ items: Array<{ id: string; name: string }> }>(
      env, { url: '/r/OrderItem__find', method: 'get', params: { orderId: target.orderId } },
    );
    expect(found.data.items.find((i) => i.id === target.id)!.name).toBe('内层名');

    await callEnv(env, {
      url: '/r/Budget__save', method: 'post',
      data: { id: 'b1', q1: 999, record: { id: 'b1', q1: 111 } },
    });
    const budgets = await callEnv<{ items: Array<{ id: string; total: number }> }>(
      env, { url: '/r/Budget__find', method: 'get' },
    );
    expect(budgets.data.items.find((b) => b.id === 'b1')!.total).toBe(276);
  });
});

/* ── 9. placeholder records ─────────────────────────────────────────────── */

describe('plan 599 Phase 1 — placeholder records (3+1 variants)', () => {
  it('airtable record miss → placeholder row (占位样本 title, fallback fields, id preserved)', () => {
    const branch = createAirtableFetcherBranch(createAirtableDatabase(), clone);
    const res = branch({ url: '/r/Airtable__record?id=AT-999', method: 'get', params: {}, body: {} })!;
    expect(res.status).toBe(0);
    const row = res.data as { id: string; title: string; amount: number };
    expect(row.id).toBe('AT-999');
    expect(row.title).toBe('未找到记录（占位样本）');
    expect(row.amount).toBe(createAirtableRecords()[0].amount);
  });

  it('notion record miss → inline placeholder; card- prefix tolerated on the hit path', () => {
    const branch = createNotionFetcherBranch(createNotionDatabase(), clone);
    const hit = branch({ url: '/r/Notion__record?id=card-REC-101', method: 'get', params: {}, body: {} })!;
    expect((hit.data as { id: string }).id).toBe('REC-101');
    const miss = branch({ url: '/r/Notion__record?id=REC-999', method: 'get', params: {}, body: {} })!;
    const row = miss.data as { id: string; title: string };
    expect(row.id).toBe('REC-999');
    expect(row.title).toBe('未找到记录（占位样本）');
  });

  it('stripe payment miss → placeholder payment (customer 占位样本 + description 占位记录)', () => {
    const branch = createStripeFetcherBranch(createStripeDatabase(), clone);
    const res = branch({ url: '/r/Stripe__payment?id=TX-999', method: 'get', params: {}, body: {} })!;
    const row = res.data as { id: string; customer: string; description: string };
    expect(row.id).toBe('TX-999');
    expect(row.customer).toBe('未找到交易（占位样本）');
    expect(row.description).toBe('占位记录');
  });

  it('cal event miss → placeholder event (预约活动（占位）); known id keeps the real title', () => {
    const event = createCalEventMeta();
    const branch = createCalFetcherBranch(event, clone);
    const miss = branch({ url: '/r/Cal__event?id=other-event', method: 'get', params: {}, body: {} })!;
    expect((miss.data as { id: string; title: string })).toMatchObject({ id: 'other-event', title: '预约活动（占位）' });
    const hit = branch({ url: `/r/Cal__event?id=${event.id}`, method: 'get', params: {}, body: {} })!;
    expect((hit.data as { title: string }).title).toBe(event.title);
  });

  it('linear detail miss → placeholder detail record', () => {
    const detail = buildLinearIssueDetail(createLinearIssues(), 'ENG-999');
    expect(detail.placeholder).toBe(true);
    expect(detail.title).toBe('未找到对应问题');
  });
});

/* ── 10. asNumber + read-closure precedence + branch-loop dispatch ──────── */

describe('plan 599 Phase 1 — asNumber ×3 twins / read-closure precedence / [prefix,handler] loop', () => {
  it('antdpro asNumber alias: saveOrder amount string coerced to number', async () => {
    const { env } = createShowcaseEnv();
    const saved = await callEnv<{ ok: boolean }>(
      env, { url: '/r/AntdPro__saveOrder', method: 'post', data: { id: 'A1001', amount: '123.45' } },
    );
    expect(saved.data.ok).toBe(true);
    const detail = await callEnv<{ amountText: string }>(
      env, { url: '/r/AntdPro__orderDetail?id=A1001', method: 'get' },
    );
    expect(detail.data.amountText).toBe('¥ 123.45');
  });

  it('sundial-branch asNumber: string id coerced; invalid/missing id → status 1 missing id', () => {
    const branch = createSundialFetcherBranch(createMockDatabase(), clone);
    const ok = branch({ url: '/r/Sundial__updateTodoItem', method: 'post', params: {}, body: { id: '3', done: true } })!;
    expect(ok.status).toBe(0);
    expect((ok.data as { task: { done: boolean } }).task.done).toBe(true);
    const invalid = branch({ url: '/r/Sundial__updateTodoItem', method: 'post', params: {}, body: { id: 'abc' } })!;
    expect(invalid.status).toBe(1);
    expect((invalid.data as { error?: string }).error).toBe('missing id');
    const missing = branch({ url: '/r/Sundial__updateTodoItem', method: 'post', params: {}, body: {} })!;
    expect(missing.status).toBe(1);
  });

  it('showcase-env asNumber: User__findPage minId/maxId string coercion', async () => {
    const { env } = createShowcaseEnv();
    const res = await callEnv<{ items: Array<{ id: number }> }>(
      env, { url: '/r/User__findPage', method: 'get', params: { minId: '30', maxId: '32' } },
    );
    expect(res.data.items.map((u) => u.id).sort((a, b) => a - b)).toEqual([30, 31, 32]);
  });

  it('read-closure precedence params ?? body ?? qs (six verbatim twins; stripe representative)', () => {
    const branch = createStripeFetcherBranch(createStripeDatabase(), clone);
    const call = (params: Record<string, unknown>, body: Record<string, unknown>, url: string) =>
      (branch({ url, method: 'get', params, body })!.data as { page: number; perPage: number });
    expect(call({ page: '2', perPage: '20' }, { page: '3', perPage: '30' }, '/r/Stripe__payments?page=4&perPage=40'))
      .toMatchObject({ page: 2, perPage: 20 });
    expect(call({}, { page: '3', perPage: '30' }, '/r/Stripe__payments?page=4&perPage=40'))
      .toMatchObject({ page: 3, perPage: 30 });
    expect(call({}, {}, '/r/Stripe__payments?page=4&perPage=40'))
      .toMatchObject({ page: 4, perPage: 40 });
  });

  it('A-shape echo surfaces through the antdpro branch (pageSize echo + qs-driven read)', async () => {
    const { env } = createShowcaseEnv();
    const res = await callEnv<{ page: number; pageSize: number; pages: number }>(
      env, { url: '/r/AntdPro__orders?page=2&perPage=7', method: 'get' },
    );
    expect(res.data).toMatchObject({ page: 2, pageSize: 7 });
    expect(res.data.pages).toBeGreaterThanOrEqual(3);
  });

  it('branch loop: first matching prefix wins, null fall-through continues, exhaust → {status:0, data:null}', async () => {
    const { env } = createShowcaseEnv();
    const routed = await callEnv<{ items: unknown[]; perPage: number; pages: number }>(
      env, { url: '/r/Stripe__payments?perPage=1', method: 'get' },
    );
    expect(routed.data.perPage).toBe(1);
    expect(routed.data.pages).toBeGreaterThanOrEqual(1);

    const continued = await callEnv<{ items: unknown[] }>(
      env, { url: '/r/AntdPro__/r/Stripe__payments', method: 'get' },
    );
    expect(Array.isArray(continued.data.items)).toBe(true);

    const exhausted = await callEnv<null>(env, { url: '/r/Kit__nowhere', method: 'get' });
    expect(exhausted).toEqual({ status: 0, data: null });
  });
});
