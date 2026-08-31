import { describe, expect, it } from 'vitest';
import type { ApiRequestContext, SchemaValue } from '@nop-chaos/flux-core';
import {
  ANTDPRO_CHANNEL_LABELS,
  ANTDPRO_STATUS_LABELS,
  buildAntdProOrderDetail,
  createAntdProDashboard,
  createAntdProOrders,
  filterAntdProOrders,
  findAntdProOrder,
  paginateAntdPro,
  toAntdProOrderListRow,
} from '../shared/mock-backend-antdpro';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

describe('AntdPro mock backend — dataset scale', () => {
  it('seeds 36 orders so the list yields ≥3 pages at pageSize 10', () => {
    const orders = createAntdProOrders();
    expect(orders.length).toBeGreaterThanOrEqual(31);
    expect(paginateAntdPro(orders, 1, 10).pages).toBeGreaterThanOrEqual(3);
  });

  it('covers every status/channel type needed by list columns and tags', () => {
    const orders = createAntdProOrders();
    const statuses = new Set(orders.map((o) => o.status));
    expect([...statuses].sort()).toEqual(['cancelled', 'done', 'pending', 'processing', 'shipped'].sort());
    const channels = new Set(orders.map((o) => o.channel));
    expect(channels.size).toBe(Object.keys(ANTDPRO_CHANNEL_LABELS).length);
    for (const status of statuses) {
      expect(ANTDPRO_STATUS_LABELS[status], `label for ${status}`).toBeTruthy();
    }
  });

  it('list rows carry label/amount text projections for table columns', () => {
    const row = toAntdProOrderListRow(createAntdProOrders()[0]);
    expect(row.statusLabel).toBe(ANTDPRO_STATUS_LABELS[row.status]);
    expect(row.channelLabel).toBe(ANTDPRO_CHANNEL_LABELS[row.channel]);
    expect(row.amountText).toMatch(/^¥ \d+\.\d{2}$/);
  });
});

describe('AntdPro mock backend — filter/pagination helpers', () => {
  it('filters by keyword across orderNo and customer', () => {
    const orders = createAntdProOrders();
    const byNo = filterAntdProOrders(orders, { keyword: orders[0].orderNo });
    expect(byNo.map((o) => o.id)).toContain(orders[0].id);
    const byCustomer = filterAntdProOrders(orders, { keyword: '云澈' });
    expect(byCustomer.length).toBeGreaterThan(0);
    expect(byCustomer.every((o) => o.customer.includes('云澈'))).toBe(true);
    expect(filterAntdProOrders(orders, { keyword: '绝对不存在的关键词' })).toHaveLength(0);
  });

  it('filters by status and channel', () => {
    const orders = createAntdProOrders();
    const done = filterAntdProOrders(orders, { status: 'done' });
    expect(done.length).toBeGreaterThan(0);
    expect(done.every((o) => o.status === 'done')).toBe(true);
    const web = filterAntdProOrders(orders, { channel: 'web' });
    expect(web.length).toBeGreaterThan(0);
    expect(web.every((o) => o.channel === 'web')).toBe(true);
  });

  it('paginates deterministically with total and page count', () => {
    const orders = createAntdProOrders();
    const page1 = paginateAntdPro(orders, 1, 10);
    const page3 = paginateAntdPro(orders, 3, 10);
    const page4 = paginateAntdPro(orders, 4, 10);
    expect(page1.items).toHaveLength(10);
    expect(page3.items).toHaveLength(10);
    expect(page4.items).toHaveLength(orders.length - 30);
    expect(page4.total).toBe(orders.length);
    expect(page4.pages).toBe(4);
  });
});

