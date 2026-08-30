/**
 * Grid-tracker replica — write-operation cores (plan 2026-08-30-0953-1 P6b
 * Phase 1, notion `-writes.ts` entity-module precedent).
 *
 * Session state stays in the caller-owned `AtRecord[]` array, so writes are
 * observable across pages and sources within one session. Write contracts
 * (post):
 * `Airtable__updateRecord` — `{id, patch:{...}}` canonical body or flat
 * top-level patch keys (form `includeScope:'*'` alias); `atEdit*` edit-face
 * keys take precedence over same-name loaded-record keys riding along in the
 * merged body (includeScope shadowing countermeasure, `ntPeek*` precedent).
 * Readonly auto fields (`autoNo`/`createdAt`/`modifiedAt`) are ignored
 * (at-write-readonly); a patch with zero effective keys fails; unknown id
 * fails (at-update-miss).
 * `Airtable__createRecord` — `{title, ...}`; title required (at-create-miss,
 * schema-side `required` blocks first); the next `AT-{n}` id is appended at
 * the session-library tail (表尾插行) with defaults for unspecified fields.
 */

import {
  AT_CATEGORY_LABELS,
  AT_PEOPLE,
  AT_TAG_LABELS,
  type AtRecord,
} from './mock-backend-airtable-types';
import { airtableWriteStamp } from './mock-backend-airtable-records';

export interface AirtableWriteResult {
  ok: boolean;
  error?: string;
  id?: string;
  updated?: number;
}

export type AtRecordPatch = Partial<Pick<AtRecord,
  | 'title' | 'notes' | 'category' | 'tags' | 'date' | 'amount' | 'score'
  | 'progress' | 'done' | 'email' | 'site' | 'phone' | 'durationSeconds'
  | 'rating' | 'barcode'
>>;

/** Edit-face canonical keys (`atEdit*`) → record field (precedence order). */
const AT_EDIT_KEY_BY_FIELD: Record<string, keyof AtRecordPatch> = {
  atEditNotes: 'notes',
  atEditCategory: 'category',
  atEditTags: 'tags',
  atEditDate: 'date',
  atEditAmount: 'amount',
  atEditScore: 'score',
  atEditProgress: 'progress',
  atEditDone: 'done',
  atEditEmail: 'email',
  atEditSite: 'site',
  atEditPhone: 'phone',
  atEditDurationSeconds: 'durationSeconds',
  atEditRating: 'rating',
  atEditBarcode: 'barcode',
};

function normalizePatchValue(field: keyof AtRecordPatch, raw: unknown): { ok: true; value: unknown } | { ok: false } {
  switch (field) {
    case 'notes':
    case 'site':
    case 'phone':
    case 'barcode':
      return typeof raw === 'string' ? { ok: true, value: raw } : { ok: false };
    case 'email':
      return typeof raw === 'string' && raw.includes('@') ? { ok: true, value: raw } : { ok: false };
    case 'category':
      return typeof raw === 'string' && AT_CATEGORY_LABELS.some((c) => c.label === raw)
        ? { ok: true, value: raw }
        : { ok: false };
    case 'tags':
      if (!Array.isArray(raw)) return { ok: false };
      return raw.every((t) => typeof t === 'string' && AT_TAG_LABELS.some((label) => label.label === t))
        ? { ok: true, value: raw }
        : { ok: false };
    case 'date':
      return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? { ok: true, value: raw }
        : { ok: false };
    case 'amount':
    case 'score':
    case 'durationSeconds': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) && n >= 0 ? { ok: true, value: n } : { ok: false };
    }
    case 'progress': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) && n >= 0 && n <= 1 ? { ok: true, value: n } : { ok: false };
    }
    case 'rating': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? { ok: true, value: n } : { ok: false };
    }
    case 'done':
      return typeof raw === 'boolean' ? { ok: true, value: raw } : { ok: false };
    default:
      return { ok: false };
  }
}

/**
 * Parse the edit patch out of a merged request body. `atEdit*` keys win over
 * same-name raw keys; unknown/readonly keys are ignored; a present-but-blank
 * canonical title is invalid (primary field cannot be cleared).
 */
