import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined') {
  const existing = window.localStorage as { setItem?: unknown } | null;
  if (!existing || typeof existing.setItem !== 'function') {
    const store = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key) {
        store.delete(key);
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
    };
    try {
      Object.defineProperty(window, 'localStorage', {
        value: storage,
        configurable: true,
        writable: true,
      });
    } catch {
      // localStorage not redefinable — leave as-is
    }
  }
}
