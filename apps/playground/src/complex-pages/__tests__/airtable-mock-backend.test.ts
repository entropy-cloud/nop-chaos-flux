import { describe, expect, it } from 'vitest';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
import {
  AT_CATEGORY_LABELS,
  AT_FIELDS,
  AT_PALETTE,
  AT_PEOPLE,
  createAirtableDatabase,
  createAirtableFetcherBranch,
  createAirtableRecords,
  filterAirtableRecords,
  groupAirtableRecords,
  paginateAirtable,
  sortAirtableRecords,
  summarizeAirtable,
  toAirtableRecordRow,
} from '../shared/mock-backend-airtable';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

const fetchCtx = { scope: null } as unknown as ApiRequestContext;

describe('Airtable mock backend — dataset & field-type coverage', () => {
  it('ships 33 records so the default pageSize 10 yields ≥3 pages', () => {
    const records = createAirtableRecords();
    expect(records.length).toBeGreaterThanOrEqual(30);
    const paged = paginateAirtable(records, 1, 10);
    expect(paged.pages).toBeGreaterThanOrEqual(3);
    expect(paged.total).toBe(records.length);
    expect(paged.items).toHaveLength(10);
  });

  it('covers the trimmed field-type list on every record (D3 裁剪清单终态)', () => {
    const records = createAirtableRecords();
    for (const r of records) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.notes.length).toBeGreaterThan(20);
      expect(AT_CATEGORY_LABELS.some((c) => c.label === r.category)).toBe(true);
      expect(r.tags.length).toBeGreaterThanOrEqual(2);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r.date)).toBe(true);
      expect(r.amount).toBeGreaterThan(0);
      expect(r.score).toBeGreaterThan(0);
      expect(r.progress).toBeGreaterThanOrEqual(0);
      expect(r.progress).toBeLessThanOrEqual(1);
      expect(typeof r.done).toBe('boolean');
      expect(r.owner.name.length).toBeGreaterThan(0);
      expect(r.email).toContain('@');
      expect(r.site.startsWith('https://')).toBe(true);
      expect(r.phone).toMatch(/^138\d{8}$/);
      expect(r.durationSeconds).toBeGreaterThan(0);
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
      expect(r.barcode).toMatch(/^AT-\d{4}-\d{5}$/);
      expect(r.autoNo).toBeGreaterThan(0);
      expect(r.createdAt).toContain('2026-');
      expect(r.modifiedAt).toContain('2026-');
    }
    expect(records.some((r) => r.attachmentTones.length > 0)).toBe(true);
    expect(records.some((r) => r.attachmentTones.length === 0)).toBe(true);
    expect(records.some((r) => r.done)).toBe(true);
    expect(records.some((r) => !r.done)).toBe(true);
    expect(records.some((r) => r.progress === 1)).toBe(true);
  });

  it('declares the 9-color field palette (text/bg/icon triplets) and the 20-field registry', () => {
    const colors = Object.keys(AT_PALETTE);
    expect(colors).toHaveLength(9);
    for (const value of Object.values(AT_PALETTE)) {
      expect(value.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(value.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(value.icon).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(AT_FIELDS).toHaveLength(20);
    expect(AT_FIELDS.find((f) => f.name === 'title')?.primary).toBe(true);
    expect(AT_FIELDS.filter((f) => f.primary)).toHaveLength(1);
    expect(AT_FIELDS.filter((f) => f.readonly)).toHaveLength(3);
    expect(AT_PEOPLE.length).toBeGreaterThanOrEqual(5);
  });

  it('rows carry at-* chip/avatar/star/thumb classes and precomputed labels', () => {
    const rows = createAirtableRecords().map(toAirtableRecordRow);
    expect(rows[0].categoryChipClass).toMatch(/^at-chip at-chip-[a-z]+$/);
    expect(rows[0].tagChips.length).toBe(rows[0].tags.length);
    for (const chip of rows[0].tagChips) {
      expect(chip.chipClass).toMatch(/^at-chip at-chip-[a-z]+$/);
    }
    expect(rows[0].ownerAvatarClass).toMatch(/^at-avatar at-avatar-[a-z]+$/);
    expect(rows[0].amountLabel).toMatch(/^¥[\d,]+\.\d{2}$/);
    expect(rows[0].progressLabel).toMatch(/^\d+%$/);
    expect(rows[0].durationLabel).toMatch(/^\d+:\d{2}:\d{2}$/);
    expect(rows[0].ratingStars).toHaveLength(rows[0].rating);
    expect(rows[0].ratingOffStars).toHaveLength(5 - rows[0].rating);
    expect(rows[0].dateLabel).toContain('年');
    const withThumbs = rows.find((r) => r.attachmentThumbs.length > 0);
    expect(withThumbs?.attachmentThumbs[0]?.toneClass).toMatch(/^at-thumb at-thumb-[a-z]+$/);
    const chipColors = new Set(rows.map((r) => r.categoryChipClass));
    expect(chipColors.size).toBe(4);
  });

  it('at-records-miss: zero-match keyword returns an empty array without error', () => {
    expect(filterAirtableRecords(createAirtableRecords(), '绝不存在的关键词xyz')).toEqual([]);
    expect(filterAirtableRecords(createAirtableRecords(), '')).toHaveLength(33);
    expect(filterAirtableRecords(createAirtableRecords(), undefined)).toHaveLength(33);
  });

  it('summary bar values are precomputed (count/amount/progress/done/rating + labels)', () => {
    const records = createAirtableRecords();
    const summary = summarizeAirtable(records);
    expect(summary.count).toBe(records.length);
    expect(summary.amountSum).toBeCloseTo(records.reduce((s, r) => s + r.amount, 0), 6);
    expect(summary.doneCount).toBe(records.filter((r) => r.done).length);
    expect(summary.progressAvg).toBeGreaterThan(0);
    expect(summary.ratingAvg).toBeGreaterThan(0);
    expect(summary.amountSumLabel).toMatch(/^¥[\d,]+\.\d{2}$/);
    expect(summary.progressAvgLabel).toMatch(/^\d+%$/);
    expect(summary.ratingAvgLabel).toMatch(/^\d+(\.\d)?$/);
    expect(summarizeAirtable([]).count).toBe(0);
    expect(summarizeAirtable([]).amountSumLabel).toBe('¥0.00');
  });
});

describe('Airtable mock backend — grouped shape (group= parameterization)', () => {
  it('groups by category with per-group counts, summary values, and sample rows', () => {
    const records = createAirtableRecords();
    const payload = groupAirtableRecords(records);
    expect(payload.total).toBe(records.length);
    expect(payload.groups.map((g) => g.label)).toEqual(AT_CATEGORY_LABELS.map((c) => c.label));
    let counted = 0;
    for (const group of payload.groups) {
      const members = records.filter((r) => r.category === group.key);
      expect(group.count).toBe(members.length);
      expect(group.amountSum).toBeCloseTo(members.reduce((s, r) => s + r.amount, 0), 6);
      expect(group.doneCount).toBe(members.filter((r) => r.done).length);
      expect(group.amountSumLabel).toMatch(/^¥[\d,]+\.\d{2}$/);
      expect(group.collapsed).toBe(false);
      expect(group.sample.length).toBeGreaterThan(0);
      expect(group.sample.length).toBeLessThanOrEqual(3);
      expect(group.chipClass).toMatch(/^at-chip at-chip-[a-z]+$/);
      for (const row of group.sample) {
        expect(row.category).toBe(group.key);
      }
      counted += group.count;
    }
    expect(counted).toBe(records.length);
  });
});

describe('Airtable fetcher branch (get-only)', () => {
  const db = createAirtableDatabase();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const branch = createAirtableFetcherBranch(db, clone);

  function call(url: string, method = 'get'): { status: number; data: unknown } | null {
    return branch({ url, method, params: {}, body: {} });
  }

  it('returns null for non-Airtable endpoints; non-get methods fail (P6a get-only contract)', () => {
    expect(call('/r/User__findPage')).toBeNull();
    expect(call('/r/Airtable__records', 'post')?.status).toBe(1);
    expect(call('/r/Airtable__nope', 'put')?.status).toBe(1);
  });

  it('serves the grid shape with paging + summary and the unknown-view fallback (at-view-unknown)', () => {
    // perPage=100 → 全量 33 行一次取回，客户端 table 按 pageSize 10 分页 ≥3 页
    // （dataset describe 已锁 paginateAirtable(records,1,10).pages ≥3）。
    const grid = call('/r/Airtable__records?perPage=100')?.data as {
      items: unknown[];
      total: number;
      pages: number;
      summary: { count: number };
    };
    expect(grid.items).toHaveLength(33);
    expect(grid.total).toBe(33);
    expect(grid.summary.count).toBe(33);
    const fields = (call('/r/Airtable__records?perPage=100')?.data as {
      fields: Array<{ name: string; primary?: boolean; visible: boolean; glyphClass: string }>;
    }).fields;
    expect(fields).toHaveLength(20);
    expect(fields.filter((f) => f.primary)).toHaveLength(1);
    expect(fields.every((f) => f.visible)).toBe(true);
    expect(fields.every((f) => /^at-glyph at-glyph-[a-z]+$/.test(f.glyphClass))).toBe(true);
    const defaultPaged = call('/r/Airtable__records')?.data as { items: unknown[]; total: number };
    expect(defaultPaged.items).toHaveLength(10);
    expect(defaultPaged.total).toBe(33);
    const unknownView = call('/r/Airtable__records?view=timeline')?.data as { total: number };
    expect(unknownView.total).toBe(33);
  });

  it('serves grouped payloads only for supported fields; others fall back flat (at-group-unknown)', () => {
    const grouped = call('/r/Airtable__records?group=category')?.data as {
      groups: Array<{ key: string; count: number }>;
      total: number;
    };
    expect(grouped.groups).toHaveLength(4);
    expect(grouped.groups.reduce((s, g) => s + g.count, 0)).toBe(grouped.total);
    const flat = call('/r/Airtable__records?group=bogus')?.data as { groups: unknown[]; total: number };
    expect(flat.groups).toHaveLength(0);
    expect(flat.total).toBe(33);
  });

  it('serves record modal payload with prev/next ids and the placeholder fallback (at-record-miss)', () => {
    const hit = call('/r/Airtable__record?id=AT-101')?.data as {
      id: string;
      title: string;
      prevId?: string;
      nextId?: string;
    };
    expect(hit.id).toBe('AT-101');
    expect(hit.prevId).toBeUndefined();
    expect(hit.nextId).toBe('AT-102');
    const mid = call('/r/Airtable__record?id=AT-110')?.data as { prevId: string; nextId: string };
    expect(mid.prevId).toBe('AT-109');
    expect(mid.nextId).toBe('AT-111');
    const miss = call('/r/Airtable__record?id=AT-999')?.data as { id: string; title: string };
    expect(miss.id).toBe('AT-999');
    expect(miss.title).toContain('占位');
  });

  it('routes through createShowcaseEnv for every Airtable endpoint', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<{ items: unknown[] }>({ url: '/r/Airtable__records?perPage=100', method: 'get' }, fetchCtx);
    expect(res.status).toBe(0);
    expect(res.data?.items).toHaveLength(33);
    const grouped = await env.fetcher!<{ groups: unknown[] }>({ url: '/r/Airtable__records?group=category', method: 'get' }, fetchCtx);
    expect(grouped.data?.groups).toHaveLength(4);
  });
});

