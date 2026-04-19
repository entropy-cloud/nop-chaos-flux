import React from 'react';
import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { Button, Checkbox, RadioGroupItem, TableBody, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import type { TableSchema } from '../schemas';
import type { TableRowEntry } from './types';

interface TableBodyRowsProps {
  props: RendererComponentProps<TableSchema>;
  processedData: TableRowEntry[];
  rowScopeCache: Map<string, ScopeRef>;
  rowRepeatedTemplateId: string;
  expandedRowKeys: Set<string>;
  selectedRowKeys: Set<string>;
  columnCount: number;
  isStriped: boolean;
  emptyContent: React.ReactNode;
  onToggleExpand: (rowKey: string) => void;
  onSelectRow: (rowKey: string, checked: boolean) => void;
}

export function TableBodyRows({
  props,
  processedData,
  rowScopeCache,
  rowRepeatedTemplateId,
  expandedRowKeys,
  selectedRowKeys,
  columnCount,
  isStriped,
  emptyContent,
  onToggleExpand,
  onSelectRow
}: TableBodyRowsProps) {
  const schemaProps = props.props as TableSchema;
  const columns = Array.isArray(schemaProps.columns) ? schemaProps.columns : [];
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

          if (!rowScope) {
            return null;
          }

          const rowKey = entry.rowKey;
          const rowInstancePath = [
            ...(props.node.instancePath ?? []),
            { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: rowKey }
          ] as const;
          const isExpanded = expandedRowKeys.has(rowKey);
          const isSelected = selectedRowKeys.has(rowKey);
          const isEven = entry.sourceIndex % 2 === 0;

          return (
            <React.Fragment key={rowKey}>
              <TableRow
                data-slot="table-row"
                data-interactive={Boolean(props.events.onRowClick) || undefined}
                data-expanded={isExpanded || undefined}
                data-striped={isStriped && isEven ? true : undefined}
                onClick={
                  props.events.onRowClick
                    ? (event) =>
                        void props.events.onRowClick?.(event, { scope: rowScope })
                    : schemaProps.expandable?.expandRowByClick
                      ? () => onToggleExpand(rowKey)
                      : undefined
                }
              >
                {schemaProps.expandable ? (
                  <TableCell data-slot="table-expand-cell">
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
                  <TableCell data-slot="table-select-cell" onClick={(event) => event.stopPropagation()}>
                    {schemaProps.rowSelection.type === 'checkbox' ? (
                      <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectRow(rowKey, Boolean(checked))} />
                    ) : (
                      <RadioGroupItem value={rowKey} />
                    )}
                  </TableCell>
                ) : null}

                {columns.map((column, columnIndex) => {
                  const cellRegion = typeof column.cellRegionKey === 'string' ? props.regions[column.cellRegionKey] : undefined;
                  const buttonRegion = typeof column.buttonsRegionKey === 'string' ? props.regions[column.buttonsRegionKey] : undefined;

                  if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
                    return (
                      <TableCell key={column.name ?? `op-${columnIndex}`} style={column.width ? { width: column.width } : undefined}>
                        <div data-slot="table-actions" className="flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}>
                          {buttonRegion
                            ? buttonRegion.render({
                                bindings: { record: entry.record, index: entry.sourceIndex },
                                instancePath: rowInstancePath,
                                pathSuffix: `buttons.${columnIndex}`,
                              })
                            : (column.buttons ?? []).map((button: import('@nop-chaos/flux-core').BaseSchema, buttonIndex: number) => (
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
                      <TableCell
                        key={`${column.name ?? columnIndex}`}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {cellRegion.render({
                          bindings: { record: entry.record, index: entry.sourceIndex },
                          instancePath: rowInstancePath,
                          pathSuffix: `cells.${columnIndex}`,
                        })}
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={`${column.name ?? columnIndex}`} style={column.width ? { width: column.width } : undefined}>
                      {column.name ? String(entry.record[column.name] ?? '') : ''}
                    </TableCell>
                  );
                })}
              </TableRow>

              {isExpanded && schemaProps.expandable?.expandedRowRegionKey ? (
                <TableRow data-slot="table-expanded-row">
                  <TableCell colSpan={columnCount} data-slot="table-expanded-cell">
                    {props.regions[schemaProps.expandable.expandedRowRegionKey]
                      ? helpers.render(props.regions[schemaProps.expandable.expandedRowRegionKey].templateNode, {
                          scope: rowScope,
                          instancePath: rowInstancePath,
                          pathSuffix: `expanded.${rowKey}`,
                        })
                      : null}
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          );
        })
      )}
    </TableBody>
  );
}
