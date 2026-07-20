import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, Checkbox, RadioGroupItem, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon, GripVerticalIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import { TableQuickEditCell, resolveTableQuickEditConfig } from './table-quick-edit-cell.js';
import type { TreeRowEntry } from './use-table-tree.js';
import type { LazyChildrenState } from './use-table-lazy-children.js';
import type { RowDragSortApi } from './use-row-drag-sort.js';
import { getCellRowSpan, type CombinePlan } from './combine-cells.js';
import { asReactNode, indentStyle, CellContentWithPopOver } from './table-cell-chrome.js';
import {
  areColumnsRenderEquivalent,
  type FlattenedRow,
} from './table-flattened-items.js';
import {
  RowQuickEditDraftContext,
  RowQuickEditSaveBar,
  useRowQuickEditDraft,
} from './use-row-quick-edit-draft.js';

export type { FlattenedItem, FlattenedRow, FlattenedExpandedRow } from './table-flattened-items.js';
export { buildFlattenedItems } from './table-flattened-items.js';
export { renderExpandedRow } from './table-expanded-row.js';

/**
 * Whether a row click landed on an interactive control and therefore must NOT
 * trigger selection toggle. Mirrors amis `isClickOnInput`.
 */
function isClickOnInput(event: React.MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A'
  ) {
    return true;
  }
  // Checkbox/Switch/Radio rendered as role-based widgets.
  const role = target.getAttribute('role');
  if (role === 'checkbox' || role === 'switch' || role === 'radio') {
    return true;
  }
  // Closest interactive ancestor covers icon spans nested inside buttons.
  if (target.closest('button, a, input, textarea, select, [role="checkbox"], [role="switch"], [role="radio"]')) {
    return true;
  }
  return false;
}


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
  onSelectRow: (rowKey: string, checked: boolean) => void;
  isStriped: boolean;
  isRowCheckable?: (rowKey: string) => boolean;
  isAtMaxSelection?: boolean;
  combinePlan?: CombinePlan;
  rowIndex: number;
  treeMode?: boolean;
  expandedTreeRowKeys?: Set<string>;
  onToggleTreeExpand?: (rowKey: string) => void;
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>;
  draggable?: boolean;
  rowDragSortApi?: RowDragSortApi | null;
};

