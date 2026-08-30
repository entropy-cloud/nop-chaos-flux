import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  isEditableKeyboardTarget,
  resolveRendererSlotContent,
  useRendererRuntime,
  useSchemaProps,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
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
import {
  createFixedColumnLayout,
  getFixedColumnKey,
  DRAG_COLUMN_KEY,
  DRAG_COLUMN_WIDTH,
  ROW_SAVE_BAR_COLUMN_KEY,
  ROW_SAVE_BAR_COLUMN_WIDTH,
} from './table-renderer/fixed-columns.js';
import { isRowDraftColumnEnabled } from './table-renderer/table-body-row-rendering.js';
import { useTableColumnWidths } from './table-renderer/column-width-measure.js';
import { TableHeaderRow } from './table-renderer/table-header-row.js';
import { TableColumnSettings } from './table-renderer/table-column-settings.js';
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
import { isDevRuntime, readChildren, useTableTree } from './table-renderer/use-table-tree.js';
import { useTableLazyChildren } from './table-renderer/use-table-lazy-children.js';
import { useRowDragSort } from './table-renderer/use-row-drag-sort.js';
import { useAutoFillHeight } from './table-renderer/use-auto-fill-height.js';
import { extractLeafColumns } from './table-renderer/table-header-tree.js';
import { useResponsiveExpandState } from './table-renderer/responsive.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const EMPTY_TABLE_COLUMNS: TableColumnSchema[] = [];
const EMPTY_TABLE_ROWS: Array<Record<string, any>> = [];

function createTableOwnerKey(
  props: RendererComponentProps<TableSchema>,
  runtimeId: string,
): string {
  return `${runtimeId}:${props.node.scope.id}:${props.node.templateNode.templateNodeId ?? props.meta.cid ?? props.id}:${serializeInstancePath(props.node.instancePath)}`;
}

