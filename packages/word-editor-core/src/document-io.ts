import type { CanvasEditorBridge } from './canvas-editor-bridge.js';
import type { PaperSettings } from './paper-settings.js';
import type { WordDocument } from './template-model.js';
import type { Dataset } from './dataset-model.js';
import type { DocChart } from './chart-model.js';
import type { DocCode } from './code-model.js';
import { createDataColumn, createDataset, validateDataset } from './dataset-model.js';
import { createDocChart, validateDocChart } from './chart-model.js';
import { createDocCode, validateDocCode } from './code-model.js';
import { DEFAULT_PAPER_SETTINGS } from './paper-settings.js';

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
}

function normalizeChartType(value: unknown): DocChart['chartType'] | undefined {
  return value === 'bar' || value === 'line' || value === 'pie' || value === 'scatter' || value === 'area'
    ? value
    : undefined;
}

function normalizeCodeType(value: unknown): DocCode['codeType'] | undefined {
  return value === 'barcode' || value === 'qrcode' ? value : undefined;
}

const STORAGE_KEY = 'nop-word-editor-document';
const DATASET_STORAGE_KEY = 'nop-word-editor-datasets';

export interface SavedDocumentData {
  data: WordDocument;
  paperSettings: PaperSettings;
  savedAt: string;
}

export interface WordEditorRecoveredState {
  document: SavedDocumentData | null;
  datasets: Dataset[];
}

export type SaveDocumentFailureReason =
  | 'storage-unavailable'
  | 'empty-document'
  | 'bridge-read-failed'
  | 'storage-write-failed';

export class SaveDocumentError extends Error {
  readonly reason: SaveDocumentFailureReason;

  constructor(reason: SaveDocumentFailureReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SaveDocumentError';
    this.reason = reason;
  }
}

export type RecoveryLoadTarget = 'document' | 'datasets';

export type RecoveryLoadFailureReason =
  | 'storage-unavailable'
  | 'storage-read-failed'
  | 'json-parse-failed';

export interface RecoveryLoadError {
  target: RecoveryLoadTarget;
  reason: RecoveryLoadFailureReason;
  error?: unknown;
}

let recoveryLoadErrorHandler: ((error: RecoveryLoadError) => void) | undefined;

function reportRecoveryLoadError(error: RecoveryLoadError): void {
  recoveryLoadErrorHandler?.(error);
}

export function setRecoveryLoadErrorHandler(
  handler: ((error: RecoveryLoadError) => void) | undefined,
): void {
  recoveryLoadErrorHandler = handler;
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

function normalizeWordElements(value: unknown): WordDocument['main'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is WordDocument['main'][number] =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry),
  );
}

export function normalizeDocCharts(value: unknown): DocChart[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const candidate = {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : undefined,
        chartName: typeof record.chartName === 'string' ? record.chartName : undefined,
        chartType: normalizeChartType(record.chartType),
        showChartName:
          typeof record.showChartName === 'boolean' ? record.showChartName : undefined,
        datasetId: typeof record.datasetId === 'string' ? record.datasetId : undefined,
        categoryField: typeof record.categoryField === 'string' ? record.categoryField : undefined,
        valueField: isNonEmptyStringArray(record.valueField) ? record.valueField : undefined,
        seriesField: isNonEmptyStringArray(record.seriesField) ? record.seriesField : undefined,
      };

      const validation = validateDocChart(candidate);
      if (!validation.valid) {
        return null;
      }

      return createDocChart(candidate);
    })
    .filter((chart): chart is DocChart => chart !== null);
}

export function normalizeDocCodes(value: unknown): DocCode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const candidate = {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : undefined,
        codeName: typeof record.codeName === 'string' ? record.codeName : undefined,
        codeType: normalizeCodeType(record.codeType),
        datasetId: typeof record.datasetId === 'string' ? record.datasetId : undefined,
        valueField: typeof record.valueField === 'string' ? record.valueField : undefined,
      };

      const validation = validateDocCode(candidate);
      if (!validation.valid) {
        return null;
      }

      return createDocCode(candidate);
    })
    .filter((code): code is DocCode => code !== null);
}

export function normalizeWordDocument(value: unknown): WordDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    header: normalizeWordElements(record.header),
    main: normalizeWordElements(record.main),
    footer: normalizeWordElements(record.footer),
    charts: normalizeDocCharts(record.charts),
    codes: normalizeDocCodes(record.codes),
  };
}

function normalizePaperSettings(value: unknown): PaperSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PAPER_SETTINGS;
  }

  const record = value as Record<string, unknown>;
  const width = typeof record.width === 'number' ? record.width : DEFAULT_PAPER_SETTINGS.width;
  const height = typeof record.height === 'number' ? record.height : DEFAULT_PAPER_SETTINGS.height;
  const direction =
    record.direction === 'horizontal' || record.direction === 'vertical'
      ? record.direction
      : DEFAULT_PAPER_SETTINGS.direction;
  const margins =
    Array.isArray(record.margins) &&
    record.margins.length === 4 &&
    record.margins.every((entry) => typeof entry === 'number')
      ? ([record.margins[0], record.margins[1], record.margins[2], record.margins[3]] as [
          number,
          number,
          number,
          number,
        ])
      : DEFAULT_PAPER_SETTINGS.margins;

  return {
    width,
    height,
    direction,
    margins,
  };
}

