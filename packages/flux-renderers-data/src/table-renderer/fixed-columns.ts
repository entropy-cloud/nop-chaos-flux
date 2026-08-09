import type { CSSProperties } from 'react';
import type { TableColumnSchema, TableSchema } from '../schemas.js';

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

function createStickyStyle(
  fixed: 'left' | 'right',
  offset: number,
  width?: number | string,
): CSSProperties {
  return {
    position: 'sticky',
    [fixed]: `${offset}px`,
    zIndex: fixed === 'left' ? 2 : 1,
    // 背景透明继承：行级 hover/斑马纹/选中态通过 --table-hover-bg 等 token 透传到固定列（AMIS .is-sticky { background: inherit } 等价语义）。
    // maxWidth 防止 table-layout:auto 下剩余空间把固定列（序号/checkbox/expand 等）
    // 拉伸变宽：width 是建议值，没有 maxWidth 时浏览器会把表格剩余宽度分给所有列。
    ...(width !== undefined ? { width, minWidth: width, maxWidth: width } : {}),
  };
}

// 控制列（selection/expand）宽度与 sticky 解耦（P1-02）：非 sticky 配置
// （最常见 CRUD 选择表格）下也必须 width/minWidth/maxWidth 三件套封顶，
// 否则 auto 布局把剩余空间分给控制列、原始「序号/checkbox 列过宽」缺陷保留。
function createControlColumnStyle(width: number | string): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

export function getFixedColumnKey(column: TableColumnSchema, index: number) {
  return `${column.name ?? 'column'}:${index}`;
}

export function createFixedColumnLayout(
  schemaProps: Pick<TableSchema, 'rowSelection' | 'expandable'>,
  columns: TableColumnSchema[],
  showExpandColumn = Boolean(schemaProps.expandable),
  measuredWidths?: ReadonlyMap<string, number>,
) {
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
      key: getFixedColumnKey(column, index),
      fixed: column.fixed,
      width: toWidth(column.width, DEFAULT_FIXED_COLUMN_WIDTH),
    });
  });

  const resolveEntryWidth = (entryWidth: number, key: string) =>
    Math.round(measuredWidths?.get(key) ?? entryWidth);

  const leftOffsets = new Map<string, number>();
  let leftOffset = 0;
  for (const entry of entries) {
    if (entry.fixed !== 'left') {
      continue;
    }
    leftOffsets.set(entry.key, leftOffset);
    leftOffset += resolveEntryWidth(entry.width, entry.key);
  }

  const rightOffsets = new Map<string, number>();
  let rightOffset = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry || entry.fixed !== 'right') {
      continue;
    }
    rightOffsets.set(entry.key, rightOffset);
    rightOffset += resolveEntryWidth(entry.width, entry.key);
  }

  // 固定边缘阴影 marker：仅"左侧最后一列固定列 / 右侧第一列固定列"承载，表头与数据区共用。
  let lastLeftEdgeKey: string | undefined;
  for (const entry of entries) {
    if (entry.fixed === 'left') {
      lastLeftEdgeKey = entry.key;
    }
  }
  let firstRightEdgeKey: string | undefined;
  for (const entry of entries) {
    if (entry.fixed === 'right') {
      firstRightEdgeKey = entry.key;
      break;
    }
  }

  function resolveEntry(key: string, width?: number | string): FixedCellProps {
    const entryWidth = measuredWidths?.get(key);
    const realizedWidth =
      entryWidth !== undefined
        ? entryWidth
        : typeof width === 'number' && Number.isFinite(width) && width > 0
          ? width
          : undefined;
    if (leftOffsets.has(key)) {
      return {
        fixed: 'left',
        className: key === lastLeftEdgeKey ? 'nop-table-sticky-edge-left' : undefined,
        style: createStickyStyle(
          'left',
          leftOffsets.get(key) ?? 0,
          realizedWidth ?? width ?? CONTROL_COLUMN_WIDTH,
        ),
      };
    }

    if (rightOffsets.has(key)) {
      return {
        fixed: 'right',
        className: key === firstRightEdgeKey ? 'nop-table-sticky-edge-right' : undefined,
        style: createStickyStyle(
          'right',
          rightOffsets.get(key) ?? 0,
          realizedWidth ?? width ?? DEFAULT_FIXED_COLUMN_WIDTH,
        ),
      };
    }

    // 控制列在无 fixed 数据列（非 sticky）时也要封顶（P1-02）。
    if (key === '__selection__' || key === '__expand__') {
      return { style: createControlColumnStyle(width ?? CONTROL_COLUMN_WIDTH) };
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
      return resolveEntry(
        `${column.name ?? 'column'}:${index}`,
        column.fixed ? (column.width ?? DEFAULT_FIXED_COLUMN_WIDTH) : column.width,
      );
    },
  };
}

export type FixedColumnLayout = ReturnType<typeof createFixedColumnLayout>;
