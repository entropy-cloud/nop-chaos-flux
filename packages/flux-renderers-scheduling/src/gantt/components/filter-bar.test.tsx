import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './filter-bar.js';
import type { GanttColumn } from '../gantt.types.js';

const columns: GanttColumn[] = [
  { name: 'text', label: 'Task', sortable: true },
  { name: 'start', label: 'Start' },
  { name: 'end', label: 'End' },
  { name: 'type', label: 'Type', sortable: true },
];

function getSortButton(container: HTMLElement, name: string): HTMLElement {
  const buttons = container.querySelectorAll('[data-slot="gantt-sort-button"]');
  for (const b of buttons) {
    if (b.textContent?.includes(name)) return b as HTMLElement;
  }
  throw new Error(`Sort button "${name}" not found`);
}

describe('FilterBar', () => {
  it('renders filter input and sort buttons', () => {
    const { container } = render(
      <FilterBar
        columns={columns}
        filterText=""
        onFilterChange={vi.fn()}
        sortState={{ field: '', direction: null }}
        onSortChange={vi.fn()}
        groupBy={undefined}
        onGroupByChange={vi.fn()}
      />,
    );
    const inputs = screen.getAllByPlaceholderText('Filter tasks...');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(getSortButton(container, 'Task')).toBeTruthy();
    expect(getSortButton(container, 'Type')).toBeTruthy();
  });

  it('calls onFilterChange after debounce', async () => {
    vi.useFakeTimers();
    const onFilter = vi.fn();
    render(
      <FilterBar
        columns={columns}
        filterText=""
        onFilterChange={onFilter}
        sortState={{ field: '', direction: null }}
        onSortChange={vi.fn()}
        groupBy={undefined}
        onGroupByChange={vi.fn()}
      />,
    );
    const inputs = screen.getAllByPlaceholderText('Filter tasks...');
    const input = inputs[inputs.length - 1];
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onFilter).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onFilter).toHaveBeenCalledWith('test');
    vi.useRealTimers();
  });

  it('calls onSortChange when sort button clicked', () => {
    const { container } = render(
      <FilterBar
        columns={columns}
        filterText=""
        onFilterChange={vi.fn()}
        sortState={{ field: '', direction: null }}
        onSortChange={vi.fn()}
        groupBy={undefined}
        onGroupByChange={vi.fn()}
      />,
    );
    fireEvent.click(getSortButton(container, 'Task'));
  });

  it('renders groupBy select when groupBy provided', () => {
    render(
      <FilterBar
        columns={columns}
        filterText=""
        onFilterChange={vi.fn()}
        sortState={{ field: '', direction: null }}
        onSortChange={vi.fn()}
        groupBy="text"
        onGroupByChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No group')).toBeTruthy();
  });
});