describe('AntdPro mock backend — endpoint data structure', () => {
  it('AntdPro__orderDetail: known id returns grouped record, unknown id returns null (no crash)', () => {
    const orders = createAntdProOrders();
    const detail = buildAntdProOrderDetail(orders[0]);
    expect(detail.basic.orderNo).toBe(orders[0].orderNo);
    expect(detail.customer.name).toBe(orders[0].customer);
    expect(detail.payment.tradeNo).toMatch(/^TR\d+$/);
    expect(detail.shipment.trackingNo).toMatch(/^SF\d+$/);
    expect(detail.approval.approver).toBeTruthy();
    expect(detail.timeline.length).toBeGreaterThanOrEqual(3);
    expect(['created', 'confirmed', 'shipped', 'completed']).toContain(detail.progressKey);
    expect(findAntdProOrder(orders, 'NOPE')).toBeNull();
  });

  it('AntdPro__dashboard: KPI×4 + line trend + pie channels + Top10 products', () => {
    const orders = createAntdProOrders();
    const dashboard = createAntdProDashboard(orders);
    expect(Object.keys(dashboard.kpi)).toHaveLength(4);
    expect(dashboard.kpi.pendingOrders).toBe(filterAntdProOrders(orders, { status: 'pending' }).length);
    expect(dashboard.trend.length).toBeGreaterThanOrEqual(7);
    expect(dashboard.trend.every((t) => typeof t.sales === 'number' && typeof t.orders === 'number')).toBe(true);
    expect(dashboard.channels.length).toBe(4);
    expect(dashboard.channels.reduce((sum, c) => sum + c.value, 0)).toBe(orders.length);
    expect(dashboard.topProducts).toHaveLength(10);
    expect(dashboard.topProducts[0].rank).toBe(1);
    expect(dashboard.topProducts[0].sales).toBeGreaterThan(dashboard.topProducts[9].sales);
  });
});

describe('AntdPro fetcher branches (get-only)', () => {
  const fetchCtx = { scope: null } as unknown as ApiRequestContext;

  it('AntdPro__orders supports keyword + pagination via fetcher', async () => {
    const { env } = createShowcaseEnv();
    const page1 = await env.fetcher!<Record<string, unknown>>({
      url: '/r/AntdPro__orders?page=1&perPage=10',
      method: 'get',
    }, fetchCtx);
    expect(page1.status).toBe(0);
    expect(page1.data?.total).toBe(36);
    expect(((page1.data?.items ?? []) as unknown[]).length).toBe(10);

    const filtered = await env.fetcher!<Record<string, unknown>>({
      url: `/r/AntdPro__orders?page=1&perPage=10&keyword=${encodeURIComponent('云澈')}`,
      method: 'get',
    }, fetchCtx);
    expect(filtered.data?.total).toBeGreaterThan(0);
    expect(filtered.data?.total).toBeLessThan(36);
  });

  it('AntdPro__orderDetail resolves by id and misses return null', async () => {
    const { env } = createShowcaseEnv();
    const hit = await env.fetcher!<Record<string, unknown>>({
      url: '/r/AntdPro__orderDetail?id=A1001',
      method: 'get',
    }, fetchCtx);
    expect((hit.data as Record<string, unknown>).orderNo).toBeTruthy();

    const miss = await env.fetcher!<unknown>({ url: '/r/AntdPro__orderDetail?id=A9999', method: 'get' }, fetchCtx);
    expect(miss.data).toBeNull();
  });

  it('AntdPro__dashboard returns the aggregate payload', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<Record<string, unknown>>({ url: '/r/AntdPro__dashboard', method: 'get' }, fetchCtx);
    const data = res.data as Record<string, unknown>;
    expect((data.kpi as Record<string, unknown>).totalOrders).toBe(36);
    expect((data.topProducts as unknown[]).length).toBe(10);
  });
});

