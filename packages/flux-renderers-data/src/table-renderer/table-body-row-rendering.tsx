import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntimeOrNull } from '@nop-chaos/flux-react';
import {
  isClickOnInput,
  resolveTableRowOptionState,
  tableRowOptionRowProps,
} from './table-row-option-state.js';
import { Button, TableCell, TableRow, Spinner, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { RowSelectionModifiers } from './use-table-selection.js';
import { TableDragCell, TableExpandCell, TableSelectCell } from './table-row-leading-cells.js';
import { TableQuickEditCell, resolveTableQuickEditConfig } from './table-quick-edit-cell.js';
import { TableEditableCell, resolveTableEditableConfig } from './table-editable-cell.js';
import { warnOnce } from './warn-once.js';
import type { TreeRowEntry } from './use-table-tree.js';
import type { LazyChildrenState } from './use-table-lazy-children.js';
import type { RowDragSortApi } from './use-row-drag-sort.js';
import { getCellRowSpan, type CombinePlan } from './combine-cells.js';
import { isDevRuntime } from './use-table-tree.js';
import { asReactNode, indentStyle, CellContentWithPopOver } from './table-cell-chrome.js';
import { type FlattenedRow } from './table-flattened-items.js';
import {
  RowQuickEditDraftProvider,
  RowQuickEditSaveBar,
} from './use-row-quick-edit-draft.js';

export type { FlattenedItem, FlattenedRow, FlattenedExpandedRow } from './table-flattened-items.js';
export { buildFlattenedItems } from './table-flattened-items.js';
export { renderExpandedRow } from './table-expanded-row.js';

/**
 * Row-level failure feedback ([G3-R3-视角5-01]): the graceful-degradation read
 * moved into flux-react's `useRendererRuntimeOrNull` (cq-2 Phase 4) — null
 * runtime (bare DataRowView harnesses, partial flux-react mocks via
 * importOriginal spreads) means "no notify", never a throw.
 */

type DataRowRenderProps = {
  item: FlattenedRow;
  schemaProps: TableSchema;
  columns: TableColumnSchema[];
  helpers: RendererComponentProps<TableSchema>['helpers'];
  parentProps: RendererComponentProps<TableSchema>;
  fixedColumnLayout: FixedColumnLayout;
  showExpandColumn: boolean;
  expandRowByClick: boolean;
  onToggleExpand: (rowKey: string) => void;
  onSelectRow: (rowKey: string, checked: boolean, modifiers?: RowSelectionModifiers) => void;
  isStriped: boolean;
  isRowCheckable?: (rowKey: string) => boolean;
  isAtMaxSelection?: boolean;
  combinePlan?: CombinePlan;
  rowIndex: number;
  indexColumnOffset?: number;
  treeMode?: boolean;
  expandedTreeRowKeys?: Set<string>;
  onToggleTreeExpand?: (rowKey: string) => void;
  onRetryTreeLoad?: (rowKey: string) => void;
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>;
  draggable?: boolean;
  rowDragSortApi?: RowDragSortApi | null;
  /** 15-03: virtual-body measurement wiring (`virtualizer.measureElement`). */
  measureRef?: React.Ref<HTMLTableRowElement>;
};

export function DataRowView({
  item,
  schemaProps,
  columns,
  helpers,
  parentProps,
  fixedColumnLayout,
  showExpandColumn,
  expandRowByClick,
  onToggleExpand,
  onSelectRow,
  isStriped,
  isRowCheckable,
  isAtMaxSelection,
  combinePlan,
  rowIndex,
  indexColumnOffset = 0,
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  onRetryTreeLoad,
  lazyChildrenMap,
  draggable,
  rowDragSortApi,
  measureRef,
}: DataRowRenderProps) {
  const { rowKey, rowInstancePath, isExpanded, isSelected, isEven, entry, rowScope } = item;
  const viewIndex = entry.viewIndex ?? rowIndex;
  const hasRowClickHandler = Boolean(parentProps.events.onRowClick);
  const toggleOnRowClick = schemaProps.rowSelection?.toggleOnRowClick === true;
  const isRowClickable = hasRowClickHandler || expandRowByClick || toggleOnRowClick;

  // D1 option-row marker driver: explicit binding > internal selection. Without
  // the contract nothing below emits (opt-row-compat: legacy output unchanged).
  const optionRowState = resolveTableRowOptionState({
    schemaProps,
    record: entry.record,
    isSelected,
    ownerDisabled: parentProps.meta.disabled === true,
  });

  const treeEntry = treeMode ? (entry as TreeRowEntry) : undefined;
  const treeLevel = treeEntry?.level ?? 0;
  const treeHasChildren = treeEntry?.hasChildren ?? false;
  const isTreeExpanded = treeEntry ? expandedTreeRowKeys?.has(rowKey) === true : false;
  const lazyState = lazyChildrenMap?.get(rowKey);
  // [G3-R4-视角4-01] the drag/reorder domain is the DATA-ROW order (orderedKeys
  // in use-row-drag-sort is built from processedData). rowIndex is the index in
  // the flattened render sequence (virtual window: expanded detail rows count),
  // so an expanded row above shifts every drop/arrow-key target by one.
  const reorderIndex = entry.viewIndex ?? rowIndex;
  const dragHandleProps = draggable && rowDragSortApi
    ? rowDragSortApi.dragHandleProps(rowKey, reorderIndex)
    : null;

  // [G3-R3-视角5-01] a failed row-level save used to reset `saving` silently;
  // report through the same env.notify channel the cell-level quick-edit uses.
  // Tolerant context read (namespace access + null fallback): DataRowView must
  // stay renderable in bare harnesses / partial flux-react mocks — there the
  // notify channel is simply absent.
  const runtime = useRendererRuntimeOrNull();
  const notifySaveError = (error: unknown) => {
    runtime?.env.notify?.(
      'warning',
      error instanceof Error
        ? t('flux.common.saveFailedDetail', { message: error.message })
        : t('flux.common.saveFailed'),
    );
  };

  // P1-1: per-cell className expression (raw, no `${}`) + vertical alignment.
  // Both are evaluated per row against the row scope; a failing classNameExpr
  // degrades to no class + dev warn (Failure Path expr-eval-error).
  const resolveCellChromeClass = (
    column: TableColumnSchema,
    columnIndexForName: number,
  ): string | undefined => {
    const vAlignClass =
      column.vAlign === 'top'
        ? 'align-top'
        : column.vAlign === 'bottom'
          ? 'align-bottom'
          : column.vAlign === 'middle'
            ? 'align-middle'
            : undefined;
    const expr = column.classNameExpr;
    if (typeof expr !== 'string' || expr.length === 0) {
      return vAlignClass;
    }
    let evaluated: unknown;
    try {
      evaluated = helpers.evaluate(`\${${expr}}`, rowScope);
    } catch {
      if (isDevRuntime()) {
        console.warn(
          `[TableRenderer] classNameExpr evaluation failed for column "${column.name ?? columnIndexForName}"`,
        );
      }
      return vAlignClass;
    }
    return cn(vAlignClass, typeof evaluated === 'string' && evaluated.length > 0 ? evaluated : undefined);
  };
  const rowDraftEnabled = isRowDraftColumnEnabled(schemaProps, columns);

  const rowCheckboxDisabled =
    (isRowCheckable ? !isRowCheckable(rowKey) : false) ||
    (isAtMaxSelection === true && !isSelected);

  // D1 G-B2: the checkbox click gesture carries modifier keys. base-ui fires
  // onCheckedChange from the click on the checkbox itself, so the modifiers are
  // captured at mousedown on the select cell (mousedown always precedes click)
  // and consumed + cleared by the next onCheckedChange. The ref lives inside
  // TableSelectCell (per-row instance).

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    // Selection toggle chain (toggleOnRowClick): skip clicks on interactive controls,
    // respect maxSelectionLength, then preventDefault only when a toggle actually happened
    // (improves amis which always preventDefaults and blocks text selection).
    let toggled = false;
    if (toggleOnRowClick && !isClickOnInput(event)) {
      const atMax = isAtMaxSelection === true && !isSelected;
      if (!atMax) {
        onSelectRow(rowKey, !isSelected, {
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        });
        toggled = true;
      }
    }

    if (hasRowClickHandler) {
      void parentProps.events.onRowClick?.(event, { scope: rowScope });
    }

    if (expandRowByClick) {
      onToggleExpand(rowKey);
    }

    if (toggled) {
      event.preventDefault();
    }
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (!isRowClickable || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();

    // [G3-R2-视角3-01] keyboard parity for the toggleOnRowClick chain: the row
    // itself is the activation target (tabIndex=0), so Enter/Space must run the
    // same selection toggle as the click gesture — including the
    // maxSelectionLength clamp — otherwise keyboard users cannot select rows.
    if (toggleOnRowClick) {
      const atMax = isAtMaxSelection === true && !isSelected;
      if (!atMax) {
        onSelectRow(rowKey, !isSelected, {
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        });
      }
    }

    if (hasRowClickHandler) {
      void parentProps.events.onRowClick?.(event, { scope: rowScope });
    }

    if (expandRowByClick) {
      onToggleExpand(rowKey);
    }
  };

  const rowContent = (
    <TableRow
      {...tableRowOptionRowProps(optionRowState)}
      ref={measureRef}
      data-index={measureRef ? rowIndex : undefined}
      data-slot="table-row"
      data-row-toggleable={toggleOnRowClick || undefined}
      data-interactive={isRowClickable || undefined}
      data-expanded={isExpanded || undefined}
      data-striped={isStriped && isEven ? true : undefined}
      data-tree-row={treeMode || undefined}
      data-level={treeMode ? treeLevel : undefined}
      data-tree-expanded={treeMode && isTreeExpanded ? true : undefined}
      data-draggable={draggable || undefined}
      data-row-group={item.groupKey || undefined}
      data-dragging={rowDragSortApi?.draggingRowKey === rowKey || undefined}
      data-drag-over={rowDragSortApi?.dragOverRowKey === rowKey || undefined}
      onClick={isRowClickable ? handleRowClick : undefined}
      onKeyDown={isRowClickable ? handleRowKeyDown : undefined}
      tabIndex={isRowClickable ? 0 : -1}
      className={cn(
        isRowClickable ? 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none' : undefined,
        optionRowState.active && optionRowState.selected ? optionRowState.selectedClass : undefined,
      )}
    >
      {draggable && dragHandleProps ? (
        <TableDragCell dragHandleProps={dragHandleProps} fixedColumnLayout={fixedColumnLayout} />
      ) : null}

      {showExpandColumn && !treeMode ? (
        <TableExpandCell
          schemaProps={schemaProps}
          helpers={helpers}
          rowScope={rowScope}
          rowKey={rowKey}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          fixedColumnLayout={fixedColumnLayout}
        />
      ) : null}

      {schemaProps.rowSelection ? (
        <TableSelectCell
          schemaProps={schemaProps}
          rowKey={rowKey}
          isSelected={isSelected}
          isRowCheckable={isRowCheckable}
          rowCheckboxDisabled={rowCheckboxDisabled}
          onSelectRow={onSelectRow}
          fixedColumnLayout={fixedColumnLayout}
        />
      ) : null}

      {columns.map((column, columnIndex) => {
        const cellRegion =
          typeof column.cellRegionKey === 'string'
            ? parentProps.regions[column.cellRegionKey]
            : undefined;
        const buttonRegion =
          typeof column.buttonsRegionKey === 'string'
            ? parentProps.regions[column.buttonsRegionKey]
            : undefined;
        const rowSpan = combinePlan
          ? getCellRowSpan(combinePlan, rowIndex, column, columnIndex)
          : undefined;
        if (rowSpan === 0) {
          return null;
        }

        const isFirstDataColumn = columnIndex === 0;
        const treeToggle = treeMode && isFirstDataColumn && treeHasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            data-slot="table-tree-toggle"
            onClick={(event) => {
              event.stopPropagation();
              // P1-3: an error-state toggle retries the lazy load instead of
              // collapsing; refreshNode clears the cached error so the re-run
              // actually refetches (Failure Path host-table-lazy).
              if (lazyState?.error && onRetryTreeLoad) {
                onRetryTreeLoad(rowKey);
              } else {
                onToggleTreeExpand?.(rowKey);
              }
            }}
            className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-accent"
            aria-label={
              lazyState?.loading
                ? t('flux.common.loading')
                : lazyState?.error
                  ? t('flux.table.retry')
                  : isTreeExpanded
                    ? t('flux.table.collapse')
                    : t('flux.table.expand')
            }
            aria-expanded={isTreeExpanded}
            title={
              lazyState?.error
                ? lazyState.error
                : lazyState?.children && lazyState.children.length === 0 && isTreeExpanded
                  ? t('flux.table.noChildren')
                  : undefined
            }
          >
            {lazyState?.loading ? (
              <Spinner className="size-3" />
            ) : lazyState?.error ? (
              <ChevronRightIcon className="size-3 text-destructive" />
            ) : isTreeExpanded ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )}
          </Button>
        ) : null;
        const treeSpacer = treeMode && isFirstDataColumn && !treeHasChildren && treeLevel > 0 ? (
          <span data-slot="table-tree-spacer" className="mr-1 inline-block h-5 w-5" />
        ) : null;
        const treeIndentStyle = treeMode && isFirstDataColumn ? indentStyle(treeLevel) : undefined;

        // index 列（序号列）：不读 record，显示跨页累计的行号（viewIndex 为页内 0-based，
        // indexColumnOffset 为 (currentPage-1)*pageSize，对齐 AMIS __index 的 offset 语义）。
        if (column.type === 'index') {
          return (
            <TableCell
              key={`${column.name ?? `index-${columnIndex}`}`}
              className={cn(
                'text-center',
                resolveCellChromeClass(column, columnIndex),
                fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
              )}
              style={{
                ...(column.width !== undefined
                  ? { width: column.width, minWidth: column.width, maxWidth: column.width }
                  : undefined),
                ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
              }}
              rowSpan={rowSpan}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
              data-slot="table-index-cell"
            >
              {viewIndex + indexColumnOffset + 1}
            </TableCell>
          );
        }

        if (column.type === 'operation' && buttonRegion) {
          return (
            <TableCell
              key={column.name ?? `op-${columnIndex}`}
              className={cn(
                resolveCellChromeClass(column, columnIndex),
                fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
              )}
              style={{
                ...(column.width ? { width: column.width } : undefined),
                ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
              }}
              rowSpan={rowSpan}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
            >
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick is stopPropagation only; real interaction is the inner <Button> elements */}
              <div
                data-slot="table-actions"
                className="flex flex-wrap gap-[var(--table-row-action-gap)]"
                onClick={(event) => event.stopPropagation()}
              >
                {buttonRegion
                  ? asReactNode(
                      buttonRegion.render({
                        scope: rowScope,
                        instancePath: rowInstancePath,
                        pathSuffix: `buttons.${columnIndex}`,
                      }),
                    )
                  : null}
              </div>
            </TableCell>
          );
        }

        if (cellRegion) {
          return (
            <TableCell
              key={`${column.name ?? columnIndex}`}
              className={cn(
                resolveCellChromeClass(column, columnIndex),
                fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
              )}
              style={{
                ...(column.width ? { width: column.width } : undefined),
                ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
                ...treeIndentStyle,
              }}
              rowSpan={rowSpan}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
            >
              {treeToggle}
              {treeSpacer}
              {asReactNode(
                cellRegion.render({
                  scope: rowScope,
                  instancePath: rowInstancePath,
                  pathSuffix: `cells.${columnIndex}`,
                }),
              )}
            </TableCell>
          );
        }

        const quickEditConfig = resolveTableQuickEditConfig(column);
        // D1 G-D: editable declares the cell-level two-state machine and takes
        // precedence over quickEdit (no double controls — gd-cell-edit-quickedit-coexist).
        const editableDeclared = column.editable !== undefined && column.editable !== false;
        if (editableDeclared) {
          if (quickEditConfig && isDevRuntime()) {
            warnOnce(
              'gd-cell-edit-quickedit-coexist',
              '[flux:table] gd-cell-edit-quickedit-coexist: both editable and quickEdit are declared on this column; editable takes precedence and the quickEdit control is not rendered.',
            );
          }
          const editableConfig = resolveTableEditableConfig(column);
          if (editableConfig && column.name) {
            return (
              <TableCell
                key={`${column.name ?? columnIndex}`}
                className={cn(
                  resolveCellChromeClass(column, columnIndex),
                  fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
                )}
                style={{
                  ...(column.width ? { width: column.width } : undefined),
                  ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
                  ...treeIndentStyle,
                }}
                rowSpan={rowSpan}
                data-fixed={
                  fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
                }
              >
                {treeToggle}
                {treeSpacer}
                <TableEditableCell
                  column={column}
                  rowScope={rowScope}
                  record={entry.record}
                  helpers={helpers}
                  quickSaveAction={schemaProps.quickSaveAction}
                  quickSaveItemAction={schemaProps.quickSaveItemAction}
                />
              </TableCell>
            );
          }
        }
        if (quickEditConfig && column.name) {
          return (
            <TableCell
              key={`${column.name ?? columnIndex}`}
              className={cn(
                resolveCellChromeClass(column, columnIndex),
                fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
              )}
              style={{
                ...(column.width ? { width: column.width } : undefined),
                ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
                ...treeIndentStyle,
              }}
              rowSpan={rowSpan}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
            >
              {treeToggle}
              {treeSpacer}
              <TableQuickEditCell
                column={column}
                rowScope={rowScope}
                record={entry.record}
                helpers={helpers}
                regions={parentProps.regions}
                quickSaveAction={schemaProps.quickSaveAction}
                quickSaveItemAction={schemaProps.quickSaveItemAction}
              />
            </TableCell>
          );
        }

        return (
          <TableCell
            key={`${column.name ?? columnIndex}`}
            className={cn(
              resolveCellChromeClass(column, columnIndex),
              fixedColumnLayout.getColumnCellProps(column, columnIndex).className,
            )}
            style={{
              ...(column.width ? { width: column.width } : undefined),
              ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
              ...treeIndentStyle,
            }}
            rowSpan={rowSpan}
            data-fixed={
              fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
            }
          >
            {treeToggle}
            {treeSpacer}
            <CellContentWithPopOver
              column={column}
              record={entry.record}
              rowIndex={entry.sourceIndex}
              rowScope={rowScope}
              rowInstancePath={rowInstancePath}
              columnIndex={columnIndex}
              regions={parentProps.regions}
            />
          </TableCell>
        );
      })}
      {rowDraftEnabled ? (
        <TableCell
          key="__row_save_bar__"
          data-slot="table-row-save-bar-cell"
          data-column-width-key="__row_save_bar__"
          className="w-32 whitespace-nowrap"
        >
          <RowQuickEditSaveBar />
        </TableCell>
      ) : null}
    </TableRow>
  );

  if (rowDraftEnabled) {
    const saveAction = schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction;
    if (saveAction) {
      return (
        <RowQuickEditDraftProvider
          record={entry.record}
          rowScope={rowScope}
          helpers={helpers}
          saveAction={saveAction}
          onSaveError={notifySaveError}
        >
          {rowContent}
        </RowQuickEditDraftProvider>
      );
    }
  }

  return rowContent;
}

// [G3-R4-视角4-01 batch] row rendering entry points moved to
// table-data-row-render.tsx (oversized-file governance: the file crossed the
// 700-line gate); DataRowView stays here. Compatibility re-exports keep the
// existing `table-body-row-rendering.js` import paths stable for consumers.
import { isRowDraftColumnEnabled } from './table-data-row-render.js';
export { renderDataRow, isRowDraftColumnEnabled } from './table-data-row-render.js';