function DataRowView({
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
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  lazyChildrenMap,
  draggable,
  rowDragSortApi,
}: DataRowRenderProps) {
  const { rowKey, rowInstancePath, isExpanded, isSelected, isEven, entry, rowScope } = item;
  const hasRowClickHandler = Boolean(parentProps.events.onRowClick);
  const toggleOnRowClick = schemaProps.rowSelection?.toggleOnRowClick === true;
  const isRowClickable = hasRowClickHandler || expandRowByClick || toggleOnRowClick;

  const treeEntry = treeMode ? (entry as TreeRowEntry) : undefined;
  const treeLevel = treeEntry?.level ?? 0;
  const treeHasChildren = treeEntry?.hasChildren ?? false;
  const isTreeExpanded = treeEntry ? expandedTreeRowKeys?.has(rowKey) === true : false;
  const lazyState = lazyChildrenMap?.get(rowKey);
  const dragHandleProps = draggable && rowDragSortApi
    ? rowDragSortApi.dragHandleProps(rowKey, rowIndex)
    : null;

  const rowDraft = useRowQuickEditDraft({
    record: entry.record,
    rowScope,
    helpers,
    saveAction: schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction,
  });
  const hasQuickEditColumns = columns.some((col) => {
    const cfg = resolveTableQuickEditConfig(col);
    return cfg && cfg.saveImmediately !== true && cfg.mode !== 'dialog';
  });
  const rowSaveAction = schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction;
  const rowDraftEnabled = hasQuickEditColumns && Boolean(rowSaveAction);

  const rowCheckboxDisabled =
    (isRowCheckable ? !isRowCheckable(rowKey) : false) ||
    (isAtMaxSelection === true && !isSelected);

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    // Selection toggle chain (toggleOnRowClick): skip clicks on interactive controls,
    // respect maxSelectionLength, then preventDefault only when a toggle actually happened
    // (improves amis which always preventDefaults and blocks text selection).
    let toggled = false;
    if (toggleOnRowClick && !isClickOnInput(event)) {
      const atMax = isAtMaxSelection === true && !isSelected;
      if (!atMax) {
        onSelectRow(rowKey, !isSelected);
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

    if (hasRowClickHandler) {
      void parentProps.events.onRowClick?.(event, { scope: rowScope });
    }

    if (expandRowByClick) {
      onToggleExpand(rowKey);
    }
  };

  const rowContent = (
    <TableRow
      data-slot="table-row"
      data-row-toggleable={toggleOnRowClick || undefined}
      data-interactive={isRowClickable || undefined}
      data-expanded={isExpanded || undefined}
      data-striped={isStriped && isEven ? true : undefined}
      data-tree-row={treeMode || undefined}
      data-level={treeMode ? treeLevel : undefined}
      data-tree-expanded={treeMode && isTreeExpanded ? true : undefined}
      data-draggable={draggable || undefined}
      data-dragging={rowDragSortApi?.draggingRowKey === rowKey || undefined}
      data-drag-over={rowDragSortApi?.dragOverRowKey === rowKey || undefined}
      onClick={isRowClickable ? handleRowClick : undefined}
      onKeyDown={isRowClickable ? handleRowKeyDown : undefined}
      tabIndex={isRowClickable ? 0 : -1}
      className={isRowClickable ? 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none' : undefined}
    >
      {draggable && dragHandleProps ? (
        <TableCell
          data-slot="table-drag-cell"
          className="w-10 text-center text-muted-foreground"
          style={{ cursor: 'grab' }}
        >
          <span
            {...dragHandleProps}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
          >
            <GripVerticalIcon className="size-4" />
          </span>
        </TableCell>
      ) : null}

      {showExpandColumn && !treeMode ? (
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
      ) : null}

      {schemaProps.rowSelection ? (
        <TableCell
          data-slot="table-select-cell"
          className={fixedColumnLayout.getSelectionCellProps().className}
          style={fixedColumnLayout.getSelectionCellProps().style}
          onClick={(event) => event.stopPropagation()}
        >
          {schemaProps.rowSelection.type === 'radio' ? (
            <RadioGroupItem
              value={rowKey}
              disabled={isRowCheckable ? !isRowCheckable(rowKey) : undefined}
              aria-label={t('flux.table.selectRow')}
            />
          ) : (
            <Checkbox
              checked={isSelected}
              disabled={rowCheckboxDisabled || undefined}
              onCheckedChange={(checked) => onSelectRow(rowKey, Boolean(checked))}
              aria-label={t('flux.table.selectRow')}
            />
          )}
        </TableCell>
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
              onToggleTreeExpand?.(rowKey);
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
              <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
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

        if (column.type === 'operation' && buttonRegion) {
          return (
            <TableCell
              key={column.name ?? `op-${columnIndex}`}
              className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className}
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
                className="flex flex-wrap gap-3"
                onClick={(event) => event.stopPropagation()}
              >
                {buttonRegion
                  ? asReactNode(
                      buttonRegion.render({
                        scope: rowScope,
                        bindings: { record: entry.record, index: entry.sourceIndex },
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
              className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className}
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
                  bindings: { record: entry.record, index: entry.sourceIndex },
                  instancePath: rowInstancePath,
                  pathSuffix: `cells.${columnIndex}`,
                }),
              )}
            </TableCell>
          );
        }

        const quickEditConfig = resolveTableQuickEditConfig(column);
        if (quickEditConfig && column.name) {
          return (
            <TableCell
              key={`${column.name ?? columnIndex}`}
              className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className}
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
            className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className}
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
          className="w-32 whitespace-nowrap"
        >
          <RowQuickEditSaveBar rowDraft={rowDraft} />
        </TableCell>
      ) : null}
    </TableRow>
  );

  if (rowDraftEnabled) {
    return (
      <RowQuickEditDraftContext.Provider value={rowDraft}>
        {rowContent}
      </RowQuickEditDraftContext.Provider>
    );
  }

  return rowContent;
}

