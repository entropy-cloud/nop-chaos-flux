/**
 * Notion-style multi-view database replica — view-config overrides, nested
 * condition evaluation, session sorts, and write-operation cores (plan
 * 2026-08-30-0614-1 P5b Phase 1 module split, linear entity-module
 * precedent).
 *
 * Session state stays in the caller-owned `NotionRecord[]` array plus the
 * `NotionViewOverrideMap`, so writes are observable across pages and views
 * within one session. Write contracts (all post unless noted):
 * `Notion__updateRecord` (flat/nested patch by id, miss → nt-update-miss),
 * `Notion__createRecord` (append `REC-` sequence, title required —
 * nt-create-miss), `Notion__moveCard` (group-property flip + session
 * ordering, `card-`/`col-` prefixes tolerated — nt-move-miss),
 * `Notion__updateViewConfig` (per-view session overrides for filter/sort/
 * group, pre-applied by reads — nt-viewcfg-miss).
 */

import {
  NOTION_CATEGORY_LABELS,
  NOTION_PEOPLE,
  NOTION_STATUS_META,
  NOTION_STATUS_ORDER,
  type NotionGroupProperty,
  type NotionRecord,
  type NotionStatus,
  type NotionViewType,
} from './mock-backend-notion-types';
import { notionWriteStamp } from './mock-backend-notion-records';
import { notionGroupColumns, recordGroupValue } from './mock-backend-notion-views';

/* ── View-config overrides (I3/I4/I11 session 态载体) ──────────────────── */

export interface NotionSortKey {
  property: string;
  dir: 'asc' | 'desc';
}

/**
 * Condition-builder value node (`flux-renderers-form-advanced` types):
 * recursive group ≤3 levels with and/or conjunction; leaf = field/op/right.
 */
export interface NotionConditionNode {
  id?: string;
  conjunction?: 'and' | 'or';
  not?: boolean;
  children?: NotionConditionNode[];
  left?: { type: string; field: string };
  op?: string;
  right?: unknown;
}

export interface NotionViewOverride {
  filter?: NotionConditionNode | null;
  sorts?: NotionSortKey[] | null;
  group?: NotionGroupProperty | null;
}

export type NotionViewOverrideMap = Partial<Record<NotionViewType, NotionViewOverride>>;

const FILTER_STATUS_VALUES = new Set<string>(NOTION_STATUS_ORDER);
const FILTER_MAX_DEPTH = 3;

function filterComparable(record: NotionRecord, field: string): unknown {
  if (field === 'category') return record.category;
  // status 比较域 = 枚举值 ∪ 中文标签（builder 选项/记录枚举双形态，updateRecord 同口径）
  if (field === 'status') return `${record.status}|${NOTION_STATUS_META[record.status].label}`;
  if (field === 'statusLabel') return NOTION_STATUS_META[record.status].label;
  if (field === 'number') return record.number;
  if (field === 'date') return record.date;
  if (field === 'title') return record.title;
  return undefined;
}

/** status 双形态（枚举|标签）相等性；其余字段退化为单值字符串比较。 */
function comparableMatches(left: unknown, needle: string): boolean {
  const text = String(left);
  if (!text.includes('|')) return text === needle;
  return text.split('|').includes(needle);
}

function evalFilterItem(record: NotionRecord, node: NotionConditionNode): boolean {
  const field = node.left?.field ?? '';
  const op = node.op ?? '';
  const left = filterComparable(record, field);
  const right = node.right;
  if (left === undefined) return false;
  if (op === 'is_empty') return left === '' || left === undefined || left === null;
  if (op === 'is_not_empty') return !(left === '' || left === undefined || left === null);
  if (typeof left === 'number') {
    const n = Number(right);
    switch (op) {
      case 'equal': return left === n;
      case 'not_equal': return left !== n;
      case 'less': return left < n;
      case 'less_or_equal': return left <= n;
      case 'greater': return left > n;
      case 'greater_or_equal': return left >= n;
      default: return false;
    }
  }
  const text = String(left);
  const needle = right === undefined || right === null ? '' : String(right);
  switch (op) {
    case 'equal':
    case 'select_equals':
      return comparableMatches(left, needle);
    case 'not_equal':
    case 'select_not_equals':
      return !comparableMatches(left, needle);
    case 'like':
    case 'starts_with':
    case 'ends_with':
      return op === 'like'
        ? text.toLowerCase().includes(needle.toLowerCase())
        : op === 'starts_with'
          ? text.startsWith(needle)
          : text.endsWith(needle);
    case 'select_any_in':
    case 'select_not_any_in': {
      const list = Array.isArray(right) ? right.map(String) : [needle];
      const hit = list.some((n) => comparableMatches(left, n));
      return op === 'select_any_in' ? hit : !hit;
    }
    case 'between': {
      const pair = Array.isArray(right) ? right : [];
      const lo = String(pair[0] ?? '');
      const hi = String(pair[1] ?? '');
      return (!lo || text >= lo) && (!hi || text <= hi);
    }
    default:
      return false;
  }
}

