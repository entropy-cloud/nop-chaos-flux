import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, Checkbox, cn, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, Input, TableHead, TableRow } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { ArrowUpDownIcon, ChevronDownIcon } from 'lucide-react';
import type { TableColumnSchema, TableSchema } from '../schemas';
import type { FixedColumnLayout } from './fixed-columns';
import type { FilterState, SortState } from './types';

interface TableHeaderRowProps {
  props: RendererComponentProps<TableSchema>;
  columns: TableColumnSchema[];
  sourceLength: number;
  sortState: SortState;
  filterState: FilterState;
  allSelected: boolean;
  selectedRowCount: number;
  fixedColumnLayout: FixedColumnLayout;
  onSort: (column: string) => void;
  onFilter: (column: string, option: string, checked: boolean) => void;
  onSearch: (column: string, keyword: string) => void;
  onSelectAll: (checked: boolean) => void;
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
  onSort,
  onFilter,
  onSearch,
  onSelectAll
}: TableHeaderRowProps) {
  const schemaProps = props.props as TableSchema;

  return (
    <TableRow>
      {schemaProps.expandable ? (
        <TableHead data-slot="table-expand-column" className={fixedColumnLayout.getExpandCellProps().className} style={{ width: '40px', ...fixedColumnLayout.getExpandCellProps().style }}>
          <span className="sr-only">{t('flux.table.expand')}</span>
        </TableHead>
      ) : null}

      {schemaProps.rowSelection ? (
        <TableHead data-slot="table-select-column" className={fixedColumnLayout.getSelectionCellProps().className} style={{ width: '40px', ...fixedColumnLayout.getSelectionCellProps().style }}>
          {schemaProps.rowSelection.type === 'checkbox' && (
            <Checkbox
              checked={allSelected && selectedRowCount === sourceLength && sourceLength > 0}
              onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
            />
          )}
        </TableHead>
      ) : null}

      {columns.map((column, index) => {
        const labelRegion = typeof column.labelRegionKey === 'string' ? props.regions[column.labelRegionKey] : undefined;
        const labelContent = labelRegion?.render() ?? column.label ?? column.name;
        const isSortable = column.sortable === true;
        const filterConfig = typeof column.filterable === 'object' && column.filterable ? column.filterable : undefined;
        const filterOptions = Array.isArray(column.filterOptions) ? column.filterOptions : filterConfig?.options;
        const isFilterable = (column.filterable === true || Boolean(filterConfig)) && Array.isArray(filterOptions) && filterOptions.length > 0;
        const isSearchable = column.searchable === true || Boolean(filterConfig?.searchable);
        const currentSort = sortState.column === column.name ? sortState.direction : null;
        const activeFilters = column.name ? (filterState[column.name]?.values ?? new Set<string>()) : new Set<string>();
        const currentKeyword = column.name ? (filterState[column.name]?.keyword ?? '') : '';
        const columnKey = column.name ?? (typeof column.label === 'string' ? column.label : undefined) ?? `column-${index}`;

        return (
          <TableHead
            key={columnKey}
            className={fixedColumnLayout.getColumnCellProps(column, index).className}
            style={{ ...(column.width ? { width: column.width } : undefined), ...fixedColumnLayout.getColumnCellProps(column, index).style }}
            data-slot="table-head"
            data-fixed={fixedColumnLayout.getColumnCellProps(column, index).fixed || undefined}
            data-interactive={isSortable || isFilterable || undefined}
          >
            {isSortable || isFilterable || isSearchable ? (
              <div className="flex items-center gap-1">
                <span
                  className={isSortable ? 'cursor-pointer hover:text-primary' : ''}
                  onClick={() => isSortable && column.name && onSort(column.name)}
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
                            activeFilters.size > 0 ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-label="Filter"
                        >
                          <span className="sr-only">{t('flux.table.filter')}</span>
                          <ChevronDownIcon className="size-3" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      {isSearchable && column.name ? (
                        <div className="p-2">
                          <Input
                            value={currentKeyword}
                            placeholder={typeof column.searchable === 'object' && column.searchable ? String((column.searchable as { placeholder?: string }).placeholder ?? 'Search') : 'Search'}
                            onChange={(event) => onSearch(column.name!, event.target.value)}
                          />
                        </div>
                      ) : null}
                      {isFilterable ? filterOptions!.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={activeFilters.has(option.value)}
                          onCheckedChange={(checked) => column.name && onFilter(column.name, option.value, checked)}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      )) : null}
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
  );
}
