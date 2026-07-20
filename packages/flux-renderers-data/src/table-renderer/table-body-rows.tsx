import React from 'react';
import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { RadioGroup, TableBody, TableCell, TableRow } from '@nop-chaos/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { TableRowEntry } from './types.js';
import { buildFlattenedItems, renderDataRow, renderExpandedRow } from './table-body-row-rendering.js';
import { computeCombinePlan, type CombinePlan } from './combine-cells.js';
import type { RowDragSortApi } from './use-row-drag-sort.js';

const DEFAULT_ROW_ESTIMATE = 44;
const OVERSCAN = 5;

interface TableBodyRowsProps {
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
  treeMode?: boolean;
  expandedTreeRowKeys?: Set<string>;
  onToggleTreeExpand?: (rowKey: string) => void;
  lazyChildrenMap?: ReadonlyMap<string, import('./use-table-lazy-children.js').LazyChildrenState>;
  rowDragSortApi?: RowDragSortApi | null;
  draggable?: boolean;
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
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  lazyChildrenMap,
  rowDragSortApi,
  draggable,
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
        treeMode={treeMode}
        expandedTreeRowKeys={expandedTreeRowKeys}
        onToggleTreeExpand={onToggleTreeExpand}
        lazyChildrenMap={lazyChildrenMap}
        rowDragSortApi={rowDragSortApi}
        draggable={draggable}
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
      treeMode={treeMode}
      expandedTreeRowKeys={expandedTreeRowKeys}
      onToggleTreeExpand={onToggleTreeExpand}
      lazyChildrenMap={lazyChildrenMap}
      rowDragSortApi={rowDragSortApi}
      draggable={draggable}
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
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  lazyChildrenMap,
  rowDragSortApi,
  draggable,
}: TableBodyRowsProps) {
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;
  const radioSelectionValue =
    schemaProps.rowSelection?.type === 'radio' ? Array.from(selectedRowKeys)[0] : undefined;

  const combinePlan: CombinePlan = React.useMemo(
    () => computeCombinePlan(processedData, columns, combineNum, { virtualEnabled: false }),
    [processedData, columns, combineNum],
  );

  const rows =
    processedData.length === 0 ? (
      <TableRow data-slot="table-empty-row">
        <TableCell colSpan={columnCount} data-slot="table-empty-cell">
          {emptyContent}
        </TableCell>
      </TableRow>
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
        const isExpanded = expandedRowKeys.has(rowKey);
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
              lazyChildrenMap,
              draggable,
              rowDragSortApi,
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

function VirtualBody({
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
  showExpandColumn,
  expandRowByClick,
  onToggleExpand,
  onSelectRow,
  isRowCheckable,
  isAtMaxSelection,
  emptyContent,
  scrollRef,
  combineNum,
  treeMode,
  expandedTreeRowKeys,
  onToggleTreeExpand,
  lazyChildrenMap,
  rowDragSortApi,
  draggable,
}: TableBodyRowsProps) {
  const parentRef = scrollRef;
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;

  const combinePlan: CombinePlan = React.useMemo(
    () => computeCombinePlan(processedData, columns, combineNum, { virtualEnabled: true }),
    [processedData, columns, combineNum],
  );

  const flattenedItems = React.useMemo(
    () =>
      buildFlattenedItems(
        processedData,
        rowScopeCache,
        expandedRowKeys,
        selectedRowKeys,
        columnCount,
        props,
        rowRepeatedTemplateId,
      ),
    [
      processedData,
      rowScopeCache,
      expandedRowKeys,
      selectedRowKeys,
      columnCount,
      props,
      rowRepeatedTemplateId,
    ],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions; React Compiler auto-skips this component
  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef?.current ?? null,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      if (!item) return DEFAULT_ROW_ESTIMATE;
      return item.kind === 'expanded' ? 120 : DEFAULT_ROW_ESTIMATE;
    },
    overscan: OVERSCAN,
    getItemKey: (index) => {
      const item = flattenedItems[index];
      if (!item) return `item-${index}`;
      return item.kind === 'expanded' ? `expanded-${item.rowKey}` : `data-${item.rowKey}`;
    },
  });

  return (
    <TableBody>
      {flattenedItems.length === 0 ? (
        <TableRow data-slot="table-empty-row">
          <TableCell colSpan={columnCount} data-slot="table-empty-cell">
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emptyContent}
            </div>
          </TableCell>
        </TableRow>
      ) : (
        <>
          {rowVirtualizer.getTotalSize() > 0 &&
            (() => {
              const items = rowVirtualizer.getVirtualItems();
              return items.length > 0 ? (
                <tr aria-hidden style={{ height: items[0].start }} />
              ) : null;
            })()}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = flattenedItems[virtualRow.index];
            if (!item) return null;

            if (item.kind === 'data') {
              return (
                <React.Fragment key={virtualRow.key}>
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
                    virtualRow.index,
                    treeMode,
                    expandedTreeRowKeys,
                    onToggleTreeExpand,
                    lazyChildrenMap,
                    draggable,
                    rowDragSortApi,
                  )}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={virtualRow.key}>
                {renderExpandedRow(
                  item,
                  schemaProps,
                  helpers,
                  props,
                  rowScopeCache,
                  rowRepeatedTemplateId,
                  responsiveHiddenColumns,
                )}
              </React.Fragment>
            );
          })}
          {rowVirtualizer.getTotalSize() > 0 &&
            (() => {
              const items = rowVirtualizer.getVirtualItems();
              if (items.length === 0) return null;
              const lastItem = items[items.length - 1];
              const bottomPad = rowVirtualizer.getTotalSize() - lastItem.end;
              return bottomPad > 0 ? <tr aria-hidden style={{ height: bottomPad }} /> : null;
            })()}
        </>
      )}
    </TableBody>
  );
}