/**
 * Recursive condition evaluation (I3/G-C 实测义务): groups nest ≤3 levels;
 * unsupported fields/ops evaluate to no-match (visible as filtered-out, not
 * an error). `not` groups are accepted and flipped.
 */
export function evalNotionCondition(record: NotionRecord, node: NotionConditionNode | undefined | null, depth = 1): boolean {
  if (!node) return true;
  if (node.children) {
    if (depth > FILTER_MAX_DEPTH) return false;
    const conj = node.conjunction === 'or' ? 'or' : 'and';
    const results = node.children.map((child) => evalNotionCondition(record, child, depth + 1));
    const joined = conj === 'and' ? results.every(Boolean) : results.some(Boolean);
    return node.not ? !joined : joined;
  }
  const hit = evalFilterItem(record, node);
  return node.not ? !hit : hit;
}

const NOTION_SORT_FIELD_ACCESSORS: Record<string, (r: NotionRecord) => string | number> = {
  title: (r) => r.title,
  number: (r) => r.number,
  date: (r) => r.date,
  category: (r) => String(NOTION_CATEGORY_LABELS.findIndex((c) => c.label === r.category)),
  status: (r) => NOTION_STATUS_ORDER.indexOf(r.status),
  person: (r) => r.person.name,
  editedTime: (r) => r.editedTime,
  createdTime: (r) => r.createdTime,
};

/** Session-override sorts (I4): applied by the table read before pagination. */
export function sortNotionRecords(rows: NotionRecord[], sorts: NotionSortKey[] | undefined): NotionRecord[] {
  if (!sorts || sorts.length === 0) return rows;
  const valid = sorts.filter((s) => NOTION_SORT_FIELD_ACCESSORS[s.property]);
  if (valid.length === 0) return rows;
  const sorted = rows.slice().sort((a, b) => {
    for (const s of valid) {
      const av = NOTION_SORT_FIELD_ACCESSORS[s.property](a);
      const bv = NOTION_SORT_FIELD_ACCESSORS[s.property](b);
      if (av === bv) continue;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'zh');
      return s.dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

/* ── Write-operation cores (P5b Phase 1; session state = caller-owned) ─── */

export interface NotionWriteResult {
  ok: boolean;
  error?: string;
  updated?: number;
  id?: string;
}

export function nextNotionRecordId(rows: NotionRecord[]): string {
  const max = rows.reduce((acc, r) => Math.max(acc, Number(r.id.slice(4)) || 0), 100);
  return `REC-${max + 1}`;
}

export interface NotionRecordPatch {
  title?: string;
  category?: string;
  status?: NotionStatus;
  date?: string;
}

const NOTION_PATCH_STATUS_BY_LABEL = new Map<string, NotionStatus>(
  NOTION_STATUS_ORDER.map((s) => [NOTION_STATUS_META[s].label, s]),
);

function pickNotionRecordPatch(source: Record<string, unknown>): NotionRecordPatch | null {
  const patch: NotionRecordPatch = {};
  // Peek-form field names (`ntPeek*`) are the canonical edit keys: they take
  // precedence over the loaded record's own keys, which ride along when the
  // save action merges surface scope with `includeScope: '*'`.
  const title = source.ntPeekTitle ?? source.title;
  if (title !== undefined && title !== null) {
    if (typeof title !== 'string' || !title.trim()) return null;
    patch.title = title.trim();
  }
  const category = source.ntPeekCategory ?? source.category;
  if (category !== undefined && category !== null && category !== '') {
    if (typeof category !== 'string' || !NOTION_CATEGORY_LABELS.some((c) => c.label === category)) return null;
    patch.category = category;
  }
  const status = source.ntPeekStatus ?? source.status;
  if (status !== undefined && status !== null && status !== '') {
    if (typeof status !== 'string') return null;
    if (FILTER_STATUS_VALUES.has(status)) {
      patch.status = status as NotionStatus;
    } else if (NOTION_PATCH_STATUS_BY_LABEL.has(status)) {
      patch.status = NOTION_PATCH_STATUS_BY_LABEL.get(status);
    } else {
      return null;
    }
  }
  const date = source.date;
  if (date !== undefined && date !== null && date !== '') {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    patch.date = date;
  }
  return patch;
}

export function applyNotionRecordPatch(row: NotionRecord, patch: NotionRecordPatch): void {
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) {
    row.category = patch.category;
    row.categoryColor = NOTION_CATEGORY_LABELS.find((c) => c.label === patch.category)?.color ?? row.categoryColor;
  }
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.date !== undefined) row.date = patch.date;
  row.editedTime = notionWriteStamp();
}

/**
 * `Notion__updateRecord` core: flat top-level patch keys (form alias) or
 * `{patch:{...}}` canonical body; zero match → `{ok:false}`
 * (nt-update-miss).
 */
export function updateNotionRecord(rows: NotionRecord[], input: Record<string, unknown>): NotionWriteResult {
  const rawId = typeof input.id === 'string' ? input.id : '';
  const id = rawId.replace(/^card-/, '');
  if (!id) return { ok: false, error: 'missing id' };
  const row = rows.find((r) => r.id === id);
  if (!row) return { ok: false, error: 'record not found' };
  if (input.forceMiss === true) return { ok: false, error: 'forced update miss' };
  const patchSource = (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)
    ? input.patch
    : input) as Record<string, unknown>;
  const patch = pickNotionRecordPatch(patchSource);
  if (!patch || Object.keys(patch).length === 0) return { ok: false, error: 'empty patch' };
  applyNotionRecordPatch(row, patch);
  return { ok: true, id: row.id, updated: 1 };
}

