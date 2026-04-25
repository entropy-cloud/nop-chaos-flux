import type { CSSProperties } from 'react';
import type { TableColumnSchema, TableSchema } from '../schemas';

const CONTROL_COLUMN_WIDTH = 40;
const DEFAULT_FIXED_COLUMN_WIDTH = 160;

export interface FixedCellProps {
  className?: string;
  style?: CSSProperties;
  fixed?: 'left' | 'right';
}

interface FixedColumnEntry {
  key: string;
  fixed: 'left' | 'right';
  width: number;
}

function toWidth(value: number | string | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/px$/, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function createStickyStyle(fixed: 'left' | 'right', offset: number, width?: number | string): CSSProperties {
  return {
    position: 'sticky',
    [fixed]: `${offset}px`,
    zIndex: fixed === 'left' ? 2 : 1,
    background: 'var(--background)',
    ...(width !== undefined ? { width, minWidth: width } : {}),
  };
}

export function createFixedColumnLayout(schemaProps: TableSchema, columns: TableColumnSchema[], showExpandColumn = Boolean(schemaProps.expandable)) {
  const hasLeftFixedDataColumn = columns.some((column) => column.fixed === 'left');
  const entries: FixedColumnEntry[] = [];

  if (showExpandColumn && hasLeftFixedDataColumn) {
    entries.push({ key: '__expand__', fixed: 'left', width: CONTROL_COLUMN_WIDTH });
  }

  if (schemaProps.rowSelection && hasLeftFixedDataColumn) {
    entries.push({ key: '__selection__', fixed: 'left', width: CONTROL_COLUMN_WIDTH });
  }

  columns.forEach((column, index) => {
    if (column.fixed !== 'left' && column.fixed !== 'right') {
      return;
    }

    entries.push({
      key: `${column.name ?? 'column'}:${index}`,
      fixed: column.fixed,
      width: toWidth(column.width, DEFAULT_FIXED_COLUMN_WIDTH),
    });
  });

  const leftOffsets = new Map<string, number>();
  let leftOffset = 0;
  for (const entry of entries) {
    if (entry.fixed !== 'left') {
      continue;
    }
    leftOffsets.set(entry.key, leftOffset);
    leftOffset += entry.width;
  }

  const rightOffsets = new Map<string, number>();
  let rightOffset = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry || entry.fixed !== 'right') {
      continue;
    }
    rightOffsets.set(entry.key, rightOffset);
    rightOffset += entry.width;
  }

  function resolveEntry(key: string, width?: number | string): FixedCellProps {
    if (leftOffsets.has(key)) {
      return {
        fixed: 'left',
        className: 'bg-background',
        style: createStickyStyle('left', leftOffsets.get(key) ?? 0, width ?? CONTROL_COLUMN_WIDTH),
      };
    }

    if (rightOffsets.has(key)) {
      return {
        fixed: 'right',
        className: 'bg-background',
        style: createStickyStyle('right', rightOffsets.get(key) ?? 0, width ?? DEFAULT_FIXED_COLUMN_WIDTH),
      };
    }

    return {};
  }

  return {
    hasStickyColumns: entries.length > 0,
    getExpandCellProps() {
      return resolveEntry('__expand__', CONTROL_COLUMN_WIDTH);
    },
    getSelectionCellProps() {
      return resolveEntry('__selection__', CONTROL_COLUMN_WIDTH);
    },
    getColumnCellProps(column: TableColumnSchema, index: number) {
      return resolveEntry(`${column.name ?? 'column'}:${index}`, column.fixed ? column.width ?? DEFAULT_FIXED_COLUMN_WIDTH : column.width);
    },
  };
}

export type FixedColumnLayout = ReturnType<typeof createFixedColumnLayout>;
