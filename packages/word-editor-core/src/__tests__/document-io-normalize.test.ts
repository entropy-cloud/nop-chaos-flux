import { describe, expect, it } from 'vitest';
import {
  normalizeWordDocument,
  normalizeDocCharts,
  normalizeDocCodes,
  normalizeDataset,
  normalizeDatasets,
} from '../document-io.js';


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