// H10: row-level bailout is load-bearing for the table single-row locality
// contract (a change to one row must not re-render sibling rows — see the
// playground `performance-table-page` diagnostic; the React Compiler is not
// active in the test environment, so an explicit memo is required there). The
// previous hand-written comparator compared every field the row reads EXCEPT
// `fixedColumnLayout` (used ~11× in JSX), so a `fixedColumnLayout` identity
// churn with all compared fields equal made the comparator return true and the
// row rendered with stale sticky offset / className / style. The comparator now
// includes `fixedColumnLayout`, closing that stale-render gap while preserving
// row locality.
const MemoizedDataRow = React.memo(DataRowView, (prev, next) => {
  return (
    prev.item.entry.record === next.item.entry.record &&
    prev.item.rowScope === next.item.rowScope &&
    prev.item.rowKey === next.item.rowKey &&
    prev.item.isExpanded === next.item.isExpanded &&
    prev.item.isSelected === next.item.isSelected &&
    prev.item.isEven === next.item.isEven &&
    Boolean(prev.schemaProps.rowSelection) === Boolean(next.schemaProps.rowSelection) &&
    prev.schemaProps.rowSelection?.type === next.schemaProps.rowSelection?.type &&
    prev.schemaProps.rowSelection?.toggleOnRowClick === next.schemaProps.rowSelection?.toggleOnRowClick &&
    prev.schemaProps.quickSaveAction === next.schemaProps.quickSaveAction &&
    prev.schemaProps.quickSaveItemAction === next.schemaProps.quickSaveItemAction &&
    prev.combinePlan === next.combinePlan &&
    prev.rowIndex === next.rowIndex &&
    areColumnsRenderEquivalent(prev.columns, next.columns) &&
    prev.helpers === next.helpers &&
    prev.parentProps.events.onRowClick === next.parentProps.events.onRowClick &&
    prev.parentProps.regions === next.parentProps.regions &&
    prev.parentProps.node.instancePath === next.parentProps.node.instancePath &&
    prev.showExpandColumn === next.showExpandColumn &&
    prev.expandRowByClick === next.expandRowByClick &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.onSelectRow === next.onSelectRow &&
    prev.isStriped === next.isStriped &&
    prev.isRowCheckable === next.isRowCheckable &&
    prev.isAtMaxSelection === next.isAtMaxSelection &&
    prev.treeMode === next.treeMode &&
    prev.expandedTreeRowKeys === next.expandedTreeRowKeys &&
    prev.onToggleTreeExpand === next.onToggleTreeExpand &&
    prev.lazyChildrenMap === next.lazyChildrenMap &&
    prev.draggable === next.draggable &&
    prev.rowDragSortApi === next.rowDragSortApi
  );
});

export function renderDataRow(
  item: FlattenedRow,
  schemaProps: TableSchema,
  columns: TableColumnSchema[],
  helpers: RendererComponentProps<TableSchema>['helpers'],
  parentProps: RendererComponentProps<TableSchema>,
  fixedColumnLayout: FixedColumnLayout,
  showExpandColumn: boolean,
  expandRowByClick: boolean,
  onToggleExpand: (rowKey: string) => void,
  onSelectRow: (rowKey: string, checked: boolean) => void,
  isStriped: boolean,
  isRowCheckable?: (rowKey: string) => boolean,
  isAtMaxSelection?: boolean,
  combinePlan?: CombinePlan,
  rowIndex: number = 0,
  treeMode?: boolean,
  expandedTreeRowKeys?: Set<string>,
  onToggleTreeExpand?: (rowKey: string) => void,
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>,
  draggable?: boolean,
  rowDragSortApi?: RowDragSortApi | null,
) {
  return (
    <MemoizedDataRow
      item={item}
      schemaProps={schemaProps}
      columns={columns}
      helpers={helpers}
      parentProps={parentProps}
      fixedColumnLayout={fixedColumnLayout}
      showExpandColumn={showExpandColumn}
      expandRowByClick={expandRowByClick}
      onToggleExpand={onToggleExpand}
      onSelectRow={onSelectRow}
      isStriped={isStriped}
      isRowCheckable={isRowCheckable}
      isAtMaxSelection={isAtMaxSelection}
      combinePlan={combinePlan}
      rowIndex={rowIndex}
      treeMode={treeMode}
      expandedTreeRowKeys={expandedTreeRowKeys}
      onToggleTreeExpand={onToggleTreeExpand}
      lazyChildrenMap={lazyChildrenMap}
      draggable={draggable}
      rowDragSortApi={rowDragSortApi}
    />
  );
}
