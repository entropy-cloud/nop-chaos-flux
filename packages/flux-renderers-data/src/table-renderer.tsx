import { useMemo, useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useSchemaProps } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Table, TableHeader, cn } from '@nop-chaos/ui';
import type { TableColumnSchema, TableSchema } from './schemas';
import { createTableRowRepeatedTemplateId, processTableData, serializeInstancePath } from './table-renderer/table-data';
import { TableBodyRows } from './table-renderer/table-body-rows';
import { createFixedColumnLayout } from './table-renderer/fixed-columns';
import { TableHeaderRow } from './table-renderer/table-header-row';
import { TableLoadingOverlay } from './table-renderer/table-loading-overlay';
import { TablePaginationBar } from './table-renderer/table-pagination-bar';
import { useTablePagination, useTableSelection, useTableSort, useTableFilter, useTableExpand, useTableVisibleColumns } from './table-renderer/use-table-controls';
import { useTableHandle } from './table-renderer/use-table-handle';
import { useTableRowScopeCache } from './table-renderer/use-table-row-scope-cache';

const EMPTY_TABLE_COLUMNS: TableColumnSchema[] = [];
const EMPTY_TABLE_ROWS: Array<Record<string, any>> = [];

function createTableOwnerKey(props: RendererComponentProps<TableSchema>): string {
  return `${props.node.templateNode.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.node.instancePath)}`;
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const schemaProps = useSchemaProps(props);
  const columns = Array.isArray(schemaProps.columns) ? schemaProps.columns : EMPTY_TABLE_COLUMNS;
  const source = Array.isArray(schemaProps.source) ? (schemaProps.source as Array<Record<string, any>>) : EMPTY_TABLE_ROWS;
  const helpers = props.helpers;
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const paginationStatePath = typeof schemaProps.paginationStatePath === 'string' ? schemaProps.paginationStatePath : undefined;
  const selectionStatePath = typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;

  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: t('flux.table.noData') });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const loadingContent = resolveRendererSlotContent(props, 'loadingSlot');

  const templateNodeId = props.node.templateNode.templateNodeId;
  const ownerKey = createTableOwnerKey(props);
  const rowRepeatedTemplateId = useMemo(() => createTableRowRepeatedTemplateId(templateNodeId), [templateNodeId]);

  const { columnSettingsEnabled, visibleColumns, orderedColumns, tableColumns, toggleColumn, moveColumn } = useTableVisibleColumns(schemaProps, columns);
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
  const { sortState, handleSort } = useTableSort(schemaProps, props.events.onSortChange, tableColumns, helpers);
  const { filterState, handleFilter, handleSearch } = useTableFilter(schemaProps, props.events.onFilterChange, helpers);
  const { expandedRowKeys, handleToggleExpand } = useTableExpand(schemaProps);

  const processedData = useMemo(
    () => processTableData(source, schemaProps.rowKey, sortState, filterState, paginationEnabled, currentPage, pageSize),
    [source, schemaProps.rowKey, sortState, filterState, paginationEnabled, currentPage, pageSize]
  );
  const fixedColumnLayout = useMemo(() => createFixedColumnLayout(schemaProps, tableColumns), [schemaProps, tableColumns]);

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
  const columnCount = tableColumns.length + (schemaProps.rowSelection ? 1 : 0) + (schemaProps.expandable ? 1 : 0);

  const virtualThreshold = schemaProps.virtualThreshold;
  const scrollHeight = schemaProps.scrollHeight;
  const virtualEnabled = !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold;

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn('nop-table', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(headerContent) ? <div data-slot="table-header-region">{headerContent}</div> : null}
      {columnSettingsEnabled ? (
        <div className="mb-2 flex justify-end" data-slot="table-column-settings">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm">{t('flux.editor.columns')}</Button>}
            />
            <DropdownMenuContent>
              {orderedColumns.map((key) => {
                const columnIndex = columns.findIndex((column, index) => (column.name ?? `column-${index}`) === key);
                if (columnIndex < 0) {
                  return null;
                }

                const column = columns[columnIndex];
                const label = typeof column.label === 'string' ? column.label : column.name ?? key;
                const orderedIndex = orderedColumns.indexOf(key);
                return (
                  <div key={key} data-slot="table-column-settings-item">
                    <DropdownMenuCheckboxItem checked={visibleColumns.includes(key)} onCheckedChange={(checked) => toggleColumn(key, checked)}>
                      {label}
                    </DropdownMenuCheckboxItem>
                    <div className="flex gap-1 px-1.5 pb-1" data-slot="table-column-settings-actions">
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
        </div>
      ) : null}

      <div
        ref={virtualEnabled ? scrollRef : undefined}
        className={cn(virtualEnabled ? 'overflow-auto' : 'relative', fixedColumnLayout.hasStickyColumns ? 'overflow-x-auto' : undefined)}
        style={virtualEnabled && scrollHeight ? { maxHeight: scrollHeight } : undefined}
        data-slot="table-container"
      >
        <Table data-striped={isStriped || undefined} data-bordered={isBordered || undefined}>
          <TableHeader data-slot="table-header">
            <TableHeaderRow
              props={props}
              columns={tableColumns}
              sourceLength={source.length}
              sortState={sortState}
              filterState={filterState}
              allSelected={allSelected}
              selectedRowCount={selectedRowKeys.size}
              fixedColumnLayout={fixedColumnLayout}
              onSort={handleSort}
              onFilter={handleFilter}
              onSearch={handleSearch}
              onSelectAll={handleSelectAll}
            />
          </TableHeader>

          <TableBodyRows
            props={props}
            columns={tableColumns}
            processedData={processedData}
            rowScopeCache={rowScopeCache}
            rowRepeatedTemplateId={rowRepeatedTemplateId}
            expandedRowKeys={expandedRowKeys}
            selectedRowKeys={selectedRowKeys}
            columnCount={columnCount}
            isStriped={isStriped}
            fixedColumnLayout={fixedColumnLayout}
            emptyContent={emptyContent}
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

      {hasRendererSlotContent(footerContent) ? <div data-slot="table-footer">{footerContent}</div> : null}
    </div>
  );
}
