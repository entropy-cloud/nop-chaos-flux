import { beforeEach, vi } from 'vitest';

const store = new Map<string, string>();

const localStorageStub: Storage = {
  getItem(key: string) {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    store.set(key, value);
  },
  removeItem(key: string) {
    store.delete(key);
  },
  clear() {
    store.clear();
  },
  key(index: number) {
    return Array.from(store.keys())[index] ?? null;
  },
  get length() {
    return store.size;
  },
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', localStorageStub);
});
