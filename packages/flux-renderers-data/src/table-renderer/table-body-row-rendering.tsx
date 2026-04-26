import React from 'react';
import type { BaseSchema, InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { Button, Checkbox, RadioGroupItem, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import type { TableSchema } from '../schemas';
import type { FixedColumnLayout } from './fixed-columns';
import { TableQuickEditCell, resolveTableQuickEditConfig } from './table-quick-edit-cell';
import type { TableRowEntry } from './types';

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

export function buildFlattenedItems(
  processedData: TableRowEntry[],
  rowScopeCache: Map<string, ScopeRef>,
  expandedRowKeys: Set<string>,
  selectedRowKeys: Set<string>,
  columnCount: number,
  parentProps: RendererComponentProps<TableSchema>,
  rowRepeatedTemplateId: string
): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  for (const entry of processedData) {
    const rowScope = rowScopeCache.get(entry.rowKey);
    if (!rowScope) continue;

    const rowKey = entry.rowKey;
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

export function renderDataRow(
  item: FlattenedRow,
  schemaProps: TableSchema,
  columns: import('../schemas').TableColumnSchema[],
  helpers: RendererComponentProps<TableSchema>['helpers'],
  parentProps: RendererComponentProps<TableSchema>,
  fixedColumnLayout: FixedColumnLayout,
  showExpandColumn: boolean,
  expandRowByClick: boolean,
  onToggleExpand: (rowKey: string) => void,
  onSelectRow: (rowKey: string, checked: boolean) => void,
  isStriped: boolean
) {
  const { rowKey, rowInstancePath, isExpanded, isSelected, isEven, entry, rowScope } = item;

  return (
    <TableRow
      data-slot="table-row"
      data-interactive={Boolean(parentProps.events.onRowClick) || undefined}
      data-expanded={isExpanded || undefined}
      data-striped={isStriped && isEven ? true : undefined}
      onClick={
        parentProps.events.onRowClick
          ? (event) => void parentProps.events.onRowClick?.(event, { scope: rowScope })
          : expandRowByClick
            ? () => onToggleExpand(rowKey)
            : undefined
      }
    >
      {showExpandColumn ? (
        <TableCell data-slot="table-expand-cell" className={fixedColumnLayout.getExpandCellProps().className} style={fixedColumnLayout.getExpandCellProps().style}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(rowKey);
            }}
            className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          </Button>
        </TableCell>
      ) : null}

      {schemaProps.rowSelection ? (
        <TableCell data-slot="table-select-cell" className={fixedColumnLayout.getSelectionCellProps().className} style={fixedColumnLayout.getSelectionCellProps().style} onClick={(event) => event.stopPropagation()}>
          {schemaProps.rowSelection.type === 'checkbox' ? (
            <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectRow(rowKey, Boolean(checked))} />
          ) : (
            <RadioGroupItem value={rowKey} />
          )}
        </TableCell>
      ) : null}

      {columns.map((column, columnIndex) => {
        const cellRegion = typeof column.cellRegionKey === 'string' ? parentProps.regions[column.cellRegionKey] : undefined;
        const buttonRegion = typeof column.buttonsRegionKey === 'string' ? parentProps.regions[column.buttonsRegionKey] : undefined;

        if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
          return (
            <TableCell key={column.name ?? `op-${columnIndex}`} className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className} style={{ ...(column.width ? { width: column.width } : undefined), ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style }} data-fixed={fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined}>
              <div data-slot="table-actions" className="flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}>
                {buttonRegion
                  ? buttonRegion.render({
                      bindings: { record: entry.record, index: entry.sourceIndex },
                      instancePath: rowInstancePath,
                      pathSuffix: `buttons.${columnIndex}`,
                    })
                  : (column.buttons ?? []).map((button: BaseSchema, buttonIndex: number) => (
                      <div key={button.id ?? button.name ?? `btn-${buttonIndex}`}>
                        {helpers.render(button, {
                          scope: rowScope,
                          instancePath: rowInstancePath,
                          pathSuffix: `buttons.${buttonIndex}`,
                        })}
                      </div>
                    ))}
              </div>
            </TableCell>
          );
        }

        if (cellRegion) {
          return (
            <TableCell key={`${column.name ?? columnIndex}`} className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className} style={{ ...(column.width ? { width: column.width } : undefined), ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style }} data-fixed={fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined}>
              {cellRegion.render({
                bindings: { record: entry.record, index: entry.sourceIndex },
                instancePath: rowInstancePath,
                pathSuffix: `cells.${columnIndex}`,
              })}
            </TableCell>
          );
        }

        const quickEditConfig = resolveTableQuickEditConfig(column);
        if (quickEditConfig && column.name) {
          return (
            <TableCell key={`${column.name ?? columnIndex}`} className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className} style={{ ...(column.width ? { width: column.width } : undefined), ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style }} data-fixed={fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined}>
              <TableQuickEditCell
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

        return (
          <TableCell key={`${column.name ?? columnIndex}`} className={fixedColumnLayout.getColumnCellProps(column, columnIndex).className} style={{ ...(column.width ? { width: column.width } : undefined), ...fixedColumnLayout.getColumnCellProps(column, columnIndex).style }} data-fixed={fixedColumnLayout.getColumnCellProps(column, columnIndex).fixed || undefined}>
            {column.name ? String(entry.record[column.name] ?? '') : ''}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function renderExpandedRow(
  item: FlattenedExpandedRow,
  schemaProps: TableSchema,
  helpers: RendererComponentProps<TableSchema>['helpers'],
  parentProps: RendererComponentProps<TableSchema>,
  rowScopeCache: Map<string, ScopeRef>,
  rowRepeatedTemplateId: string,
  responsiveHiddenColumns: import('../schemas').TableColumnSchema[]
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
              const cellRegion = typeof column.cellRegionKey === 'string' ? parentProps.regions[column.cellRegionKey] : undefined;
              const label = typeof column.label === 'string' ? column.label : column.name ?? `Column ${index + 1}`;
              const columnKey = column.name ?? `${label}-${column.type ?? 'value'}`;
              return (
                <div key={columnKey} className="rounded-md border bg-muted/20 px-3 py-2" data-slot="table-responsive-expanded-item">
                  <div className="text-xs font-medium text-muted-foreground" data-slot="table-responsive-expanded-label">{label}</div>
                  <div className="mt-1 text-sm" data-slot="table-responsive-expanded-value">
                    {cellRegion
                      ? cellRegion.render({
                          bindings: {
                            record: rowScope.get('record'),
                            index: rowScope.get('index'),
                          },
                          instancePath: rowInstancePath,
                          pathSuffix: `responsive.${index}`,
                        })
                      : column.name
                        ? String(((rowScope.get('record') as Record<string, unknown> | undefined)?.[column.name]) ?? '')
                        : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {regionKey && parentProps.regions[regionKey]
          ? helpers.render(parentProps.regions[regionKey].templateNode, {
              scope: rowScope,
              instancePath: rowInstancePath,
              pathSuffix: `expanded.${item.rowKey}`,
            })
          : null}
      </TableCell>
    </TableRow>
  );
}
