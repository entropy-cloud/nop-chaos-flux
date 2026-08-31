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
  evalNotionCondition,
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

  it('returns null for non-Notion endpoints; unknown post targets fail (P5b write contract)', () => {
    expect(call('/r/User__findPage')).toBeNull();
    const post = call('/r/Notion__records?view=table', 'post');
    expect(post?.status).toBe(1);
    const unknownWrite = call('/r/Notion__nope', 'post');
    expect(unknownWrite?.status).toBe(1);
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

  it('locks kanban drag wiring (draggable not disabled, onCardMove bound) and the five view branch testids', () => {
    const schema = JSON.parse(loadSchemaText());
    expect(schema.testid).toBe('notion-database-page');
    expect(schema.className).toBe('nt-root');
    const schemaText = loadSchemaText();
    const kanbanNode = findNode(schema, 'kanban');
    expect(kanbanNode?.draggable).not.toBe(false);
    expect((kanbanNode?.onCardMove as { action?: string } | undefined)?.action).toBe('ajax');
    expect(schemaText).toContain('Notion__moveCard');
    for (const view of ['table', 'board', 'gallery', 'calendar', 'list']) {
      expect(schemaText).toContain(`notion-views-${view}`);
    }
  });
});

describe('Notion mock backend — write operations (P5b session state)', () => {
  const db = createNotionDatabase();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const branch = createNotionFetcherBranch(db, clone);

  function call(url: string, method = 'get', body: Record<string, unknown> = {}): { status: number; data: unknown } | null {
    return branch({ url, method, params: {}, body });
  }

  it('nt-update-miss + success: updateRecord patches the session row; unknown id fails', () => {
    const miss = call('/r/Notion__updateRecord', 'post', { id: 'REC-999', patch: { title: '无' } });
    expect(miss?.status).toBe(1);
    const bad = call('/r/Notion__updateRecord', 'post', { id: 'REC-101', patch: { status: 'bogus' } });
    expect(bad?.status).toBe(1);
    const ok = call('/r/Notion__updateRecord', 'post', {
      id: 'REC-101',
      patch: { title: '更新后的标题样本', status: '已完成', category: '技术优化' },
    });
    expect(ok?.status).toBe(0);
    // 会话内持久性：records 端点返回新值（跨视图可观察）
    const table = call('/r/Notion__records?view=table&perPage=100')?.data as {
      items: Array<{ id: string; title: string; statusLabel: string; category: string }>;
    };
    const row = table.items.find((r) => r.id === 'REC-101');
    expect(row?.title).toBe('更新后的标题样本');
    expect(row?.statusLabel).toBe('已完成');
    expect(row?.category).toBe('技术优化');
    // 平铺顶层 patch 键（form includeScope 别名）等价接受
    const flat = call('/r/Notion__updateRecord', 'post', { id: 'REC-102', status: 'review' });
    expect(flat?.status).toBe(0);
    // ntPeek* 键为编辑面规范键：优先于 includeScope 带入的加载记录同名键
    const peekAlias = call('/r/Notion__updateRecord', 'post', {
      id: 'REC-107',
      title: '旧标题（载荷残留）',
      ntPeekTitle: '编辑面新标题',
    });
    expect(peekAlias?.status).toBe(0);
    const aliased = call('/r/Notion__record?id=REC-107')?.data as { title: string };
    expect(aliased.title).toBe('编辑面新标题');
    // review 行未完成 → 仍留 list；翻转为 done 的行离开 list
    let list = call('/r/Notion__records?view=list')?.data as { items: Array<{ id: string }> };
    expect(list.items.some((r) => r.id === 'REC-102')).toBe(true);
    expect(call('/r/Notion__updateRecord', 'post', { id: 'REC-105', status: '已完成' })?.status).toBe(0);
    list = call('/r/Notion__records?view=list')?.data as { items: Array<{ id: string }> };
    expect(list.items.some((r) => r.id === 'REC-105')).toBe(false);
  });

  it('nt-create-miss + success: createRecord appends REC-133 at the tail; title required', () => {
    const miss = call('/r/Notion__createRecord', 'post', { title: '   ' });
    expect(miss?.status).toBe(1);
    const badField = call('/r/Notion__createRecord', 'post', { title: '样本', category: '不存在的分类' });
    expect(badField?.status).toBe(1);
    const ok = call('/r/Notion__createRecord', 'post', { title: '链路验证新建记录样本', status: '进行中' });
    expect(ok?.status).toBe(0);
    expect((ok?.data as { id?: string }).id).toBe('REC-133');
    // 插行位次=表尾（分页/行数 +1，keyword 检索可达）
    const table = call('/r/Notion__records?view=table&perPage=100')?.data as { total: number; items: unknown[] };
    expect(table.total).toBe(33);
    const search = call('/r/Notion__records?view=table&perPage=100&keyword=链路验证新建')?.data as { total: number };
    expect(search.total).toBe(1);
  });

  it('nt-move-miss + success: moveCard flips status across views; board counts follow session', () => {
    const before = call('/r/Notion__records?view=board')?.data as { columns: Array<{ id: string; count: number }> };
    const notStarted = before.columns.find((c) => c.id === 'col-not_started');
    const done = before.columns.find((c) => c.id === 'col-done');
    expect(notStarted?.count).toBeGreaterThan(0);
    const doneBefore = done?.count ?? 0;

    const missColumn = call('/r/Notion__moveCard', 'post', { id: 'card-REC-101', toColumn: 'col-bogus' });
    expect(missColumn?.status).toBe(1);
    const missCard = call('/r/Notion__moveCard', 'post', { id: 'card-REC-999', toColumn: 'col-done' });
    expect(missCard?.status).toBe(1);

    const ok = call('/r/Notion__moveCard', 'post', { id: 'card-REC-104', toColumn: 'col-done', toIndex: 0 });
    expect(ok?.status).toBe(0);
    const after = call('/r/Notion__records?view=board')?.data as { columns: Array<{ id: string; count: number }> };
    expect(after.columns.find((c) => c.id === 'col-done')?.count).toBe(doneBefore + 1);
    // table 视图分组值同步（会话态跨视图一致）
    const table = call('/r/Notion__records?view=table&perPage=100')?.data as {
      items: Array<{ id: string; statusLabel: string }>;
    };
    expect(table.items.find((r) => r.id === 'REC-104')?.statusLabel).toBe('已完成');
  });

  it('nt-viewcfg-miss + overrides: filter/sort/group session overrides pre-apply on reads', () => {
    const miss = call('/r/Notion__updateViewConfig', 'post', { viewId: 'timeline', patch: { sorts: [] } });
    expect(miss?.status).toBe(1);
    const badGroup = call('/r/Notion__updateViewConfig', 'post', { viewId: 'board', patch: { group: 'bogus' } });
    expect(badGroup?.status).toBe(1);

    // I4 sorts override：table 按 number 升序（设置表单字符串码别名 number:asc）
    const sort = call('/r/Notion__updateViewConfig', 'post', {
      viewId: 'table',
      patch: { sorts: [{ property: 'number', dir: 'asc' }] },
    });
    expect(sort?.status).toBe(0);
    const sortAlias = call('/r/Notion__updateViewConfig', 'post', { viewId: 'list', ntSort: 'number:desc' });
    expect(sortAlias?.status).toBe(0);
    const sorted = call('/r/Notion__records?view=table&perPage=100')?.data as {
      items: Array<{ number: number }>;
    };
    const numbers = sorted.items.map((r) => r.number);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);

    // I3 filter override：嵌套组（≤3 层）求值——or(状态=已完成, and(分类=技术优化, 工作量>4))
    const filter = call('/r/Notion__updateViewConfig', 'post', {
      viewId: 'table',
      patch: {
        filter: {
          id: 'root',
          conjunction: 'or',
          children: [
            { id: 'r1', left: { type: 'field', field: 'status' }, op: 'select_equals', right: 'done' },
            {
              id: 'g1',
              conjunction: 'and',
              children: [
                { id: 'r2', left: { type: 'field', field: 'category' }, op: 'select_equals', right: '技术优化' },
                { id: 'r3', left: { type: 'field', field: 'number' }, op: 'greater', right: 4 },
              ],
            },
          ],
        },
      },
    });
    expect(filter?.status).toBe(0);
    const filtered = call('/r/Notion__records?view=table&perPage=100')?.data as {
      items: Array<{ statusLabel: string; category: string; number: number }>;
    };
    expect(filtered.items.length).toBeGreaterThan(0);
    for (const row of filtered.items) {
      const hit = row.statusLabel === '已完成' || (row.category === '技术优化' && row.number > 4);
      expect(hit).toBe(true);
    }
    // nt-filter-empty：恒假规则 → 空数组不报错
    const empty = call('/r/Notion__updateViewConfig', 'post', {
      viewId: 'list',
      patch: { filter: { id: 'root', conjunction: 'and', children: [{ id: 'r1', left: { type: 'field', field: 'title' }, op: 'equal', right: '绝不存在的标题xyz' }] } },
    });
    expect(empty?.status).toBe(0);
    const emptyList = call('/r/Notion__records?view=list')?.data as { items: unknown[] };
    expect(emptyList.items).toHaveLength(0);

    // I11 group override：board 列集随分组属性变化，moveCard 翻转对应属性
    const group = call('/r/Notion__updateViewConfig', 'post', { viewId: 'board', patch: { group: 'category' } });
    expect(group?.status).toBe(0);
    const board = call('/r/Notion__records?view=board')?.data as { columns: Array<{ id: string; title: string }> };
    expect(board.columns.map((c) => c.title)).toEqual(['产品需求', '技术优化', '体验改进', '调研探索']);
    const move = call('/r/Notion__moveCard', 'post', { id: 'card-REC-101', toColumn: 'col-调研探索', toIndex: 0 });
    expect(move?.status).toBe(0);
    const table = call('/r/Notion__records?view=table&perPage=100')?.data as {
      items: Array<{ id: string; category: string }>;
    };
    expect(table.items.find((r) => r.id === 'REC-101')?.category).toBe('调研探索');

    // null patch 清除 override，board 回到 status 分组
    const clear = call('/r/Notion__updateViewConfig', 'post', { viewId: 'board', patch: { group: null } });
    expect(clear?.status).toBe(0);
    const restored = call('/r/Notion__records?view=board')?.data as { columns: Array<{ title: string }> };
    expect(restored.columns.map((c) => c.title)).toEqual(['未开始', '进行中', '评审中', '已完成']);
  });

  it('nt-copy-noop: copyLink is a zero-side-effect get that always succeeds', () => {
    const ok = call('/r/Notion__copyLink?id=REC-101');
    expect(ok?.status).toBe(0);
    expect(ok?.data).toMatchObject({ ok: true, id: 'REC-101' });
    expect((ok?.data as { url: string }).url).toContain('wiki.demo');
    // 零副作用：清除测试残留 filter 后记录集全量不变化
    expect(call('/r/Notion__updateViewConfig', 'post', { viewId: 'table', patch: { filter: null, sorts: null } })?.status).toBe(0);
    const table = call('/r/Notion__records?view=table&perPage=100')?.data as { total: number };
    expect(table.total).toBe(33);
  });

  it('opt-in hooks stay no-op in production and route forced misses through the endpoint', () => {
    expect((globalThis as { __notionTestHooks?: unknown }).__notionTestHooks).toBeUndefined();
    expect((globalThis as { __notionEndpointCalls?: unknown }).__notionEndpointCalls).toBeUndefined();
  });
});

