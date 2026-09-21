import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import { optionRowConfigEquals } from './table-row-option-state.js';
import { areColumnsRenderEquivalent, type FlattenedRow } from './table-flattened-items.js';
import { resolveTableQuickEditConfig } from './table-quick-edit-cell.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { RowSelectionModifiers } from './use-table-selection.js';
import type { LazyChildrenState } from './use-table-lazy-children.js';
import type { RowDragSortApi } from './use-row-drag-sort.js';
import type { CombinePlan } from './combine-cells.js';
import { DataRowView } from './table-body-row-rendering.js';

// H10: row-level bailout is load-bearing for the table single-row locality
// contract (a change to one row must not re-render sibling rows — see the
// playground `performance-table-page` diagnostic; the React Compiler is not
// active in the test environment, so an explicit memo is required there). All
// `fixedColumnLayout` content inputs are covered BY CONTENT: columns via
// `areColumnsRenderEquivalent` (fixed/width included), `rowSelection` and
// `showExpandColumn` compared directly — so a content-equal layout cannot
// render stale sticky offsets. A direct `fixedColumnLayout` identity check is
// deliberately NOT in the comparator: the layout object identity churns with
// render-derived inputs (e.g. measured-width state), which would re-render
// every row on every table render and break the locality diagnostic (sibling
// probe delta 0 → 2, verified 2026-08-09).
const MemoizedDataRow = React.memo(DataRowView, (prev, next) => {
  return (
    prev.item.entry.record === next.item.entry.record &&
    prev.item.rowScope === next.item.rowScope &&
    prev.item.rowKey === next.item.rowKey &&
    prev.item.isExpanded === next.item.isExpanded &&
    prev.item.isSelected === next.item.isSelected &&
    prev.item.isEven === next.item.isEven &&
    prev.item.groupKey === next.item.groupKey &&
    Boolean(prev.schemaProps.rowSelection) === Boolean(next.schemaProps.rowSelection) &&
    prev.schemaProps.rowSelection?.type === next.schemaProps.rowSelection?.type &&
    prev.schemaProps.rowSelection?.toggleOnRowClick === next.schemaProps.rowSelection?.toggleOnRowClick &&
    prev.schemaProps.rowSelection?.modifierSelect === next.schemaProps.rowSelection?.modifierSelect &&
    prev.schemaProps.quickSaveAction === next.schemaProps.quickSaveAction &&
    prev.schemaProps.quickSaveItemAction === next.schemaProps.quickSaveItemAction &&
    prev.parentProps.meta.disabled === next.parentProps.meta.disabled &&
    optionRowConfigEquals(prev.schemaProps.optionRow, next.schemaProps.optionRow) &&
    prev.combinePlan === next.combinePlan &&
    prev.rowIndex === next.rowIndex &&
    prev.indexColumnOffset === next.indexColumnOffset &&
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
    prev.rowDragSortApi === next.rowDragSortApi &&
    prev.measureRef === next.measureRef
  );
});


/** [G3-视角5-01] whether the trailing row save-bar column renders on body rows —
 * exported so header/colgroup can pair the column. */
export function isRowDraftColumnEnabled(
  schemaProps: TableSchema,
  columns: TableColumnSchema[],
): boolean {
  const hasQuickEditColumns = columns.some((col) => {
    const cfg = resolveTableQuickEditConfig(col);
    return cfg && cfg.saveImmediately !== true && cfg.mode !== 'dialog';
  });
  const rowSaveAction = schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction;
  return hasQuickEditColumns && Boolean(rowSaveAction);
}

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
  onSelectRow: (rowKey: string, checked: boolean, modifiers?: RowSelectionModifiers) => void,
  isStriped: boolean,
  isRowCheckable?: (rowKey: string) => boolean,
  isAtMaxSelection?: boolean,
  combinePlan?: CombinePlan,
  rowIndex: number = 0,
  treeMode?: boolean,
  expandedTreeRowKeys?: Set<string>,
  onToggleTreeExpand?: (rowKey: string) => void,
  onRetryTreeLoad?: (rowKey: string) => void,
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>,
  draggable?: boolean,
  rowDragSortApi?: RowDragSortApi | null,
  indexColumnOffset?: number,
  measureRef?: React.Ref<HTMLTableRowElement>,
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
      onRetryTreeLoad={onRetryTreeLoad}
      lazyChildrenMap={lazyChildrenMap}
      draggable={draggable}
      rowDragSortApi={rowDragSortApi}
      indexColumnOffset={indexColumnOffset}
      measureRef={measureRef}
    />
  );
}
