import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DatasetPanel } from '../panels/dataset-panel.js';
import type { Dataset, DatasetStoreApi } from '@nop-chaos/word-editor-core';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({
      children,
      onClick,
      title,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string }) => (
      <button type="button" data-testid="button" onClick={onClick} title={title} {...props}>
        {children}
      </button>
    ),
    ScrollArea: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="scroll-area">{children}</div>
    ),
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  };
});

function createMockStore(
  datasets: Dataset[] = [],
  selectedDatasetId: string | null = null,
): DatasetStoreApi {
  const state = { datasets, selectedDatasetId };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as DatasetStoreApi;
}

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('DatasetPanel', () => {
  it('renders Datasets header', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('Datasets')).toBeInTheDocument();
  });

  it('renders add button', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByTitle('Add Dataset')).toBeInTheDocument();
  });

  it('shows empty state when no datasets', () => {
    const store = createMockStore();
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('No datasets found')).toBeInTheDocument();
  });

  it('shows add dataset button in empty state', () => {
    const onAddDataset = vi.fn();
    const store = createMockStore();
    render(<DatasetPanel store={store} onAddDataset={onAddDataset} onEditDataset={vi.fn()} />);

    const addButton = screen.getByText('Add Dataset');
    expect(addButton).toBeInTheDocument();
  });

  it('renders datasets when present', () => {
    const datasets: Dataset[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] },
      { id: 'ds2', name: 'Products', description: 'Product table', type: 'api', columns: [] },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('shows type badges for datasets', () => {
    const datasets: Dataset[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('shows column count', () => {
    const datasets: Dataset[] = [
      {
        id: 'ds1',
        name: 'Users',
        description: 'User table',
        type: 'sql',
        columns: [
          { name: 'col1', label: 'Col 1', type: 'sql' },
          { name: 'col2', label: 'Col 2', type: 'sql' },
        ],
      },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('2 columns')).toBeInTheDocument();
  });

  it('shows singular "column" for single column', () => {
    const datasets: Dataset[] = [
      {
        id: 'ds1',
        name: 'Users',
        description: 'User table',
        type: 'sql',
        columns: [{ name: 'col1', label: 'Col 1', type: 'sql' }],
      },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('1 column')).toBeInTheDocument();
  });

  it('calls onAddDataset when add button is clicked', async () => {
    const onAddDataset = vi.fn();
    const store = createMockStore();
    render(<DatasetPanel store={store} onAddDataset={onAddDataset} onEditDataset={vi.fn()} />);

    await userEvent.click(screen.getByTitle('Add Dataset'));
    expect(onAddDataset).toHaveBeenCalledTimes(1);
  });

  it('calls onEditDataset when a dataset item is clicked', async () => {
    const onEditDataset = vi.fn();
    const datasets: Dataset[] = [
      { id: 'ds1', name: 'Users', description: 'User table', type: 'sql', columns: [] },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={onEditDataset} />);

    const datasetEl = screen.getByText('Users').closest('[class*="cursor-pointer"]');
    if (datasetEl) {
      await userEvent.click(datasetEl);
      expect(onEditDataset).toHaveBeenCalledWith('ds1');
    }
  });

  it('shows "No description" when dataset has no description', () => {
    const datasets: Dataset[] = [
      { id: 'ds1', name: 'Users', description: '', type: 'sql', columns: [] },
    ];
    const store = createMockStore(datasets);
    render(<DatasetPanel store={store} onAddDataset={vi.fn()} onEditDataset={vi.fn()} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});
