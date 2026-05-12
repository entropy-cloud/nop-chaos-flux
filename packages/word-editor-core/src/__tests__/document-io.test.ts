import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSavedDocumentData,
  SaveDocumentError,
  saveDocument,
  loadDocument,
  clearDocument,
  saveDatasets,
  loadDatasets,
  loadRecoveredState,
} from '../document-io.js';
import type { Dataset } from '../dataset-model.js';

const STORAGE_KEY = 'nop-word-editor-document';
const DATASET_STORAGE_KEY = 'nop-word-editor-datasets';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(() => null),
    _store: store,
  };
}

const localStorageState = {
  current: createLocalStorageMock(),
};

beforeEach(() => {
  localStorageState.current = createLocalStorageMock();
  vi.stubGlobal('localStorage', localStorageState.current);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveDocument', () => {
  it('returns saved data and stores it when bridge has value', () => {
    const mockData = {
      data: {
        header: [{ value: 'header' }],
        main: [{ value: 'main' }],
        footer: [{ value: 'footer' }],
      },
    };
    const mockBridge = {
      getValue: vi.fn(() => mockData),
      getPaperSettings: vi.fn(() => ({
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      })),
    } as any;

    const result = saveDocument(mockBridge, {
      charts: [
        {
          id: 'chart_1',
          chartName: 'Revenue',
          chartType: 'bar',
          showChartName: true,
          datasetId: 'ds',
          categoryField: 'month',
          valueField: ['value'],
        },
      ],
      codes: [
        { id: 'code_1', codeName: 'QR', codeType: 'qrcode', datasetId: 'ds', valueField: 'id' },
      ],
    });

    expect(result).not.toBeNull();
    expect(localStorageState.current.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const saved = JSON.parse(localStorageState.current.setItem.mock.calls[0][1]) as any;
    expect(saved.data.main).toEqual([{ value: 'main' }]);
    expect(saved.data.header).toEqual([{ value: 'header' }]);
    expect(saved.data.footer).toEqual([{ value: 'footer' }]);
    expect(saved.data.charts).toHaveLength(1);
    expect(saved.data.codes).toHaveLength(1);
    expect(saved.paperSettings.width).toBe(595);
    expect(saved.savedAt).toBeDefined();
  });

  it('returns null when bridge.getValue() returns null', () => {
    const mockBridge = {
      getValue: vi.fn(() => null),
      getPaperSettings: vi.fn(),
    } as any;

    expect(() => saveDocument(mockBridge)).toThrow(SaveDocumentError);
    expect(localStorageState.current.setItem).not.toHaveBeenCalled();
  });

  it('handles missing header/footer with defaults', () => {
    const mockData = { data: { main: [{ value: 'content' }] } };
    const mockBridge = {
      getValue: vi.fn(() => mockData),
      getPaperSettings: vi.fn(() => null),
    } as any;

    const result = saveDocument(mockBridge);
    expect(result).not.toBeNull();
    const saved = JSON.parse(localStorageState.current.setItem.mock.calls[0][1]) as any;
    expect(saved.data.header).toEqual([]);
    expect(saved.data.footer).toEqual([]);
    expect(saved.data.charts).toEqual([]);
    expect(saved.data.codes).toEqual([]);
    expect(saved.paperSettings).toEqual({
      width: 595,
      height: 842,
      direction: 'vertical',
      margins: [100, 120, 100, 120],
    });
  });

  it('preserves storage write failures with a distinguishable reason', () => {
    const mockBridge = {
      getValue: vi.fn(() => ({ data: { main: [{ value: 'main' }] } })),
      getPaperSettings: vi.fn(() => null),
    } as any;
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    localStorageState.current.setItem.mockImplementation(() => {
      throw quotaError;
    });

    try {
      saveDocument(mockBridge);
      expect.fail('Expected saveDocument to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(SaveDocumentError);
      expect((error as SaveDocumentError).reason).toBe('storage-write-failed');
      expect((error as Error).cause).toBe(quotaError);
    }
  });

  it('normalizes saved document data with defaults', () => {
    const saved = createSavedDocumentData({
      data: {
        header: [],
        main: [{ value: 'hello' }],
        footer: [],
      },
      paperSettings: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(saved.data.charts).toEqual([]);
    expect(saved.data.codes).toEqual([]);
    expect(saved.paperSettings.width).toBe(595);
  });
});

describe('loadDocument', () => {
  it('returns null when no data saved', () => {
    expect(loadDocument()).toBeNull();
  });

  it('returns saved data correctly', () => {
    const saved = {
      data: { header: [], main: [{ value: 'hello' }], footer: [], charts: [], codes: [] },
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    };
    localStorageState.current._store[STORAGE_KEY] = JSON.stringify(saved);

    const result = loadDocument();
    expect(result).toEqual(saved);
  });

  it('upgrades legacy saved documents without chart/code arrays', () => {
    const saved = {
      data: { header: [], main: [{ value: 'legacy' }], footer: [] },
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    };
    localStorageState.current._store[STORAGE_KEY] = JSON.stringify(saved);

    const result = loadDocument();
    expect(result?.data.charts).toEqual([]);
    expect(result?.data.codes).toEqual([]);
  });
});

describe('clearDocument', () => {
  it('removes stored data', () => {
    localStorageState.current._store[STORAGE_KEY] = '{"data":{}}';
    clearDocument();
    expect(localStorageState.current.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

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
