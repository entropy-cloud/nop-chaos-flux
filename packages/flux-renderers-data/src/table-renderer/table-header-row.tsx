import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useLayoutEffect, useRef } from 'react';
import {
  Button,
  Checkbox,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TableHead,
  TableRow,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, ListFilterIcon } from 'lucide-react';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { getFixedColumnKey } from './fixed-columns.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { FilterState, MultiSortState, SortEntry, SortState } from './types.js';
import {
  createColumnResizeHandleProps,
  isColumnResizable,
  type ColumnResizeApi,
} from './use-column-resize.js';
import {
  computeHeaderRows,
  extractLeafColumns,
  hasNestedColumns,
  type HeaderTreeCell,
} from './table-header-tree.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

interface TableHeaderRowProps {
  props: RendererComponentProps<TableSchema>;
  columns: TableColumnSchema[];
  sourceLength: number;
  sortState: SortState;
  sortEntries?: MultiSortState;
  multiSort?: boolean;
  filterState: FilterState;
  allSelected: boolean;
  selectedRowCount: number;
  /** Resolved header select-all checked state (D1 G-B3). Falls back to the legacy allSelected formula when omitted. */
  selectAllChecked?: boolean;
  /** Resolved header select-all indeterminate state (D1 G-B3). Falls back to the legacy formula when omitted. */
  selectAllIndeterminate?: boolean;
  fixedColumnLayout: FixedColumnLayout;
  showExpandColumn: boolean;
  onSort: (column: string, multiKey?: boolean) => void;
  onFilter: (column: string, option: string, checked: boolean) => void;
  onSearch: (column: string, keyword: string) => void;
  onClearFilters: (column: string) => void;
  onSelectAll: (checked: boolean) => void;
  selectAllDisabled?: boolean;
  /** [G3-R2-视角4-01] maxSelectionLength cap reached — render count/reason feedback. */
  selectionCapped?: boolean;
  selectedCount?: number;
  selectionMax?: number;
  columnResize?: boolean;
  resizeApi?: ColumnResizeApi;
  affixHeader?: boolean;
  /** [G3-R3-视角8-01] leading drag-handle column pairing. */
  draggable?: boolean;
  /** [G3-视角5-01] trailing row save-bar column pairing. */
  rowDraftColumnEnabled?: boolean;
}

export function TableHeaderRow(props: TableHeaderRowProps) {
  const { columns } = props;
  if (hasNestedColumns(columns)) {
    return <NestedTableHeaderRows {...props} />;
  }
  return <FlatTableHeaderRow {...props} />;
}

interface LeafCellContext {
  activeSortEntries: MultiSortState;
  showMultiSortBadge: boolean;
}