/**
 * `Notion__createRecord` core: append the next `REC-` sequence record at the
 * session-library tail (表尾插行裁定). Title required (nt-create-miss guard);
 * unspecified fields take defaults.
 */
export function createNotionRecordRow(rows: NotionRecord[], input: Record<string, unknown>): NotionWriteResult {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) return { ok: false, error: 'title required' };
  const patch = pickNotionRecordPatch({ ...input, title });
  if (patch === null) return { ok: false, error: 'invalid field' };
  const category = patch.category ?? NOTION_CATEGORY_LABELS[0].label;
  const id = nextNotionRecordId(rows);
  const record: NotionRecord = {
    id,
    emoji: '📌',
    title,
    number: 1,
    category,
    categoryColor: NOTION_CATEGORY_LABELS.find((c) => c.label === category)?.color ?? 'blue',
    status: patch.status ?? 'not_started',
    tags: ['前端'],
    tagColors: ['gray'],
    date: patch.date ?? '2026-09-15',
    person: NOTION_PEOPLE[0],
    files: [],
    coverEmoji: '📐',
    coverTone: 'blue',
    hasCover: true,
    done: false,
    url: `https://wiki.demo/req/${id.toLowerCase()}`,
    email: 'owner-new@demo.example',
    phone: '13810000000',
    createdTime: notionWriteStamp(),
    editedTime: notionWriteStamp(),
  };
  rows.push(record);
  return { ok: true, id, updated: 1 };
}

/**
 * `Notion__moveCard` core: group-property flip + session ordering against the
 * board's *current* group property (session view-config, default status).
 * `card-`/`col-` prefixes tolerated; ordering inserts before the
 * `toIndex`-th card of the target column (append when out of range).
 * Unknown column or unmatched id → `{ok:false}` (nt-move-miss).
 */
