/**
 * Notion-style multi-view database replica mock data + fetcher branch
 * (plans 2026-08-30-0040-2 P5a reads + 2026-08-30-0614-1 P5b writes).
 *
 * This module owns the full `/r/Notion__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (branch-sink
 * precedent). Record dataset + view-payload builders + write-operation cores
 * live in `mock-backend-notion-records.ts` (P5b Phase 1 module split, linear
 * precedent). Session state lives in the factory closure (records array +
 * per-view config override map) so writes are observable across pages and
 * views within one session.
 *
 * Read endpoints (get): `Notion__records` (`view=` five shapes; `keyword=`
 * I5 search; per-view session overrides pre-applied server-side — filter
 * groups nest ≤3 levels, table sorts, board group property), `Notion__record?id=`
 * (miss → placeholder nt-peek-miss), `Notion__viewConfigs` (per-view
 * filter/sort/group/layout parameter objects — the G-C config-set data
 * carrier), plus the no-op `Notion__copyLink` semantic carrier.
 * Write endpoints (post): `Notion__updateRecord` (nt-update-miss),
 * `Notion__createRecord` (nt-create-miss), `Notion__moveCard`
 * (nt-move-miss), `Notion__updateViewConfig` (nt-viewcfg-miss).
 *
 * Opt-in e2e hooks (mirror mock-backend-linear): specs pre-create
 * `window.__notionEndpointCalls` / `window.__notionTestHooks` via
 * addInitScript; production never sets them, so both stay no-ops.
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import { createNotionRecords, filterNotionRecords, paginateNotion, toNotionRecordRow } from './mock-backend-notion-records';
import {
  buildNotionBoardData,
  buildNotionCalendarGrid,
} from './mock-backend-notion-views';
import {
  evalNotionCondition,
  moveNotionCard,
  sortNotionRecords,
  updateNotionRecord,
  updateNotionViewConfig,
  type NotionViewOverrideMap,
} from './mock-backend-notion-writes';
import { createNotionRecordRow } from './mock-backend-notion-writes';
import type {
  NotionDatabase,
  NotionGroupProperty,
  NotionRecord,
  NotionViewConfig,
  NotionViewType,
} from './mock-backend-notion-types';

export * from './mock-backend-notion-types';
export * from './mock-backend-notion-records';
export * from './mock-backend-notion-views';
export * from './mock-backend-notion-writes';

export function createNotionViewConfigs(): NotionViewConfig[] {
  const visibility = (names: string[]) => names.map((property) => ({ property, visible: true }));
  return [
    {
      viewId: 'table', type: 'table', name: '全部记录', icon: 'table', display: 'both',
      layout: { rowHeight: 'short' },
      propVisibility: visibility(['title', 'category', 'status', 'person', 'number', 'tags', 'date', 'done', 'url']),
      filter: { conjunction: 'and', rules: [{ property: 'category', op: 'is-not', value: '归档' }] },
      sorts: [{ property: 'editedTime', dir: 'desc' }],
    },
    {
      viewId: 'board', type: 'board', name: '状态看板', icon: 'kanban', display: 'both',
      layout: { cardSize: 'medium' },
      propVisibility: visibility(['title', 'tags', 'person']),
      filter: { conjunction: 'and', rules: [{ property: 'status', op: 'is-not', value: 'cancelled' }] },
      sorts: [{ property: 'number', dir: 'desc' }],
      group: { property: 'status', colorColumns: true },
    },
    {
      viewId: 'gallery', type: 'gallery', name: '封面墙', icon: 'layout-grid', display: 'both',
      layout: { cardSize: 'small', cover: true },
      propVisibility: visibility(['title', 'category', 'tags']),
      filter: { conjunction: 'and', rules: [{ property: 'hasCover', op: 'is', value: 'true' }] },
      sorts: [{ property: 'date', dir: 'asc' }],
    },
    {
      viewId: 'calendar', type: 'calendar', name: '排期月历', icon: 'calendar', display: 'both',
      layout: { dateProperty: 'date' },
      propVisibility: visibility(['title', 'status']),
      filter: { conjunction: 'and', rules: [] },
      sorts: [],
    },
    {
      viewId: 'list', type: 'list', name: '进行清单', icon: 'list', display: 'both',
      layout: { rowHeight: 'short' },
      propVisibility: visibility(['title', 'category', 'person']),
      filter: { conjunction: 'and', rules: [{ property: 'status', op: 'is-not', value: 'done' }] },
      sorts: [{ property: 'title', dir: 'asc' }],
    },
  ];
}

export function createNotionDatabase(): NotionDatabase & { overrides: NotionViewOverrideMap } {
  return {
    records: createNotionRecords(),
    viewConfigs: createNotionViewConfigs(),
    overrides: {},
  };
}

export interface NotionFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

type NotionTestHooks = {
  moveMiss?: boolean;
  updateMiss?: boolean;
  /** last `Notion__moveCard` body (opt-in e2e observation; production no-op) */
  lastMove?: Record<string, unknown>;
  /** last `Notion__updateRecord` body (opt-in e2e observation; production no-op) */
  lastUpdate?: Record<string, unknown>;
};

function readNotionTestHooks(): NotionTestHooks | undefined {
  return (globalThis as { __notionTestHooks?: NotionTestHooks }).__notionTestHooks;
}

