import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
import {
  NOTION_PALETTE,
  buildNotionBoardData,
  buildNotionCalendarGrid,
  createNotionDatabase,
  createNotionFetcherBranch,
  createNotionRecords,
  createNotionViewConfigs,
  filterNotionRecords,
  paginateNotion,
  toNotionRecordRow,
} from '../shared/mock-backend-notion';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

const fetchCtx = { scope: null } as unknown as ApiRequestContext;

function loadSchemaText(): string {
  return readFileSync(join(__dirname, '../page-schemas/notion-database.json'), 'utf-8');
}

describe('Notion mock backend — dataset & property types', () => {
  it('ships 32 records so the default pageSize 10 yields ≥3 pages', () => {
    const records = createNotionRecords();
    expect(records.length).toBeGreaterThanOrEqual(30);
    const paged = paginateNotion(records, 1, 10);
    expect(paged.pages).toBeGreaterThanOrEqual(3);
    expect(paged.total).toBe(records.length);
  });

  it('covers the trimmed property-type list on every record', () => {
    const records = createNotionRecords();
    for (const r of records) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.number).toBeGreaterThan(0);
      expect(r.category.length).toBeGreaterThan(0);
      expect(r.tags.length).toBeGreaterThan(0);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r.date)).toBe(true);
      expect(r.person.name.length).toBeGreaterThan(0);
      expect(r.url.startsWith('https://')).toBe(true);
      expect(r.email).toContain('@');
      expect(r.phone).toMatch(/^138\d{8}$/);
      expect(r.createdTime).toContain('2026-');
      expect(r.editedTime).toContain('2026-');
    }
    expect(records.some((r) => r.files.length > 0)).toBe(true);
    expect(records.some((r) => r.files.length === 0)).toBe(true);
    expect(records.some((r) => r.done)).toBe(true);
    expect(records.some((r) => !r.done)).toBe(true);
    expect(records.some((r) => !r.hasCover)).toBe(true);
  });

  it('declares the full 10-color semantic palette (text/bg/icon triplets)', () => {
    const colors = Object.keys(NOTION_PALETTE);
    expect(colors).toHaveLength(10);
    for (const value of Object.values(NOTION_PALETTE)) {
      expect(value.text).toMatch(/^#[0-9A-F]{6}$/);
      expect(value.bg).toMatch(/^#[0-9A-F]{6}$/);
      expect(value.icon).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('rows carry nt-* chip/dot/avatar classes and conditional-color samples', () => {
    const rows = createNotionRecords().map(toNotionRecordRow);
    expect(rows[0].categoryChipClass).toMatch(/^nt-chip nt-chip-[a-z]+$/);
    expect(rows[0].statusChipClass).toMatch(/^nt-chip nt-chip-[a-z]+$/);
    expect(rows[0].statusDotClass).toMatch(/^nt-dot nt-dot-[a-z]+$/);
    expect(rows[0].personChipClass).toMatch(/^nt-avatar nt-avatar-[a-z]+$/);
    expect(rows[0].tagChips.length).toBe(rows[0].tags.length);
    expect(rows.some((r) => r.condRowClass === 'nt-cond-red')).toBe(true);
    expect(rows.some((r) => r.condRowClass === 'nt-cond-yellow')).toBe(true);
    expect(rows.every((r) => r.personInitials.length > 0)).toBe(true);
    const chipColors = new Set(rows.map((r) => r.categoryChipClass));
    expect(chipColors.size).toBeGreaterThanOrEqual(4);
  });

  it('nt-records-miss: zero-match keyword returns an empty array without error', () => {
    expect(filterNotionRecords(createNotionRecords(), '绝不存在的关键词xyz')).toEqual([]);
    expect(filterNotionRecords(createNotionRecords(), '')).toHaveLength(32);
    expect(filterNotionRecords(createNotionRecords(), undefined)).toHaveLength(32);
  });
});

describe('Notion mock backend — view-parameterized shapes', () => {
  it('board view groups by status with column counts and Count/Percent aggregates', () => {
    const records = createNotionRecords();
    const { board, columns, aggregates } = buildNotionBoardData(records);
    expect((board['root'] as { type: string }).type).toBe('root');
    expect(columns.map((c) => c.title)).toEqual(['未开始', '进行中', '评审中', '已完成']);
    let cardTotal = 0;
    for (const col of columns) {
      const colNode = board[col.id] as { type: string; children: string[] };
      expect(colNode.type).toBe('column');
      expect(colNode.children).toHaveLength(col.count);
      for (const cardId of colNode.children) {
        const card = board[cardId] as { type: string; data: Record<string, unknown>; meta: Record<string, unknown> };
        expect(card.type).toBe('card');
        expect(String(card.data.title).length).toBeGreaterThan(0);
        expect(String(card.data.description)).toMatch(/^REC-\d+ · \d+ pt$/);
        expect(Array.isArray(card.meta.members)).toBe(true);
        cardTotal += 1;
      }
      const agg = aggregates.find((a) => a.columnId === col.id);
      expect(agg?.count).toBe(col.count);
    }
    expect(cardTotal).toBe(records.length);
    expect(aggregates.reduce((sum, a) => sum + a.percent, 0)).toBe(100);
  });

  it('calendar view builds a 6-week × 7-day grid with exactly one today', () => {
    const payload = buildNotionCalendarGrid(createNotionRecords());
    expect(payload.weeks).toHaveLength(6);
    for (const week of payload.weeks) {
      expect(week).toHaveLength(7);
    }
    expect(payload.weeks.flat().filter((d) => d.isToday)).toHaveLength(1);
    expect(payload.weeks.flat().filter((d) => d.inMonth).length).toBe(31);
    const landed = payload.weeks.flat().flatMap((d) => d.records);
    expect(landed.length).toBeGreaterThan(0);
    expect(landed.every((r) => /^REC-\d+$/.test(r.id))).toBe(true);
  });

  it('view configs carry a private filter/sort/group/layout set per view', () => {
    const configs = createNotionViewConfigs();
    expect(configs.map((c) => c.viewId)).toEqual(['table', 'board', 'gallery', 'calendar', 'list']);
    for (const config of configs) {
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.icon.length).toBeGreaterThan(0);
      expect(Array.isArray(config.layout)).toBe(false);
      expect(config.propVisibility.length).toBeGreaterThan(0);
      expect(Array.isArray(config.filter.rules)).toBe(true);
      expect(config.filter.conjunction).toBe('and');
    }
    expect(configs.find((c) => c.viewId === 'board')?.group?.property).toBe('status');
    expect(configs.find((c) => c.viewId === 'gallery')?.layout.cover).toBe(true);
    expect(configs.find((c) => c.viewId === 'calendar')?.layout.dateProperty).toBe('date');
    expect(configs.find((c) => c.viewId === 'list')?.filter.rules[0]?.value).toBe('done');
  });
});

describe('Notion fetcher branch', () => {
  const db = createNotionDatabase();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const branch = createNotionFetcherBranch(db, clone);

  function call(url: string, method = 'get'): { status: number; data: unknown } | null {
    return branch({ url, method, params: {}, body: {} });
  }

  it('returns null for non-Notion endpoints and rejects writes (get-only)', () => {
    expect(call('/r/User__findPage')).toBeNull();
    const post = call('/r/Notion__records?view=table', 'post');
    expect(post?.status).toBe(1);
  });

  it('serves the table shape with paging and the unknown-view fallback', () => {
    const table = call('/r/Notion__records?view=table')?.data as { items: unknown[]; pages: number };
    expect(table.items).toHaveLength(10);
    expect(table.pages).toBeGreaterThanOrEqual(3);
    const unknown = call('/r/Notion__records?view=timeline')?.data as { items: unknown[]; total: number };
    expect(unknown.total).toBe(32);
  });

  it('serves board/gallery/calendar/list shapes from the view parameter', () => {
    const board = call('/r/Notion__records?view=board')?.data as { columns: unknown[]; aggregates: unknown[] };
    expect(board.columns).toHaveLength(4);
    expect(board.aggregates).toHaveLength(4);
    const gallery = call('/r/Notion__records?view=gallery')?.data as { items: Array<{ hasCover: boolean }> };
    expect(gallery.items.every((i) => i.hasCover)).toBe(true);
    const calendar = call('/r/Notion__records?view=calendar')?.data as { weeks: unknown[][] };
    expect(calendar.weeks).toHaveLength(6);
    const list = call('/r/Notion__records?view=list')?.data as { items: Array<{ statusLabel: string }> };
    expect(list.items.every((i) => i.statusLabel !== '已完成')).toBe(true);
  });

  it('serves record peek with placeholder fallback and the config set endpoint', () => {
    const hit = call('/r/Notion__record?id=REC-101')?.data as { id: string; title: string };
    expect(hit.id).toBe('REC-101');
    const miss = call('/r/Notion__record?id=REC-999')?.data as { id: string; title: string };
    expect(miss.id).toBe('REC-999');
    expect(miss.title).toContain('占位');
    const configs = call('/r/Notion__viewConfigs')?.data as { items: unknown[]; total: number };
    expect(configs.total).toBe(5);
  });

  it('routes through createShowcaseEnv for every Notion endpoint', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<{ items: unknown[] }>({ url: '/r/Notion__records?view=table', method: 'get' }, fetchCtx);
    expect(res.status).toBe(0);
    expect(res.data?.items).toHaveLength(10);
  });
});

describe('Notion replica registration & schema contract', () => {
  it('registers the notion-database page as an app-replica entry', () => {
    const entry = COMPLEX_PAGE_ENTRIES.find((e) => e.id === 'notion-database');
    expect(entry?.category).toBe('app-replica');
    expect(entry?.features).toHaveLength(4);
    expect(entry?.description).toContain('Notion__records');
    expect(entry?.features.join(',')).not.toContain('Notion__');
  });

  it('locks kanban draggable:false and the five view branch testids in the schema', () => {
    const schema = JSON.parse(loadSchemaText());
    expect(schema.testid).toBe('notion-database-page');
    expect(schema.className).toBe('nt-root');
    const schemaText = loadSchemaText();
    const kanbanNode = findNode(schema, 'kanban');
    expect(kanbanNode?.draggable).toBe(false);
    for (const view of ['table', 'board', 'gallery', 'calendar', 'list']) {
      expect(schemaText).toContain(`notion-views-${view}`);
    }
  });
});

function findNode(node: unknown, type: string): Record<string, unknown> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findNode(child, type);
      if (hit) return hit;
    }
    return undefined;
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (record.type === type) return record;
    for (const value of Object.values(record)) {
      const hit = findNode(value, type);
      if (hit) return hit;
    }
  }
  return undefined;
}
