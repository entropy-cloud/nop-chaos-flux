import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, Checkbox, cn, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, TableHead, TableRow } from '@nop-chaos/ui';
import { ArrowUpDownIcon, ChevronDownIcon } from 'lucide-react';
import type { TableColumnSchema, TableSchema } from '../schemas';
import type { FilterState, SortState } from './types';

interface TableHeaderRowProps {
  props: RendererComponentProps<TableSchema>;
  columns: TableColumnSchema[];
  sourceLength: number;
  sortState: SortState;
  filterState: FilterState;
  allSelected: boolean;
  selectedRowCount: number;
  onSort: (column: string) => void;
  onFilter: (column: string, option: string, checked: boolean) => void;
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
  onSort,
  onFilter,
  onSelectAll
}: TableHeaderRowProps) {
  const schemaProps = props.props as TableSchema;

  return (
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
        const isFilterable = column.filterable === true && Array.isArray(column.filterOptions) && column.filterOptions.length > 0;
        const currentSort = sortState.column === column.name ? sortState.direction : null;
        const activeFilters = column.name ? (filterState[column.name] ?? new Set<string>()) : new Set<string>();
        const columnKey = column.name ?? (typeof column.label === 'string' ? column.label : undefined) ?? `column-${index}`;

        return (
          <TableHead
            key={columnKey}
            style={column.width ? { width: column.width } : undefined}
            data-slot="table-head"
            data-interactive={isSortable || isFilterable || undefined}
          >
            {isSortable || isFilterable ? (
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

                {isFilterable && (
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
                          <span className="sr-only">Filter</span>
                          <ChevronDownIcon className="size-3" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      {column.filterOptions!.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={activeFilters.has(option.value)}
                          onCheckedChange={(checked) => column.name && onFilter(column.name, option.value, checked)}
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
  );
}
