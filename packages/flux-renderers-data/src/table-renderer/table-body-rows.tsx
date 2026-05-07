import React from 'react';
import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { TableBody, TableCell, TableRow } from '@nop-chaos/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { TableRowEntry } from './types.js';
import { buildFlattenedItems, renderDataRow, renderExpandedRow } from './table-body-row-rendering.js';

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
  virtualEnabled?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
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
  virtualEnabled,
  scrollRef,
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
      scrollRef={scrollRef}
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
}: TableBodyRowsProps) {
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;

  return (
    <TableBody>
      {processedData.length === 0 ? (
        <TableRow data-slot="table-empty-row">
          <TableCell colSpan={columnCount} data-slot="table-empty-cell">
            {emptyContent}
          </TableCell>
        </TableRow>
      ) : (
        processedData.map((entry) => {
          const rowScope = rowScopeCache.get(entry.rowKey);
          if (!rowScope) return null;

          const rowKey = entry.rowKey;
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
      )}
    </TableBody>
  );
}

/* eslint-disable react-hooks/incompatible-library */
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
  scrollRef,
}: TableBodyRowsProps) {
  const parentRef = scrollRef;
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;

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
              {''}
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
