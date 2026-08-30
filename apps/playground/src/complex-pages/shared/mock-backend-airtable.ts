/**
 * Grid-tracker replica mock data + fetcher branch (plan 2026-08-30-0614-2
 * P6a Phase 1, notion module precedent).
 *
 * This module owns the full `/r/Airtable__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (branch-sink
 * precedent). Record dataset + row projection live in
 * `mock-backend-airtable-records.ts`; grouped-view computation lives in
 * `mock-backend-airtable-views.ts`; types/registries live in
 * `mock-backend-airtable-types.ts`.
 *
 * Read endpoints (get-only — interaction wiring belongs to P6b):
 * `Airtable__records` (grid shape `{items,total,summary,...}`; `keyword=`
 * filter; `group=category` → grouped sample payload; unknown group → flat
 * fallback at-group-unknown; unknown view → grid fallback at-view-unknown),
 * `Airtable__record?id=` (miss → placeholder AT-record-miss; carries
 * prevId/nextId for the modal prev/next nav shape).
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import {
  createAirtableRecords,
  filterAirtableRecords,
  paginateAirtable,
  summarizeAirtable,
  toAirtableFieldRows,
  toAirtableRecordRow,
} from './mock-backend-airtable-records';
import { groupAirtableRecords } from './mock-backend-airtable-views';
import type {
  AirtableDatabase,
  AtRecord,
} from './mock-backend-airtable-types';

export * from './mock-backend-airtable-types';
export * from './mock-backend-airtable-records';
export * from './mock-backend-airtable-views';

export function createAirtableDatabase(): AirtableDatabase {
  return { records: createAirtableRecords() };
}

export interface AirtableFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Full `/r/Airtable__*` fetcher branch (get-only). Unknown methods fail
 * (status 1); the grid view is the only view so any `view=` value falls back
 * to the grid shape (at-view-unknown); zero-match keyword → empty items
 * without error (at-records-miss); record miss → placeholder row (at-record-miss).
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
    const normalizedMethod = method.toLowerCase();
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'unknown Airtable endpoint (get-only in P6a)' }) as T };
    }

    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (url.includes('/r/Airtable__records')) {
      // at-view-unknown: grid is the only replicated view — any view value
      // (including typos) serves the grid shape data.
      const rows = filterAirtableRecords(db.records, read('keyword'));
      const group = read('group');
      if (group !== undefined && group !== '') {
        // at-group-unknown: unsupported group fields → flat shape (empty groups).
        const grouped = group === 'category' ? groupAirtableRecords(rows) : { groups: [], total: rows.length };
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

  return handleAirtableBranch;
}
