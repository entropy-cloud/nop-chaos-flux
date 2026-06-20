import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  Button,
  Checkbox,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  TableHead,
  TableRow,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, ListFilterIcon } from 'lucide-react';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import type { FixedColumnLayout } from './fixed-columns.js';
import type { FilterState, SortState } from './types.js';
import {
  isColumnResizable,
  type ColumnResizeApi,
} from './use-column-resize.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

interface TableHeaderRowProps {
  props: RendererComponentProps<TableSchema>;
  columns: TableColumnSchema[];
  sourceLength: number;
  sortState: SortState;
  filterState: FilterState;
  allSelected: boolean;
  selectedRowCount: number;
  fixedColumnLayout: FixedColumnLayout;
  showExpandColumn: boolean;
  onSort: (column: string) => void;
  onFilter: (column: string, option: string, checked: boolean) => void;
  onSearch: (column: string, keyword: string) => void;
  onClearFilters: (column: string) => void;
  onSelectAll: (checked: boolean) => void;
  selectAllDisabled?: boolean;
  columnResize?: boolean;
  resizeApi?: ColumnResizeApi;
  affixHeader?: boolean;
}

export function TableHeaderRow({
  props,
  columns,
  sourceLength,
  sortState,
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
}: TableHeaderRowProps) {
  const schemaProps = props.props as TableSchema;
  const isAffix = affixHeader === true;

  return (
    <TableRow
      className={cn(
        isAffix ? 'nop-table-header-sticky' : undefined,
      )}
      style={
        isAffix
          ? { position: 'sticky', top: 0, zIndex: 3, background: 'hsl(var(--background))' }
          : undefined
      }
    >
      {showExpandColumn ? (
        <TableHead
          data-slot="table-expand-column"
          className={fixedColumnLayout.getExpandCellProps().className}
          style={{ width: '40px', ...fixedColumnLayout.getExpandCellProps().style }}
        >
          <span className="sr-only">{t('flux.table.expand')}</span>
        </TableHead>
      ) : null}

      {schemaProps.rowSelection ? (
        <TableHead
          data-slot="table-select-column"
          className={fixedColumnLayout.getSelectionCellProps().className}
          style={{ width: '40px', ...fixedColumnLayout.getSelectionCellProps().style }}
        >
          {schemaProps.rowSelection.type === 'checkbox' && (
            <Checkbox
              checked={allSelected && selectedRowCount === sourceLength && sourceLength > 0}
              indeterminate={!allSelected && selectedRowCount > 0}
              disabled={selectAllDisabled || undefined}
              onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
              aria-label={t('flux.table.selectAll')}
            />
          )}
        </TableHead>
      ) : null}

      {columns.map((column, index) => {
        const labelRegion =
          typeof column.labelRegionKey === 'string'
            ? props.regions[column.labelRegionKey]
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
        const isSearchable = column.searchable === true || Boolean(filterConfig?.searchable);
        const currentSort = sortState.column === column.name ? sortState.direction : null;
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
        const resizeStart = (event: React.PointerEvent<HTMLSpanElement>) => {
          if (!resizable || !resizeApi) return;
          event.preventDefault();
          event.stopPropagation();
          resizeApi.startResize(column, index, event.clientX);
        };
        const resolvedWidth = resizeApi?.getColumnWidth(column, index) ?? column.width;

        return (
          <TableHead
            key={columnKey}
            className={fixedColumnLayout.getColumnCellProps(column, index).className}
            style={{
              ...(resolvedWidth ? { width: resolvedWidth, minWidth: resolvedWidth } : undefined),
              ...fixedColumnLayout.getColumnCellProps(column, index).style,
            }}
            data-slot="table-head"
            data-fixed={fixedColumnLayout.getColumnCellProps(column, index).fixed || undefined}
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
                    onClick={() => {
                      if (column.name) onSort(column.name);
                    }}
                  >
                    {labelContent}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger
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
                    <DropdownMenuContent>
                      {isSearchable && column.name ? (
                        <div className="p-2">
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
                        </div>
                      ) : null}
                      {isFilterable
                        ? filterOptions!.map((option) => (
                            <DropdownMenuCheckboxItem
                              key={option.value}
                              checked={activeFilters.has(option.value)}
                              onCheckedChange={(checked) =>
                                column.name && onFilter(column.name, option.value, checked)
                              }
                            >
                              {option.label}
                            </DropdownMenuCheckboxItem>
                          ))
                        : null}
                      {column.name && hasActiveFilterState ? (
                        <>
                          <DropdownMenuSeparator />
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {resizable ? (
                  <span
                    data-slot="table-column-resize-handle"
                    aria-label={t('flux.table.resizeColumn')}
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={resizeStart}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-primary/40"
                    style={{ touchAction: 'none' }}
                  />
                ) : null}
              </div>
            ) : (
              <>
                {labelContent}
                {resizable ? (
                  <span
                    data-slot="table-column-resize-handle"
                    aria-label={t('flux.table.resizeColumn')}
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={resizeStart}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-primary/40"
                    style={{ touchAction: 'none' }}
                  />
                ) : null}
              </>
            )}
          </TableHead>
        );
      })}
    </TableRow>
  );
}