describe('Notion condition evaluator — nested group feasibility (G-C)', () => {
  const records = createNotionRecords();

  it('evaluates and/or nesting up to 3 levels and caps depth beyond', () => {
    const record = records[0]; // in_progress / 产品需求 / number 1
    expect(
      evalNotionCondition(record, {
        conjunction: 'and',
        children: [
          { left: { type: 'field', field: 'status' }, op: 'select_equals', right: 'in_progress' },
          {
            conjunction: 'or',
            children: [
              { left: { type: 'field', field: 'category' }, op: 'select_equals', right: '产品需求' },
              { left: { type: 'field', field: 'number' }, op: 'greater', right: 100 },
            ],
          },
        ],
      }),
    ).toBe(true);
    expect(
      evalNotionCondition(record, {
        conjunction: 'and',
        not: true,
        children: [{ left: { type: 'field', field: 'status' }, op: 'select_equals', right: 'in_progress' }],
      }),
    ).toBe(false);
    // 组嵌套第 4 层判否（maxDepth=3 口径，与 builder 一致）
    const deep = {
      conjunction: 'and',
      children: [{
        conjunction: 'and',
        children: [{
          conjunction: 'and',
          children: [{
            conjunction: 'and',
            children: [{ left: { type: 'field', field: 'status' }, op: 'select_equals', right: 'in_progress' }],
          }],
        }],
      }],
    };
    expect(evalNotionCondition(record, deep as never)).toBe(false);
    // 未知字段/操作符 → 不命中（不抛错）
    expect(evalNotionCondition(record, { left: { type: 'field', field: 'bogus' }, op: 'select_equals', right: 'x' })).toBe(false);
    expect(evalNotionCondition(record, { left: { type: 'field', field: 'status' }, op: 'bogus_op', right: 'x' })).toBe(false);
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
