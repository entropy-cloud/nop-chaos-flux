const DEFAULT_PAGE_CACHE_MAX = 50;

interface PageCacheEntry {
  state: 'pending' | 'resolved';
  // When state is 'pending' this holds the in-flight promise so concurrent callers de-dup.
  // When 'resolved' it holds the settled value.
  pendingPromise?: Promise<unknown>;
  value?: unknown;
}

interface PageCacheConfig {
  max: number;
}

let config: PageCacheConfig = { max: DEFAULT_PAGE_CACHE_MAX };
const store = new Map<string, PageCacheEntry>();

function touch(key: string, entry: PageCacheEntry): void {
  store.delete(key);
  store.set(key, entry);
}

function evictIfNeeded(): void {
  while (store.size > config.max) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }
    store.delete(oldestKey);
  }
}

export function pageCacheKey(locale: string, path: string): string {
  return `${locale}|${path}`;
}

export function readPageCache<T>(key: string):
  | { kind: 'resolved'; value: T }
  | { kind: 'pending'; promise: Promise<T> }
  | { kind: 'miss' } {
  const entry = store.get(key);
  if (!entry) {
    return { kind: 'miss' };
  }

  touch(key, entry);

  if (entry.state === 'pending') {
    return { kind: 'pending', promise: entry.pendingPromise as Promise<T> };
  }

  return { kind: 'resolved', value: entry.value as T };
}

export function setPageCachePending<T>(
  key: string,
  promise: Promise<T>,
): Promise<T> {
  const entry: PageCacheEntry = { state: 'pending', pendingPromise: promise };
  store.set(key, entry);
  evictIfNeeded();

  return promise.then(
    (value) => {
      const resolved = store.get(key);
      if (resolved === entry) {
        store.set(key, { state: 'resolved', value });
      }
      return value;
    },
    (error: unknown) => {
      const resolved = store.get(key);
      if (resolved === entry) {
        store.delete(key);
      }
      throw error;
    },
  );
}

export function clearPageCache(): void {
  store.clear();
}

export function configurePageCache(opts: { max?: number }): void {
  if (typeof opts.max === 'number' && Number.isFinite(opts.max) && opts.max > 0) {
    config = { max: Math.floor(opts.max) };
  }
}

// Test-only access to current config.
export function getPageCacheMax(): number {
  return config.max;
}