function isValidColumnArray(value: unknown): value is TableColumnSchema[] {
  return Array.isArray(value) && value.every((col) => col !== null && typeof col === 'object');
}

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const runtime = useRendererRuntime();
  const schemaProps = useSchemaProps(props);
  const tableSchemaProps = schemaProps as TableSchema;
  const rawColumns = schemaProps.columns;
  // 04-01: last-good render-time derivation (React "adjust state during render"
  // pattern). Valid columns apply immediately; invalid expression results keep
  // the last valid array and surface a dev warning on arrival. Replaces the
  // props→state dual-mirror (useState + prevRawRef + useEffect + startTransition)
  // — there is no real sync loop to guard against (a rawColumns reference change
  // simply re-renders with the fresh value), so the mirror only added an extra
  // render hop and a stale-value window.
  const [lastGoodColumns, setLastGoodColumns] = useState<TableColumnSchema[] | null>(() =>
    isValidColumnArray(rawColumns) ? rawColumns : null,
  );
  const [prevRawColumns, setPrevRawColumns] = useState(rawColumns);
  const rawColumnsValid = isValidColumnArray(rawColumns);
  if (rawColumns !== prevRawColumns) {
    setPrevRawColumns(rawColumns);
    if (rawColumnsValid) {
      setLastGoodColumns(rawColumns);
    } else if (isDevRuntime()) {
      console.warn(
        `[TableRenderer] Dynamic columns expression returned invalid format. Falling back to previous columns.`,
      );
    }
  }
  const columns = rawColumnsValid ? rawColumns : (lastGoodColumns ?? EMPTY_TABLE_COLUMNS);
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
  const { paginationEnabled, serverPaged, currentPage, pageSize, handlePageChange, handlePageSizeChange, clampPage } =
    useTablePagination(tableSchemaProps, props.events.onPageChange);
  const { sortState, sortEntries, handleSort } = useTableSort(
    tableSchemaProps,
    props.events.onSortChange,
    tableColumns,
  );
  const { filterState, handleFilter, handleSearch, clearFilters } = useTableFilter(
    tableSchemaProps,
    props.events.onFilterChange,
    (nextFilterState) => {
      if (tableSchemaProps.paginationOwnership === 'controlled') {
        return;
      }

      const nextFilteredRows = processTableData(source, schemaProps.rowKey, sortState, nextFilterState);
      clampPage(currentPage, nextFilteredRows.length);
    },
  );
  const { expandedRowKeys, handleToggleExpand } = useTableExpand(tableSchemaProps);

  const {
    responsiveExpandActive,
    expandAllByDefault,
    mainColumns,
    responsiveHiddenColumns,
    nestedHeadersActive,
  } = useResponsiveExpandState(tableSchemaProps, tableColumns);
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
  // Lazy children loading for tree table (T11): when a tree node with
  // childrenSource is expanded, trigger an action dispatch to fetch children.
  const { lazyChildrenMap, loadChildren, refreshNode } = useTableLazyChildren({
    childrenSource: tableSchemaProps.childrenSource,
    helpers,
  });
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
  } = useTableTree(tableSchemaProps, filteredData, lazyChildrenMap);
  // Auto-trigger lazy children load when a tree node is expanded.
  const prevExpandedRef = useRef(expandedTreeRowKeys);
  useEffect(() => {
    if (!treeMode || !tableSchemaProps.childrenSource) return;
    const prev = prevExpandedRef.current;
    const next = expandedTreeRowKeys;
    for (const key of next) {
      // P1-3: re-load when the node has no cached children OR the cache holds a
      // failed state (error) — a stale error must not permanently block reloads.
      const cached = lazyChildrenMap.get(key);
      if (!prev.has(key) && (!cached || cached.error)) {
        const row = filteredData.find((r) => (r.cacheKey ?? r.rowKey) === key);
        if (row && row.record && !readChildren(row.record, tableSchemaProps.rowChildrenField!)) {
          loadChildren(key, row.record);
        }
      }
    }
    for (const key of prev) {
      if (!next.has(key)) {
        // Node collapsed — keep cached children for next expand
      }
    }
    prevExpandedRef.current = next;
  }, [treeMode, tableSchemaProps, expandedTreeRowKeys, lazyChildrenMap, filteredData, loadChildren]);

  // opt-row-selection-clash: an explicit optionRow.value binding exclusively
  // drives the row state markers; warn once in dev when it coexists with
  // rowSelection so the override is visible to authors.
  useEffect(() => {
    const optionRow = tableSchemaProps.optionRow;
    const binding = optionRow && typeof optionRow === 'object' ? optionRow.value : undefined;
    if (binding === undefined || binding === null || binding === '' || !tableSchemaProps.rowSelection) {
      return;
    }
    if (!isDevRuntime()) {
      return;
    }
    console.warn(
      '[flux:table] optionRow.value overrides rowSelection for row state markers. ' +
        'Row selection checkboxes keep working and dispatch onSelectionChange, but visual ' +
        'selected markers follow the binding.',
    );
  }, [tableSchemaProps]);

  // P1-3: retry path for a failed lazy load. refreshNode clears the error state
  // (so the auto-trigger effect above can re-run) and loadChildren re-fetches
  // with the same row scope; used by the error-state tree toggle.
  const handleRetryTreeLoad = (rowKey: string) => {
    const row = filteredData.find((r) => (r.cacheKey ?? r.rowKey) === rowKey);
    if (!row || !row.record) return;
    refreshNode(rowKey);
    loadChildren(rowKey, row.record);
  };
  const {
    selectedRowKeys,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    setSelectionExternal,
    isRowCheckable,
    isAtMaxSelection,
  } = useTableSelection(tableSchemaProps, treeFlattenedData, props.events.onSelectionChange, helpers);

  // D1 G-B2 Decision 3: ⌘/ctrl+A selects all checkable rows of the current view.
  // Trigger domain = focus inside the table container (container-level React
  // onKeyDown bubble); editable targets (inputs) keep the native select-all.
  const modifierSelectEnabled =
    tableSchemaProps.rowSelection?.modifierSelect === true &&
    tableSchemaProps.rowSelection?.type !== 'radio';
  const handleContainerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!modifierSelectEnabled) {
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'a') {
      return;
    }
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }
    event.preventDefault();
    handleSelectAll(true);
  };

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

  // index 列（序号列）跨页累计偏移：(currentPage-1)*pageSize，对齐 AMIS __index 的 offset 语义。
  const indexColumnOffset = paginationEnabled ? (resolvedCurrentPage - 1) * pageSize : 0;

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

  const measureRootRef = useRef<HTMLDivElement | null>(null);
  const measuredWidths = useTableColumnWidths(measureRootRef, [
    mainColumns,
    showExpandColumn,
    Boolean(schemaProps.rowSelection),
    resizeApi.widths,
    visibleColumns,
  ]);
  const fixedColumnLayout = useMemo(
    () =>
      createFixedColumnLayout(
        {
          rowSelection: tableSchemaProps.rowSelection,
          draggable: tableSchemaProps.draggable === true,
        },
        mainColumns,
        showExpandColumn,
        measuredWidths,
      ),
    [mainColumns, tableSchemaProps.rowSelection, tableSchemaProps.draggable, showExpandColumn, measuredWidths],
  );

  // [G3-视角5-01]/[G3-R3-视角8-01] helper body columns must pair header th +
  // colgroup col; derive the flags once and share them with header/count.
  const rowDraftColumnEnabled = useMemo(
    () => isRowDraftColumnEnabled(tableSchemaProps, mainColumns),
    [tableSchemaProps, mainColumns],
  );
  const visibleColumnsSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const colgroupEntries = useMemo(() => {
    const entries: { key: string; width: number | undefined }[] = [];
    if (schemaProps.draggable === true) {
      entries.push({ key: DRAG_COLUMN_KEY, width: measuredWidths.get(DRAG_COLUMN_KEY) ?? DRAG_COLUMN_WIDTH });
    }
    if (showExpandColumn) {
      entries.push({ key: '__expand__', width: measuredWidths.get('__expand__') });
    }
    if (schemaProps.rowSelection) {
      entries.push({ key: '__selection__', width: measuredWidths.get('__selection__') });
    }
    effectiveMainColumns.forEach((column, index) => {
      const key = getFixedColumnKey(column, index);
      entries.push({ key, width: measuredWidths.get(key) });
    });
    if (rowDraftColumnEnabled) {
      entries.push({
        key: ROW_SAVE_BAR_COLUMN_KEY,
        width: measuredWidths.get(ROW_SAVE_BAR_COLUMN_KEY) ?? ROW_SAVE_BAR_COLUMN_WIDTH,
      });
    }
    return entries;
  }, [effectiveMainColumns, measuredWidths, schemaProps.rowSelection, schemaProps.draggable, showExpandColumn, rowDraftColumnEnabled]);

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
    (schemaProps.draggable ? 1 : 0) +
    (rowDraftColumnEnabled ? 1 : 0);
  const columnSettingsOverlay = schemaProps.columnSettings?.overlay !== false;
  const columnSettingsAlignmentClass =
    schemaProps.columnSettings?.align === 'left' ? 'items-start' : 'items-end';

  const virtualThreshold = schemaProps.virtualThreshold;
  const scrollHeight = schemaProps.scrollHeight;
  const virtualEnabled =
    !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold;

  const autoFill = useAutoFillHeight(schemaProps.autoFillHeight, isLoading);
  const autoFillActive = schemaProps.autoFillHeight !== undefined && schemaProps.autoFillHeight !== false;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Container-level keydown relay for rowSelection.modifierSelect (cmd/ctrl+A
  // select-all). Spread as interaction props: the container is not itself an
  // interactive element, so the static-element a11y rule does not apply.
  const containerInteractions = modifierSelectEnabled
    ? { onKeyDown: handleContainerKeyDown }
    : {};

  return (
    <div
      className={cn('nop-table', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-responsive-expand={responsiveExpandActive ? 'true' : undefined}
      {...containerInteractions}
    >
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="table-header-region">{asReactNode(headerContent)}</div>
      ) : null}
      <TableColumnSettings
        enabled={columnSettingsEnabled}
        overlay={columnSettingsOverlay}
        align={columnSettingsAlignmentClass === 'items-start' ? 'left' : 'right'}
        columns={columns}
        orderedColumns={orderedColumns}
        visibleColumnKeys={visibleColumnsSet}
        rendererId={props.id}
        onToggle={toggleColumn}
        onMove={moveColumn}
      />

      <div
        ref={(element) => {
          measureRootRef.current = element;
          // [G3-R4-视角5-01] autoFill and virtualization are independent consumers of the
          // same scroll container — route the element to BOTH (an if/else here left
          // scrollRef null under autoFillHeight × virtualThreshold and the body
          // silently rendered zero rows).
          if (element && autoFillActive) {
            // eslint-disable-next-line react-hooks/immutability, react-compiler/react-compiler -- C1a 组合 ref 回调：同一元素路由到三个 ref（列宽测量 + autoFill + 虚拟滚动），hook 返回的 ref 对象由消费方赋 .current 是既有契约
            autoFill.containerRef.current = element;
          }
          if (element && virtualEnabled) {
            scrollRef.current = element;
          }
        }}
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
          <colgroup data-slot="table-column-group">
            {colgroupEntries.map(({ key, width }) => (
              <col
                key={key}
                data-column-width-col-key={key}
                style={width === undefined ? undefined : { width }}
              />
            ))}
          </colgroup>
          {schemaProps.showHeader !== false ? (
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
                draggable={schemaProps.draggable === true}
                rowDraftColumnEnabled={rowDraftColumnEnabled}
              />
            </TableHeader>
          ) : null}

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
            combineFromIndex={schemaProps.combineFromIndex}
            expandAllByDefault={expandAllByDefault}
            treeMode={treeMode}
            expandedTreeRowKeys={expandedTreeRowKeys}
            onToggleTreeExpand={handleToggleTreeExpand}
            onRetryTreeLoad={handleRetryTreeLoad}
            lazyChildrenMap={lazyChildrenMap}
            rowDragSortApi={rowDragSortApi}
            draggable={schemaProps.draggable === true}
            indexColumnOffset={indexColumnOffset}
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

      {paginationEnabled && !schemaProps.pagination?.hideBar && treeFlattenedData.length > 0 ? (
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
