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
  return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
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
    data.sort((a, b) => {
      for (const entry of sortEntries) {
        const comparison = compareValues(a.record[entry.column], b.record[entry.column]);
        if (comparison !== 0) {
          return entry.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  Object.entries(filterState).forEach(([columnName, values]) => {
    if (values.values.size > 0) {
      data = data.filter((row) => values.values.has(String(row.record[columnName])));
    }

    if (values.keyword && values.keyword.trim().length > 0) {
      const needle = values.keyword.trim().toLowerCase();
      data = data.filter((row) =>
        String(row.record[columnName] ?? '')
          .toLowerCase()
          .includes(needle),
      );
    }
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
  return instancePath?.length ? JSON.stringify(instancePath) : 'root';
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
