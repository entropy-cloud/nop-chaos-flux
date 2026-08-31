import React from 'react';
import { RadioGroup, TableBody, TableCell, TableRow } from '@nop-chaos/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TableSchema } from '../schemas.js';
import { formatGroupAggregateText } from './table-grouping.js';
import { TableGroupHeaderRow } from './table-group-header-row.js';
import { buildGroupedFlattenedItems } from './table-flattened-items.js';
import {
  buildFlattenedItems,
  renderDataRow,
  renderExpandedRow,
} from './table-body-row-rendering.js';
import { computeCombinePlan, type CombinePlan } from './combine-cells.js';
import type { TableBodyRowsProps } from './table-body-rows.js';

/* D1 G-D note: virtual body split out of table-body-rows.tsx (file-size governance). */

const DEFAULT_ROW_ESTIMATE = 44;
const OVERSCAN = 5;

export function VirtualBody({
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
  const parentRef = scrollRef;
  const schemaProps = props.props as TableSchema;
  const helpers = props.helpers;
  const radioSelectionValue =
    schemaProps.rowSelection?.type === 'radio' ? Array.from(selectedRowKeys)[0] : undefined;

  // D1 G-D: combine must not merge cells across group boundaries (group precedence).
  const combinePlan: CombinePlan | undefined = React.useMemo(
    () =>
      groupedPageItems
        ? undefined
        : computeCombinePlan(processedData, columns, combineNum, {
            virtualEnabled: true,
            combineFromIndex,
          }),
    [groupedPageItems, processedData, columns, combineNum, combineFromIndex],
  );

  const flattenedItems = React.useMemo(
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
        : buildFlattenedItems(
            processedData,
            rowScopeCache,
            expandedRowKeys,
            selectedRowKeys,
            columnCount,
            props,
            rowRepeatedTemplateId,
            expandAllByDefault,
          ),
    [
      groupedPageItems,
      processedData,
      rowScopeCache,
      expandedRowKeys,
      selectedRowKeys,
      columnCount,
      props,
      rowRepeatedTemplateId,
      expandAllByDefault,
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
      if (item.kind === 'expanded') return `expanded-${item.rowKey}`;
      if (item.kind === 'group') return `group-${item.item.group.key}`;
      return `data-${item.rowKey}`;
    },
  });

  // [G3-R3-视角4-01] the virtual body must keep RadioGroupItem cells inside a
  // RadioGroup exactly like the non-virtual branch — without the group wrapper
  // Base UI radios are context-less (checked reads `value === ''`, writes are
  // NOOP) and single-select is completely dead under virtualization.
  const bodyContent = (
    <>
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

            if (item.kind === 'group') {
              const { group, collapsed } = item.item;
              return (
                <TableGroupHeaderRow
                  key={virtualRow.key}
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
                    onRetryTreeLoad,
                    lazyChildrenMap,
                    draggable,
                    rowDragSortApi,
                    indexColumnOffset,
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
    </>
  );

  if (schemaProps.rowSelection?.type === 'radio') {
    return (
      <RadioGroup
        render={<TableBody />}
        className={undefined}
        value={radioSelectionValue ?? ''}
        onValueChange={(value) => onSelectRow(String(value), true)}
      >
        {bodyContent}
      </RadioGroup>
    );
  }

  return <TableBody>{bodyContent}</TableBody>;
}
