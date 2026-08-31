import React from 'react';
import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { RadioGroup, TableBody, TableCell, TableRow } from '@nop-chaos/ui';
import type { TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { TableRowEntry } from './types.js';
import type { GroupedDisplayItem } from './table-grouping.js';
import { formatGroupAggregateText } from './table-grouping.js';
import { TableGroupHeaderRow } from './table-group-header-row.js';
import { buildGroupedFlattenedItems } from './table-flattened-items.js';
import { renderDataRow, renderExpandedRow } from './table-body-row-rendering.js';
import { computeCombinePlan, type CombinePlan } from './combine-cells.js';
import type { RowDragSortApi } from './use-row-drag-sort.js';
import { VirtualBody } from './table-virtual-body.js';

export interface TableBodyRowsProps {
  props: RendererComponentProps<TableSchema>;
  columns: import('../schemas.js').TableColumnSchema[];
  responsiveHiddenColumns: import('../schemas.js').TableColumnSchema[];
  processedData: TableRowEntry[];
  rowScopeCache: Map<string, ScopeRef>;
  rowRepeatedTemplateId: string;
  expandedRowKeys: Set<string>;
  selectedRowKeys: Set<string>;
  columnCount: number;
  isStriped: boolean;
  fixedColumnLayout: FixedColumnLayout;
  emptyContent: React.ReactNode;
  showExpandColumn: boolean;
  expandRowByClick: boolean;
  onToggleExpand: (rowKey: string) => void;
  onSelectRow: (rowKey: string, checked: boolean) => void;
  isRowCheckable?: (rowKey: string) => boolean;
  isAtMaxSelection?: boolean;
  virtualEnabled?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  combineNum?: number;
  combineFromIndex?: number;
  /** P1-2: responsive.defaultExpanded — every row starts expanded; the
   * expandedRowKeys set then means "collapsed overrides" (inverted semantics). */
  expandAllByDefault?: boolean;
  treeMode?: boolean;
  expandedTreeRowKeys?: Set<string>;
  onToggleTreeExpand?: (rowKey: string) => void;
  onRetryTreeLoad?: (rowKey: string) => void;
  lazyChildrenMap?: ReadonlyMap<string, import('./use-table-lazy-children.js').LazyChildrenState>;
  rowDragSortApi?: RowDragSortApi | null;
  draggable?: boolean;
  /** D1 G-D: interleaved page slice of group headers + member rows. */
  groupedPageItems?: GroupedDisplayItem[] | null;
  onToggleGroupCollapse?: (groupKey: string) => void;
  indexColumnOffset?: number;
}

export function TableBodyRows({
  props,
  columns,
  responsiveHiddenColumns,
  processedData,
  rowScopeCache,
  rowRepeatedTemplateId,
  expandedRowKeys,
  selectedRowKeys,
  columnCount,
  isStriped,
  fixedColumnLayout,
  emptyContent,
  showExpandColumn,
  expandRowByClick,
  onToggleExpand,
  onSelectRow,
  isRowCheckable,
  isAtMaxSelection,
  virtualEnabled,
  scrollRef,
  combineNum,
  combineFromIndex,
  expandAllByDefault,
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  onRetryTreeLoad,
  lazyChildrenMap,
  rowDragSortApi,
  draggable,
  groupedPageItems,
  onToggleGroupCollapse,
  indexColumnOffset,
}: TableBodyRowsProps) {
  if (!virtualEnabled || processedData.length === 0) {
    return (
      <NonVirtualBody
        props={props}
        columns={columns}
        responsiveHiddenColumns={responsiveHiddenColumns}
        processedData={processedData}
        rowScopeCache={rowScopeCache}
        rowRepeatedTemplateId={rowRepeatedTemplateId}
        expandedRowKeys={expandedRowKeys}
        selectedRowKeys={selectedRowKeys}
        columnCount={columnCount}
        isStriped={isStriped}
        fixedColumnLayout={fixedColumnLayout}
        emptyContent={emptyContent}
        showExpandColumn={showExpandColumn}
        expandRowByClick={expandRowByClick}
        onToggleExpand={onToggleExpand}
        onSelectRow={onSelectRow}
        isRowCheckable={isRowCheckable}
        isAtMaxSelection={isAtMaxSelection}
        combineNum={combineNum}
        combineFromIndex={combineFromIndex}
        expandAllByDefault={expandAllByDefault}
        treeMode={treeMode}
        expandedTreeRowKeys={expandedTreeRowKeys}
        onToggleTreeExpand={onToggleTreeExpand}
        onRetryTreeLoad={onRetryTreeLoad}
        lazyChildrenMap={lazyChildrenMap}
        rowDragSortApi={rowDragSortApi}
        draggable={draggable}
        groupedPageItems={groupedPageItems}
        onToggleGroupCollapse={onToggleGroupCollapse}
        indexColumnOffset={indexColumnOffset}
      />
    );
  }

  return (
    <VirtualBody
      props={props}
      columns={columns}
      responsiveHiddenColumns={responsiveHiddenColumns}
      processedData={processedData}
      rowScopeCache={rowScopeCache}
      rowRepeatedTemplateId={rowRepeatedTemplateId}
      expandedRowKeys={expandedRowKeys}
      selectedRowKeys={selectedRowKeys}
      columnCount={columnCount}
      isStriped={isStriped}
      fixedColumnLayout={fixedColumnLayout}
      emptyContent={emptyContent}
      showExpandColumn={showExpandColumn}
      expandRowByClick={expandRowByClick}
      onToggleExpand={onToggleExpand}
      onSelectRow={onSelectRow}
      isRowCheckable={isRowCheckable}
      isAtMaxSelection={isAtMaxSelection}
      scrollRef={scrollRef}
      combineNum={combineNum}
      combineFromIndex={combineFromIndex}
      expandAllByDefault={expandAllByDefault}
      treeMode={treeMode}
      expandedTreeRowKeys={expandedTreeRowKeys}
      onToggleTreeExpand={onToggleTreeExpand}
      onRetryTreeLoad={onRetryTreeLoad}
      lazyChildrenMap={lazyChildrenMap}
      rowDragSortApi={rowDragSortApi}
      draggable={draggable}
      groupedPageItems={groupedPageItems}
      onToggleGroupCollapse={onToggleGroupCollapse}
      indexColumnOffset={indexColumnOffset}
    />
  );
}

function NonVirtualBody({
  props,
  columns,
  responsiveHiddenColumns,
  processedData,
  rowScopeCache,
  rowRepeatedTemplateId,
  expandedRowKeys,
  selectedRowKeys,
  columnCount,
  isStriped,
  fixedColumnLayout,
  emptyContent,
  showExpandColumn,
  expandRowByClick,
  onToggleExpand,
  onSelectRow,
  isRowCheckable,
  isAtMaxSelection,
  combineNum,
  combineFromIndex,
  expandAllByDefault,
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  onRetryTreeLoad,
  lazyChildrenMap,
  rowDragSortApi,
  draggable,
  groupedPageItems,
  onToggleGroupCollapse,
  indexColumnOffset,
}: TableBodyRowsProps) {
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;
  const radioSelectionValue =
    schemaProps.rowSelection?.type === 'radio' ? Array.from(selectedRowKeys)[0] : undefined;

  // D1 G-D: cell combining merges adjacent rows by equal cell values — under
  // grouping that merge would cross group boundaries, so group precedence
  // disables combine while a grouping display sequence is active.
  const combinePlan: CombinePlan | undefined = React.useMemo(
    () =>
      groupedPageItems
        ? undefined
        : computeCombinePlan(processedData, columns, combineNum, {
            virtualEnabled: false,
            combineFromIndex,
          }),
    [groupedPageItems, processedData, columns, combineNum, combineFromIndex],
  );

  const groupedFlattenedItems = React.useMemo(
    () =>
      groupedPageItems
        ? buildGroupedFlattenedItems(
            groupedPageItems,
            rowScopeCache,
            expandedRowKeys,
            selectedRowKeys,
            columnCount,
            props,
            rowRepeatedTemplateId,
            expandAllByDefault,
          )
        : null,
    [
      groupedPageItems,
      rowScopeCache,
      expandedRowKeys,
      selectedRowKeys,
      columnCount,
      props,
      rowRepeatedTemplateId,
      expandAllByDefault,
    ],
  );

  const rows =
    processedData.length === 0 && (groupedPageItems?.length ?? 0) === 0 ? (
      <TableRow data-slot="table-empty-row">
        <TableCell colSpan={columnCount} data-slot="table-empty-cell">
          {emptyContent}
        </TableCell>
      </TableRow>
    ) : groupedFlattenedItems ? (
      groupedFlattenedItems.map((item, displayIndex) => {
        if (item.kind === 'group') {
          const { group, collapsed } = item.item;
          return (
            <TableGroupHeaderRow
              key={`group-${group.key}`}
              groupKey={group.key}
              label={group.label}
              count={group.count}
              aggregateText={formatGroupAggregateText(group.aggregates)}
              collapsed={collapsed}
              columnCount={columnCount}
              onToggle={onToggleGroupCollapse ?? (() => undefined)}
            />
          );
        }

        if (item.kind === 'expanded') {
          return null;
        }

        return (
          <React.Fragment key={item.rowKey}>
            {renderDataRow(
              item,
              schemaProps,
              columns,
              helpers,
              props,
              fixedColumnLayout,
              showExpandColumn,
              expandRowByClick,
              onToggleExpand,
              onSelectRow,
              isStriped,
              isRowCheckable,
              isAtMaxSelection,
              combinePlan,
              displayIndex,
              treeMode,
              expandedTreeRowKeys,
              onToggleTreeExpand,
              onRetryTreeLoad,
              lazyChildrenMap,
              draggable,
              rowDragSortApi,
              indexColumnOffset,
            )}
            {item.isExpanded && (schemaProps.expandable?.expandedRowRegionKey || responsiveHiddenColumns.length > 0)
              ? renderExpandedRow(
                  { kind: 'expanded', rowKey: item.rowKey, columnCount },
                  schemaProps,
                  helpers,
                  props,
                  rowScopeCache,
                  rowRepeatedTemplateId,
                  responsiveHiddenColumns,
                )
              : null}
          </React.Fragment>
        );
      })
    ) : (
      processedData.map((entry, rowIndex) => {
        const cacheKey = entry.cacheKey ?? entry.rowKey;
        const rowScope = rowScopeCache.get(cacheKey);
        if (!rowScope) return null;

        const rowKey = cacheKey;
        const rowInstancePath: InstanceFrame[] = [
          ...(props.node.instancePath ?? []),
          { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: rowKey },
        ];
        // P1-2: expandAllByDefault inverts set membership (set = collapsed overrides).
        const isExpanded = expandAllByDefault
          ? !expandedRowKeys.has(rowKey)
          : expandedRowKeys.has(rowKey);
        const isSelected = selectedRowKeys.has(rowKey);
        const isEven = entry.sourceIndex % 2 === 0;

        return (
          <React.Fragment key={rowKey}>
            {renderDataRow(
              {
                kind: 'data',
                entry,
                rowScope,
                rowKey,
                rowInstancePath,
                isExpanded,
                isSelected,
                isEven,
              },
              schemaProps,
              columns,
              helpers,
              props,
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
              onRetryTreeLoad,
              lazyChildrenMap,
              draggable,
              rowDragSortApi,
              indexColumnOffset,
            )}
            {isExpanded && schemaProps.expandable?.expandedRowRegionKey
              ? renderExpandedRow(
                  { kind: 'expanded', rowKey, columnCount },
                  schemaProps,
                  helpers,
                  props,
                  rowScopeCache,
                  rowRepeatedTemplateId,
                  responsiveHiddenColumns,
                )
              : isExpanded && responsiveHiddenColumns.length > 0
                ? renderExpandedRow(
                    { kind: 'expanded', rowKey, columnCount },
                    schemaProps,
                    helpers,
                    props,
                    rowScopeCache,
                    rowRepeatedTemplateId,
                    responsiveHiddenColumns,
                  )
                : null}
          </React.Fragment>
        );
      })
    );

  if (schemaProps.rowSelection?.type === 'radio') {
    return (
      <RadioGroup
        render={<TableBody />}
        className={undefined}
        value={radioSelectionValue ?? ''}
        onValueChange={(value) => onSelectRow(String(value), true)}
      >
        {rows}
      </RadioGroup>
    );
  }

  return <TableBody>{rows}</TableBody>;
}
