import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatasetPanel } from '../panels/DatasetPanel.js';
import type { DataSet } from '@nop-chaos/word-editor-core';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, title, ...props }: any) => (
      <button data-testid="button" onClick={onClick} title={title} {...props}>
        {children}
      </button>
    ),
    ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

function createMockStore(datasets: DataSet[] = [], selectedDatasetId: string | null = null) {
  const state = { datasets, selectedDatasetId };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

describe('DatasetPanel', () => {
  it('renders Datasets header', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('Datasets')).toBeInTheDocument();
  });

  it('renders add button', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByTitle('Add Dataset')).toBeInTheDocument();
  });

  it('shows empty state when no datasets', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('No datasets found')).toBeInTheDocument();
  });

  it('shows add dataset button in empty state', () => {
    const onAddDataset = vi.fn();
    const store = createMockStore();
    render(<DatasetPanel store={store as any} onAddDataset={onAddDataset} onEditDataset={vi.fn()} />);

    const addButton = screen.getByText('Add Dataset');
    expect(addButton).toBeInTheDocument();
  });

  it('renders datasets when present', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] },
      { id: 'ds2', name: 'Products', description: 'Product table', type: 'api', columns: [] }
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('shows type badges for datasets', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] }
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('shows column count', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [
        { name: 'col1', label: 'Col 1', type: 'sql' },
        { name: 'col2', label: 'Col 2', type: 'sql' }
      ]}
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('2 columns')).toBeInTheDocument();
  });

  it('shows singular "column" for single column', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [
        { name: 'col1', label: 'Col 1', type: 'sql' }
      ]}
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('1 column')).toBeInTheDocument();
  });

  it('calls onAddDataset when add button is clicked', async () => {
    const onAddDataset = vi.fn();
    const store = createMockStore();
    render(<DatasetPanel store={store as any} onAddDataset={onAddDataset} onEditDataset={vi.fn()} />);

    await userEvent.click(screen.getByTitle('Add Dataset'));
    expect(onAddDataset).toHaveBeenCalledTimes(1);
  });

  it('calls onEditDataset when a dataset item is clicked', async () => {
    const onEditDataset = vi.fn();
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] }
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={onEditDataset} />);

    const datasetEl = screen.getByText('Users').closest('[class*="cursor-pointer"]');
    if (datasetEl) {
      await userEvent.click(datasetEl);
      expect(onEditDataset).toHaveBeenCalledWith('ds1');
    }
  });

  it('shows "No description" when dataset has no description', () => {
    const datasets: DataSet[] = [
      { id: 'ds1', name: 'Users', description: '', type: 'sql', columns: [] }
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store as any} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});
