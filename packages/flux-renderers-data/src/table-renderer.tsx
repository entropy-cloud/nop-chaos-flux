import { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useSchemaProps } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Table, TableHeader, cn } from '@nop-chaos/ui';
import type { TableColumnSchema, TableSchema } from './schemas';
import { createTableRowRepeatedTemplateId, processTableData, serializeInstancePath } from './table-renderer/table-data';
import { TableBodyRows } from './table-renderer/TableBodyRows';
import { TableHeaderRow } from './table-renderer/TableHeaderRow';
import { TableLoadingOverlay } from './table-renderer/TableLoadingOverlay';
import { TablePaginationBar } from './table-renderer/TablePaginationBar';
import { useTablePagination, useTableSelection, useTableSort, useTableFilter, useTableExpand } from './table-renderer/use-table-controls';
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
        <Table data-striped={isStriped || undefined} data-bordered={isBordered || undefined}>
          <TableHeader data-slot="table-header">
            <TableHeaderRow
              props={props}
              columns={columns}
              sourceLength={source.length}
              sortState={sortState}
              filterState={filterState}
              allSelected={allSelected}
              selectedRowCount={selectedRowKeys.size}
              onSort={handleSort}
              onFilter={handleFilter}
              onSelectAll={handleSelectAll}
            />
          </TableHeader>

          <TableBodyRows
            props={props}
            processedData={processedData}
            rowScopeCache={rowScopeCache}
            rowRepeatedTemplateId={rowRepeatedTemplateId}
            expandedRowKeys={expandedRowKeys}
            selectedRowKeys={selectedRowKeys}
            columnCount={columnCount}
            isStriped={isStriped}
            emptyContent={emptyContent}
            onToggleExpand={handleToggleExpand}
            onSelectRow={handleSelectRow}
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
