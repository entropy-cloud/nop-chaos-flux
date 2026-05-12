import type { CanvasEditorBridge } from './canvas-editor-bridge.js';
import type { PaperSettings } from './paper-settings.js';
import type { WordDocument } from './template-model.js';
import type { Dataset } from './dataset-model.js';
import type { DocChart } from './chart-model.js';
import type { DocCode } from './code-model.js';

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
      paperSettings: parsed.paperSettings as PaperSettings,
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

export function loadDatasets(): Dataset[] {
  try {
    const storage = getStorage();
    if (!storage) return [];

    const raw = storage.getItem(DATASET_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Dataset[];
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