function renderLeafHeaderCell(
  column: TableColumnSchema,
  index: number,
  ctx: TableHeaderRowProps,
  leafCtx: LeafCellContext,
) {
  const {
    props: rendererProps,
    fixedColumnLayout,
    onSort,
    onFilter,
    onSearch,
    onClearFilters,
    filterState,
    columnResize,
    resizeApi,
  } = ctx;

  const labelRegion =
    typeof column.labelRegionKey === 'string'
      ? rendererProps.regions[column.labelRegionKey]
      : undefined;
  const labelContent = asReactNode(labelRegion?.render()) ?? column.label ?? column.name;
  const columnLabelText = typeof column.label === 'string' ? column.label : column.name;
  const isSortable = column.sortable === true;
  const filterConfig =
    typeof column.filterable === 'object' && column.filterable
      ? column.filterable
      : undefined;
  const filterOptions = Array.isArray(column.filterOptions)
    ? column.filterOptions
    : filterConfig?.options;
  const isFilterable =
    (column.filterable === true || Boolean(filterConfig)) &&
    Array.isArray(filterOptions) &&
    filterOptions.length > 0;
  const searchableRegionKey = (column as { searchableRegionKey?: string }).searchableRegionKey;
  const searchableRegion =
    typeof searchableRegionKey === 'string'
      ? rendererProps.regions[searchableRegionKey]
      : undefined;
  const isSearchable =
    column.searchable === true ||
    Boolean(filterConfig?.searchable) ||
    typeof searchableRegionKey === 'string';
  const activeSortEntry = column.name
    ? leafCtx.activeSortEntries.find((entry) => entry.column === column.name)
    : undefined;
  const currentSort = activeSortEntry ? activeSortEntry.direction : null;
  const sortBadgeNumber =
    leafCtx.showMultiSortBadge && activeSortEntry
      ? leafCtx.activeSortEntries.indexOf(activeSortEntry) + 1
      : undefined;
  const activeFilters = column.name
    ? (filterState[column.name]?.values ?? new Set<string>())
    : new Set<string>();
  const currentKeyword = column.name ? (filterState[column.name]?.keyword ?? '') : '';
  const hasActiveFilterState = activeFilters.size > 0 || currentKeyword.length > 0;
  const columnKey =
    column.name ??
    (typeof column.label === 'string' ? column.label : undefined) ??
    `column-${index}`;
  const resizable = isColumnResizable(column, columnResize);
  const resizeHandleProps = createColumnResizeHandleProps({
    column,
    index,
    resizable,
    resizeApi,
  });
  const resolvedWidth = resizeApi?.getColumnWidth(column, index) ?? column.width;
  const cellProps = fixedColumnLayout.getColumnCellProps(column, index);
  const headerAlignClass =
    column.headerAlign === 'center'
      ? 'text-center'
      : column.headerAlign === 'right'
        ? 'text-right'
        : undefined;

  return (
    <TableHead
      key={columnKey}
      className={cn('relative', cellProps.className, headerAlignClass)}
      style={{
        ...(resolvedWidth
          ? { width: resolvedWidth, minWidth: resolvedWidth, maxWidth: resolvedWidth }
          : undefined),
        ...cellProps.style,
      }}
      data-slot="table-head"
      data-fixed={cellProps.fixed || undefined}
      data-column-width-key={getFixedColumnKey(column, index)}
      data-resizable={resizable || undefined}
      data-interactive={isSortable || isFilterable || undefined}
      aria-sort={
        isSortable && currentSort === 'asc'
          ? 'ascending'
          : isSortable && currentSort === 'desc'
            ? 'descending'
            : isSortable
              ? 'none'
              : undefined
      }
    >
      {isSortable || isFilterable || isSearchable ? (
        <div className="flex items-center gap-1">
          {isSortable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto rounded-sm px-1 py-0 font-normal hover:text-primary"
              onClick={(event) => {
                if (column.name) onSort(column.name, event.shiftKey);
              }}
            >
              {labelContent}
              {sortBadgeNumber !== undefined ? (
                <span
                  data-slot="table-sort-badge"
                  className="ml-1 inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                >
                  {sortBadgeNumber}
                </span>
              ) : null}
            </Button>
          ) : (
            <span>{labelContent}</span>
          )}
          {isSortable && (
            currentSort === 'asc' ? (
              <ArrowUpIcon className="inline ml-1 size-3 text-primary" />
            ) : currentSort === 'desc' ? (
              <ArrowDownIcon className="inline ml-1 size-3 text-primary" />
            ) : (
              <ArrowUpDownIcon className="inline ml-1 size-3 text-muted-foreground/40" />
            )
          )}

          {(isFilterable || isSearchable) && (
            // [G3-视角4-01] the keyword search Input must not live inside a
            // DropdownMenuContent: Base UI's open-menu typeahead stopEvents all
            // single-character keys regardless of target, so typing was
            // swallowed. A Popover hosts the input + filter options without the
            // menu typeahead (AntD/shadcn column-filter pattern).
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      'h-6 w-6 rounded hover:bg-accent',
                      hasActiveFilterState ? 'text-primary' : 'text-muted-foreground',
                    )}
                    aria-label={
                      hasActiveFilterState
                        ? t('flux.table.filterActive')
                        : t('flux.table.filter')
                    }
                  >
                    <span className="sr-only">{t('flux.table.filter')}</span>
                    <ListFilterIcon className="size-3" />
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-56 p-1">
                {isSearchable && column.name ? (
                  <div className="p-1 pb-2">
                    {searchableRegion ? (
                      asReactNode(searchableRegion.render())
                    ) : (
                      <Input
                        value={currentKeyword}
                        aria-label={
                          columnLabelText
                            ? `${t('flux.table.search')} ${columnLabelText}`
                            : t('flux.table.search')
                        }
                        placeholder={
                          typeof column.searchable === 'object' && column.searchable
                            ? String(
                                (column.searchable as { placeholder?: string }).placeholder ??
                                  t('flux.table.search'),
                              )
                            : t('flux.table.search')
                        }
                        onChange={(event) => onSearch(column.name!, event.target.value)}
                      />
                    )}
                  </div>
                ) : null}
                {isFilterable
                  ? filterOptions!.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        data-slot="table-filter-option"
                      >
                        <Checkbox
                          checked={activeFilters.has(option.value)}
                          onCheckedChange={(checked) =>
                            column.name && onFilter(column.name, option.value, checked === true)
                        }
                        />
                        {option.label}
                      </label>
                    ))
                  : null}
                {column.name && hasActiveFilterState ? (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <div className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onClearFilters(column.name!)}
                      >
                        {t('flux.table.clearFilters')}
                      </Button>
                    </div>
                  </>
                ) : null}
              </PopoverContent>
            </Popover>
          )}
          {resizable ? (
            <span {...resizeHandleProps} />
          ) : null}
        </div>
      ) : (
        <>
          {labelContent}
          {resizable ? (
            <span {...resizeHandleProps} />
          ) : null}
        </>
      )}
    </TableHead>
  );
}