function pickAirtablePatch(source: Record<string, unknown>): AtRecordPatch | null {
  const patch: Record<string, unknown> = {};
  const atEditTitle = source.atEditTitle;
  if (atEditTitle !== undefined && atEditTitle !== null) {
    if (typeof atEditTitle !== 'string' || !atEditTitle.trim()) return null;
    patch.title = atEditTitle.trim();
  }
  const rawTitle = source.title;
  if (patch.title === undefined && rawTitle !== undefined && rawTitle !== null && rawTitle !== '') {
    if (typeof rawTitle !== 'string' || !rawTitle.trim()) return null;
    patch.title = rawTitle.trim();
  }
  for (const [editKey, field] of Object.entries(AT_EDIT_KEY_BY_FIELD)) {
    const raw = source[editKey] ?? source[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const normalized = normalizePatchValue(field, raw);
    if (!normalized.ok) return null;
    patch[field] = normalized.value;
  }
  return patch as AtRecordPatch;
}

/**
 * `Airtable__updateRecord` core: `{patch:{...}}` canonical body or flat
 * top-level patch keys; zero match → `{ok:false}` (at-update-miss); all-
 * readonly patch → `{ok:false, error:'empty patch'}` (at-write-readonly).
 */
export function updateAirtableRecord(rows: AtRecord[], input: Record<string, unknown>): AirtableWriteResult {
  const id = typeof input.id === 'string' ? input.id : '';
  if (!id) return { ok: false, error: 'missing id' };
  const row = rows.find((r) => r.id === id);
  if (!row) return { ok: false, error: 'record not found' };
  if (input.forceMiss === true) return { ok: false, error: 'forced update miss' };
  const patchSource = (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)
    ? input.patch
    : input) as Record<string, unknown>;
  const patch = pickAirtablePatch(patchSource);
  if (patch === null) return { ok: false, error: 'invalid field' };
  if (Object.keys(patch).length === 0) return { ok: false, error: 'empty patch' };
  Object.assign(row, patch);
  row.modifiedAt = airtableWriteStamp();
  return { ok: true, id: row.id, updated: 1 };
}

/**
 * `Airtable__updateViewConfig` core (P6b Phase 2 mechanism amendment): the
 * grid column-menu sort items live inside the table renderer, and surface
 * forms there write table-local sub-scopes — page-level data-source
 * `dependsOn` cannot observe them (live-probe evidence, plan Phase 2). So
 * in-table view switches go through a session write endpoint (P5b
 * `updateViewConfig` variant) instead of url-parameter materialization:
 * `{viewId:'grid', patch:{sort:'<field>:<dir>'|null}}` → session config;
 * subsequent records reads pre-apply the session sort; explicit `null`
 * clears; unknown viewId → `{ok:false}` (at-viewcfg-miss).
 */
export function updateAirtableViewConfig(
  config: { sort?: string | null },
  input: Record<string, unknown>,
): AirtableWriteResult {
  const viewId = typeof input.viewId === 'string' ? input.viewId : '';
  if (viewId !== 'grid') return { ok: false, error: 'unknown viewId' };
  const patchSource = (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)
    ? input.patch
    : input) as Record<string, unknown>;
  const sortValue = patchSource.sort;
  if (sortValue === undefined) return { ok: false, error: 'empty patch' };
  if (sortValue !== null && typeof sortValue !== 'string') return { ok: false, error: 'invalid sort' };
  config.sort = sortValue;
  return { ok: true, id: viewId, updated: 1 };
}

export function nextAirtableRecordId(rows: AtRecord[]): string {
  const max = rows.reduce((acc, r) => Math.max(acc, Number(r.id.slice(3)) || 0), 100);
  return `AT-${max + 1}`;
}

/**
 * `Airtable__createRecord` core: append the next `AT-{n}` record at the
 * session-library tail (表尾插行裁定). Title required (at-create-miss guard);
 * unspecified fields take deterministic defaults.
 */
export function createAirtableRecordRow(rows: AtRecord[], input: Record<string, unknown>): AirtableWriteResult {
  const rawTitle = input.atEditTitle ?? input.title;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) return { ok: false, error: 'title required' };
  const rest: Record<string, unknown> = { ...input };
  delete rest.title;
  delete rest.atEditTitle;
  const patch = pickAirtablePatch(rest);
  if (patch === null) return { ok: false, error: 'invalid field' };
  const id = nextAirtableRecordId(rows);
  const seq = rows.length + 1;
  const stamp = airtableWriteStamp();
  const record: AtRecord = {
    id,
    autoNo: seq,
    title,
    notes: (patch.notes as string) ?? '',
    category: (patch.category as string) ?? AT_CATEGORY_LABELS[0].label,
    tags: (patch.tags as string[]) ?? [AT_TAG_LABELS[0].label],
    date: (patch.date as string) ?? '2026-09-15',
    amount: (patch.amount as number) ?? 1000,
    score: (patch.score as number) ?? 3,
    progress: (patch.progress as number) ?? 0,
    done: (patch.done as boolean) ?? false,
    attachmentTones: [],
    owner: AT_PEOPLE[0],
    email: (patch.email as string) ?? `member${seq + 100}@team.example.com`,
    site: (patch.site as string) ?? `https://tracker.example.com/req/${seq + 100}`,
    phone: (patch.phone as string) ?? '13810000000',
    durationSeconds: (patch.durationSeconds as number) ?? 3600,
    rating: (patch.rating as number) ?? 3,
    barcode: (patch.barcode as string) ?? `AT-8800-${String(100000 + seq).slice(1)}`,
    createdAt: stamp,
    modifiedAt: stamp,
  };
  rows.push(record);
  return { ok: true, id, updated: 1 };
}
