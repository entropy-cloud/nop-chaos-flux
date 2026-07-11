import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useRendererRuntime,
  useSchemaProps,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Table,
  TableBody,
  TableFooter,
  TableHeader,
  cn,
} from '@nop-chaos/ui';
import type { TableColumnSchema, TableSchema } from './schemas.js';
import {
  createTableRowRepeatedTemplateId,
  paginateTableData,
  processTableData,
  serializeInstancePath,
} from './table-renderer/table-data.js';
import { TableBodyRows } from './table-renderer/table-body-rows.js';
import { createFixedColumnLayout } from './table-renderer/fixed-columns.js';
import { TableHeaderRow } from './table-renderer/table-header-row.js';
import { TableSummaryRowView } from './table-renderer/table-summary-row.js';
import { TableLoadingOverlay } from './table-renderer/table-loading-overlay.js';
import { TablePaginationBar } from './table-renderer/table-pagination-bar.js';
import {
  useTablePagination,
  useTableSelection,
  useTableSort,
  useTableFilter,
  useTableExpand,
  useTableVisibleColumns,
} from './table-renderer/use-table-controls.js';
import { useTableHandle } from './table-renderer/use-table-handle.js';
import { useTableRowScopeCache } from './table-renderer/use-table-row-scope-cache.js';
import { useColumnResize } from './table-renderer/use-column-resize.js';
import { useTableTree } from './table-renderer/use-table-tree.js';
import { useRowDragSort } from './table-renderer/use-row-drag-sort.js';
import { useAutoFillHeight } from './table-renderer/use-auto-fill-height.js';
import { extractLeafColumns, hasNestedColumns } from './table-renderer/table-header-tree.js';
import type { TableResponsiveConfig } from './schemas.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const EMPTY_TABLE_COLUMNS: TableColumnSchema[] = [];
const EMPTY_TABLE_ROWS: Array<Record<string, any>> = [];
const RESPONSIVE_BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
} as const;

function resolveResponsiveBreakpoint(breakpoint: TableResponsiveConfig['breakpoint']) {
  if (typeof breakpoint === 'number' && Number.isFinite(breakpoint) && breakpoint > 0) {
    return breakpoint;
  }

  if (typeof breakpoint === 'string') {
    return (
      RESPONSIVE_BREAKPOINTS[breakpoint as keyof typeof RESPONSIVE_BREAKPOINTS] ??
      RESPONSIVE_BREAKPOINTS.md
    );
  }

  return RESPONSIVE_BREAKPOINTS.md;
}

function splitResponsiveColumns(columns: TableColumnSchema[]) {
  const leftFixedColumns = columns.filter((column) => column.fixed === 'left');
  const rightFixedColumns = columns.filter((column) => column.fixed === 'right');
  const nonFixedColumns = columns.filter(
    (column) => column.fixed !== 'left' && column.fixed !== 'right',
  );
  const primaryColumn = nonFixedColumns[0];
  const primaryColumnNames = new Set<string>();

  leftFixedColumns.forEach((column, index) => {
    primaryColumnNames.add(column.name ?? `left-${index}`);
  });

  rightFixedColumns.forEach((column, index) => {
    primaryColumnNames.add(column.name ?? `right-${index}`);
  });

  if (primaryColumn) {
    primaryColumnNames.add(primaryColumn.name ?? '__primary__');
  }

  const primaryColumns = columns.filter((column, index) =>
    primaryColumnNames.has(
      column.name ??
        (column.fixed === 'left'
          ? `left-${index}`
          : column.fixed === 'right'
            ? `right-${index}`
            : '__primary__'),
    ),
  );
  const hiddenColumns = columns.filter((column) => !primaryColumns.includes(column));

  return {
    primaryColumns: primaryColumns.length > 0 ? primaryColumns : columns.slice(0, 1),
    hiddenColumns,
  };
}

function useIsBelowResponsiveBreakpoint(breakpoint: number) {
  const [isBelow, setIsBelow] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const update = () => {
      setIsBelow(window.innerWidth < breakpoint);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);

  return isBelow;
}