function renderGroupHeaderCell(
  cell: HeaderTreeCell,
  rendererProps: RendererComponentProps<TableSchema>,
) {
  const { column, colSpan, rowSpan } = cell;
  const labelRegion =
    typeof column.labelRegionKey === 'string'
      ? rendererProps.regions[column.labelRegionKey]
      : undefined;
  const labelContent = asReactNode(labelRegion?.render()) ?? column.label ?? column.name;
  const columnKey =
    column.name ??
    (typeof column.label === 'string' ? column.label : undefined) ??
    `group-${cell.depth}-${cell.leafIndex}`;
  return (
    <TableHead
      key={columnKey}
      colSpan={colSpan}
      rowSpan={rowSpan}
      data-slot="table-head-group"
      data-depth={cell.depth}
    >
      {labelContent}
    </TableHead>
  );
}

function FlatTableHeaderRow({
  props,
  columns,
  sourceLength,
  sortState,
  sortEntries,
  multiSort,
  filterState,
  allSelected,
  selectedRowCount,
  fixedColumnLayout,
  showExpandColumn,
  onSort,
  onFilter,
  onSearch,
  onClearFilters,
  onSelectAll,
  selectAllChecked,
  selectAllIndeterminate,
  selectAllDisabled,
  selectionCapped,
  selectedCount,
  selectionMax,
  columnResize,
  resizeApi,
  affixHeader,
  draggable,
  rowDraftColumnEnabled,
}: TableHeaderRowProps) {
  const schemaProps = props.props as TableSchema;
  const isAffix = affixHeader === true;
  const activeSortEntries: MultiSortState =
    sortEntries ??
    (sortState.column && sortState.direction
      ? [{ column: sortState.column, direction: sortState.direction } satisfies SortEntry]
      : []);
  const showMultiSortBadge = multiSort === true || activeSortEntries.length > 1;
  const leafCtx: LeafCellContext = { activeSortEntries, showMultiSortBadge };

  return (
    <TableRow
      className={cn(isAffix ? 'nop-table-header-sticky' : undefined)}
      style={
        isAffix
          ? { position: 'sticky', top: 0, zIndex: 3, background: 'var(--table-header-bg)' }
          : undefined
      }
    >
      {draggable ? (
        <TableHead
          data-slot="table-drag-column"
          data-column-width-key="__drag__"
          aria-label={t('flux.table.dragColumn')}
          className={fixedColumnLayout.getDragCellProps().className}
          style={fixedColumnLayout.getDragCellProps().style}
        />
      ) : null}

      {showExpandColumn ? (
        <TableHead
          data-slot="table-expand-column"
          data-column-width-key="__expand__"
          className={fixedColumnLayout.getExpandCellProps().className}
          style={fixedColumnLayout.getExpandCellProps().style}
        >
          <span className="sr-only">{t('flux.table.expand')}</span>
        </TableHead>
      ) : null}

      {schemaProps.rowSelection ? (
        <TableHead
          data-slot="table-select-column"
          data-column-width-key="__selection__"
          className={fixedColumnLayout.getSelectionCellProps().className}
          style={fixedColumnLayout.getSelectionCellProps().style}
        >
          {schemaProps.rowSelection.type === 'checkbox' && (
            <>
              <Checkbox
                checked={
                  selectAllChecked ??
                  (allSelected && selectedRowCount === sourceLength && sourceLength > 0)
                }
                indeterminate={selectAllIndeterminate ?? (!allSelected && selectedRowCount > 0)}
                disabled={selectAllDisabled || undefined}
                onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                aria-label={t('flux.table.selectAll')}
                title={
                  selectionCapped && selectionMax !== undefined
                    ? t('flux.table.selectionCapReached', {
                        selected: selectedCount ?? 0,
                        max: selectionMax,
                      })
                    : undefined
                }
              />
              {/* [G3-R2-视角4-01] the cap silently grays unchecked rows; announce
                  the count/reason so the state is perceivable without hover. */}
              {selectionCapped && selectionMax !== undefined ? (
                <span
                  role="status"
                  data-slot="table-selection-cap"
                  className="sr-only"
                >
                  {t('flux.table.selectionCapReached', {
                    selected: selectedCount ?? 0,
                    max: selectionMax,
                  })}
                </span>
              ) : null}
            </>
          )}
        </TableHead>
      ) : null}

      {columns.map((column, index) =>
        renderLeafHeaderCell(column, index, {
          props,
          columns,
          sourceLength,
          sortState,
          sortEntries,
          multiSort,
          filterState,
          allSelected,
          selectedRowCount,
          fixedColumnLayout,
          showExpandColumn,
          onSort,
          onFilter,
          onSearch,
          onClearFilters,
          onSelectAll,
          selectAllDisabled,
          columnResize,
          resizeApi,
          affixHeader,
          draggable,
          rowDraftColumnEnabled,
        }, leafCtx),
      )}

      {rowDraftColumnEnabled ? (
        <TableHead
          data-slot="table-row-save-bar-column"
          data-column-width-key="__row_save_bar__"
          className="w-32"
        />
      ) : null}
    </TableRow>
  );
}

