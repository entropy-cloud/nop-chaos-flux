import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input, Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { GanttColumn } from '../gantt.types.js';

interface FilterBarProps {
  columns: GanttColumn[];
  filterText: string;
  onFilterChange: (text: string) => void;
  sortState: { field: string; direction: 'asc' | 'desc' | null };
  onSortChange: (field: string, direction: 'asc' | 'desc' | null) => void;
  groupBy: string | undefined;
  onGroupByChange: (field: string | undefined) => void;
  className?: string;
}

export function FilterBar({
  columns,
  filterText,
  onFilterChange,
  sortState,
  onSortChange,
  groupBy,
  onGroupByChange,
  className,
}: FilterBarProps) {
  const [localText, setLocalText] = useState(filterText);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalText(filterText);
  }, [filterText]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange(value);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onFilterChange]);

  const handleSortToggle = useCallback((field: string) => {
    if (sortState.field === field) {
      if (sortState.direction === 'asc') onSortChange(field, 'desc');
      else if (sortState.direction === 'desc') onSortChange(field, null);
      else onSortChange(field, 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  }, [sortState, onSortChange]);

  const sortableColumns = columns.filter((c) => c.sortable);

  return (
    <div className={cn('nop-gantt-filter-bar flex items-center gap-2 p-1', className)} data-slot="gantt-filter-bar">
      <Input
        placeholder={t('scheduling.gantt.filterTasks')}
        value={localText}
        onChange={handleTextChange}
        className="h-7 text-xs w-40"
      />
      {groupBy !== undefined && (
        <select
          value={groupBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onGroupByChange(e.target.value || undefined)}
          className="h-7 text-xs rounded border border-input bg-background px-2"
        >
          <option value="">{t('scheduling.gantt.noGroup')}</option>
          {sortableColumns.map((col) => (
            <option key={col.name} value={col.name}>{col.label}</option>
          ))}
        </select>
      )}
      {sortableColumns.map((col) => (
        <Button
          key={col.name}
          variant={sortState.field === col.name ? 'default' : 'ghost'}
          size="sm"
          className={cn('h-7 px-1.5 text-xs')}
          onClick={() => handleSortToggle(col.name)}
          aria-sort={
            sortState.field === col.name
              ? sortState.direction === 'asc'
                ? 'ascending'
                : sortState.direction === 'desc'
                  ? 'descending'
                  : 'none'
              : 'none'
          }
          data-slot="gantt-sort-button"
        >
          {col.label}
          {sortState.field === col.name && sortState.direction !== null && (
            <span className="ml-0.5">{sortState.direction === 'asc' ? '▲' : '▼'}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