function countNotionEndpointCall(url: string): void {
  const counters = (globalThis as { __notionEndpointCalls?: Record<string, number> }).__notionEndpointCalls;
  if (!counters) return;
  const name = url.slice(url.indexOf('Notion__')).split('?')[0];
  counters[name] = (counters[name] ?? 0) + 1;
}

/**
 * Full `/r/Notion__*` fetcher branch. Read payloads clone out of the session
 * state; write endpoints mutate the session arrays/overrides in place.
 * Returns null when the request is not a Notion endpoint. Unknown `view` →
 * table shape (nt-view-unknown); record miss → placeholder (nt-peek-miss);
 * zero-match keyword → empty items array (nt-records-miss).
 */
export function createNotionFetcherBranch(
  db: NotionDatabase & { overrides: NotionViewOverrideMap },
  clone: <T>(value: T) => T,
) {
  function boardGroupProperty(): NotionGroupProperty {
    return db.overrides.board?.group ?? 'status';
  }

  /** Session view-config pre-apply (P5a 服务端预应用平移 + P5b overrides). */
  function readRows(view: NotionViewType, keyword: string | undefined): NotionRecord[] {
    let rows = filterNotionRecords(db.records, keyword);
    const override = db.overrides[view];
    if (override?.filter) {
      rows = rows.filter((r) => evalNotionCondition(r, override.filter));
    }
    if (override?.sorts) {
      rows = sortNotionRecords(rows, override.sorts);
    }
    return rows;
  }

  function handleNotionBranch<T>(input: NotionFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Notion__')) {
      return null;
    }
    countNotionEndpointCall(url);
    const normalizedMethod = method.toLowerCase();

    // ----- writes (P5b) -----
    if (normalizedMethod === 'post') {
      if (url.includes('/r/Notion__updateRecord')) {
        const hooks = readNotionTestHooks();
        if (hooks) hooks.lastUpdate = { ...body };
        const result = updateNotionRecord(db.records, { ...body, forceMiss: hooks?.updateMiss === true });
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Notion__createRecord')) {
        const result = createNotionRecordRow(db.records, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Notion__moveCard')) {
        const hooks = readNotionTestHooks();
        if (hooks) hooks.lastMove = { ...body };
        const result = moveNotionCard(db.records, { ...body, forceMiss: hooks?.moveMiss === true }, boardGroupProperty());
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Notion__updateViewConfig')) {
        const result = updateNotionViewConfig(db.overrides, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      return { status: 1, data: clone({ ok: false, error: 'unknown Notion write endpoint' }) as T };
    }
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'unknown Notion endpoint' }) as T };
    }

    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    // ----- reads (P5a) + copy-link no-op carrier (P5b) -----
    if (url.includes('/r/Notion__copyLink')) {
      const id = read('id') ?? '';
      return { status: 0, data: clone({ ok: true, id, url: `https://wiki.demo/req/${id.toLowerCase()}` }) as T };
    }
    if (url.includes('/r/Notion__viewConfigs')) {
      return { status: 0, data: clone({ items: db.viewConfigs, total: db.viewConfigs.length }) as T };
    }
    if (url.includes('/r/Notion__records')) {
      const viewRaw = read('view') ?? 'table';
      const view: NotionViewType = (['table', 'board', 'gallery', 'calendar', 'list'] as const).includes(viewRaw as NotionViewType)
        ? (viewRaw as NotionViewType)
        : 'table';
      const rows = readRows(view, read('keyword')).map(toNotionRecordRow);
      if (view === 'board') {
        const rawIds = new Set(rows.map((r) => r.id));
        return { status: 0, data: clone(buildNotionBoardData(db.records.filter((r) => rawIds.has(r.id)), boardGroupProperty())) as T };
      }
      if (view === 'gallery') {
        const items = rows.filter((r) => r.hasCover);
        return { status: 0, data: clone({ items, total: items.length }) as T };
      }
      if (view === 'calendar') {
        return { status: 0, data: clone(buildNotionCalendarGrid(rows)) as T };
      }
      if (view === 'list') {
        const items = rows
          .filter((r) => r.status !== 'done')
          .sort((a, b) => a.title.localeCompare(b.title, 'zh'));
        return { status: 0, data: clone({ items, total: items.length }) as T };
      }
      const paged = paginateNotion(rows, Number(read('page') ?? 1) || 1, Number(read('perPage') ?? 10) || 10);
      return { status: 0, data: clone(paged) as T };
    }
    if (url.includes('/r/Notion__record')) {
      const id = (read('id') ?? '').replace(/^card-/, '');
      const found = db.records.find((r) => r.id === id);
      const record = found ?? { ...db.records[0], id, title: '未找到记录（占位样本）' };
      return { status: 0, data: clone(toNotionRecordRow(record)) as T };
    }
    return { status: 0, data: clone({ ok: false, error: 'unknown replica endpoint' }) as T };
  }

  // Opt-in e2e hook: force the miss branches through the exact endpoint
  // paths — the drag/edit UI cannot produce unknown ids (P5b Phase 1).
  const hooks = (globalThis as { __notionTestHooks?: NotionTestHooks }).__notionTestHooks;
  if (hooks) {
    hooks.moveMiss = false;
    hooks.updateMiss = false;
  }

  return handleNotionBranch;
}
