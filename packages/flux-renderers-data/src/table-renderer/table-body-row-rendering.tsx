import React from 'react';
import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { Button, Checkbox, RadioGroupItem, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import { TableQuickEditCell, resolveTableQuickEditConfig } from './table-quick-edit-cell.js';
import type { TableRowEntry } from './types.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export interface FlattenedRow {
  kind: 'data';
  entry: TableRowEntry;
  rowScope: ScopeRef;
  rowKey: string;
  rowInstancePath: InstanceFrame[];
  isExpanded: boolean;
  isSelected: boolean;
  isEven: boolean;
}

export interface FlattenedExpandedRow {
  kind: 'expanded';
  rowKey: string;
  columnCount: number;
}

export type FlattenedItem = FlattenedRow | FlattenedExpandedRow;

type DataRowRenderProps = {
  item: FlattenedRow;
  schemaProps: TableSchema;
  columns: import('../schemas.js').TableColumnSchema[];
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
};

function areColumnsRenderEquivalent(
  prev: import('../schemas.js').TableColumnSchema[],
  next: import('../schemas.js').TableColumnSchema[],
) {
  if (prev === next) {
    return true;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((column, index) => {
    const nextColumn = next[index];
    if (!nextColumn) {
      return false;
    }

    return (
      column === nextColumn ||
      (column.name === nextColumn.name &&
        column.type === nextColumn.type &&
        column.width === nextColumn.width &&
        column.fixed === nextColumn.fixed &&
        column.cellRegionKey === nextColumn.cellRegionKey &&
        column.buttonsRegionKey === nextColumn.buttonsRegionKey &&
        column.labelRegionKey === nextColumn.labelRegionKey)
    );
  });
}

export function buildFlattenedItems(
  processedData: TableRowEntry[],
  rowScopeCache: Map<string, ScopeRef>,
  expandedRowKeys: Set<string>,
  selectedRowKeys: Set<string>,
  columnCount: number,
  parentProps: RendererComponentProps<TableSchema>,
  rowRepeatedTemplateId: string,
): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  for (const entry of processedData) {
    const cacheKey = entry.cacheKey ?? entry.rowKey;
    const rowScope = rowScopeCache.get(cacheKey);
    if (!rowScope) continue;

    const rowKey = cacheKey;
    const rowInstancePath: InstanceFrame[] = [
      ...(parentProps.node.instancePath ?? []),
      { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: rowKey },
    ];
    const isExpanded = expandedRowKeys.has(rowKey);

    items.push({
      kind: 'data',
      entry,
      rowScope,
      rowKey,
      rowInstancePath,
      isExpanded,
      isSelected: selectedRowKeys.has(rowKey),
      isEven: entry.sourceIndex % 2 === 0,
    });

    if (isExpanded) {
      items.push({ kind: 'expanded', rowKey, columnCount });
    }
  }

  return items;
}

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
}: DataRowRenderProps) {
  const { rowKey, rowInstancePath, isExpanded, isSelected, isEven, entry, rowScope } = item;
  const hasRowClickHandler = Boolean(parentProps.events.onRowClick);
  const isRowClickable = hasRowClickHandler || expandRowByClick;

  const rowCheckboxDisabled =
    (isRowCheckable ? !isRowCheckable(rowKey) : false) ||
    (isAtMaxSelection === true && !isSelected);

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (hasRowClickHandler) {
      void parentProps.events.onRowClick?.(event, { scope: rowScope });
    }

    if (expandRowByClick) {
      onToggleExpand(rowKey);
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

  return (
    <TableRow
      data-slot="table-row"
      data-interactive={isRowClickable || undefined}
      data-expanded={isExpanded || undefined}
      data-striped={isStriped && isEven ? true : undefined}
      onClick={isRowClickable ? handleRowClick : undefined}
      onKeyDown={isRowClickable ? handleRowKeyDown : undefined}
      tabIndex={isRowClickable ? 0 : -1}
      className={isRowClickable ? 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none' : undefined}
    >
      {showExpandColumn ? (
        <TableCell
          data-slot="table-expand-cell"
          className={fixedColumnLayout.getExpandCellProps().className}
          style={fixedColumnLayout.getExpandCellProps().style}
        >
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

        if (column.type === 'operation' && buttonRegion) {
          return (
            <TableCell
              key={column.name ?? `op-${columnIndex}`}
              className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className}
              style={{
                ...(column.width ? { width: column.width } : undefined),
                ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style,
              }}
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
              }}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
            >
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
              }}
              data-fixed={
                fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
              }
            >
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
            }}
            data-fixed={
              fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined
            }
          >
            {column.name ? String(entry.record[column.name] ?? '') : ''}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

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
    prev.schemaProps.quickSaveAction === next.schemaProps.quickSaveAction &&
    prev.schemaProps.quickSaveItemAction === next.schemaProps.quickSaveItemAction &&
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
    prev.isAtMaxSelection === next.isAtMaxSelection
  );
});