export function moveNotionCard(
  rows: NotionRecord[],
  input: Record<string, unknown>,
  groupProperty: NotionGroupProperty,
): NotionWriteResult {
  const rawId = typeof input.id === 'string' ? input.id : '';
  const id = rawId.replace(/^card-/, '');
  const rawColumn = typeof input.toColumn === 'string' ? input.toColumn.replace(/^col-/, '') : '';
  const column = notionGroupColumns(groupProperty).find((c) => c.value === rawColumn || c.id === input.toColumn);
  if (!column) return { ok: false, error: 'unknown column' };
  const record = rows.find((r) => r.id === id);
  if (!record) return { ok: false, error: 'no matching card' };
  if (input.forceMiss === true) return { ok: false, error: 'forced move miss' };

  if (groupProperty === 'category') {
    record.category = column.value;
    record.categoryColor = NOTION_CATEGORY_LABELS.find((c) => c.label === column.value)?.color ?? record.categoryColor;
  } else if (groupProperty === 'person') {
    const person = NOTION_PEOPLE.find((p) => p.name === column.value);
    if (person) record.person = person;
  } else {
    record.status = column.value as NotionStatus;
  }
  record.editedTime = notionWriteStamp();

  const toIndex = Number(input.toIndex);
  if (input.toIndex !== undefined && input.toIndex !== '' && Number.isFinite(toIndex)) {
    const at = rows.indexOf(record);
    if (at >= 0) rows.splice(at, 1);
    const columnRecords = rows.filter((r) => recordGroupValue(r, groupProperty) === column.value);
    const anchor = columnRecords[toIndex];
    if (anchor) {
      rows.splice(rows.indexOf(anchor), 0, record);
    } else {
      const last = columnRecords[columnRecords.length - 1];
      if (last) rows.splice(rows.indexOf(last) + 1, 0, record);
      else rows.push(record);
    }
  }
  return { ok: true, id: record.id, updated: 1 };
}

/**
 * `Notion__updateViewConfig` core: per-view session overrides for
 * filter/sorts/group (patch keys optional; explicit `null` clears an
 * override). Unknown viewId → `{ok:false}` (nt-viewcfg-miss).
 *
 * Flat aliases from the settings form (`includeScope:'*'` body keys) are
 * accepted: `ntFilter`/`ntSort`/`ntGroup` map onto filter/sorts/group;
 * `ntSort` additionally accepts the settings-select string codes
 * (`'none'` clears, `'<property>:<asc|desc>'`).
 */
export function updateNotionViewConfig(
  overrides: NotionViewOverrideMap,
  input: Record<string, unknown>,
): NotionWriteResult {
  const viewId = typeof input.viewId === 'string' ? input.viewId : '';
  if (!( ['table', 'board', 'gallery', 'calendar', 'list'] as const).includes(viewId as NotionViewType)) {
    return { ok: false, error: 'unknown viewId' };
  }
  const patchSource = (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)
    ? input.patch
    : input) as Record<string, unknown>;
  const filterValue = patchSource.filter !== undefined ? patchSource.filter : patchSource.ntFilter;
  const sortsValue = patchSource.sorts !== undefined ? patchSource.sorts : patchSource.ntSort;
  const groupValue = patchSource.group !== undefined ? patchSource.group : patchSource.ntGroup;
  const next: NotionViewOverride = { ...(overrides[viewId as NotionViewType] ?? {}) };
  let touched = false;
  if (filterValue !== undefined) {
    if (filterValue !== null && (typeof filterValue !== 'object' || Array.isArray(filterValue))) {
      return { ok: false, error: 'invalid filter' };
    }
    next.filter = filterValue === null ? null : (filterValue as NotionConditionNode);
    touched = true;
  }
  if (sortsValue !== undefined) {
    if (sortsValue === null || sortsValue === 'none') {
      next.sorts = null;
    } else if (typeof sortsValue === 'string') {
      const [property, dir] = sortsValue.split(':');
      if (!property || (dir !== 'asc' && dir !== 'desc')) return { ok: false, error: 'invalid sorts' };
      next.sorts = [{ property, dir }];
    } else {
      if (!Array.isArray(sortsValue)) return { ok: false, error: 'invalid sorts' };
      const sorts = (sortsValue as Array<Record<string, unknown>>).map((s) => ({
        property: String(s.property ?? ''),
        dir: s.dir === 'desc' ? 'desc' : 'asc',
      })) as NotionSortKey[];
      next.sorts = sorts;
    }
    touched = true;
  }
  if (groupValue !== undefined) {
    const group = groupValue;
    if (group === null) {
      next.group = null;
    } else if (group === 'status' || group === 'category' || group === 'person') {
      next.group = group;
    } else {
      return { ok: false, error: 'invalid group' };
    }
    touched = true;
  }
  if (!touched) return { ok: false, error: 'empty patch' };
  overrides[viewId as NotionViewType] = next;
  return { ok: true, id: viewId, updated: 1 };
}
