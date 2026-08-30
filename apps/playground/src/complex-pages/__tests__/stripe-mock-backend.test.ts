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
