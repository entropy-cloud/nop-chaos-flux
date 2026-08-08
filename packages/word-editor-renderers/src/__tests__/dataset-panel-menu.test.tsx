// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DatasetPanel } from '../panels/dataset-panel.js';
import type { Dataset, DatasetStoreApi } from '@nop-chaos/word-editor-core';

const dataset: Dataset = {
  id: 'ds-1',
  name: 'Orders',
  description: '',
  type: 'sql',
  columns: [{ name: 'amount', label: 'Amount', type: 'static' }],
};

function createStore(initial: { datasets: Dataset[]; selectedDatasetId: string | null }) {
  let state = { ...initial };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    select: vi.fn((id: string | null) => {
      state = { ...state, selectedDatasetId: id };
      listeners.forEach((listener) => listener());
    }),
    getAll: () => state.datasets,
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

describe('DatasetPanel interactions', () => {
  it('selects the dataset when its row is clicked', () => {
    const store = createStore({ datasets: [dataset], selectedDatasetId: null });
    const onEdit = vi.fn();

    render(<DatasetPanel store={store} onAddDataset={() => undefined} onEditDataset={onEdit} />);

    fireEvent.click(screen.getByText('Orders'));

    expect(store.select).toHaveBeenCalledWith('ds-1');
    expect(onEdit).toHaveBeenCalledWith('ds-1');
  });

  it('opens the edit dialog from the row menu', () => {
    const store = createStore({ datasets: [dataset], selectedDatasetId: null });
    const onEdit = vi.fn();

    render(<DatasetPanel store={store} onAddDataset={() => undefined} onEditDataset={onEdit} />);

    fireEvent.click(screen.getByTestId('dataset-menu-ds-1'));
    fireEvent.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledWith('ds-1');
  });

  it('deletes the dataset after confirming from the row menu', () => {
    const store = createStore({ datasets: [dataset], selectedDatasetId: null });
    const onDelete = vi.fn();

    render(
      <DatasetPanel
        store={store}
        onAddDataset={() => undefined}
        onEditDataset={() => undefined}
        onDeleteDataset={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('dataset-menu-ds-1'));
    fireEvent.click(screen.getByText('Delete Dataset'));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Dataset' }));

    expect(onDelete).toHaveBeenCalledWith('ds-1');
  });

  it('cancels deletion without calling the delete handler', () => {
    const store = createStore({ datasets: [dataset], selectedDatasetId: null });
    const onDelete = vi.fn();

    render(
      <DatasetPanel
        store={store}
        onAddDataset={() => undefined}
        onEditDataset={() => undefined}
        onDeleteDataset={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('dataset-menu-ds-1'));
    fireEvent.click(screen.getByText('Delete Dataset'));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
