import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import type { ComponentHandle, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
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

type SortState = { column: string; direction: 'asc' | 'desc' | null };
type FilterState = Record<string, Set<string>>;
type TableRowEntry = {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, any>;
  viewIndex?: number;
};
const EMPTY_TABLE_COLUMNS: TableColumnSchema[] = [];
const EMPTY_TABLE_ROWS: Array<Record<string, any>> = [];

function normalizeRowKey(record: Record<string, any>, sourceIndex: number, rowKeyField?: string): string {
  const explicitValue = rowKeyField ? getIn(record, rowKeyField) : undefined;
  const compatibilityValue = explicitValue ?? record.__rowKey ?? record.id;

  if (compatibilityValue === null || compatibilityValue === undefined || compatibilityValue === '') {
    return `legacy-index:${sourceIndex}`;
  }

  return String(compatibilityValue);
}

function buildTableRowEntries(source: Array<Record<string, any>>, rowKeyField?: string): TableRowEntry[] {
  return source.map((record, sourceIndex) => ({
    rowKey: normalizeRowKey(record, sourceIndex, rowKeyField),
    sourceIndex,
    record
  }));
}

function serializeInstancePath(instancePath: readonly { repeatedTemplateId: string; instanceKey: string }[] | undefined): string {
  return instancePath?.length ? JSON.stringify(instancePath) : 'root';
}

function createTableRowRepeatedTemplateId(tableNodeId: number | undefined): string {
  return `table-row:${tableNodeId ?? 'unknown'}`;
}

function createTableOwnerKey(props: RendererComponentProps<TableSchema>): string {
  return `${props.node.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.nodeInstance.locator.instancePath)}`;
}

function createRowScopeId(ownerKey: string, rowKey: string): string {
  return `table:${ownerKey}:row:${rowKey}`;
}

function createRowScopePath(ownerPath: string, rowKey: string): string {
  return `${ownerPath}.rowsByKey.${rowKey}`;
}

function syncRowScope(scope: ScopeRef, payload: { record: Record<string, any>; index: number }, previous: { record: Record<string, any>; index: number } | undefined) {
  if (!previous || previous.record !== payload.record) {
    scope.merge({ record: payload.record });
  }

  if (!previous || previous.index !== payload.index) {
    scope.merge({ index: payload.index });
  }
}

function warnOnDuplicateRowKeys(entries: TableRowEntry[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.rowKey)) {
      duplicates.add(entry.rowKey);
      continue;
    }

    seen.add(entry.rowKey);
  }

  if (duplicates.size > 0) {
    console.warn(`[TableRenderer] Duplicate rowKey values detected: ${Array.from(duplicates).join(', ')}`);
  }
}

function toPositiveNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function toSelectionPayload(payload: Record<string, unknown> | undefined) {
  return new Set(toStringArray(payload?.selectedRowKeys));
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const renderScope = useRenderScope();
  const schemaProps = props.props as unknown as TableSchema;
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const paginationStatePath = typeof schemaProps.paginationStatePath === 'string' ? schemaProps.paginationStatePath : undefined;
  const selectionStatePath = typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;
  const scopeData = useScopeSelector((scope) => scope);
  const columns = Array.isArray(schemaProps.columns) ? schemaProps.columns : EMPTY_TABLE_COLUMNS;
  const source = Array.isArray(schemaProps.source) ? (schemaProps.source as Array<Record<string, any>>) : EMPTY_TABLE_ROWS;
  const onSortChange = props.events.onSortChange;
  const onFilterChange = props.events.onFilterChange;
  const onPageChange = props.events.onPageChange;
  const onSelectionChange = props.events.onSelectionChange;
  const onRefresh = props.events.onRefresh;
  const helpers = props.helpers;
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const loadingContent = resolveRendererSlotContent(props, 'loadingSlot');
  const ownerKey = useMemo(() => createTableOwnerKey(props), [props]);
  const rowRepeatedTemplateId = useMemo(() => createTableRowRepeatedTemplateId(props.node.templateNodeId), [props.node.templateNodeId]);
  const [rowScopeCache] = useState(() => new Map<string, ScopeRef>());
  const [rowScopeSnapshots] = useState(() => new Map<string, { record: Record<string, any>; index: number }>());

  const [sortState, setSortState] = useState<SortState>({ column: '', direction: null });
  const [filterState, setFilterState] = useState<FilterState>({});
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(schemaProps.pagination?.pageSize ?? 10);
  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.rowSelection?.selectedRowKeys ?? [])
  );
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.expandable?.expandedRowKeys ?? [])
  );
  const [allSelected, setAllSelected] = useState(false);

  const columnCount = columns.length + (schemaProps.rowSelection ? 1 : 0) + (schemaProps.expandable ? 1 : 0);
  const isLoading = schemaProps.loading === true;
  const isStriped = schemaProps.stripe === true;
  const isBordered = schemaProps.bordered === true;
  const paginationEnabled = schemaProps.pagination?.enabled !== false;
  const scopePaginationState = paginationOwnership === 'scope' && paginationStatePath
    ? (getIn(scopeData, paginationStatePath) as Record<string, unknown> | undefined)
    : undefined;
  const currentPage = paginationOwnership === 'controlled'
    ? toPositiveNumber(schemaProps.pagination?.currentPage, 1)
    : paginationOwnership === 'scope'
      ? toPositiveNumber(scopePaginationState?.currentPage, toPositiveNumber(schemaProps.pagination?.currentPage, 1))
      : localCurrentPage;
  const pageSize = paginationOwnership === 'controlled'
    ? toPositiveNumber(schemaProps.pagination?.pageSize, 10)
    : paginationOwnership === 'scope'
      ? toPositiveNumber(scopePaginationState?.pageSize, toPositiveNumber(schemaProps.pagination?.pageSize, 10))
      : localPageSize;
  const controlledSelectedRowKeys = useMemo(
    () => new Set(toStringArray(schemaProps.rowSelection?.selectedRowKeys)),
    [schemaProps.rowSelection?.selectedRowKeys]
  );
  const scopeSelectedRowKeys = useMemo(
    () => new Set(toStringArray(selectionOwnership === 'scope' && selectionStatePath ? getIn(scopeData, selectionStatePath) : undefined)),
    [scopeData, selectionOwnership, selectionStatePath]
  );
  const selectedRowKeys = selectionOwnership === 'controlled'
    ? controlledSelectedRowKeys
    : selectionOwnership === 'scope'
      ? scopeSelectedRowKeys
      : localSelectedRowKeys;

  const handleSort = useCallback(
    (columnName: string) => {
      if (!columnName || !columns.find((c) => c.name === columnName && c.sortable)) {
        return;
      }

      setSortState((prev) => {
        let newDirection: 'asc' | 'desc' | null;
        if (prev.column !== columnName) {
          newDirection = 'asc';
        } else if (prev.direction === 'asc') {
          newDirection = 'desc';
        } else if (prev.direction === 'desc') {
          newDirection = null;
        } else {
          newDirection = 'asc';
        }

        const newState = { column: columnName, direction: newDirection };
        onSortChange?.(
          null,
          {
            scope: helpers.createScope({ column: columnName, direction: newDirection }, { scopeKey: 'sort', pathSuffix: 'sort' }),
          }
        );

        return newState;
      });
    },
    [columns, onSortChange, helpers]
  );

  const handleFilter = useCallback(
    (columnName: string, value: string, checked: boolean) => {
      setFilterState((prev) => {
        const newFilters = { ...prev };
        const currentFilters = newFilters[columnName] ?? new Set<string>();

        if (checked) {
          currentFilters.add(value);
        } else {
          currentFilters.delete(value);
        }

        if (currentFilters.size === 0) {
          delete newFilters[columnName];
        } else {
          newFilters[columnName] = currentFilters;
        }

        onFilterChange?.(
          null,
          {
            scope: helpers.createScope({ column: columnName, filters: Array.from(currentFilters) }, { scopeKey: 'filter', pathSuffix: 'filter' }),
          }
        );

        return newFilters;
      });
    },
    [onFilterChange, helpers]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (paginationOwnership === 'local') {
        setLocalCurrentPage(page);
      } else if (paginationOwnership === 'scope' && paginationStatePath) {
        renderScope.update(paginationStatePath, {
          currentPage: page,
          pageSize
        });
      }

      onPageChange?.(
        null,
        {
          scope: helpers.createScope({ page, pageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
        }
      );
    },
    [paginationOwnership, paginationStatePath, pageSize, onPageChange, helpers, renderScope]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      if (paginationOwnership === 'local') {
        setLocalPageSize(newPageSize);
        setLocalCurrentPage(1);
      } else if (paginationOwnership === 'scope' && paginationStatePath) {
        renderScope.update(paginationStatePath, {
          currentPage: 1,
          pageSize: newPageSize
        });
      }

      onPageChange?.(
        null,
        {
          scope: helpers.createScope({ page: 1, pageSize: newPageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
        }
      );
    },
    [paginationOwnership, paginationStatePath, onPageChange, helpers, renderScope]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const nextKeys = checked
        ? new Set(source.map((r) => String(r.id ?? '')))
        : new Set<string>();

      setAllSelected(checked);
      if (selectionOwnership === 'local') {
        setLocalSelectedRowKeys(nextKeys);
      } else if (selectionOwnership === 'scope' && selectionStatePath) {
        renderScope.update(selectionStatePath, Array.from(nextKeys));
      }

      onSelectionChange?.(
        null,
        {
          scope: helpers.createScope({ selectedRowKeys: Array.from(nextKeys) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
        }
      );

      if (selectionOwnership === 'controlled') {
        return;
      }
    },
    [selectionOwnership, selectionStatePath, source, onSelectionChange, helpers, renderScope]
  );

  const handleSelectRow = useCallback(
    (rowKey: string, checked: boolean) => {
      const baseSet = selectionOwnership === 'controlled' ? selectedRowKeys : localSelectedRowKeys;
      const newSet = new Set(baseSet);

      if (checked) {
        newSet.add(rowKey);
      } else {
        newSet.delete(rowKey);
      }

      if (selectionOwnership === 'local') {
        setLocalSelectedRowKeys(newSet);
      } else if (selectionOwnership === 'scope' && selectionStatePath) {
        renderScope.update(selectionStatePath, Array.from(newSet));
      }

      onSelectionChange?.(
        null,
        {
          scope: helpers.createScope({ selectedRowKeys: Array.from(newSet) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
        }
      );

      if (selectionOwnership === 'controlled') {
        return;
      }
    },
    [helpers, localSelectedRowKeys, onSelectionChange, renderScope, selectedRowKeys, selectionOwnership, selectionStatePath]
  );

  const handleToggleExpand = useCallback((rowKey: string) => {
    setExpandedRowKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  }, []);

  const processedData = useMemo(() => {
    let data = buildTableRowEntries(source, schemaProps.rowKey);
    warnOnDuplicateRowKeys(data);

    if (sortState.column && sortState.direction) {
      data.sort((a, b) => {
        const aVal = a.record[sortState.column];
        const bVal = b.record[sortState.column];
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortState.direction === 'asc' ? comparison : -comparison;
      });
    }

    Object.entries(filterState).forEach(([columnName, values]) => {
      if (values.size > 0) {
        data = data.filter((row) => values.has(String(row.record[columnName])));
      }
    });

    if (paginationEnabled) {
      const startIndex = (currentPage - 1) * pageSize;
      data = data.slice(startIndex, startIndex + pageSize);
    }

    return data.map((entry, viewIndex) => ({
      ...entry,
      viewIndex
    }));
  }, [source, schemaProps.rowKey, sortState, filterState, currentPage, pageSize, paginationEnabled]);

  const materializedRows = useMemo(() => {
    return processedData.map((entry) => {
      const payload = {
        record: entry.record,
        index: entry.sourceIndex
      };
        let rowScope = rowScopeCache.get(entry.rowKey);

        if (!rowScope) {
          rowScope = props.helpers.createScope(payload, {
            scopeKey: createRowScopeId(ownerKey, entry.rowKey),
            pathSuffix: createRowScopePath(props.path, entry.rowKey),
            isolate: true,
            source: 'row'
          });
          rowScopeCache.set(entry.rowKey, rowScope);
          rowScopeSnapshots.set(entry.rowKey, payload);
        }

      return {
        entry,
        rowScope,
        payload
      };
    });
  }, [processedData, ownerKey, props.helpers, props.path, rowScopeCache, rowScopeSnapshots]);

  useLayoutEffect(() => {
    const nextVisibleKeys = new Set<string>();

    for (const row of materializedRows) {
      nextVisibleKeys.add(row.entry.rowKey);
      const previous = rowScopeSnapshots.get(row.entry.rowKey);
      syncRowScope(row.rowScope, row.payload, previous);
      rowScopeSnapshots.set(row.entry.rowKey, row.payload);
    }

    for (const key of Array.from(rowScopeCache.keys())) {
      if (nextVisibleKeys.has(key)) {
        continue;
      }

      rowScopeCache.delete(key);
      rowScopeSnapshots.delete(key);
    }
  }, [materializedRows, rowScopeCache, rowScopeSnapshots]);

  const totalPages = useMemo(() => {
    if (!paginationEnabled) return 1;
    return Math.ceil(source.length / pageSize);
  }, [source.length, pageSize, paginationEnabled]);

  const tableHandle = useMemo<ComponentHandle>(() => ({
    id: props.id,
    type: 'table',
    capabilities: {
      invoke(method, payload, ctx) {
        switch (method) {
          case 'refresh': {
            if (onRefresh) {
              onRefresh(null, {
                scope: ctx.scope,
                actionScope: ctx.actionScope,
                componentRegistry: ctx.componentRegistry,
                form: ctx.form,
                page: ctx.page,
                node: ctx.node,
                nodeInstance: ctx.nodeInstance
              });
            } else {
              props.events.onPageChange?.(null, {
                scope: helpers.createScope({ page: currentPage, pageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
                actionScope: ctx.actionScope,
                componentRegistry: ctx.componentRegistry,
                form: ctx.form,
                page: ctx.page,
                node: ctx.node,
                nodeInstance: ctx.nodeInstance
              });
            }
            return { ok: true, data: { page: currentPage, pageSize } };
          }
          case 'getSelection': {
            return { ok: true, data: Array.from(selectedRowKeys) };
          }
          case 'setSelection': {
            const nextKeys = toSelectionPayload(payload);

            if (selectionOwnership === 'local') {
              setLocalSelectedRowKeys(nextKeys);
            } else if (selectionOwnership === 'scope' && selectionStatePath) {
              renderScope.update(selectionStatePath, Array.from(nextKeys));
            }

            onSelectionChange?.(
              null,
              {
                scope: helpers.createScope({ selectedRowKeys: Array.from(nextKeys) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
              }
            );

            return { ok: true, data: Array.from(nextKeys) };
          }
          default:
            return { ok: false, error: new Error(`Unsupported table handle method: ${method}`) };
        }
      },
      hasMethod(method) {
        return method === 'refresh' || method === 'getSelection' || method === 'setSelection';
      },
      listMethods() {
        return ['refresh', 'getSelection', 'setSelection'];
      },
      getDebugData() {
        return {
          paginationOwnership,
          selectionOwnership,
          paginationStatePath,
          selectionStatePath,
          currentPage,
          pageSize,
          selectedRowKeys: Array.from(selectedRowKeys)
        };
      },
      store: undefined
    }
  }), [props.id, props.events, helpers, currentPage, pageSize, selectedRowKeys, selectionOwnership, selectionStatePath, onSelectionChange, paginationOwnership, paginationStatePath, onRefresh, renderScope]);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    return componentRegistry.register(tableHandle, {
      cid: props.meta.cid,
      locator: props.nodeInstance.locator
    });
  }, [componentRegistry, tableHandle, props.meta.cid, props.nodeInstance.locator]);

  return (
    <div className="nop-table-wrap grid gap-4" data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(headerContent) ? <div data-slot="table-header-region">{headerContent}</div> : null}

      <div className="relative" data-slot="table-container">
        <Table
          className="nop-table"
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
                const labelContent = labelRegion?.render({ pathSuffix: `columns.${index}.label` }) ?? column.label ?? column.name;
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
                            <ArrowUpDownIcon className={`inline ml-1 size-3 ${currentSort ? 'text-primary' : 'text-muted-foreground'}`} />
                          )}
                        </span>

                        {isFilterable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  className={`h-6 w-6 rounded hover:bg-accent ${activeFilters.size > 0 ? 'text-primary' : 'text-muted-foreground'}`}
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
              materializedRows.map(({ entry, rowScope }) => {
                const rowKey = entry.rowKey;
                const rowInstancePath = [
                  ...(props.nodeInstance.locator.instancePath ?? []),
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
                              void props.events.onRowClick?.(event, {
                                scope: rowScope,
                              })
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
                                      scope: rowScope,
                                      instancePath: rowInstancePath,
                                      pathSuffix: `buttons.${columnIndex}`,
                                    })
                                  : (column.buttons ?? []).map((button, buttonIndex) => (
                                      <div key={`btn-${buttonIndex}`}>
                                        {props.helpers.render(button, {
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
                                scope: rowScope,
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
                          {props.regions[schemaProps.expandable.expandedRowRegionKey]?.render({
                            scope: rowScope,
                            instancePath: rowInstancePath,
                            pathSuffix: `expanded.${rowKey}`,
                          })}
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