export function renderDataRow(
  item: FlattenedRow,
  schemaProps: TableSchema,
  columns: import('../schemas.js').TableColumnSchema[],
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
    />
  );
}

export function renderExpandedRow(
  item: FlattenedExpandedRow,
  schemaProps: TableSchema,
  helpers: RendererComponentProps<TableSchema>['helpers'],
  parentProps: RendererComponentProps<TableSchema>,
  rowScopeCache: Map<string, ScopeRef>,
  rowRepeatedTemplateId: string,
  responsiveHiddenColumns: import('../schemas.js').TableColumnSchema[],
) {
  const regionKey = schemaProps.expandable?.expandedRowRegionKey;
  const hasResponsiveHiddenColumns = responsiveHiddenColumns.length > 0;
  if (!regionKey && !hasResponsiveHiddenColumns) return null;

  const rowScope = rowScopeCache.get(item.rowKey);
  if (!rowScope) return null;

  const rowInstancePath: InstanceFrame[] = [
    ...(parentProps.node.instancePath ?? []),
    { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: item.rowKey },
  ];

  return (
    <TableRow data-slot="table-expanded-row">
      <TableCell colSpan={item.columnCount} data-slot="table-expanded-cell">
        {hasResponsiveHiddenColumns ? (
          <div className="grid gap-2 sm:grid-cols-2" data-slot="table-responsive-expanded">
            {responsiveHiddenColumns.map((column, index) => {
              const cellRegion =
                typeof column.cellRegionKey === 'string'
                  ? parentProps.regions[column.cellRegionKey]
                  : undefined;
              const labelRegion =
                typeof column.labelRegionKey === 'string'
                  ? parentProps.regions[column.labelRegionKey]
                  : undefined;
              const label =
                asReactNode(labelRegion?.render()) ??
                (typeof column.label === 'string' ? column.label : (column.name ?? `Column ${index + 1}`));
              const columnKey = column.name ?? `${label}-${column.type ?? 'value'}`;
              return (
                <div
                  key={columnKey}
                  className="rounded-md border bg-muted/20 px-3 py-2"
                  data-slot="table-responsive-expanded-item"
                >
                  <div
                    className="text-xs font-medium text-muted-foreground"
                    data-slot="table-responsive-expanded-label"
                  >
                    {label}
                  </div>
                  <div className="mt-1 text-sm" data-slot="table-responsive-expanded-value">
                    {cellRegion
                      ? asReactNode(
                          cellRegion.render({
                            scope: rowScope,
                            bindings: {
                              record: rowScope.get('record'),
                              index: rowScope.get('index'),
                            },
                            instancePath: rowInstancePath,
                            pathSuffix: `responsive.${index}`,
                          }),
                        )
                      : column.name
                        ? String(
                            (rowScope.get('record') as Record<string, unknown> | undefined)?.[
                              column.name
                            ] ?? '',
                          )
                        : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {regionKey && parentProps.regions[regionKey]
          ? asReactNode(
              parentProps.regions[regionKey].render({
                scope: rowScope,
                bindings: {
                  record: rowScope.get('record'),
                  index: rowScope.get('index'),
                },
                instancePath: rowInstancePath,
                pathSuffix: `expanded.${item.rowKey}`,
              }),
            )
          : null}
      </TableCell>
    </TableRow>
  );
}
