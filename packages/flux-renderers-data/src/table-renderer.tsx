import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
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
  TableHeader,
  cn,
} from '@nop-chaos/ui';
import type { TableColumnSchema, TableSchema } from './schemas';
import {
  createTableRowRepeatedTemplateId,
  processTableData,
  serializeInstancePath,
} from './table-renderer/table-data';
import { TableBodyRows } from './table-renderer/table-body-rows';
import { createFixedColumnLayout } from './table-renderer/fixed-columns';
import { TableHeaderRow } from './table-renderer/table-header-row';
import { TableLoadingOverlay } from './table-renderer/table-loading-overlay';
import { TablePaginationBar } from './table-renderer/table-pagination-bar';
import {
  useTablePagination,
  useTableSelection,
  useTableSort,
  useTableFilter,
  useTableExpand,
  useTableVisibleColumns,
} from './table-renderer/use-table-controls';
import { useTableHandle } from './table-renderer/use-table-handle';
import { useTableRowScopeCache } from './table-renderer/use-table-row-scope-cache';
import type { TableResponsiveConfig } from './schemas';

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

function createTableOwnerKey(props: RendererComponentProps<TableSchema>): string {
  return `${props.node.templateNode.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.node.instancePath)}`;
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const schemaProps = useSchemaProps(props);
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
  const loadingContent = resolveRendererSlotContent(props, 'loadingSlot');

  const templateNodeId = props.node.templateNode.templateNodeId;
  const ownerKey = createTableOwnerKey(props);
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
  } = useTableVisibleColumns(schemaProps, columns);
  const [inlineColumnSettingsOpen, setInlineColumnSettingsOpen] = useState(false);
  const { paginationEnabled, currentPage, pageSize, handlePageChange, handlePageSizeChange } =
    useTablePagination(schemaProps, props.events.onPageChange, helpers);
  const { selectedRowKeys, allSelected, handleSelectAll, handleSelectRow, setSelectionExternal } =
    useTableSelection(schemaProps, source, props.events.onSelectionChange, helpers);
  const { sortState, handleSort } = useTableSort(
    schemaProps,
    props.events.onSortChange,
    tableColumns,
    helpers,
  );
  const { filterState, handleFilter, handleSearch, clearFilters } = useTableFilter(
    schemaProps,
    props.events.onFilterChange,
    helpers,
  );
  const { expandedRowKeys, handleToggleExpand } = useTableExpand(schemaProps);

  const responsiveBreakpoint = resolveResponsiveBreakpoint(schemaProps.responsive?.breakpoint);
  const isBelowResponsiveBreakpoint = useIsBelowResponsiveBreakpoint(responsiveBreakpoint);
  const responsiveExpandActive =
    schemaProps.responsive?.mode === 'expand' && isBelowResponsiveBreakpoint;
  const responsiveColumns = useMemo(() => splitResponsiveColumns(tableColumns), [tableColumns]);
  const mainColumns = responsiveExpandActive ? responsiveColumns.primaryColumns : tableColumns;
  const responsiveHiddenColumns = responsiveExpandActive
    ? responsiveColumns.hiddenColumns
    : EMPTY_TABLE_COLUMNS;
  const showExpandColumn = Boolean(schemaProps.expandable) || responsiveHiddenColumns.length > 0;
  const expandRowByClick =
    schemaProps.expandable?.expandRowByClick === true ||
    (responsiveExpandActive && schemaProps.responsive?.expandTrigger === 'row');

  const processedData = useMemo(
    () =>
      processTableData(
        source,
        schemaProps.rowKey,
        sortState,
        filterState,
        paginationEnabled,
        currentPage,
        pageSize,
      ),
    [source, schemaProps.rowKey, sortState, filterState, paginationEnabled, currentPage, pageSize],
  );
  const fixedColumnLayout = useMemo(
    () => createFixedColumnLayout(schemaProps, mainColumns, showExpandColumn),
    [schemaProps, mainColumns, showExpandColumn],
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
    setSelectionExternal,
  );

  const totalPages = useMemo(() => {
    if (!paginationEnabled) return 1;
    return Math.ceil(source.length / pageSize);
  }, [source.length, pageSize, paginationEnabled]);

  const isLoading = schemaProps.loading === true;
  const isStriped = schemaProps.stripe === true;
  const isBordered = schemaProps.bordered === true;
  const columnCount =
    mainColumns.length + (schemaProps.rowSelection ? 1 : 0) + (showExpandColumn ? 1 : 0);
  const columnSettingsOverlay = schemaProps.columnSettings?.overlay !== false;
  const columnSettingsAlignmentClass =
    schemaProps.columnSettings?.align === 'left' ? 'items-start' : 'items-end';

  const virtualThreshold = schemaProps.virtualThreshold;
  const scrollHeight = schemaProps.scrollHeight;
  const virtualEnabled =
    !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold;

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn('nop-table', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="table-header-region">{headerContent}</div>
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
                {orderedColumns.map((key) => {
                  const columnIndex = columns.findIndex(
                    (column, index) => (column.name ?? `column-${index}`) === key,
                  );
                  if (columnIndex < 0) {
                    return null;
                  }

                  const column = columns[columnIndex];
                  const label =
                    typeof column.label === 'string' ? column.label : (column.name ?? key);
                  const orderedIndex = orderedColumns.indexOf(key);
                  return (
                    <div key={key} data-slot="table-column-settings-item">
                      <DropdownMenuCheckboxItem
                        checked={visibleColumns.includes(key)}
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
                  {orderedColumns.map((key) => {
                    const columnIndex = columns.findIndex(
                      (column, index) => (column.name ?? `column-${index}`) === key,
                    );
                    if (columnIndex < 0) {
                      return null;
                    }

                    const column = columns[columnIndex];
                    const label =
                      typeof column.label === 'string' ? column.label : (column.name ?? key);
                    const orderedIndex = orderedColumns.indexOf(key);
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
                            checked={visibleColumns.includes(key)}
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
        ref={virtualEnabled ? scrollRef : undefined}
        className={cn(
          virtualEnabled ? 'overflow-auto' : 'relative',
          fixedColumnLayout.hasStickyColumns ? 'overflow-x-auto' : undefined,
        )}
        style={virtualEnabled && scrollHeight ? { maxHeight: scrollHeight } : undefined}
        data-slot="table-container"
      >
        <Table data-striped={isStriped || undefined} data-bordered={isBordered || undefined}>
          <TableHeader data-slot="table-header">
            <TableHeaderRow
              props={props}
              columns={mainColumns}
              sourceLength={source.length}
              sortState={sortState}
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
            />
          </TableHeader>

          <TableBodyRows
            props={props}
            columns={mainColumns}
            processedData={processedData}
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
            virtualEnabled={virtualEnabled}
            scrollRef={scrollRef}
          />
        </Table>

        {isLoading ? <TableLoadingOverlay loadingContent={loadingContent} /> : null}
      </div>

      {paginationEnabled && source.length > 0 ? (
        <TablePaginationBar
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalRows={source.length}
          pageSizeOptions={schemaProps.pagination?.pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}

      {hasRendererSlotContent(footerContent) ? (
        <div data-slot="table-footer">{footerContent}</div>
      ) : null}
    </div>
  );
}
