import { getIn, toPositiveNumber, toStringArray } from '@nop-chaos/flux-core';
import type { FilterState, SortState, TableRowEntry } from './types.js';

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
  return source.map((value, sourceIndex) => {
    const record = toRowRecord(value);
    return {
      rowKey: normalizeRowKey(record, sourceIndex, rowKeyField),
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

export function processTableData(
  source: unknown[],
  rowKeyField: string | undefined,
  sortState: SortState,
  filterState: FilterState,
  paginationEnabled: boolean,
  currentPage: number,
  pageSize: number,
): TableRowEntry[] {
  let data = buildTableRowEntries(source, rowKeyField);
  warnOnDuplicateRowKeys(data);

  if (sortState.column && sortState.direction) {
    data.sort((a, b) => {
      const aVal = a.record[sortState.column];
      const bVal = b.record[sortState.column];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortState.direction === 'asc' ? comparison : -comparison;
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

  if (paginationEnabled) {
    const startIndex = (currentPage - 1) * pageSize;
    data = data.slice(startIndex, startIndex + pageSize);
  }

  return data.map((entry, viewIndex) => ({ ...entry, viewIndex }));
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