describe('Airtable mock backend — write operations (P6b session state)', () => {
  const db = createAirtableDatabase();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const branch = createAirtableFetcherBranch(db, clone);

  function call(url: string, method = 'get', body: Record<string, unknown> = {}): { status: number; data: unknown } | null {
    return branch({ url, method, params: {}, body });
  }

  it('at-update-miss + success: updateRecord patches the session row; summary follows the session', () => {
    const miss = call('/r/Airtable__updateRecord', 'post', { id: 'AT-999', patch: { title: '无' } });
    expect(miss?.status).toBe(1);
    const before = call('/r/Airtable__records?perPage=100')?.data as {
      summary: { amountSum: number; doneCount: number };
      items: Array<{ id: string; title: string; done: boolean; amount: number }>;
    };
    const ok = call('/r/Airtable__updateRecord', 'post', {
      id: 'AT-101',
      patch: { title: '编辑保存后的标题样本', amount: 999, done: true },
    });
    expect(ok?.status).toBe(0);
    // 会话内持久性：records 端点返回新值且 summary 随动
    const after = call('/r/Airtable__records?perPage=100')?.data as {
      summary: { amountSum: number; doneCount: number };
      items: Array<{ id: string; title: string; amountLabel: string }>;
    };
    const row = after.items.find((r) => r.id === 'AT-101');
    expect(row?.title).toBe('编辑保存后的标题样本');
    expect(row?.amountLabel).toContain('999');
    expect(after.summary.amountSum).toBeCloseTo(before.summary.amountSum - before.items[0].amount + 999, 6);
    expect(after.summary.doneCount).toBe(before.summary.doneCount + (before.items[0].done ? 0 : 1));
    // 分组源同会话可观察（跨源一致：组内计数/金额随动）
    const grouped = call('/r/Airtable__records?group=category')?.data as {
      groups: Array<{ key: string; amountSum: number }>;
    };
    const gridGroup = grouped.groups.find((g) => g.key === '需求评审');
    expect(gridGroup).toBeDefined();
  });

  it('atEdit* canonical edit keys take precedence over includeScope ride-along record keys', () => {
    const shadowed = call('/r/Airtable__updateRecord', 'post', {
      id: 'AT-102',
      title: '载荷残留旧标题',
      atEditTitle: '编辑面新标题',
      atEditCategory: '验收发布',
    });
    expect(shadowed?.status).toBe(0);
    const row = call('/r/Airtable__record?id=AT-102')?.data as { title: string; category: string };
    expect(row.title).toBe('编辑面新标题');
    expect(row.category).toBe('验收发布');
    // 平铺原始键（无 atEdit* 时）等价接受（P5b 平铺别名口径）
    const flat = call('/r/Airtable__updateRecord', 'post', { id: 'AT-103', notes: '平铺键更新说明样本' });
    expect(flat?.status).toBe(0);
    expect((call('/r/Airtable__record?id=AT-103')?.data as { notes: string }).notes).toBe('平铺键更新说明样本');
  });

  it('at-write-readonly: readonly keys are ignored; an all-readonly patch fails with empty patch', () => {
    const ignored = call('/r/Airtable__updateRecord', 'post', {
      id: 'AT-104',
      autoNo: 999,
      createdAt: '2000-01-01 00:00',
      modifiedAt: '2000-01-01 00:00',
      atEditTitle: '只读忽略伴随更新',
    });
    expect(ignored?.status).toBe(0);
    const row = call('/r/Airtable__record?id=AT-104')?.data as {
      title: string;
      autoNo: number;
      createdAt: string;
    };
    expect(row.title).toBe('只读忽略伴随更新');
    expect(row.autoNo).not.toBe(999);
    expect(row.createdAt).not.toContain('2000');
    const onlyReadonly = call('/r/Airtable__updateRecord', 'post', {
      id: 'AT-105',
      autoNo: 888,
    });
    expect(onlyReadonly?.status).toBe(1);
  });

  it('at-create-miss + success: createRecord appends AT-134 at the tail; title required; defaults land', () => {
    const miss = call('/r/Airtable__createRecord', 'post', { title: '   ' });
    expect(miss?.status).toBe(1);
    const badField = call('/r/Airtable__createRecord', 'post', { title: '样本', category: '不存在的阶段' });
    expect(badField?.status).toBe(1);
    const ok = call('/r/Airtable__createRecord', 'post', { title: '链路验证新建记录样本', category: '开发进行' });
    expect(ok?.status).toBe(0);
    expect((ok?.data as { id?: string }).id).toBe('AT-134');
    // 插行位次=表尾（行数 +1、新行 keyword 检索可达、默认值落库）
    const grid = call('/r/Airtable__records?perPage=100')?.data as {
      total: number;
      summary: { count: number };
      items: Array<{ id: string; title: string; category: string; barcode: string; autoNo: number }>;
    };
    expect(grid.total).toBe(34);
    expect(grid.summary.count).toBe(34);
    expect(grid.items[grid.items.length - 1].id).toBe('AT-134');
    expect(grid.items[grid.items.length - 1].autoNo).toBe(34);
    expect(grid.items[grid.items.length - 1].barcode).toMatch(/^AT-\d{4}-\d{5}$/);
    const search = call('/r/Airtable__records?perPage=100&keyword=链路验证新建')?.data as { total: number };
    expect(search.total).toBe(1);
    // 新行进入分组源（组内计数随会话 +1：开发进行 8 种子 + 1 新建）
    const grouped = call('/r/Airtable__records?group=category')?.data as {
      groups: Array<{ key: string; count: number }>;
      total: number;
    };
    expect(grouped.total).toBe(34);
    expect(grouped.groups.find((g) => g.key === '开发进行')?.count).toBe(9);
  });

  it('at-sort-unknown: unknown sort field/dir falls back to original order; known fields sort', () => {
    const rows = createAirtableRecords();
    expect(sortAirtableRecords(rows, 'bogus:asc').map((r) => r.id)).toEqual(rows.map((r) => r.id));
    expect(sortAirtableRecords(rows, 'amount:bogus').map((r) => r.id)).toEqual(rows.map((r) => r.id));
    expect(sortAirtableRecords(rows, undefined)).toHaveLength(rows.length);
    const asc = sortAirtableRecords(rows, 'amount:asc');
    const desc = sortAirtableRecords(rows, 'amount:desc');
    expect(asc[0].amount).toBeLessThanOrEqual(asc[1].amount);
    expect(desc[0].amount).toBeGreaterThanOrEqual(desc[1].amount);
    const byOwner = sortAirtableRecords(rows, 'owner:asc');
    expect(byOwner[0].owner.name.length).toBeGreaterThan(0);
  });

  it('generalized grouping: owner and done fields produce counts + summary; unknown stays flat', () => {
    const rows = createAirtableRecords();
    const byOwner = groupAirtableRecords(rows, 'owner');
    expect(byOwner.total).toBe(rows.length);
    expect(byOwner.groups.length).toBeGreaterThanOrEqual(5);
    expect(byOwner.groups.reduce((s, g) => s + g.count, 0)).toBe(rows.length);
    for (const group of byOwner.groups) {
      const members = rows.filter((r) => r.owner.name === group.key);
      expect(group.count).toBe(members.length);
      expect(group.amountSum).toBeCloseTo(members.reduce((s, r) => s + r.amount, 0), 6);
    }
    const byDone = groupAirtableRecords(rows, 'done');
    expect(byDone.groups.map((g) => g.key).sort()).toEqual(['已交付', '未交付'].sort());
    expect(groupAirtableRecords(rows, 'bogus').groups).toHaveLength(0);
    expect(groupAirtableRecords(rows, 'category').groups).toHaveLength(4);
  });

  it('post contract: unknown Airtable write endpoints fail; read endpoints stay get-only', () => {
    expect(call('/r/Airtable__nope', 'post')?.status).toBe(1);
    expect(call('/r/Airtable__records', 'post')?.status).toBe(1);
    expect(call('/r/User__findPage')).toBeNull();
  });

  it('at-viewcfg-miss + session sort: updateViewConfig pre-applies on subsequent reads; null clears', () => {
    // 未知 viewId → 失败（at-viewcfg-miss）
    const miss = call('/r/Airtable__updateViewConfig', 'post', { viewId: 'bogus', patch: { sort: 'amount:desc' } });
    expect(miss?.status).toBe(1);
    // 会话排序生效：设置后 records 读按 sort 预应用
    const ok = call('/r/Airtable__updateViewConfig', 'post', { viewId: 'grid', patch: { sort: 'amount:desc' } });
    expect(ok?.status).toBe(0);
    const after = call('/r/Airtable__records?perPage=100')?.data as {
      items: Array<{ amount: number }>;
    };
    for (let i = 1; i < after.items.length; i += 1) {
      expect(after.items[i - 1].amount).toBeGreaterThanOrEqual(after.items[i].amount);
    }
    // url sort= 参数优先于会话配置（显式 asc 覆盖会话 desc）
    const overridden = call('/r/Airtable__records?perPage=100&sort=amount:asc')?.data as {
      items: Array<{ amount: number }>;
    };
    expect(overridden.items[0].amount).toBeLessThanOrEqual(overridden.items[1].amount);
    // null 清除会话排序 → 回默认序
    expect(call('/r/Airtable__updateViewConfig', 'post', { viewId: 'grid', patch: { sort: null } })?.status).toBe(0);
    const cleared = call('/r/Airtable__records?perPage=100')?.data as { items: Array<{ id: string }> };
    expect(cleared.items[0].id).toBe('AT-101');
    // 非法 sort 载荷 → 失败
    const bad = call('/r/Airtable__updateViewConfig', 'post', { viewId: 'grid', patch: { sort: 42 } });
    expect(bad?.status).toBe(1);
  });

  it('routes writes through createShowcaseEnv (session state observable across pages)', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<{ ok: boolean }>(
      { url: '/r/Airtable__updateRecord', method: 'post', data: { id: 'AT-106', patch: { score: 9 } } },
      fetchCtx,
    );
    expect(res.status).toBe(0);
    const grid = await env.fetcher!<{ items: Array<{ id: string; score: number }> }>(
      { url: '/r/Airtable__records?perPage=100', method: 'get' },
      fetchCtx,
    );
    expect(grid.data?.items.find((r) => r.id === 'AT-106')?.score).toBe(9);
  });
});

describe('Airtable replica registration', () => {
  it('registers the airtable-grid page as an app-replica entry', () => {
    const entry = COMPLEX_PAGE_ENTRIES.find((e) => e.id === 'airtable-grid');
    expect(entry?.category).toBe('app-replica');
    expect(entry?.features).toHaveLength(4);
    expect(entry?.description).toContain('Airtable__records');
    expect(entry?.features.join(',')).not.toContain('Airtable__');
  });
});