function createTableOwnerKey(
  props: RendererComponentProps<TableSchema>,
  runtimeId: string,
): string {
  return `${runtimeId}:${props.node.scope.id}:${props.node.templateNode.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.node.instancePath)}`;
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const runtime = useRendererRuntime();
  const schemaProps = useSchemaProps(props);
  const tableSchemaProps = schemaProps as TableSchema;
  const columns = Array.isArray(schemaProps.columns) ? schemaProps.columns : EMPTY_TABLE_COLUMNS;
  const source = Array.isArray(schemaProps.source)
    ? (schemaProps.source as Array<Record<string, any>>)
    : EMPTY_TABLE_ROWS;
  const helpers = props.helpers;
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const paginationStatePath =
    typeof schemaProps.paginationStatePath === 'string'
      ? schemaProps.paginationStatePath
      : undefined;
  const selectionStatePath =
    typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;

  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.table.noData'),
  });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const renderedLoadingContent = props.regions.loading?.render();
  const loadingContent = hasRendererSlotContent(asReactNode(renderedLoadingContent))
    ? asReactNode(renderedLoadingContent)
    : asReactNode(props.props.loadingContent);

  const templateNodeId = props.node.templateNode.templateNodeId;
  const ownerKey = createTableOwnerKey(props, runtime.runtimeId);
  const rowRepeatedTemplateId = useMemo(
    () => createTableRowRepeatedTemplateId(templateNodeId),
    [templateNodeId],
  );

  const {
    columnSettingsEnabled,
    visibleColumns,
    orderedColumns,
    tableColumns,
    toggleColumn,
    moveColumn,
  } = useTableVisibleColumns(tableSchemaProps, columns);
  const [inlineColumnSettingsOpen, setInlineColumnSettingsOpen] = useState(false);
  const { paginationEnabled, serverPaged, currentPage, pageSize, handlePageChange, handlePageSizeChange, clampPage } =
    useTablePagination(tableSchemaProps, props.events.onPageChange, helpers);
  const { sortState, sortEntries, handleSort } = useTableSort(
    tableSchemaProps,
    props.events.onSortChange,
    tableColumns,
    helpers,
  );
  const { filterState, handleFilter, handleSearch, clearFilters } = useTableFilter(
    tableSchemaProps,
    props.events.onFilterChange,
    helpers,
    (nextFilterState) => {
      if (tableSchemaProps.paginationOwnership === 'controlled') {
        return;
      }

      const nextFilteredRows = processTableData(source, schemaProps.rowKey, sortState, nextFilterState);
      clampPage(currentPage, nextFilteredRows.length);
    },
  );
  const { expandedRowKeys, handleToggleExpand } = useTableExpand(tableSchemaProps);

  const responsiveBreakpoint = resolveResponsiveBreakpoint(schemaProps.responsive?.breakpoint);
  const isBelowResponsiveBreakpoint = useIsBelowResponsiveBreakpoint(responsiveBreakpoint);
  const responsiveExpandActive =
    schemaProps.responsive?.mode === 'expand' && isBelowResponsiveBreakpoint;
  const responsiveColumns = useMemo(() => splitResponsiveColumns(tableColumns), [tableColumns]);
  const mainColumns = responsiveExpandActive ? responsiveColumns.primaryColumns : tableColumns;
  const responsiveHiddenColumns = responsiveExpandActive
    ? responsiveColumns.hiddenColumns
    : EMPTY_TABLE_COLUMNS;
  const nestedHeadersActive = !responsiveExpandActive && hasNestedColumns(mainColumns);
  const leafBodyColumns = useMemo(
    () => (nestedHeadersActive ? extractLeafColumns(mainColumns) : mainColumns),
    [mainColumns, nestedHeadersActive],
  );
  const showExpandColumn = Boolean(schemaProps.expandable) || responsiveHiddenColumns.length > 0;
  const expandRowByClick =
    schemaProps.expandable?.expandRowByClick === true ||
    (responsiveExpandActive && schemaProps.responsive?.expandTrigger === 'row');

  const filteredData = useMemo(
    () => processTableData(source, schemaProps.rowKey, sortEntries.length > 0 ? sortEntries : sortState, filterState),
    [source, schemaProps.rowKey, sortState, sortEntries, filterState],
  );
  // Flatten the tree BEFORE building selection so selection's row-key set covers
  // expanded nested children (G2). Previously selection consumed the top-level
  // filteredData, so currentRowKeySet lacked child keys and the render-time
  // prune snapped a just-checked child back to unchecked. In non-tree mode
  // useTableTree returns its input unchanged, so this is a no-op for flat tables.
  const {
    treeMode,
    treeRows: treeFlattenedData,
    expandedTreeRowKeys,
    handleToggleTreeExpand,
  } = useTableTree(tableSchemaProps, filteredData);
  const {
    selectedRowKeys,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    setSelectionExternal,
    isRowCheckable,
    isAtMaxSelection,
  } = useTableSelection(tableSchemaProps, treeFlattenedData, props.events.onSelectionChange, helpers);

  const paginationTotal = schemaProps.pagination?.total;
  const effectiveTotalRows =
    serverPaged && typeof paginationTotal === 'number' && Number.isFinite(paginationTotal)
      ? paginationTotal
      : treeFlattenedData.length;

  const totalPages = useMemo(() => {
    if (!paginationEnabled) return 1;
    return Math.max(1, Math.ceil(effectiveTotalRows / pageSize));
  }, [effectiveTotalRows, pageSize, paginationEnabled]);

  // Render-time currentPage clamp mirrors list-pagination
  // (currentPage = enabled ? clampPage(resolvedPage, totalPages) : 1). This prevents an
  // empty page when the source shrinks below (currentPage-1)*pageSize (delete / bulk action).
  // It is a pure render-time derivation; it does NOT write back scope/local state, so external
  // readers ($crud.pagination.currentPage) still observe the owner value.
  const resolvedCurrentPage = paginationEnabled
    ? Math.min(Math.max(1, currentPage), totalPages)
    : 1;

  const processedData = useMemo(
    () => paginateTableData(treeFlattenedData, paginationEnabled && !serverPaged, resolvedCurrentPage, pageSize),
    [treeFlattenedData, paginationEnabled, serverPaged, resolvedCurrentPage, pageSize],
  );
  // H10: `createFixedColumnLayout` only reads `schemaProps.rowSelection` + the
  // columns' `fixed`/`width` + `showExpandColumn`. Memoizing on those specific
  // values (instead of the whole `tableSchemaProps`, whose identity churns every
  // render) keeps `fixedColumnLayout` referentially stable across renders, so the
  // row memo is not busted by pure identity churn and rows never render with a
  // stale layout object. A genuine layout change still forces a row re-render
  // because all content inputs are covered by the row comparator (columns via
  // areColumnsRenderEquivalent, rowSelection, showExpandColumn).
  const fixedColumnLayout = useMemo(
    () => createFixedColumnLayout({ rowSelection: tableSchemaProps.rowSelection }, mainColumns, showExpandColumn),
    [mainColumns, tableSchemaProps.rowSelection, showExpandColumn],
  );

  const columnResizeEnabled = schemaProps.columnResize !== false;
  const resizeApi = useColumnResize(
    nestedHeadersActive ? leafBodyColumns : tableColumns,
    schemaProps.columnResize,
    {
      columnWidthsOwnership: schemaProps.columnWidthsOwnership,
      columnWidthsStatePath: schemaProps.columnWidthsStatePath,
    },
  );
  const effectiveMainColumns = useMemo(() => {
    const baseColumns = nestedHeadersActive ? leafBodyColumns : mainColumns;
    if (
      !columnResizeEnabled ||
      Object.keys(resizeApi.widths).length === 0 ||
      baseColumns !== (nestedHeadersActive ? leafBodyColumns : mainColumns)
    ) {
      return baseColumns;
    }

    let changed = false;
    const next = baseColumns.map((column, index) => {
      const key = column.name ?? `column-${index}`;
      const override = resizeApi.widths[key];
      if (override === undefined || override === column.width) {
        return column;
      }
      changed = true;
      return { ...column, width: override };
    });
    return changed ? next : baseColumns;
  }, [columnResizeEnabled, leafBodyColumns, mainColumns, nestedHeadersActive, resizeApi.widths]);

  const rowDragSortApi = useRowDragSort({
    enabled: schemaProps.draggable === true,
    orderField: schemaProps.orderField,
    statePath: schemaProps.orderStatePath,
    ownership: schemaProps.orderOwnership ?? 'local',
    rows: processedData,
  });

  // When drag-sort is active under local ownership, apply the reordered rows to the
  // rendered body (and the row-scope cache) so the new order is visible and persists
  // across re-renders instead of resetting on the next render (P0-1).
  const displayData = rowDragSortApi ? rowDragSortApi.orderedRows : processedData;

  const rowScopeCache = useTableRowScopeCache(displayData, ownerKey, helpers, props.path);

  useTableHandle(
    props,
    resolvedCurrentPage,
    pageSize,
    selectedRowKeys,
    selectionOwnership,
    selectionStatePath,
    paginationOwnership,
    paginationStatePath,
    setSelectionExternal,
  );

  const isLoading = schemaProps.loading === true;
  const isStriped = schemaProps.stripe === true;
  const isBordered = schemaProps.bordered === true;
  const columnCount =
    (nestedHeadersActive ? leafBodyColumns : mainColumns).length +
    (schemaProps.rowSelection ? 1 : 0) +
    (showExpandColumn ? 1 : 0) +
    (schemaProps.draggable ? 1 : 0);
  const columnSettingsOverlay = schemaProps.columnSettings?.overlay !== false;
  const columnSettingsAlignmentClass =
    schemaProps.columnSettings?.align === 'left' ? 'items-start' : 'items-end';
  const columnSettingsColumnsByKey = useMemo(
    () => new Map(columns.map((column, index) => [column.name ?? `column-${index}`, column] as const)),
    [columns],
  );
  const visibleColumnKeys = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const orderedColumnKeyToIndex = useMemo(
    () => new Map(orderedColumns.map((key, index) => [key, index] as const)),
    [orderedColumns],
  );
  const columnSettingsItems = useMemo(
    () =>
      orderedColumns.flatMap((key) => {
        const orderedIndex = orderedColumnKeyToIndex.get(key);
        const column = columnSettingsColumnsByKey.get(key);

        if (!column || orderedIndex == null) {
          return [];
        }

        return [
          {
            key,
            column,
            orderedIndex,
            label: typeof column.label === 'string' ? column.label : (column.name ?? key),
            visible: visibleColumnKeys.has(key),
          },
        ];
      }),
    [columnSettingsColumnsByKey, orderedColumnKeyToIndex, orderedColumns, visibleColumnKeys],
  );

  const virtualThreshold = schemaProps.virtualThreshold;
  const scrollHeight = schemaProps.scrollHeight;
  const virtualEnabled =
    !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold;

  const autoFill = useAutoFillHeight(schemaProps.autoFillHeight, isLoading);
  const autoFillActive = schemaProps.autoFillHeight !== undefined && schemaProps.autoFillHeight !== false;

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn('nop-table', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-responsive-expand={responsiveExpandActive ? 'true' : undefined}
    >
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="table-header-region">{asReactNode(headerContent)}</div>
      ) : null}
      {columnSettingsEnabled ? (
        <div
          className={cn('mb-2 flex flex-col', columnSettingsAlignmentClass)}
          data-slot="table-column-settings"
        >
          {columnSettingsOverlay ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    {t('flux.table.columns')}
                  </Button>
                }
              />
              <DropdownMenuContent>
                {columnSettingsItems.map(({ key, label, orderedIndex, visible }) => {
                  return (
                    <div key={key} data-slot="table-column-settings-item">
                      <DropdownMenuCheckboxItem
                        checked={visible}
                        onCheckedChange={(checked) => toggleColumn(key, checked)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                      <div
                        className="flex gap-1 px-1.5 pb-1"
                        data-slot="table-column-settings-actions"
                      >
                        <DropdownMenuItem
                          aria-label={`${t('flux.table.moveUp')} ${label}`}
                          disabled={orderedIndex === 0}
                          onClick={() => moveColumn(key, 'up')}
                        >
                          {t('flux.table.moveUp')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          aria-label={`${t('flux.table.moveDown')} ${label}`}
                          disabled={orderedIndex === orderedColumns.length - 1}
                          onClick={() => moveColumn(key, 'down')}
                        >
                          {t('flux.table.moveDown')}
                        </DropdownMenuItem>
                      </div>
                      {orderedIndex < orderedColumns.length - 1 ? <DropdownMenuSeparator /> : null}
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInlineColumnSettingsOpen((value) => !value)}
              >
                {t('flux.table.columns')}
              </Button>
              {inlineColumnSettingsOpen ? (
                <div
                  className="mt-2 w-full max-w-sm rounded-md border bg-popover p-2 shadow-sm"
                  data-slot="table-column-settings-inline"
                >
                  {columnSettingsItems.map(({ key, label, orderedIndex, visible }) => {
                    const checkboxId = `table-column-settings-${props.id}-${key}`;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-2 py-1.5"
                        data-slot="table-column-settings-item"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={checkboxId}
                            checked={visible}
                            onCheckedChange={(checked) => toggleColumn(key, Boolean(checked))}
                          />
                          <Label htmlFor={checkboxId}>{label}</Label>
                        </div>
                        <div className="flex gap-1" data-slot="table-column-settings-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`${t('flux.table.moveUp')} ${label}`}
                            disabled={orderedIndex === 0}
                            onClick={() => moveColumn(key, 'up')}
                          >
                            {t('flux.table.moveUp')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`${t('flux.table.moveDown')} ${label}`}
                            disabled={orderedIndex === orderedColumns.length - 1}
                            onClick={() => moveColumn(key, 'down')}
                          >
                            {t('flux.table.moveDown')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div
        ref={autoFillActive ? autoFill.containerRef : virtualEnabled ? scrollRef : undefined}
        className={cn(
          autoFillActive
            ? 'overflow-auto'
            : virtualEnabled
              ? 'overflow-auto'
              : 'relative',
          fixedColumnLayout.hasStickyColumns ? 'overflow-x-auto' : undefined,
        )}
        style={
          autoFillActive
            ? autoFill.heightStyle
            : virtualEnabled && scrollHeight
              ? { maxHeight: scrollHeight }
              : undefined
        }
        data-slot="table-container"
        data-auto-fill-height={autoFillActive ? 'true' : undefined}
      >
        <Table data-striped={isStriped || undefined} data-bordered={isBordered || undefined}>
          <TableHeader data-slot="table-header">
            <TableHeaderRow
              props={props}
              columns={mainColumns}
              sourceLength={filteredData.length}
              sortState={sortState}
              sortEntries={sortEntries}
              multiSort={schemaProps.multiSort}
              filterState={filterState}
              allSelected={allSelected}
              selectedRowCount={selectedRowKeys.size}
              fixedColumnLayout={fixedColumnLayout}
              showExpandColumn={showExpandColumn}
              onSort={handleSort}
              onFilter={handleFilter}
              onSearch={handleSearch}
              onClearFilters={clearFilters}
              onSelectAll={handleSelectAll}
              selectAllDisabled={isAtMaxSelection && !allSelected}
              columnResize={schemaProps.columnResize}
              resizeApi={resizeApi}
              affixHeader={schemaProps.affixHeader}
            />
          </TableHeader>

          {schemaProps.prefixRow ? (
            <TableBody>
              <TableSummaryRowView
                row={schemaProps.prefixRow}
                variant="prefix"
                columns={effectiveMainColumns}
                showExpandColumn={showExpandColumn}
                hasSelection={Boolean(schemaProps.rowSelection)}
                fixedColumnLayout={fixedColumnLayout}
                parentProps={props}
              />
            </TableBody>
          ) : null}

          <TableBodyRows
            props={props}
            columns={effectiveMainColumns}
            processedData={displayData}
            rowScopeCache={rowScopeCache}
            rowRepeatedTemplateId={rowRepeatedTemplateId}
            expandedRowKeys={expandedRowKeys}
            selectedRowKeys={selectedRowKeys}
            columnCount={columnCount}
            isStriped={isStriped}
            fixedColumnLayout={fixedColumnLayout}
            emptyContent={emptyContent}
            responsiveHiddenColumns={responsiveHiddenColumns}
            showExpandColumn={showExpandColumn}
            expandRowByClick={expandRowByClick}
            onToggleExpand={handleToggleExpand}
            onSelectRow={handleSelectRow}
            isRowCheckable={isRowCheckable}
            isAtMaxSelection={isAtMaxSelection}
            virtualEnabled={virtualEnabled}
            scrollRef={scrollRef}
            combineNum={schemaProps.combineNum}
            treeMode={treeMode}
            expandedTreeRowKeys={expandedTreeRowKeys}
            onToggleTreeExpand={handleToggleTreeExpand}
            rowDragSortApi={rowDragSortApi}
            draggable={schemaProps.draggable === true}
          />

          {schemaProps.affixRow ? (
            <TableFooter data-slot="table-footer-row">
              <TableSummaryRowView
                row={schemaProps.affixRow}
                variant="affix"
                columns={effectiveMainColumns}
                showExpandColumn={showExpandColumn}
                hasSelection={Boolean(schemaProps.rowSelection)}
                fixedColumnLayout={fixedColumnLayout}
                parentProps={props}
              />
            </TableFooter>
          ) : null}
        </Table>

        {isLoading ? <TableLoadingOverlay loadingContent={loadingContent} /> : null}
      </div>

      {paginationEnabled && treeFlattenedData.length > 0 ? (
        <TablePaginationBar
          currentPage={resolvedCurrentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalRows={effectiveTotalRows}
          pageSizeOptions={schemaProps.pagination?.pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}

      {hasRendererSlotContent(footerContent) ? (
        <div data-slot="table-footer">{asReactNode(footerContent)}</div>
      ) : null}
    </div>
  );
}
