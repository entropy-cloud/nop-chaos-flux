import React from 'react';
import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { Button, Checkbox, RadioGroupItem, TableCell, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon, GripVerticalIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { RowSelectionModifiers } from './use-table-selection.js';

type TableHelpers = RendererComponentProps<TableSchema>['helpers'];

/**
 * Leading (pre-column) cells of a body row: drag handle, expand toggle, and
 * selection cell. Extracted from table-body-row-rendering (oversized-file
 * governance, 2026-08-31 G-B2 plan Phase 3); behavior moved verbatim.
 */

export function TableDragCell(props: {
  dragHandleProps: Record<string, unknown> | null;
  fixedColumnLayout: FixedColumnLayout;
}) {
  const { dragHandleProps, fixedColumnLayout } = props;
  if (!dragHandleProps) {
    return null;
  }
  return (
    <TableCell
      data-slot="table-drag-cell"
      data-column-width-key="__drag__"
      className={cn(
        'w-10 text-center text-muted-foreground',
        fixedColumnLayout.getDragCellProps?.().className,
      )}
      style={{
        cursor: 'grab',
        ...fixedColumnLayout.getDragCellProps?.().style,
      }}
    >
      <span
        {...dragHandleProps}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
      >
        <GripVerticalIcon className="size-4" />
      </span>
    </TableCell>
  );
}

export function TableExpandCell(props: {
  schemaProps: TableSchema;
  helpers: TableHelpers;
  rowScope: ScopeRef;
  rowKey: string;
  isExpanded: boolean;
  onToggleExpand: (rowKey: string) => void;
  fixedColumnLayout: FixedColumnLayout;
}) {
  const { schemaProps, helpers, rowScope, rowKey, isExpanded, onToggleExpand, fixedColumnLayout } =
    props;
  return (
    <TableCell
      data-slot="table-expand-cell"
      className={fixedColumnLayout.getExpandCellProps().className}
      style={fixedColumnLayout.getExpandCellProps().style}
    >
      {(() => {
        // expandableWhen: a raw expression (no `${}`) evaluated per-row. Falsy → no toggle button.
        const expandableWhenExpr = schemaProps.expandable?.expandableWhen;
        let canExpand = true;
        if (typeof expandableWhenExpr === 'string' && expandableWhenExpr.length > 0) {
          try {
            const wrapped = `\${${expandableWhenExpr}}`;
            canExpand = Boolean(helpers.evaluate(wrapped, rowScope));
          } catch {
            // expr-eval-error Failure Path: degrade to expandable (do not block rendering).
            canExpand = true;
          }
        }
        if (!canExpand) return null;
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(rowKey);
            }}
            className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded"
            aria-label={isExpanded ? t('flux.table.collapse') : t('flux.table.expand')}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
        );
      })()}
    </TableCell>
  );
}

export function TableSelectCell(props: {
  schemaProps: TableSchema;
  rowKey: string;
  isSelected: boolean;
  isRowCheckable?: (rowKey: string) => boolean;
  rowCheckboxDisabled: boolean;
  onSelectRow: (rowKey: string, checked: boolean, modifiers?: RowSelectionModifiers) => void;
  fixedColumnLayout: FixedColumnLayout;
}) {
  const {
    schemaProps,
    rowKey,
    isSelected,
    isRowCheckable,
    rowCheckboxDisabled,
    onSelectRow,
    fixedColumnLayout,
  } = props;
  // Modifier capture is per-cell instance state (D1 G-B2): mousedown records the
  // gesture modifiers, the checkbox onCheckedChange consumes + clears them.
  const selectCellModifiersRef = React.useRef<RowSelectionModifiers | undefined>(undefined);
  return (
    <TableCell
      data-slot="table-select-cell"
      className={fixedColumnLayout.getSelectionCellProps().className}
      style={fixedColumnLayout.getSelectionCellProps().style}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        selectCellModifiersRef.current = {
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        };
      }}
    >
      {schemaProps.rowSelection?.type === 'radio' ? (
        <RadioGroupItem
          value={rowKey}
          disabled={isRowCheckable ? !isRowCheckable(rowKey) : undefined}
          aria-label={t('flux.table.selectRow')}
        />
      ) : (
        <Checkbox
          checked={isSelected}
          disabled={rowCheckboxDisabled || undefined}
          onCheckedChange={(checked) => {
            const modifiers = selectCellModifiersRef.current;
            selectCellModifiersRef.current = undefined;
            onSelectRow(rowKey, Boolean(checked), modifiers);
          }}
          aria-label={t('flux.table.selectRow')}
        />
      )}
    </TableCell>
  );
}