function NestedTableHeaderRows({
  props,
  columns,
  sourceLength,
  sortState,
  sortEntries,
  multiSort,
  filterState,
  allSelected,
  selectedRowCount,
  fixedColumnLayout,
  showExpandColumn,
  onSort,
  onFilter,
  onSearch,
  onClearFilters,
  onSelectAll,
  selectAllChecked,
  selectAllIndeterminate,
  selectAllDisabled,
  selectionCapped,
  selectedCount,
  selectionMax,
  columnResize,
  resizeApi,
  affixHeader,
  draggable,
  rowDraftColumnEnabled,
}: TableHeaderRowProps) {
  const schemaProps = props.props as TableSchema;
  const isAffix = affixHeader === true;
  const rows = computeHeaderRows(columns);
  const leafColumns = extractLeafColumns(columns);
  const activeSortEntries: MultiSortState =
    sortEntries ??
    (sortState.column && sortState.direction
      ? [{ column: sortState.column, direction: sortState.direction } satisfies SortEntry]
      : []);
  const showMultiSortBadge = multiSort === true || activeSortEntries.length > 1;
  const leafCtx: LeafCellContext = { activeSortEntries, showMultiSortBadge };
  const headerCtx: TableHeaderRowProps = {
    props,
    columns,
    sourceLength,
    sortState,
    sortEntries,
    multiSort,
    filterState,
    allSelected,
    selectedRowCount,
    fixedColumnLayout,
    showExpandColumn,
    onSort,
    onFilter,
    onSearch,
    onClearFilters,
    onSelectAll,
    selectAllDisabled,
    columnResize,
    resizeApi,
    affixHeader,
  };

  const stickyBase = isAffix
    ? { position: 'sticky' as const, background: 'var(--table-header-bg)' }
    : undefined;

  // [G3-R4-视角8-02] nested + affixHeader: every header row sharing `top: 0`
  // collapses the header into one visual row on scroll (group rows are fully
  // covered by the leaf row). Each row instead sticks at the cumulative height
  // of the rows above it, measured post-layout and written straight to the DOM
  // (no state mirror — React 19 set-state-in-effect hygiene); the group row
  // layers above the leaf row so a transient overlap still paints the outer
  // group header.
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  useLayoutEffect(() => {
    if (!isAffix) return;
    let acc = 0;
    for (const rowEl of rowRefs.current) {
      if (rowEl) {
        rowEl.style.top = `${acc}px`;
      }
      acc += rowEl?.getBoundingClientRect().height ?? 0;
    }
  });

  return (
    <>
      {rows.map((row, rowIndex) => {
        const isLeafRow = rowIndex === rows.length - 1;
        const rowKey = isLeafRow
          ? 'header-leaf-row'
          : `header-group-row-${row.cells.map((c) => c.column.name ?? c.leafIndex).join('-')}`;
        const stickyStyle = stickyBase
          ? {
              ...stickyBase,
              zIndex: 3 + (rows.length - 1 - rowIndex),
            }
        : undefined;
        return (
          <TableRow
            key={rowKey}
            ref={(el: HTMLTableRowElement | null) => {
              rowRefs.current[rowIndex] = el;
            }}
            className={cn(
              isAffix ? 'nop-table-header-sticky' : undefined,
              isLeafRow ? 'nop-table-header-leaf' : 'nop-table-header-group',
            )}
            style={stickyStyle}
          >
            {rowIndex === 0 && draggable ? (
              <TableHead
                rowSpan={rows.length}
                data-slot="table-drag-column"
                data-column-width-key="__drag__"
                aria-label={t('flux.table.dragColumn')}
                className={fixedColumnLayout.getDragCellProps().className}
                style={fixedColumnLayout.getDragCellProps().style}
              />
            ) : null}
            {rowIndex === 0 && showExpandColumn ? (
              <TableHead
                rowSpan={rows.length}
                data-slot="table-expand-column"
                data-column-width-key="__expand__"
                className={fixedColumnLayout.getExpandCellProps().className}
                style={fixedColumnLayout.getExpandCellProps().style}
              >
                <span className="sr-only">{t('flux.table.expand')}</span>
              </TableHead>
            ) : null}
            {rowIndex === 0 && schemaProps.rowSelection ? (
              <TableHead
                rowSpan={rows.length}
                data-slot="table-select-column"
                data-column-width-key="__selection__"
                className={fixedColumnLayout.getSelectionCellProps().className}
                style={fixedColumnLayout.getSelectionCellProps().style}
              >
                {schemaProps.rowSelection.type === 'checkbox' && (
                  <>
                    <Checkbox
                      checked={selectAllChecked ?? allSelected}
                      indeterminate={selectAllIndeterminate ?? (!allSelected && selectedRowCount > 0)}
                      disabled={selectAllDisabled || undefined}
                      onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                      aria-label={t('flux.table.selectAll')}
                      title={
                        selectionCapped && selectionMax !== undefined
                          ? t('flux.table.selectionCapReached', {
                              selected: selectedCount ?? 0,
                              max: selectionMax,
                            })
                          : undefined
                      }
                    />
                    {selectionCapped && selectionMax !== undefined ? (
                      <span role="status" data-slot="table-selection-cap" className="sr-only">
                        {t('flux.table.selectionCapReached', {
                          selected: selectedCount ?? 0,
                          max: selectionMax,
                        })}
                      </span>
                    ) : null}
                  </>
                )}
              </TableHead>
            ) : null}

            {isLeafRow
              ? leafColumns.map((column, leafIndex) =>
                  renderLeafHeaderCell(column, leafIndex, headerCtx, leafCtx),
                )
              : row.cells.map((cell) => renderGroupHeaderCell(cell, props))}

            {rowIndex === 0 && rowDraftColumnEnabled ? (
              <TableHead
                rowSpan={rows.length}
                data-slot="table-row-save-bar-column"
                data-column-width-key="__row_save_bar__"
                className="w-32"
              />
            ) : null}
          </TableRow>
        );
      })}
    </>
  );
}
