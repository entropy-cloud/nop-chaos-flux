import { afterEach, beforeEach, vi } from 'vitest';
import { setRecoveryLoadErrorHandler } from '../document-io.js';

export const STORAGE_KEY = 'nop-word-editor-document';
export const DATASET_STORAGE_KEY = 'nop-word-editor-datasets';

export function createLocalStorageMock() {
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

export const localStorageState = {
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
