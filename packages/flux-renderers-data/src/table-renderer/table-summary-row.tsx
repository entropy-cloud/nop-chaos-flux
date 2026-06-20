import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { TableCell, TableRow, cn } from '@nop-chaos/ui';
import type {
  TableColumnSchema,
  TableSchema,
  TableSummaryRow as TableSummaryRowSchema,
} from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

interface TableSummaryRowViewProps {
  row: TableSummaryRowSchema;
  variant: 'prefix' | 'affix';
  columns: TableColumnSchema[];
  showExpandColumn: boolean;
  hasSelection: boolean;
  fixedColumnLayout: FixedColumnLayout;
  parentProps: RendererComponentProps<TableSchema>;
}

function resolveCellValue(
  cell: TableSummaryRowSchema['cells'][number],
  parentProps: RendererComponentProps<TableSchema>,
): React.ReactNode {
  const { value } = cell;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    try {
      const evaluated = parentProps.helpers.evaluate(value, parentProps.node.scope);
      if (
        typeof evaluated === 'string' ||
        typeof evaluated === 'number' ||
        typeof evaluated === 'boolean'
      ) {
        return String(evaluated);
      }
      if (evaluated == null) {
        return '';
      }
      return asReactNode(evaluated);
    } catch {
      return '';
    }
  }

  return '';
}

export function TableSummaryRowView({
  row,
  variant,
  columns,
  showExpandColumn,
  hasSelection,
  fixedColumnLayout,
  parentProps,
}: TableSummaryRowViewProps) {
  const cellsByColumn = new Map<string, (typeof row.cells)[number]>();
  for (const cell of row.cells) {
    if (typeof cell.column === 'string') {
      cellsByColumn.set(cell.column, cell);
    }
  }

  const slot = variant === 'prefix' ? 'table-summary-row-prefix' : 'table-summary-row-affix';

  return (
    <TableRow data-slot={slot} className="bg-muted/40 font-medium">
      {showExpandColumn ? (
        <TableCell
          data-slot="table-summary-spacer"
          className={fixedColumnLayout.getExpandCellProps().className}
          style={{ width: '40px', ...fixedColumnLayout.getExpandCellProps().style }}
          aria-hidden
        />
      ) : null}

      {hasSelection ? (
        <TableCell
          data-slot="table-summary-spacer"
          className={fixedColumnLayout.getSelectionCellProps().className}
          style={{ width: '40px', ...fixedColumnLayout.getSelectionCellProps().style }}
          aria-hidden
        />
      ) : null}

      {columns.map((column, index) => {
        const cell = column.name ? cellsByColumn.get(column.name) : undefined;
        const alignClass = cell?.align ? ALIGN_CLASS[cell.align] : undefined;
        const cellProps = fixedColumnLayout.getColumnCellProps(column, index);
        return (
          <TableCell
            key={column.name ?? `summary-${index}`}
            data-slot="table-summary-cell"
            className={cn(alignClass, cellProps.className)}
            style={{
              ...(column.width ? { width: column.width } : undefined),
              ...cellProps.style,
            }}
            data-fixed={cellProps.fixed || undefined}
          >
            {cell ? resolveCellValue(cell, parentProps) : ''}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
