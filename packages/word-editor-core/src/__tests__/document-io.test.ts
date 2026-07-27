import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest';
import {
  captureDocumentSnapshot,
  createSavedDocumentData,
  extractDocChartsFromDocument,
  extractDocCodesFromDocument,
  persistSavedDocument,
  SaveDocumentError,
  setRecoveryLoadErrorHandler,
  saveDocument,
  loadDocument,
  clearDocument,
  saveDatasets,
  loadDatasets,
  loadRecoveredState,
  normalizeWordDocument,
  normalizeDocCharts,
  normalizeDocCodes,
  normalizeDataset,
  normalizeDatasets,
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
  setRecoveryLoadErrorHandler(undefined);
  vi.unstubAllGlobals();
});

describe('saveDocument', () => {
  it('returns saved data and stores it when bridge has value', () => {
    const mockData = {
      data: {
        header: [{ value: 'header' }],
        main: [
          { value: 'main' },
          {
            url: 'xpl:<nop:chart id="chart_1" name="Revenue" type="bar" dataset="ds" category="month" valueField="value" showTitle="true" />',
          },
          {
            url: 'xpl:<nop:code id="code_1" name="QR" type="qrcode" dataset="ds" valueField="id" />',
          },
        ],
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

    const result = saveDocument(mockBridge);

    expect(result).not.toBeNull();
    expect(localStorageState.current.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const saved = JSON.parse(localStorageState.current.setItem.mock.calls[0][1]) as any;
    expect(saved.data.main).toEqual(mockData.data.main);
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

  it('captures a saved snapshot without persisting it yet', () => {
    const mockBridge = {
      getValue: vi.fn(() => ({
        data: {
          header: [],
          main: [
            { value: 'draft' },
            {
              url: 'xpl:<nop:chart id="chart_1" name="Revenue" type="bar" dataset="ds" category="month" valueField="value" showTitle="true" />',
            },
            {
              url: 'xpl:<nop:code id="code_1" name="QR" type="qrcode" dataset="ds" valueField="id" />',
            },
          ],
          footer: [],
        },
      })),
      getPaperSettings: vi.fn(() => null),
    } as any;

    const saved = captureDocumentSnapshot(mockBridge);

    expect(saved.data.main).toEqual(mockBridge.getValue().data.main);
    expect(saved.data.charts).toHaveLength(1);
    expect(saved.data.codes).toHaveLength(1);
    expect(localStorageState.current.setItem).not.toHaveBeenCalled();
  });

  it('prefers explicit paper settings over bridge-derived paper settings', () => {
    const mockBridge = {
      getValue: vi.fn(() => ({ data: { header: [], main: [{ value: 'draft' }], footer: [] } })),
      getPaperSettings: vi.fn(() => ({
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      })),
    } as any;

    const saved = captureDocumentSnapshot(mockBridge, {
      paperSettings: { width: 1000, height: 700, direction: 'horizontal', margins: [1, 2, 3, 4] },
    });

    expect(saved.paperSettings).toEqual({
      width: 1000,
      height: 700,
      direction: 'horizontal',
      margins: [1, 2, 3, 4],
    });
  });

  it('persists a previously captured saved snapshot', () => {
    const saved = createSavedDocumentData({
      data: {
        header: [],
        main: [{ value: 'persisted' }],
        footer: [],
        charts: [],
        codes: [],
      },
      paperSettings: null,
      savedAt: '2026-05-14T00:00:00.000Z',
    });

    const result = persistSavedDocument(saved);

    expect(result).toBe(saved);
    expect(localStorageState.current.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(saved));
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

  it('rebuilds chart/code metadata from live document tags', () => {
    const document = {
      header: [],
      main: [
        { value: 'draft' },
        {
          url: 'xpl:<nop:chart id="chart_1" name="Revenue" type="bar" dataset="ds" category="month" valueField="value1,value2" seriesField="series" showTitle="true" />',
        },
        {
          url: 'xpl:<nop:code id="code_1" name="QR" type="qrcode" dataset="ds" valueField="id" />',
        },
      ],
      footer: [],
    } as any;

    expect(extractDocChartsFromDocument(document)).toEqual([
      {
        id: 'chart_1',
        chartName: 'Revenue',
        chartType: 'bar',
        showChartName: true,
        datasetId: 'ds',
        categoryField: 'month',
        valueField: ['value1', 'value2'],
        seriesField: ['series'],
      },
    ]);
    expect(extractDocCodesFromDocument(document)).toEqual([
      {
        id: 'code_1',
        codeName: 'QR',
        codeType: 'qrcode',
        datasetId: 'ds',
        valueField: 'id',
      },
    ]);
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

  it('drops invalid persisted paper settings instead of blindly trusting JSON shape', () => {
    localStorageState.current._store[STORAGE_KEY] = JSON.stringify({
      data: { header: [], main: [{ value: 'hello' }], footer: [], charts: [], codes: [] },
      paperSettings: {
        width: 'bad',
        height: null,
        direction: 'sideways',
        margins: ['x', 1, 2],
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    });

    const result = loadDocument();

    expect(result?.paperSettings).toEqual({
      width: 595,
      height: 842,
      direction: 'vertical',
      margins: [100, 120, 100, 120],
    });
  });

  it('filters invalid nested persisted document items instead of blindly trusting saved arrays', () => {
    localStorageState.current._store[STORAGE_KEY] = JSON.stringify({
      data: {
        header: [null, { value: 'header' }, 'bad'],
        main: [{ value: 'hello' }, 42, ['bad-child']],
        footer: [{ value: 'footer' }, false],
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
          {
            id: 'chart_2',
            chartName: '',
            chartType: 'bad',
            datasetId: '',
            categoryField: 'month',
            valueField: [],
          },
        ],
        codes: [
          {
            id: 'code_1',
            codeName: 'QR',
            codeType: 'qrcode',
            datasetId: 'ds',
            valueField: 'id',
          },
          {
            id: 'code_2',
            codeName: '',
            codeType: 'bad',
            datasetId: '',
            valueField: '',
          },
        ],
      },
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    });

    const result = loadDocument();

    expect(result?.data.header).toEqual([{ value: 'header' }]);
    expect(result?.data.main).toEqual([{ value: 'hello' }]);
    expect(result?.data.footer).toEqual([{ value: 'footer' }]);
    expect(result?.data.charts).toEqual([
      {
        id: 'chart_1',
        chartName: 'Revenue',
        chartType: 'bar',
        showChartName: true,
        datasetId: 'ds',
        categoryField: 'month',
        valueField: ['value'],
      },
    ]);
    expect(result?.data.codes).toEqual([
      {
        id: 'code_1',
        codeName: 'QR',
        codeType: 'qrcode',
        datasetId: 'ds',
        valueField: 'id',
      },
    ]);
  });

  it('reports storage read failures without throwing', () => {
    const onRecoveryError = vi.fn();
    setRecoveryLoadErrorHandler(onRecoveryError);
    const securityError = new DOMException('Blocked', 'SecurityError');
    localStorageState.current.getItem.mockImplementation(() => {
      throw securityError;
    });

    expect(loadDocument()).toBeNull();
    expect(onRecoveryError).toHaveBeenCalledWith({
      target: 'document',
      reason: 'storage-read-failed',
      error: securityError,
    });
  });

  it('reports JSON parse failures without throwing', () => {
    const onRecoveryError = vi.fn();
    setRecoveryLoadErrorHandler(onRecoveryError);
    localStorageState.current._store[STORAGE_KEY] = '{bad json';

    expect(loadDocument()).toBeNull();
    expect(onRecoveryError).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'document',
        reason: 'json-parse-failed',
      }),
    );
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

describe('normalizeWordDocument', () => {
  it('returns null for null/undefined input', () => {
    expect(normalizeWordDocument(null)).toBeNull();
    expect(normalizeWordDocument(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(normalizeWordDocument('string')).toBeNull();
    expect(normalizeWordDocument(42)).toBeNull();
    expect(normalizeWordDocument(true)).toBeNull();
    expect(normalizeWordDocument([])).toBeNull();
  });

  it('normalizes a valid document with header, main, footer, charts, codes', () => {
    const result = normalizeWordDocument({
      header: [{ value: 'hdr' }],
      main: [{ value: 'body' }],
      footer: [{ value: 'ftr' }],
      charts: [{ id: 'c1', chartName: 'Revenue', chartType: 'bar', datasetId: 'ds', categoryField: 'month', valueField: ['val'] }],
      codes: [{ id: 'd1', codeName: 'QR', codeType: 'qrcode', datasetId: 'ds', valueField: 'id' }],
    });
    expect(result).not.toBeNull();
    expect(result!.header).toEqual([{ value: 'hdr' }]);
    expect(result!.main).toEqual([{ value: 'body' }]);
    expect(result!.footer).toEqual([{ value: 'ftr' }]);
    expect(result!.charts).toHaveLength(1);
    expect(result!.codes).toHaveLength(1);
  });

  it('handles missing optional sections', () => {
    const result = normalizeWordDocument({ main: [{ value: 'body' }] });
    expect(result).not.toBeNull();
    expect(result!.header).toEqual([]);
    expect(result!.main).toEqual([{ value: 'body' }]);
    expect(result!.footer).toEqual([]);
    expect(result!.charts).toEqual([]);
    expect(result!.codes).toEqual([]);
  });

  it('filters invalid elements from header/main/footer', () => {
    const result = normalizeWordDocument({
      header: [null, { value: 'valid' }, 'string', 42],
      main: [{ value: 'ok' }, ['nested-array']],
    });
    expect(result!.header).toEqual([{ value: 'valid' }]);
    expect(result!.main).toEqual([{ value: 'ok' }]);
  });

  it('filters invalid charts', () => {
    const result = normalizeWordDocument({
      main: [{ value: 'body' }],
      charts: [
        null,
        { id: 'c1', chartName: 'Good', chartType: 'bar', datasetId: 'ds', categoryField: 'm', valueField: ['v'] },
        { id: 'c2', chartName: '', chartType: 'bad', datasetId: '', categoryField: '', valueField: [] },
        'string',
      ],
    });
    const charts = result!.charts!;
    expect(charts).toHaveLength(1);
    expect(charts[0].id).toBe('c1');
  });

  it('filters invalid codes', () => {
    const result = normalizeWordDocument({
      main: [{ value: 'body' }],
      codes: [
        { id: 'd1', codeName: 'QR', codeType: 'qrcode', datasetId: 'ds', valueField: 'id' },
        { id: '', codeName: '', codeType: 'unknown', datasetId: '', valueField: '' },
      ],
    });
    const codes = result!.codes!;
    expect(codes).toHaveLength(1);
    expect(codes[0].id).toBe('d1');
  });
});

describe('normalizeDocCharts', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeDocCharts(null)).toEqual([]);
    expect(normalizeDocCharts(undefined)).toEqual([]);
    expect(normalizeDocCharts('string')).toEqual([]);
    expect(normalizeDocCharts({})).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(normalizeDocCharts([])).toEqual([]);
  });

  it('normalizes valid chart entries', () => {
    const charts = [
      { id: 'c1', chartName: 'Revenue', chartType: 'bar', showChartName: true, datasetId: 'ds', categoryField: 'month', valueField: ['val1', 'val2'] },
      { id: 'c2', chartName: 'Growth', chartType: 'line', datasetId: 'ds2', categoryField: 'year', valueField: ['v'], seriesField: ['s1'] },
    ];
    const result = normalizeDocCharts(charts);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });

  it('supports all chart types', () => {
    for (const chartType of ['bar', 'line', 'pie', 'scatter', 'area'] as const) {
      const result = normalizeDocCharts([{ id: 'c', chartName: 'T', chartType, datasetId: 'd', categoryField: 'c', valueField: ['v'] }]);
      expect(result).toHaveLength(1);
      expect(result[0].chartType).toBe(chartType);
    }
  });

  it('rejects invalid chart types', () => {
    const result = normalizeDocCharts([{ id: 'c', chartName: 'T', chartType: 'invalid', datasetId: 'd', categoryField: 'c', valueField: ['v'] }]);
    expect(result).toHaveLength(0);
  });

  it('filters null/non-object entries', () => {
    const result = normalizeDocCharts([null, undefined, 'string', 42, []]);
    expect(result).toHaveLength(0);
  });
});

describe('normalizeDocCodes', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeDocCodes(null)).toEqual([]);
    expect(normalizeDocCodes(undefined)).toEqual([]);
    expect(normalizeDocCodes(42)).toEqual([]);
  });

  it('normalizes valid barcode and qrcode entries', () => {
    const codes = [
      { id: 'd1', codeName: 'Barcode1', codeType: 'barcode', datasetId: 'ds', valueField: 'id' },
      { id: 'd2', codeName: 'QR1', codeType: 'qrcode', datasetId: 'ds', valueField: 'code' },
    ];
    const result = normalizeDocCodes(codes);
    expect(result).toHaveLength(2);
    expect(result[0].codeType).toBe('barcode');
    expect(result[1].codeType).toBe('qrcode');
  });

  it('rejects unknown code types', () => {
    const result = normalizeDocCodes([{ id: 'd1', codeName: 'X', codeType: 'pdf417', datasetId: 'ds', valueField: 'id' }]);
    expect(result).toHaveLength(0);
  });

  it('filters invalid entries', () => {
    const result = normalizeDocCodes([null, { id: '', codeName: '', codeType: 'barcode', datasetId: '', valueField: '' }]);
    expect(result).toHaveLength(0);
  });
});

describe('normalizeDataset', () => {
  it('returns null for null/undefined input', () => {
    expect(normalizeDataset(null)).toBeNull();
    expect(normalizeDataset(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(normalizeDataset('string')).toBeNull();
    expect(normalizeDataset(42)).toBeNull();
    expect(normalizeDataset([])).toBeNull();
  });

  it('normalizes a valid dataset', () => {
    const result = normalizeDataset({
      id: 'ds_1',
      name: 'Users',
      description: 'User dataset',
      type: 'sql',
      columns: [{ name: 'email', label: 'Email', type: 'sql' }],
    });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('ds_1');
    expect(result!.name).toBe('Users');
    expect(result!.columns).toHaveLength(1);
  });

  it('returns null for dataset with empty name (validation fails)', () => {
    const result = normalizeDataset({
      id: 'ds_1',
      name: '',
      type: 'sql',
      columns: [],
    });
    expect(result).toBeNull();
  });

  it('normalizes dataset with non-array columns to empty columns (soft)', () => {
    const result = normalizeDataset({
      id: 'ds_1',
      name: 'Users',
      type: 'sql',
      columns: 'invalid',
    });
    expect(result).not.toBeNull();
    expect(result!.columns).toEqual([]);
  });

});

describe('normalizeDatasets', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeDatasets(null)).toEqual([]);
    expect(normalizeDatasets(undefined)).toEqual([]);
    expect(normalizeDatasets({})).toEqual([]);
  });

  it('normalizes array of valid datasets', () => {
    const result = normalizeDatasets([
      { id: 'ds_1', name: 'Users', description: '', type: 'sql', columns: [] },
      { id: 'ds_2', name: 'Orders', description: '', type: 'api', columns: [] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Users');
    expect(result[1].name).toBe('Orders');
  });

  it('filters invalid dataset entries', () => {
    const result = normalizeDatasets([
      { id: 'good', name: 'Valid', description: '', type: 'sql', columns: [] },
      { id: 'bad', name: '', description: '', type: 'sql', columns: [] },
      null,
      'string',
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good');
  });
});

