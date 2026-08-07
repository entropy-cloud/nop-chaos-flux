import { describe, expect, it, vi } from 'vitest';
import {
  saveDatasets,
  loadDatasets,
  loadRecoveredState,
  setRecoveryLoadErrorHandler,
} from '../document-io.js';
import type { Dataset } from '../dataset-model.js';
import { DATASET_STORAGE_KEY, installDocumentIoTestHooks, localStorageState } from './document-io-test-utils.js';

installDocumentIoTestHooks();

describe('saveDatasets', () => {
  it('saves and loads datasets round-trip', () => {
    const datasets: Dataset[] = [
      {
        id: 'ds_1',
        name: 'Users',
        description: 'User data',
        type: 'sql',
        columns: [{ name: 'email', label: 'Email', type: 'sql' }],
      },
      { id: 'ds_2', name: 'Orders', description: 'Order data', type: 'api', columns: [] },
    ];

    saveDatasets(datasets);
    const loaded = loadDatasets();

    expect(loaded).toEqual(datasets);
    expect(localStorageState.current.setItem).toHaveBeenCalledWith(
      DATASET_STORAGE_KEY,
      expect.any(String),
    );
  });

  it('handles empty array', () => {
    saveDatasets([]);
    const loaded = loadDatasets();

    expect(loaded).toEqual([]);
  });
});

describe('loadDatasets', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadDatasets()).toEqual([]);
  });

  it('drops invalid persisted dataset entries instead of blindly casting JSON', () => {
    localStorageState.current._store[DATASET_STORAGE_KEY] = JSON.stringify([
      { id: 'good', name: 'Users', description: '', type: 'sql', columns: [] },
      { id: 'bad', name: '', description: '', type: 'invalid', columns: 'oops' },
    ]);

    expect(loadDatasets()).toEqual([
      { id: 'good', name: 'Users', description: '', type: 'sql', columns: [] },
    ]);
  });

  it('reports dataset recovery read failures without throwing', () => {
    const onRecoveryError = vi.fn();
    setRecoveryLoadErrorHandler(onRecoveryError);
    const securityError = new DOMException('Blocked', 'SecurityError');
    localStorageState.current.getItem.mockImplementation(() => {
      throw securityError;
    });

    expect(loadDatasets()).toEqual([]);
    expect(onRecoveryError).toHaveBeenCalledWith({
      target: 'datasets',
      reason: 'storage-read-failed',
      error: securityError,
    });
  });
});

describe('loadRecoveredState', () => {
  it('prefers persisted datasets over schema seed datasets', () => {
    localStorageState.current._store[DATASET_STORAGE_KEY] = JSON.stringify([
      { id: 'persisted', name: 'Persisted', description: '', type: 'sql', columns: [] },
    ]);

    const recovered = loadRecoveredState([
      { id: 'schema', name: 'Schema', description: '', type: 'api', columns: [] },
    ]);

    expect(recovered.datasets).toEqual([
      { id: 'persisted', name: 'Persisted', description: '', type: 'sql', columns: [] },
    ]);
  });
});
