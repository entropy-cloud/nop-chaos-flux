import { describe, expect, it } from 'vitest';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
import {
  createStripeDatabase,
  createStripeFetcherBranch,
  createStripePayments,
  createStripeOverview,
  createStripeEmptyOverview,
  filterStPayments,
  formatStAmount,
  paginateStPayments,
  ST_BRANDS,
  ST_CURRENCY_META,
  ST_RISK_META,
  ST_STATUS_META,
  toStPaymentRow,
} from '../shared/mock-backend-stripe';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

const fetchCtx = { scope: null } as unknown as ApiRequestContext;

describe('Stripe mock backend — dataset & status coverage', () => {
  it('ships 36 payments so the default pageSize 10 yields ≥3 pages', () => {
    const payments = createStripePayments();
    expect(payments.length).toBeGreaterThanOrEqual(30);
    const paged = paginateStPayments(payments, 1, 10);
    expect(paged.pages).toBeGreaterThanOrEqual(3);
    expect(paged.total).toBe(payments.length);
    expect(paged.items).toHaveLength(10);
  });

  it('covers all four status semantics with the ladder-pair pill classes', () => {
    const payments = createStripePayments();
    for (const status of ['succeeded', 'pending', 'failed', 'refunded'] as const) {
      expect(payments.some((r) => r.status === status)).toBe(true);
    }
    const meta = ST_STATUS_META;
    expect(meta.succeeded.pillClass).toBe('st-pill st-pill-ok');
    expect(meta.pending.pillClass).toBe('st-pill st-pill-pending');
    expect(meta.failed.pillClass).toBe('st-pill st-pill-failed');
    expect(meta.refunded.pillClass).toBe('st-pill st-pill-refunded');
    expect(Object.keys(meta)).toHaveLength(4);
  });

  it('declares currency decimals samples (JPY 0-decimal contrast) and formats amounts accordingly', () => {
    expect(ST_CURRENCY_META.JPY.decimals).toBe(0);
    expect(ST_CURRENCY_META.CNY.decimals).toBe(2);
    expect(formatStAmount('CNY', 123456)).toBe('CN¥1,234.56');
    expect(formatStAmount('USD', 990)).toBe('$9.90');
    expect(formatStAmount('JPY', 128000)).toBe('JP¥128,000');
    expect(formatStAmount('EUR', 50)).toBe('€0.50');
  });

  it('rows carry precomputed pill/chip classes and display labels', () => {
    const rows = createStripePayments().map(toStPaymentRow);
    for (const row of rows) {
      expect(row.statusPillClass).toMatch(/^st-pill st-pill-(ok|pending|failed|refunded)$/);
      expect(row.statusLabel.length).toBeGreaterThan(0);
      expect(row.amountLabel).toMatch(/^(CN¥|\$|€|£|JP¥)[\d,]+(\.\d{2})?$/);
      expect(row.methodLabel).toContain('••••');
      expect(row.methodLabel.endsWith(row.last4)).toBe(true);
      expect(row.dateLabel).toContain('月');
      expect(row.riskChipClass).toMatch(/^st-chip-risk st-chip-risk-(normal|elevated|high)$/);
    }
    const riskSet = new Set(rows.map((r) => r.risk));
    expect(riskSet.size).toBe(3);
    expect(Object.keys(ST_RISK_META)).toHaveLength(3);
    expect(ST_BRANDS.length).toBeGreaterThanOrEqual(4);
  });

  it('timeline partitions by status; metadata carries four rows', () => {
    const rows = createStripePayments().map(toStPaymentRow);
    const succeeded = rows.find((r) => r.status === 'succeeded')!;
    expect(succeeded.timeline.some((e) => e.label.includes('收款成功'))).toBe(true);
    const pending = rows.find((r) => r.status === 'pending')!;
    expect(pending.timeline.some((e) => e.tone === 'pending')).toBe(true);
    const failed = rows.find((r) => r.status === 'failed')!;
    expect(failed.timeline.some((e) => e.tone === 'failed')).toBe(true);
    const refunded = rows.find((r) => r.status === 'refunded')!;
    expect(refunded.timeline.filter((e) => e.label.includes('退款')).length).toBe(2);
    for (const row of rows) {
      expect(row.metadata).toHaveLength(4);
      expect(row.metadata[0].label).toBe('订单号');
    }
  });

  it('dual-track amount formatting: expression track (toFixed) works but lacks thousands separators vs the mock track', () => {
    // mock 轨（预计算）：币种符号 + 千分位 + 按币种小数位
    expect(formatStAmount('CNY', 123456)).toBe('CN¥1,234.56');
    expect(formatStAmount('JPY', 128000)).toBe('JP¥128,000');
    // 表达式轨（schema 内 `${'CN¥' + (amountMinor / 100).toFixed(2)}`）：
    // toFixed 可承载但无千分位，且按币种小数位需另写分支——两轨对照样本
    expect('CN¥' + (123456 / 100).toFixed(2)).toBe('CN¥1234.56');
    expect('CN¥' + (123456 / 100).toFixed(2)).not.toBe(formatStAmount('CNY', 123456));
  });

  it('st-payments-miss: zero-match keyword returns an empty array without error', () => {
    expect(filterStPayments(createStripePayments(), '绝不存在的关键词xyz')).toEqual([]);
    expect(filterStPayments(createStripePayments(), '')).toHaveLength(36);
    expect(filterStPayments(createStripePayments(), undefined, 'bogus')).toHaveLength(36);
  });
});

