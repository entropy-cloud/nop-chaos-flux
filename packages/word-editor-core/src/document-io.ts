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
): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;

    const value = bridge.getValue();
    if (!value) return false;

    const paperSettings = bridge.getPaperSettings();

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

    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
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
