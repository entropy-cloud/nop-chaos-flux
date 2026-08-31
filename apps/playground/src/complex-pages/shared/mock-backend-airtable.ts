/**
 * Grid-tracker replica mock data + fetcher branch (plans 2026-08-30-0614-2
 * P6a reads + 2026-08-30-0953-1 P6b writes; notion module precedent).
 *
 * This module owns the full `/r/Airtable__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (branch-sink
 * precedent). Record dataset + row projection live in
 * `mock-backend-airtable-records.ts`; grouped-view computation lives in
 * `mock-backend-airtable-views.ts`; write-operation cores live in
 * `mock-backend-airtable-writes.ts`; types/registries live in
 * `mock-backend-airtable-types.ts`. Session state (the records array) is
 * owned by the factory closure, so writes are observable across pages and
 * sources within one session.
 *
 * Read endpoints (get): `Airtable__records` (grid shape
 * `{items,total,summary,...}`; `keyword=` filter (P6b A1); `sort=field:dir`
 * session sort (P6b A5); `group=category|owner|done` grouped payload with
 * generalized grouping (P6b A8); unknown group → flat fallback
 * at-group-unknown; unknown view → grid fallback at-view-unknown),
 * `Airtable__record?id=` (miss → placeholder AT-record-miss; carries
 * prevId/nextId for the modal prev/next nav).
 * Write endpoints (post, P6b): `Airtable__updateRecord` (at-update-miss /
 * at-write-readonly), `Airtable__createRecord` (at-create-miss).
 *
 * Opt-in e2e hooks (mirror mock-backend-notion): specs pre-create
 * `window.__airtableEndpointCalls` / `window.__airtableTestHooks` via
 * addInitScript; production never sets them, so both stay no-ops.
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import {
  createAirtableRecords,
  filterAirtableRecords,
  paginateAirtable,
  sortAirtableRecords,
  summarizeAirtable,
  toAirtableFieldRows,
  toAirtableRecordRow,
} from './mock-backend-airtable-records';
import { groupAirtableRecords } from './mock-backend-airtable-views';
import {
  createAirtableRecordRow,
  updateAirtableRecord,
  updateAirtableViewConfig,
} from './mock-backend-airtable-writes';
import type {
  AirtableDatabase,
  AtRecord,
} from './mock-backend-airtable-types';

export * from './mock-backend-airtable-types';
export * from './mock-backend-airtable-records';
export * from './mock-backend-airtable-views';
export * from './mock-backend-airtable-writes';

export function createAirtableDatabase(): AirtableDatabase {
  return { records: createAirtableRecords(), viewConfig: {} };
}

export interface AirtableFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

type AirtableTestHooks = {
  updateMiss?: boolean;
  /** last `Airtable__updateRecord` body (opt-in e2e observation; production no-op) */
  lastUpdate?: Record<string, unknown>;
};

function readAirtableTestHooks(): AirtableTestHooks | undefined {
  return (globalThis as { __airtableTestHooks?: AirtableTestHooks }).__airtableTestHooks;
}

function countAirtableEndpointCall(url: string): void {
  const counters = (globalThis as { __airtableEndpointCalls?: Record<string, number> }).__airtableEndpointCalls;
  if (!counters) return;
  const name = url.slice(url.indexOf('Airtable__')).split('?')[0];
  counters[name] = (counters[name] ?? 0) + 1;
}

/**
 * Full `/r/Airtable__*` fetcher branch. Read payloads clone out of the
 * session state; write endpoints mutate the session records array in place.
 * Unknown methods fail (status 1); the grid view is the only view so any
 * `view=` value falls back to the grid shape (at-view-unknown); zero-match
 * keyword → empty items without error (at-records-miss); record miss →
 * placeholder row (at-record-miss).
 */
export function createAirtableFetcherBranch(
  db: AirtableDatabase,
  clone: <T>(value: T) => T,
) {
  function placeholderRecord(id: string): AtRecord {
    const fallback = db.records[0];
    return { ...fallback, id, title: '未找到记录（占位样本）' };
  }

  function findNeighbor(id: string, offset: -1 | 1): string | undefined {
    const index = db.records.findIndex((r) => r.id === id);
    if (index < 0) return db.records[0]?.id;
    return db.records[index + offset]?.id;
  }

  function handleAirtableBranch<T>(input: AirtableFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Airtable__')) {
      return null;
    }
    countAirtableEndpointCall(url);
    const normalizedMethod = method.toLowerCase();

    // ----- writes (P6b) -----
    if (normalizedMethod === 'post') {
      if (url.includes('/r/Airtable__updateRecord')) {
        const hooks = readAirtableTestHooks();
        if (hooks) hooks.lastUpdate = { ...body };
        const result = updateAirtableRecord(db.records, { ...body, forceMiss: hooks?.updateMiss === true });
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Airtable__createRecord')) {
        const result = createAirtableRecordRow(db.records, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Airtable__updateViewConfig')) {
        const result = updateAirtableViewConfig(db.viewConfig, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      return { status: 1, data: clone({ ok: false, error: 'unknown Airtable write endpoint' }) as T };
    }
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'unknown Airtable endpoint' }) as T };
    }

    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    // ----- reads (P6a) + search/sort/group parameterization (P6b) -----
    if (url.includes('/r/Airtable__records')) {
      // at-view-unknown: grid is the only replicated view — any view value
      // (including typos) serves the grid shape data.
      // Sort precedence: explicit `sort=` url param wins over the session
      // viewConfig sort (in-table menu writes); empty/null → default order.
      const effectiveSort = read('sort') || db.viewConfig.sort || undefined;
      const rows = sortAirtableRecords(
        filterAirtableRecords(db.records, read('keyword')),
        effectiveSort,
      );
      const group = read('group');
      if (group !== undefined && group !== '') {
        // at-group-unknown: unsupported group fields → flat shape (empty groups).
        const grouped = groupAirtableRecords(rows, group);
        return { status: 0, data: clone(grouped) as T };
      }
      const summary = summarizeAirtable(rows);
      const paged = paginateAirtable(
        rows,
        Number(read('page') ?? 1) || 1,
        Number(read('perPage') ?? 10) || 10,
      );
      return { status: 0, data: clone({ ...paged, summary, fields: toAirtableFieldRows() }) as T };
    }
    if (url.includes('/r/Airtable__record')) {
      const id = read('id') ?? '';
      const found = db.records.find((r) => r.id === id);
      const record = found ?? placeholderRecord(id);
      return {
        status: 0,
        data: clone({
          ...toAirtableRecordRow(record),
          prevId: found ? findNeighbor(record.id, -1) : undefined,
          nextId: found ? findNeighbor(record.id, 1) : undefined,
        }) as T,
      };
    }
    return { status: 0, data: clone({ ok: false, error: 'unknown replica endpoint' }) as T };
  }

  // Opt-in e2e hook: force the miss branch through the exact endpoint path —
  // the edit UI cannot produce unknown ids (P6b Phase 1, notion precedent).
  const hooks = (globalThis as { __airtableTestHooks?: AirtableTestHooks }).__airtableTestHooks;
  if (hooks) {
    hooks.updateMiss = false;
  }

  return handleAirtableBranch;
}