describe('AntdPro fetcher branches (write endpoints)', () => {
  const fetchCtx = { scope: null } as unknown as ApiRequestContext;

  type AntdProWritePayload = Record<string, unknown>;

  interface AntdProDetailPayload {
    orderNo?: string;
    status?: string;
    statusLabel?: string;
    progressKey?: string;
    basic?: { orderNo?: string };
    customer?: { name?: string };
  }

  async function post<T extends AntdProWritePayload>(env: ReturnType<typeof createShowcaseEnv>['env'], url: string, data: Record<string, SchemaValue>) {
    return env.fetcher!<T>({ url, method: 'post', data }, fetchCtx);
  }

  async function listTotal(env: ReturnType<typeof createShowcaseEnv>['env'], keyword?: string) {
    const suffix = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
    const res = await env.fetcher!<Record<string, unknown>>({
      url: `/r/AntdPro__orders?page=1&perPage=10${suffix}`,
      method: 'get',
    }, fetchCtx);
    return res.data?.total as number;
  }

  async function detailOf(env: ReturnType<typeof createShowcaseEnv>['env'], id?: string) {
    const res = await env.fetcher!<AntdProDetailPayload | null>({
      url: id ? `/r/AntdPro__orderDetail?id=${id}` : '/r/AntdPro__orderDetail',
      method: 'get',
    }, fetchCtx);
    return res.data ?? null;
  }

  it('AntdPro__saveOrder creates a new order without id (prepended, list-observable)', async () => {
    const { env } = createShowcaseEnv();
    const res = await post<Record<string, unknown>>(env, '/r/AntdPro__saveOrder', {
      customer: '测试客户甲',
      amount: 321,
      channel: 'web',
    });
    expect(res.status).toBe(0);
    expect(res.data?.ok).toBe(true);
    expect(res.data?.created).toBe(true);
    expect(String(res.data?.id)).toMatch(/^A\d+$/);
    expect(await listTotal(env)).toBe(37);
    expect(await listTotal(env, '测试客户甲')).toBe(1);
    const page1 = await env.fetcher!<Record<string, unknown>>({
      url: '/r/AntdPro__orders?page=1&perPage=10',
      method: 'get',
    }, fetchCtx);
    expect(((page1.data?.items ?? []) as Array<Record<string, unknown>>)[0]?.customer).toBe('测试客户甲');
  });

  it('AntdPro__saveOrder updates an existing order in place (created:false, fields patched)', async () => {
    const { env } = createShowcaseEnv();
    const res = await post<Record<string, unknown>>(env, '/r/AntdPro__saveOrder', {
      id: 'A1001',
      customer: '改名客户乙',
      amount: 999,
    });
    expect(res.data?.created).toBe(false);
    expect(await listTotal(env, '改名客户乙')).toBe(1);
    const detail = await detailOf(env, 'A1001');
    expect(detail?.customer?.name).toBe('改名客户乙');
    expect(detail?.basic?.orderNo).toBe('SO2026080100');
  });

  it('AntdPro__saveOrder with unknown id upserts as a new row (adp-save-miss ruling)', async () => {
    const { env } = createShowcaseEnv();
    const res = await post<Record<string, unknown>>(env, '/r/AntdPro__saveOrder', {
      id: 'A9999',
      customer: '落库新行丙',
    });
    expect(res.data?.created).toBe(true);
    expect(res.data?.id).toBe('A9999');
    expect(await listTotal(env)).toBe(37);
    expect(await listTotal(env, '落库新行丙')).toBe(1);
  });

  it('AntdPro__deleteOrders removes rows observably within the session', async () => {
    const { env } = createShowcaseEnv();
    const res = await post<Record<string, unknown>>(env, '/r/AntdPro__deleteOrders', {
      ids: ['A1001', 'A1002'],
    });
    expect(res.data?.deleted).toBe(2);
    expect(await listTotal(env)).toBe(34);
    expect(await detailOf(env, 'A1001')).toBeNull();
    expect(await listTotal(env, 'SO2026080100')).toBe(0);
  });

  it('AntdPro__deleteOrders with empty ids deletes nothing (adp-del-empty); string ids accepted', async () => {
    const { env } = createShowcaseEnv();
    const empty = await post<Record<string, unknown>>(env, '/r/AntdPro__deleteOrders', {});
    expect(empty.data?.deleted).toBe(0);
    expect(await listTotal(env)).toBe(36);
    const single = await post<Record<string, unknown>>(env, '/r/AntdPro__deleteOrders', { ids: 'A1001' });
    expect(single.data?.deleted).toBe(1);
    expect(await listTotal(env)).toBe(35);
  });

  it('AntdPro__approveOrder flips status (approve→done, reject→cancelled), detail reflects it', async () => {
    const { env } = createShowcaseEnv();
    const approve = await post<Record<string, unknown>>(env, '/r/AntdPro__approveOrder', {
      id: 'A1002',
      decision: 'approve',
    });
    expect(approve.data?.status).toBe('done');
    const approved = await detailOf(env, 'A1002');
    expect(approved?.status).toBe('done');
    expect(approved?.statusLabel).toBe('已完成');
    expect(approved?.progressKey).toBe('completed');

    const reject = await post<Record<string, unknown>>(env, '/r/AntdPro__approveOrder', {
      id: 'A1003',
      decision: 'reject',
    });
    expect(reject.data?.status).toBe('cancelled');
    const rejected = await detailOf(env, 'A1003');
    expect(rejected?.status).toBe('cancelled');
    expect(rejected?.statusLabel).toBe('已关闭');
  });

  it('AntdPro__approveOrder with missing id fails without flipping anything (adp-approve-miss)', async () => {
    const { env } = createShowcaseEnv();
    const miss = await post<Record<string, unknown>>(env, '/r/AntdPro__approveOrder', {
      id: 'A9999',
      decision: 'approve',
    });
    expect(miss.status).toBe(1);
    expect(miss.data?.ok).toBe(false);
    const invalid = await post<Record<string, unknown>>(env, '/r/AntdPro__approveOrder', {
      id: 'A1002',
      decision: 'nonsense',
    });
    expect(invalid.status).toBe(1);
    expect((await detailOf(env, 'A1002'))?.status).toBe('processing');
  });

  it('AntdPro__submitForm accepts a generic payload and returns a generated id', async () => {
    const { env } = createShowcaseEnv();
    const res = await post<Record<string, unknown>>(env, '/r/AntdPro__submitForm', {
      title: '季度目标',
      owner: '林知夏',
    });
    expect(res.status).toBe(0);
    expect(res.data?.ok).toBe(true);
    expect(String(res.data?.id)).toMatch(/^A\d+$/);
  });

  it('AntdPro__selectOrder records the session pointer; orderDetail falls back to it (adp-select-miss keeps pointer)', async () => {
    const { env } = createShowcaseEnv();
    const fresh = await detailOf(env);
    expect(fresh?.orderNo).toBe('SO2026080100');

    const select = await post<Record<string, unknown>>(env, '/r/AntdPro__selectOrder', { id: 'A1002' });
    expect(select.data?.ok).toBe(true);
    expect((await detailOf(env))?.orderNo).toBe('SO2026080101');

    const miss = await post<Record<string, unknown>>(env, '/r/AntdPro__selectOrder', { id: 'NOPE' });
    expect(miss.status).toBe(1);
    expect((await detailOf(env))?.orderNo).toBe('SO2026080101');
  });
});

describe('AntdPro page registration', () => {
  it('registers the 9 antdpro-* pages in the app-replica category', () => {
    const ids = COMPLEX_PAGE_ENTRIES.filter((e) => e.id.startsWith('antdpro-')).map((e) => e.id);
    expect(ids).toHaveLength(9);
    expect(ids).toEqual([
      'antdpro-list',
      'antdpro-form-basic',
      'antdpro-form-grouped',
      'antdpro-form-dialog',
      'antdpro-form-step',
      'antdpro-detail-basic',
      'antdpro-detail-advanced',
      'antdpro-dashboard',
      'antdpro-result',
    ]);
    for (const entry of COMPLEX_PAGE_ENTRIES.filter((e) => e.id.startsWith('antdpro-'))) {
      expect(entry.category).toBe('app-replica');
      expect(entry.description).toContain('Ant Design Pro');
      expect(entry.features.length).toBeGreaterThanOrEqual(4);
    }
  });
});
