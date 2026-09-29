import { getIn, toPositiveNumber, toStringArray } from '@nop-chaos/flux-core';
import type { FilterState, MultiSortState, SortEntry, SortState, TableRowEntry } from './types.js';

function toRowRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

export function normalizeRowKey(
  record: Record<string, unknown>,
  sourceIndex: number,
  rowKeyField?: string,
): string {
  const explicitValue = rowKeyField ? getIn(record, rowKeyField) : undefined;
  const compatibilityValue = explicitValue ?? record.__rowKey ?? record.id;

  if (
    compatibilityValue === null ||
    compatibilityValue === undefined ||
    compatibilityValue === ''
  ) {
    return `legacy-index:${sourceIndex}`;
  }

  return String(compatibilityValue);
}

export function buildTableRowEntries(
  source: unknown[],
  rowKeyField?: string,
): TableRowEntry[] {
  const duplicateCounts = new Map<string, number>();

  return source.map((value, sourceIndex) => {
    const record = toRowRecord(value);
    const rowKey = normalizeRowKey(record, sourceIndex, rowKeyField);
    const duplicateIndex = duplicateCounts.get(rowKey) ?? 0;
    duplicateCounts.set(rowKey, duplicateIndex + 1);
    return {
      rowKey,
      cacheKey: duplicateIndex === 0 ? rowKey : `${rowKey}::dup:${duplicateIndex}`,
      sourceIndex,
      record,
    };
  });
}

export function warnOnDuplicateRowKeys(entries: TableRowEntry[]): void {
  if (!isDevRuntime()) return;

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.rowKey)) {
      duplicates.add(entry.rowKey);
      continue;
    }
    seen.add(entry.rowKey);
  }

  if (duplicates.size > 0) {
    console.warn(
      `[TableRenderer] Duplicate rowKey values detected: ${Array.from(duplicates).join(', ')}`,
    );
  }
}

function compareValues(aVal: unknown, bVal: unknown): number {
  if (aVal === bVal) return 0;
  if (aVal == null) return 1;
  if (bVal == null) return -1;
  // Numeric fast path: relational comparison matches numeric collation for
  // numbers and avoids the per-comparison String/localeCompare cost.
  if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
  return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
}

function compareKeyTuples(
  aKeys: unknown[],
  bKeys: unknown[],
  sortEntries: SortEntry[],
): number {
  for (let index = 0; index < sortEntries.length; index += 1) {
    const comparison = compareValues(aKeys[index], bKeys[index]);
    if (comparison !== 0) {
      return sortEntries[index].direction === 'asc' ? comparison : -comparison;
    }
  }
  return 0;
}

function toSortEntries(sortState: SortState | MultiSortState | undefined): SortEntry[] {
  if (!sortState) return [];
  if (Array.isArray(sortState)) {
    return sortState.filter(
      (entry): entry is SortEntry =>
        Boolean(entry && typeof entry.column === 'string' && entry.direction && entry.column.length > 0),
    );
  }
  if (sortState.column && sortState.direction) {
    return [{ column: sortState.column, direction: sortState.direction }];
  }
  return [];
}

export function processTableData(
  source: unknown[],
  rowKeyField: string | undefined,
  sortState: SortState | MultiSortState,
  filterState: FilterState,
): TableRowEntry[] {
  let data = buildTableRowEntries(source, rowKeyField);
  warnOnDuplicateRowKeys(data);

  const sortEntries = toSortEntries(sortState);
  if (sortEntries.length > 0) {
    // decorate-sort-undecorate: path resolution (getIn) runs once per row per
    // sort column instead of 2×O(n log n) times inside the comparator.
    const decorated = data.map((row) => ({
      row,
      keys: sortEntries.map((entry) => getIn(row.record, entry.column)),
    }));
    decorated.sort((a, b) => compareKeyTuples(a.keys, b.keys, sortEntries));
    data = decorated.map((decorated_) => decorated_.row);
  }

  // Single pass per active filter column: value-set membership and keyword
  // containment are evaluated together instead of two array scans.
  Object.entries(filterState).forEach(([columnName, values]) => {
    const hasValueFilter = values.values.size > 0;
    const keyword = values.keyword && values.keyword.trim().length > 0 ? values.keyword.trim().toLowerCase() : undefined;
    if (!hasValueFilter && !keyword) {
      return;
    }
    data = data.filter((row) => {
      const cell = String(getIn(row.record, columnName) ?? '');
      if (hasValueFilter && !values.values.has(cell)) {
        return false;
      }
      if (keyword && !cell.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    });
  });

  return data;
}

export function paginateTableData(
  data: TableRowEntry[],
  paginationEnabled: boolean,
  currentPage: number,
  pageSize: number,
): TableRowEntry[] {
  let pagedData = data;

  if (paginationEnabled) {
    const startIndex = (currentPage - 1) * pageSize;
    pagedData = pagedData.slice(startIndex, startIndex + pageSize);
  }

  return pagedData.map((entry, viewIndex) => ({ ...entry, viewIndex }));
}

export { toPositiveNumber, toStringArray };

export function toSelectionPayload(
  payload: Record<string, unknown> | string[] | undefined,
): Set<string> {
  if (Array.isArray(payload)) {
    return new Set(toStringArray(payload));
  }

  return new Set(toStringArray(payload?.selectedRowKeys));
}

export function serializeInstancePath(
  instancePath: readonly { repeatedTemplateId: string; instanceKey: string }[] | undefined,
): string {
  if (!instancePath?.length) {
    return 'root';
  }
  // Scalar JSON quoting per segment keeps the id collision-free for arbitrary
  // instance keys (values may contain the separators) while avoiding the
  // whole-array stringify per row-scope id creation (plan 2026-09-29-4
  // R2-P20). The output is a composite scope id — consumers treat it as an
  // opaque key (table-renderer.tsx embeds it in the row scope id).
  return instancePath
    .map((seg) => `${JSON.stringify(seg.repeatedTemplateId)}|${JSON.stringify(seg.instanceKey)}`)
    .join('/');
}

export function createTableRowRepeatedTemplateId(tableNodeId: number | undefined): string {
  return `table-row:${tableNodeId ?? 'unknown'}`;
}

export function createRowScopeId(ownerKey: string, rowKey: string): string {
  return `table:${ownerKey}:row:${rowKey}`;
}

export function createRowScopePath(ownerPath: string, rowKey: string): string {
  return `${ownerPath}.rowsByKey.${rowKey}`;
}