describe('Stripe fetcher branch (get-only)', () => {
  const db = createStripeDatabase();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const branch = createStripeFetcherBranch(db, clone);

  function call(url: string, method = 'get'): { status: number; data: unknown } | null {
    return branch({ url, method, params: {}, body: {} });
  }

  it('returns null for non-Stripe endpoints; non-get methods fail (P7a get-only contract)', () => {
    expect(call('/r/User__findPage')).toBeNull();
    expect(call('/r/Stripe__payments', 'post')?.status).toBe(1);
    expect(call('/r/Stripe__payment?id=TX-1001', 'put')?.status).toBe(1);
  });

  it('serves the list payload with paging; default request returns 10 of 36', () => {
    const full = call('/r/Stripe__payments?perPage=100')?.data as {
      items: unknown[];
      total: number;
      pages: number;
    };
    expect(full.items).toHaveLength(36);
    expect(full.total).toBe(36);
    const paged = call('/r/Stripe__payments')?.data as { items: unknown[]; total: number; perPage: number };
    expect(paged.items).toHaveLength(10);
    expect(paged.perPage).toBe(10);
    expect(paged.total).toBe(36);
  });

  it('st-payments-miss: zero-match keyword yields empty items with status 0', () => {
    const res = call('/r/Stripe__payments?keyword=绝不存在的关键词xyz')?.data as {
      items: unknown[];
      total: number;
    };
    expect(res.items).toHaveLength(0);
    expect(res.total).toBe(0);
  });

  it('enum status narrows the list; st-status-unknown falls back to the full default shape', () => {
    const db = createStripeDatabase();
    const succeeded = db.payments.filter((r) => r.status === 'succeeded').length;
    const filtered = call(`/r/Stripe__payments?status=succeeded`)?.data as { total: number };
    expect(filtered.total).toBe(succeeded);
    const unknown = call('/r/Stripe__payments?status=canceled')?.data as { total: number };
    expect(unknown.total).toBe(36);
  });

  it('st-payment-miss: unknown id serves the placeholder row', () => {
    const hit = call('/r/Stripe__payment?id=TX-1001')?.data as { id: string; customer: string };
    expect(hit.id).toBe('TX-1001');
    expect(hit.customer).not.toContain('占位');
    const miss = call('/r/Stripe__payment?id=TX-9999')?.data as { id: string; customer: string };
    expect(miss.id).toBe('TX-9999');
    expect(miss.customer).toContain('占位');
  });

  it('serves the overview payload; st-overview-empty serves the empty-curve placeholder', () => {
    const overview = call('/r/Stripe__overview')?.data as {
      kpi: { netVolumeLabel: string; chargeCount: number };
      curve: Array<{ label: string; net: number; prev: number }>;
      total: number;
    };
    expect(overview.kpi.netVolumeLabel).toContain('CN¥');
    expect(overview.kpi.chargeCount).toBeGreaterThan(0);
    expect(overview.curve).toHaveLength(30);
    expect(overview.curve.every((p) => p.net > 0 && p.prev > 0)).toBe(true);
    expect(overview.total).toBe(30);
    expect(createStripeOverview().curve.length).toBe(30);
    const empty = call('/r/Stripe__overview?empty=1')?.data as {
      kpi: { chargeCount: number };
      curve: unknown[];
    };
    expect(empty.curve).toHaveLength(0);
    expect(empty.kpi.chargeCount).toBe(0);
    expect(createStripeEmptyOverview().curve).toHaveLength(0);
  });

  it('routes through createShowcaseEnv for every Stripe endpoint', async () => {
    const { env } = createShowcaseEnv();
    const list = await env.fetcher!<{ items: unknown[]; total: number }>(
      { url: '/r/Stripe__payments?perPage=100', method: 'get' },
      fetchCtx,
    );
    expect(list.status).toBe(0);
    expect(list.data?.total).toBe(36);
    const detail = await env.fetcher!<{ id: string }>(
      { url: '/r/Stripe__payment?id=TX-1002', method: 'get' },
      fetchCtx,
    );
    expect(detail.data?.id).toBe('TX-1002');
    const overview = await env.fetcher!<{ curve: unknown[] }>(
      { url: '/r/Stripe__overview', method: 'get' },
      fetchCtx,
    );
    expect(overview.data?.curve).toHaveLength(30);
    const rejected = await env.fetcher!<{ ok: boolean }>(
      { url: '/r/Stripe__payments', method: 'post' },
      fetchCtx,
    );
    expect(rejected.status).toBe(1);
  });
});