export function createSavedDocumentData(input: {
  data: WordDocument;
  paperSettings: PaperSettings | null | undefined;
  savedAt?: string;
}): SavedDocumentData {
  return {
    data: {
      header: input.data.header ?? [],
      main: input.data.main ?? [],
      footer: input.data.footer ?? [],
      charts: input.data.charts ?? [],
      codes: input.data.codes ?? [],
    },
    paperSettings: input.paperSettings ?? {
      width: 595,
      height: 842,
      direction: 'vertical',
      margins: [100, 120, 100, 120],
    },
    savedAt: input.savedAt ?? new Date().toISOString(),
  };
}

export function captureDocumentSnapshot(
  bridge: CanvasEditorBridge,
  extras?: { charts?: DocChart[]; codes?: DocCode[] },
): SavedDocumentData {
  let value: ReturnType<CanvasEditorBridge['getValue']>;
  let paperSettings: ReturnType<CanvasEditorBridge['getPaperSettings']>;

  try {
    value = bridge.getValue();
    paperSettings = bridge.getPaperSettings();
  } catch (error) {
    throw new SaveDocumentError('bridge-read-failed', 'Failed to read the current word document.', {
      cause: error,
    });
  }

  if (!value) {
    throw new SaveDocumentError('empty-document', 'The editor has no document to save.');
  }

  return createSavedDocumentData({
    data: {
      header: value.data.header ?? [],
      main: value.data.main,
      footer: value.data.footer ?? [],
      charts: extras?.charts ?? [],
      codes: extras?.codes ?? [],
    },
    paperSettings,
  });
}

export function persistSavedDocument(saved: SavedDocumentData): SavedDocumentData {
  const storage = getStorage();
  if (!storage) {
    throw new SaveDocumentError('storage-unavailable', 'Local storage is unavailable.');
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    throw new SaveDocumentError('storage-write-failed', 'Failed to persist the word document.', {
      cause: error,
    });
  }

  return saved;
}

export function saveDocument(
  bridge: CanvasEditorBridge,
  extras?: { charts?: DocChart[]; codes?: DocCode[] },
): SavedDocumentData {
  return persistSavedDocument(captureDocumentSnapshot(bridge, extras));
}

export function loadDocument(): SavedDocumentData | null {
  const storage = getStorage();
  if (!storage) {
    reportRecoveryLoadError({ target: 'document', reason: 'storage-unavailable' });
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    reportRecoveryLoadError({ target: 'document', reason: 'storage-read-failed', error });
    return null;
  }

  if (!raw) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    reportRecoveryLoadError({ target: 'document', reason: 'json-parse-failed', error });
    return null;
  }

  const data = normalizeWordDocument(parsed.data);
  if (!data) {
    return null;
  }

  return {
    data,
    paperSettings: normalizePaperSettings(parsed.paperSettings),
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
  };
}

export function clearDocument(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}

export function saveDatasets(datasets: Dataset[]): void {
  getStorage()?.setItem(DATASET_STORAGE_KEY, JSON.stringify(datasets));
}

export function normalizeDataset(value: unknown): Dataset | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidate = {
    name: typeof record.name === 'string' ? record.name : undefined,
    description: typeof record.description === 'string' ? record.description : '',
    type: typeof record.type === 'string' ? record.type : undefined,
    columns: Array.isArray(record.columns)
      ? record.columns.map((column) => {
          if (!column || typeof column !== 'object' || Array.isArray(column)) {
            return {};
          }

          const columnRecord = column as Record<string, unknown>;
          return {
            name: typeof columnRecord.name === 'string' ? columnRecord.name : undefined,
            label: typeof columnRecord.label === 'string' ? columnRecord.label : undefined,
            description:
              typeof columnRecord.description === 'string' ? columnRecord.description : undefined,
            type: typeof columnRecord.type === 'string' ? columnRecord.type : undefined,
          };
        })
      : undefined,
  };

  const validation = validateDataset(candidate);
  if (!validation.valid) {
    return null;
  }

  return createDataset({
    id: typeof record.id === 'string' && record.id.trim() ? record.id : undefined,
    name: candidate.name,
    description: candidate.description ?? '',
    type: candidate.type as Dataset['type'],
    columns: (candidate.columns ?? []).map((column) =>
      createDataColumn({
        name: column.name,
        label: column.label,
        description: column.description,
        type: column.type as Dataset['columns'][number]['type'],
      }),
    ),
  });
}

export function loadDatasets(): Dataset[] {
  const storage = getStorage();
  if (!storage) {
    reportRecoveryLoadError({ target: 'datasets', reason: 'storage-unavailable' });
    return [];
  }

  let raw: string | null;
  try {
    raw = storage.getItem(DATASET_STORAGE_KEY);
  } catch (error) {
    reportRecoveryLoadError({ target: 'datasets', reason: 'storage-read-failed', error });
    return [];
  }

  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    reportRecoveryLoadError({ target: 'datasets', reason: 'json-parse-failed', error });
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((dataset) => normalizeDataset(dataset))
    .filter((dataset): dataset is Dataset => dataset !== null);
}

export function normalizeDatasets(value: unknown): Dataset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((dataset) => normalizeDataset(dataset))
    .filter((dataset): dataset is Dataset => dataset !== null);
}

export function loadRecoveredState(initialDatasets?: Dataset[]): WordEditorRecoveredState {
  const document = loadDocument();
  const persistedDatasets = loadDatasets();

  return {
    document,
    datasets: persistedDatasets.length > 0 ? persistedDatasets : (initialDatasets ?? []),
  };
}
