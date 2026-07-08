const DEFAULT_DICT_CACHE_TTL_MS = 20_000;

interface DictResolvedEntry {
  state: 'resolved';
  value: unknown;
  expiresAt: number;
}

interface DictPendingEntry {
  state: 'pending';
  pendingPromise: Promise<unknown>;
}

type DictCacheEntry = DictResolvedEntry | DictPendingEntry;

interface DictCacheConfig {
  ttlMs: number;
}

let config: DictCacheConfig = { ttlMs: DEFAULT_DICT_CACHE_TTL_MS };
const store = new Map<string, DictCacheEntry>();

export function dictCacheKey(locale: string, name: string): string {
  return `${locale}|${name}`;
}

export function readDictCache<T>(key: string, now: number):
  | { kind: 'resolved'; value: T }
  | { kind: 'pending'; promise: Promise<T> }
  | { kind: 'miss' } {
  const entry = store.get(key);
  if (!entry) {
    return { kind: 'miss' };
  }

  if (entry.state === 'pending') {
    return { kind: 'pending', promise: entry.pendingPromise as Promise<T> };
  }

  if (entry.expiresAt <= now) {
    store.delete(key);
    return { kind: 'miss' };
  }

  return { kind: 'resolved', value: entry.value as T };
}

export function setDictCachePending<T>(key: string, promise: Promise<T>): Promise<T> {
  const entry: DictPendingEntry = { state: 'pending', pendingPromise: promise };
  store.set(key, entry);

  return promise.then(
    (value) => {
      const current = store.get(key);
      if (current === entry) {
        store.set(key, {
          state: 'resolved',
          value,
          expiresAt: Date.now() + config.ttlMs,
        });
      }
      return value;
    },
    (error: unknown) => {
      const current = store.get(key);
      if (current === entry) {
        store.delete(key);
      }
      throw error;
    },
  );
}

export function clearDictCache(): void {
  store.clear();
}

export function configureDictCache(opts: { ttlMs?: number }): void {
  if (typeof opts.ttlMs === 'number' && Number.isFinite(opts.ttlMs) && opts.ttlMs >= 0) {
    config = { ttlMs: opts.ttlMs };
  }
}

// Test-only access to current config.
export function getDictCacheTtl(): number {
  return config.ttlMs;
}