describe('Stripe replica registration', () => {
  it('registers the stripe-payments page as an app-replica entry', () => {
    const entry = COMPLEX_PAGE_ENTRIES.find((e) => e.id === 'stripe-payments');
    expect(entry?.category).toBe('app-replica');
    expect(entry?.features).toHaveLength(4);
    expect(entry?.description).toContain('Stripe__payments');
    expect(entry?.description).toContain('Stripe__overview');
    expect(entry?.features.join(',')).not.toContain('Stripe__');
  });
});

describe('Stripe fetcher branch (P7b writes & session filters)', () => {
  function makeBranch() {
    const db = createStripeDatabase();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    return { db, branch: createStripeFetcherBranch(db, clone) };
  }

  function cleanupHooks() {
    delete (globalThis as { __stripeTestHooks?: unknown }).__stripeTestHooks;
    delete (globalThis as { __stripeEndpointCalls?: unknown }).__stripeEndpointCalls;
  }

  it('st-export-empty: exportPayments with zero columns fails without session change', () => {
    const { db, branch } = makeBranch();
    const res = branch({
      url: '/r/Stripe__exportPayments?amount=&date=&status=',
      method: 'get',
      params: {},
      body: {},
    });
    expect(res?.status).toBe(1);
    expect((res?.data as { ok: boolean; error?: string }).ok).toBe(false);
    expect((res?.data as { error?: string }).error).toContain('no columns');
    expect(db.payments).toHaveLength(36);
  });

  it('exportPayments: selected columns serve an ok payload with count/columns/filename; zero side effects', () => {
    const { db, branch } = makeBranch();
    const res = branch({
      url: '/r/Stripe__exportPayments?amount=%E9%87%91%E9%A2%9D&date=%E6%97%A5%E6%9C%9F',
      method: 'get',
      params: {},
      body: {},
    });
    expect(res?.status).toBe(0);
    const data = res?.data as { ok: boolean; count: number; columns: string[]; filename: string };
    expect(data.ok).toBe(true);
    expect(data.count).toBe(36);
    expect(data.columns).toEqual(['金额', '日期']);
    expect(data.filename).toContain('.csv');
    expect(db.payments.filter((r) => r.status === 'refunded')).toHaveLength(6);
  });

  it('refundPayment: mutates the session row to refunded and appends a timeline event', () => {
    const { db, branch } = makeBranch();
    const before = db.payments.find((r) => r.id === 'TX-1001')!;
    expect(before.status).toBe('succeeded');
    expect(before.timeline.some((e) => e.label.includes('退款'))).toBe(false);

    const res = branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-1001' } });
    expect(res?.status).toBe(0);
    expect(res?.data).toMatchObject({ ok: true, id: 'TX-1001', status: 'refunded' });

    const after = db.payments.find((r) => r.id === 'TX-1001')!;
    expect(after.status).toBe('refunded');
    expect(after.timeline.some((e) => e.label.includes('退款'))).toBe(true);
    // list projection follows the session (refunded pill class)
    const list = branch({ url: '/r/Stripe__payments?perPage=100', method: 'get', params: {}, body: {} });
    const row = (list?.data as { items: Array<{ id: string; statusPillClass: string }> }).items.find(
      (r) => r.id === 'TX-1001',
    )!;
    expect(row.statusPillClass).toContain('st-pill-refunded');
  });

  it('st-refund-miss: unknown id and repeated refund fail without session change', () => {
    const { db, branch } = makeBranch();
    const miss = branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-9999' } });
    expect(miss?.status).toBe(1);
    expect((miss?.data as { error?: string }).error).toContain('not found');

    branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-1002' } });
    const repeat = branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-1002' } });
    expect(repeat?.status).toBe(1);
    expect((repeat?.data as { error?: string }).error).toContain('already refunded');
    expect(db.payments.filter((r) => r.status === 'refunded')).toHaveLength(7);
  });

  it('refundPayment: forced miss via opt-in __stripeTestHooks.refundMiss keeps the session unchanged', () => {
    const { db, branch } = makeBranch();
    (globalThis as { __stripeTestHooks?: { refundMiss: boolean } }).__stripeTestHooks = { refundMiss: true };
    try {
      const res = branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-1003' } });
      expect(res?.status).toBe(1);
      expect((res?.data as { error?: string }).error).toContain('not found');
      expect(db.payments.find((r) => r.id === 'TX-1003')!.status).toBe('pending');
    } finally {
      cleanupHooks();
    }
  });

  it('exportPayments post: checkbox boolean flags from the form body select columns (st-export-empty on empty set)', () => {
    const { db, branch } = makeBranch();
    const ok = branch({
      url: '/r/Stripe__exportPayments',
      method: 'post',
      params: {},
      body: { colAmount: true, colDate: false, colStatus: true, colCustomer: false, colMethod: false, id: 'TX-1001' },
    });
    expect(ok?.status).toBe(0);
    expect(ok?.data).toMatchObject({ ok: true, count: 36, columns: ['金额', '状态'] });

    const empty = branch({
      url: '/r/Stripe__exportPayments',
      method: 'post',
      params: {},
      body: { colAmount: false, colDate: false, colStatus: false, colCustomer: false, colMethod: false },
    });
    expect(empty?.status).toBe(1);
    expect((empty?.data as { error?: string }).error).toContain('no columns');
    expect(db.payments.filter((r) => r.status === 'refunded')).toHaveLength(6);
  });

  it('range filter: prev/mtd serve an empty list (outside the sample data month); other values serve the full set', () => {
    const { branch } = makeBranch();
    const total = (range: string) =>
      (branch({ url: `/r/Stripe__payments?perPage=100&range=${range}`, method: 'get', params: {}, body: {} })
        ?.data as { total: number }).total;
    expect(total('mtd')).toBe(0);
    expect(total('prev')).toBe(0);
    expect(total('lastmonth')).toBe(36);
    expect(total('custom')).toBe(36);
    expect(total('bogus')).toBe(36);
  });

  it('minAmount filter: major-unit numeric filter; invalid values fall back to the full set (st-filter-unknown)', () => {
    const { branch } = makeBranch();
    const total = (min: string) =>
      (branch({ url: `/r/Stripe__payments?perPage=100&minAmount=${encodeURIComponent(min)}`, method: 'get', params: {}, body: {} })
        ?.data as { total: number }).total;
    expect(total('340')).toBe(4);
    expect(total('0')).toBe(36);
    expect(total('abc')).toBe(36);
    expect(total('')).toBe(36);
  });

  it('overview range: ranges outside the sample month serve the empty payload', () => {
    const { branch } = makeBranch();
    const curve = (range: string) =>
      (branch({ url: `/r/Stripe__overview?range=${range}`, method: 'get', params: {}, body: {} })
        ?.data as { curve: unknown[]; kpi: { chargeCount: number } });
    expect(curve('mtd').curve).toHaveLength(0);
    expect(curve('mtd').kpi.chargeCount).toBe(0);
    expect(curve('prev').curve).toHaveLength(0);
    expect(curve('lastmonth').curve).toHaveLength(30);
  });

  it('counts endpoint calls via opt-in __stripeEndpointCalls and routes the refund write through showcase-env', async () => {
    (globalThis as { __stripeEndpointCalls?: Record<string, number> }).__stripeEndpointCalls = {};
    try {
      const { branch } = makeBranch();
      branch({ url: '/r/Stripe__payments?perPage=100', method: 'get', params: {}, body: {} });
      branch({ url: '/r/Stripe__refundPayment', method: 'post', params: {}, body: { id: 'TX-1004' } });
      const counters = (globalThis as { __stripeEndpointCalls?: Record<string, number> }).__stripeEndpointCalls!;
      expect(counters.Stripe__payments).toBeGreaterThanOrEqual(1);
      expect(counters.Stripe__refundPayment).toBe(1);

      const { env } = createShowcaseEnv();
      const refunded = await env.fetcher!<{ ok: boolean; status?: string }>(
        { url: '/r/Stripe__refundPayment', method: 'post', data: { id: 'TX-1005' } } as never,
        fetchCtx,
      );
      expect(refunded.status).toBe(0);
      expect(refunded.data?.ok).toBe(true);
      const exported = await env.fetcher!<{ ok: boolean; count?: number }>(
        { url: '/r/Stripe__exportPayments?status=%E7%8A%B6%E6%80%81', method: 'get' },
        fetchCtx,
      );
      expect(exported.status).toBe(0);
      expect(exported.data?.ok).toBe(true);
    } finally {
      cleanupHooks();
    }
  });
});
