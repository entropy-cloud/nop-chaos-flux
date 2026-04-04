import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldList } from '../panels/FieldList.js';
import type { DataSet, DataColumn } from '@nop-chaos/word-editor-core';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, ...props }: any) => (
      <button data-testid="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

function createMockStore(selectedDatasetId: string | null = null, datasets: DataSet[] = []) {
  let state = { datasets, selectedDatasetId };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _setState: (newState: Partial<typeof state>) => {
      state = { ...state, ...newState };
      listeners.forEach(l => l());
    }
  };
}

describe('FieldList', () => {
  it('renders Fields header', () => {
    const store = createMockStore();
    render(<FieldList store={store as any} />);
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });

  it('shows empty state when no dataset is selected', () => {
    const store = createMockStore(null, []);
    render(<FieldList store={store as any} />);
    expect(screen.getByText('No dataset selected')).toBeInTheDocument();
  });

  it('shows empty state for dataset with no columns', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'TestDS', description: '', type: 'static', columns: [] }
    ];
    const store = createMockStore('ds1', datasets);
    render(<FieldList store={store as any} />);
    expect(screen.getByText('No fields in dataset')).toBeInTheDocument();
  });

  it('renders columns when dataset has columns', () => {
    const columns: DataColumn[] = [
      { name: 'col1', label: 'Column 1', type: 'sql' },
      { name: 'col2', label: 'Column 2', type: 'api', description: 'An API column' }
    ];
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'TestDS', description: 'Test', type: 'sql', columns }
    ];
    const store = createMockStore('ds1', datasets);
    render(<FieldList store={store as any} />);

    expect(screen.getByText('col1')).toBeInTheDocument();
    expect(screen.getByText('col2')).toBeInTheDocument();
    expect(screen.getByText('Column 1')).toBeInTheDocument();
    expect(screen.getByText('Column 2')).toBeInTheDocument();
  });

  it('shows type badges for columns', () => {
    const columns: DataColumn[] = [
      { name: 'col1', label: 'Column 1', type: 'sql' }
    ];
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'TestDS', description: '', type: 'sql', columns }
    ];
    const store = createMockStore('ds1', datasets);
    render(<FieldList store={store as any} />);
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('calls onFieldClick when a column is clicked', async () => {
    const onFieldClick = vi.fn();
    const columns: DataColumn[] = [
      { name: 'col1', label: 'Column 1', type: 'sql' }
    ];
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'TestDS', description: '', type: 'sql', columns }
    ];
    const store = createMockStore('ds1', datasets);
    render(<FieldList store={store as any} onFieldClick={onFieldClick} />);

    const buttons = screen.getAllByTestId('button');
    await userEvent.click(buttons[0]);
    expect(onFieldClick).toHaveBeenCalledWith('TestDS', 'col1');
  });

  it('displays column description when present', () => {
    const columns: DataColumn[] = [
      { name: 'col1', label: 'Column 1', type: 'sql', description: 'A description' }
    ];
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'TestDS', description: '', type: 'sql', columns }
    ];
    const store = createMockStore('ds1', datasets);
    render(<FieldList store={store as any} />);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });
});
