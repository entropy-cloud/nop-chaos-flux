import React, { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nop-chaos/ui';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@nop-chaos/ui';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@nop-chaos/ui';
import { Checkbox } from '@nop-chaos/ui';
import { RadioGroupItem } from '@nop-chaos/ui';
import { NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import { Spinner } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon, ArrowUpDownIcon } from 'lucide-react';
import type { TableColumnSchema, TableSchema } from './schemas';
import { processTableData, createTableRowRepeatedTemplateId, serializeInstancePath } from './table-renderer/table-data';
import { useTableRowScopeCache } from './table-renderer/use-table-row-scope-cache';
import { useTablePagination, useTableSelection, useTableSort, useTableFilter, useTableExpand } from './table-renderer/use-table-controls';
import { useTableHandle } from './table-renderer/use-table-handle';

const EMPTY_TABLE_COLUMNS: TableColumnSchema[] = [];
const EMPTY_TABLE_ROWS: Array<Record<string, any>> = [];

function createTableOwnerKey(props: RendererComponentProps<TableSchema>): string {
  return `${props.node.templateNode.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.node.instancePath)}`;
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const schemaProps = props.props as unknown as TableSchema;
  const columns = Array.isArray(schemaProps.columns) ? schemaProps.columns : EMPTY_TABLE_COLUMNS;
  const source = Array.isArray(schemaProps.source) ? (schemaProps.source as Array<Record<string, any>>) : EMPTY_TABLE_ROWS;
  const helpers = props.helpers;
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const paginationStatePath = typeof schemaProps.paginationStatePath === 'string' ? schemaProps.paginationStatePath : undefined;
  const selectionStatePath = typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;

  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const loadingContent = resolveRendererSlotContent(props, 'loadingSlot');

  const templateNodeId = props.node.templateNode.templateNodeId;
  const ownerKey = createTableOwnerKey(props);
  const rowRepeatedTemplateId = useMemo(() => createTableRowRepeatedTemplateId(templateNodeId), [templateNodeId]);

  const { paginationEnabled, currentPage, pageSize, handlePageChange, handlePageSizeChange } = useTablePagination(
    schemaProps,
    props.events.onPageChange,
    helpers
  );
  const { selectedRowKeys, allSelected, handleSelectAll, handleSelectRow, setSelectionExternal } = useTableSelection(
    schemaProps,
    source,
    props.events.onSelectionChange,
    helpers
  );
  const { sortState, handleSort } = useTableSort(props.events.onSortChange, columns, helpers);
  const { filterState, handleFilter } = useTableFilter(props.events.onFilterChange, helpers);
  const { expandedRowKeys, handleToggleExpand } = useTableExpand(schemaProps);

  const processedData = useMemo(
    () => processTableData(source, schemaProps.rowKey, sortState, filterState, paginationEnabled, currentPage, pageSize),
    [source, schemaProps.rowKey, sortState, filterState, paginationEnabled, currentPage, pageSize]
  );

  const rowScopeCache = useTableRowScopeCache(processedData, ownerKey, helpers, props.path);

  useTableHandle(
    props,
    currentPage,
    pageSize,
    selectedRowKeys,
    selectionOwnership,
    selectionStatePath,
    paginationOwnership,
    paginationStatePath,
    setSelectionExternal
  );

  const totalPages = useMemo(() => {
    if (!paginationEnabled) return 1;
    return Math.ceil(source.length / pageSize);
  }, [source.length, pageSize, paginationEnabled]);

  const isLoading = schemaProps.loading === true;
  const isStriped = schemaProps.stripe === true;
  const isBordered = schemaProps.bordered === true;
  const columnCount = columns.length + (schemaProps.rowSelection ? 1 : 0) + (schemaProps.expandable ? 1 : 0);

  return (
    <div className={cn('nop-table', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(headerContent) ? <div data-slot="table-header-region">{headerContent}</div> : null}

      <div className="relative" data-slot="table-container">
        <Table
          data-striped={isStriped || undefined}
          data-bordered={isBordered || undefined}
        >
          <TableHeader data-slot="table-header">
            <TableRow>
              {schemaProps.expandable ? (
                <TableHead data-slot="table-expand-column" style={{ width: '40px' }}>
                  <span className="sr-only">Expand</span>
                </TableHead>
              ) : null}

              {schemaProps.rowSelection ? (
                <TableHead data-slot="table-select-column" style={{ width: '40px' }}>
                  {schemaProps.rowSelection.type === 'checkbox' && (
                    <Checkbox
                      checked={allSelected && selectedRowKeys.size === source.length && source.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    />
                  )}
                </TableHead>
              ) : null}

              {columns.map((column, index) => {
                const labelRegion = typeof column.labelRegionKey === 'string' ? props.regions[column.labelRegionKey] : undefined;
                const labelContent = labelRegion?.instantiate() ?? column.label ?? column.name;
                const isSortable = column.sortable === true;
                const isFilterable = column.filterable === true && Array.isArray(column.filterOptions) && column.filterOptions.length > 0;
                const currentSort = sortState.column === column.name ? sortState.direction : null;
                const activeFilters = column.name ? (filterState[column.name] ?? new Set()) : new Set<string>();

                return (
                  <TableHead
                    key={`${column.name ?? column.label ?? 'column'}-${index}`}
                    style={column.width ? { width: column.width } : undefined}
                    data-slot="table-head"
                    data-interactive={isSortable || isFilterable || undefined}
                  >
                    {isSortable || isFilterable ? (
                      <div className="flex items-center gap-1">
                        <span
                          className={isSortable ? 'cursor-pointer hover:text-primary' : ''}
                          onClick={() => isSortable && column.name && handleSort(column.name)}
                        >
                          {labelContent}
                          {isSortable && (
                            <ArrowUpDownIcon
                              className={cn(
                                'inline ml-1 size-3',
                                currentSort ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                          )}
                        </span>

                        {isFilterable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  className={cn(
                                    'h-6 w-6 rounded hover:bg-accent',
                                    activeFilters.size > 0 ? 'text-primary' : 'text-muted-foreground'
                                  )}
                                  aria-label="Filter"
                                >
                                  <span className="sr-only">Filter</span>
                                  <ChevronDownIcon className="size-3" />
                                </button>
                              }
                            />
                            <DropdownMenuContent>
                              {column.filterOptions!.map((option) => (
                                <DropdownMenuCheckboxItem
                                  key={option.value}
                                  checked={activeFilters.has(option.value)}
                                  onCheckedChange={(checked) => column.name && handleFilter(column.name, option.value, checked)}
                                >
                                  {option.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ) : (
                      labelContent
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

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
                            ? () => handleToggleExpand(rowKey)
                            : undefined
                      }
                    >
                      {schemaProps.expandable ? (
                        <TableCell data-slot="table-expand-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(rowKey);
                            }}
                            className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                          </button>
                        </TableCell>
                      ) : null}

                      {schemaProps.rowSelection ? (
                        <TableCell data-slot="table-select-cell" onClick={(e) => e.stopPropagation()}>
                          {schemaProps.rowSelection.type === 'checkbox' ? (
                            <Checkbox checked={isSelected} onCheckedChange={(checked) => handleSelectRow(rowKey, Boolean(checked))} />
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
                            <TableCell key={`op-${columnIndex}`} style={column.width ? { width: column.width } : undefined}>
                              <div data-slot="table-actions" className="flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}>
                                 {buttonRegion
                                   ? buttonRegion.render({
                                       bindings: { record: entry.record, index: entry.sourceIndex },
                                       instancePath: rowInstancePath,
                                       pathSuffix: `buttons.${columnIndex}`,
                                     })
                                  : (column.buttons ?? []).map((button, buttonIndex) => (
                                      <div key={`btn-${buttonIndex}`}>
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
        </Table>

        {isLoading && (
          <div data-slot="table-loading-overlay" className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="size-6" />
              {hasRendererSlotContent(loadingContent) && <span className="text-sm text-muted-foreground">{loadingContent}</span>}
            </div>
          </div>
        )}
      </div>

      {paginationEnabled && source.length > 0 && (
        <div data-slot="table-pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <NativeSelect
              value={String(pageSize)}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              size="sm"
            >
              {schemaProps.pagination?.pageSizeOptions?.map((size: number) => (
                <NativeSelectOption key={size} value={String(size)}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {totalPages <= 7 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))
              ) : (
                <>
                  {currentPage > 3 && (
                    <>
                      <PaginationItem>
                        <PaginationLink onClick={() => handlePageChange(1)} isActive={currentPage === 1} className="cursor-pointer">
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {currentPage > 4 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}

                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let page = currentPage - 1 + i;
                    if (page < 1) page = 1;
                    if (page > totalPages) page = totalPages;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink onClick={() => handlePageChange(page)} isActive={page === currentPage} className="cursor-pointer">
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(totalPages)}
                          isActive={currentPage === totalPages}
                          className="cursor-pointer"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="text-sm text-muted-foreground">
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, source.length)} of ${source.length}`}
          </div>
        </div>
      )}

      {hasRendererSlotContent(footerContent) ? <div data-slot="table-footer">{footerContent}</div> : null}
    </div>
  );
}
