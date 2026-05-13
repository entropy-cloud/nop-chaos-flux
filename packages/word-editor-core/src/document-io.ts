import type { CanvasEditorBridge } from './canvas-editor-bridge.js';
import type { PaperSettings } from './paper-settings.js';
import type { WordDocument } from './template-model.js';
import type { Dataset } from './dataset-model.js';
import type { DocChart } from './chart-model.js';
import type { DocCode } from './code-model.js';
import { createDataColumn, createDataset, validateDataset } from './dataset-model.js';
import { DEFAULT_PAPER_SETTINGS } from './paper-settings.js';

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

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

function normalizeWordDocument(value: unknown): WordDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    header: Array.isArray(record.header) ? (record.header as WordDocument['header']) : [],
    main: Array.isArray(record.main) ? (record.main as WordDocument['main']) : [],
    footer: Array.isArray(record.footer) ? (record.footer as WordDocument['footer']) : [],
    charts: Array.isArray(record.charts) ? (record.charts as DocChart[]) : [],
    codes: Array.isArray(record.codes) ? (record.codes as DocCode[]) : [],
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

export function saveDocument(
  bridge: CanvasEditorBridge,
  extras?: { charts?: DocChart[]; codes?: DocCode[] },
): SavedDocumentData {
  const storage = getStorage();
  if (!storage) {
    throw new SaveDocumentError('storage-unavailable', 'Local storage is unavailable.');
  }

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

  const saved = createSavedDocumentData({
    data: {
      header: value.data.header ?? [],
      main: value.data.main,
      footer: value.data.footer ?? [],
      charts: extras?.charts ?? [],
      codes: extras?.codes ?? [],
    },
    paperSettings,
  });

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    throw new SaveDocumentError('storage-write-failed', 'Failed to persist the word document.', {
      cause: error,
    });
  }

  return saved;
}

export function loadDocument(): SavedDocumentData | null {
  try {
    const storage = getStorage();
    if (!storage) return null;

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const data = normalizeWordDocument(parsed.data);
    if (!data) {
      return null;
    }

    return {
      data,
      paperSettings: normalizePaperSettings(parsed.paperSettings),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearDocument(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}

export function saveDatasets(datasets: Dataset[]): void {
  getStorage()?.setItem(DATASET_STORAGE_KEY, JSON.stringify(datasets));
}

function normalizeDataset(value: unknown): Dataset | null {
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
  try {
    const storage = getStorage();
    if (!storage) return [];

    const raw = storage.getItem(DATASET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((dataset) => normalizeDataset(dataset))
      .filter((dataset): dataset is Dataset => dataset !== null);
  } catch {
    return [];
  }
}

export function loadRecoveredState(initialDatasets?: Dataset[]): WordEditorRecoveredState {
  const document = loadDocument();
  const persistedDatasets = loadDatasets();

  return {
    document,
    datasets: persistedDatasets.length > 0 ? persistedDatasets : (initialDatasets ?? []),
  };
}
