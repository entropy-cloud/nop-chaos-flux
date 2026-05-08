import type { ExecutableApiRequest } from '@nop-chaos/flux-core';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ApiCacheStore {
  get<T>(key: string): CacheEntry<T> | undefined;
  set<T>(key: string, data: T, ttl: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
}

const MAX_ENTRIES = 200;
const MAX_STRINGIFY_DEPTH = 12;
const MAX_STRINGIFY_NODES = 2000;

interface LRUNode {
  key: string;
  data: unknown;
  expiresAt: number;
  prev: LRUNode | null;
  next: LRUNode | null;
}

function stableStringifyInternal(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
  budget: { remaining: number },
): string {
  budget.remaining -= 1;
  if (budget.remaining < 0) {
    return '"[MaxNodesExceeded]"';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (depth >= MAX_STRINGIFY_DEPTH) {
    return '"[MaxDepthExceeded]"';
  }

  if (seen.has(value)) {
    return '"[Circular]"';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const result = `[${value
      .map((entry) => stableStringifyInternal(entry, seen, depth + 1, budget))
      .join(',')}]`;
    seen.delete(value);
    return result;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const result = `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringifyInternal(record[key], seen, depth + 1, budget)}`,
    )
    .join(',')}}`;
  seen.delete(value);
  return result;
}

export function stableStringify(value: unknown): string {
  return stableStringifyInternal(value, new WeakSet<object>(), 0, {
    remaining: MAX_STRINGIFY_NODES,
  });
}

export function createApiCacheStore(): ApiCacheStore {
  const cache = new Map<string, LRUNode>();
  let head: LRUNode | null = null;
  let tail: LRUNode | null = null;

  function removeFromList(node: LRUNode): void {
    if (node.prev) node.prev.next = node.next;
    else head = node.next;
    if (node.next) node.next.prev = node.prev;
    else tail = node.prev;
  }

  function pushToFront(node: LRUNode): void {
    node.prev = null;
    node.next = head;
    if (head) head.prev = node;
    head = node;
    if (!tail) tail = node;
  }

  function isExpired(node: LRUNode | undefined): boolean {
    if (!node) return true;
    return Date.now() > node.expiresAt;
  }

  return {
    get<T>(key: string): CacheEntry<T> | undefined {
      const node = cache.get(key);
      if (!node || isExpired(node)) {
        if (node) {
          cache.delete(key);
          removeFromList(node);
        }
        return undefined;
      }
      removeFromList(node);
      pushToFront(node);
      return { data: node.data as T, expiresAt: node.expiresAt };
    },

    set<T>(key: string, data: T, ttl: number): void {
      const expiresAt = Date.now() + ttl;
      const existing = cache.get(key);
      if (existing) {
        existing.data = data;
        existing.expiresAt = expiresAt;
        removeFromList(existing);
        pushToFront(existing);
        return;
      }
      const node: LRUNode = { key, data, expiresAt, prev: null, next: null };
      cache.set(key, node);
      pushToFront(node);
      if (cache.size > MAX_ENTRIES && tail) {
        cache.delete(tail.key);
        removeFromList(tail);
      }
    },

    has(key: string): boolean {
      const node = cache.get(key);
      if (!node || isExpired(node)) {
        if (node) {
          cache.delete(key);
          removeFromList(node);
        }
        return false;
      }
      removeFromList(node);
      pushToFront(node);
      return true;
    },

    delete(key: string): boolean {
      const node = cache.get(key);
      if (!node) return false;
      cache.delete(key);
      removeFromList(node);
      return true;
    },

    clear(): void {
      cache.clear();
      head = null;
      tail = null;
    },
  };
}

export function generateCacheKey(api: ExecutableApiRequest): string {
  const method = api.method ?? 'get';
  const url = api.url;

  const dataStr = api.data ? stableStringify(api.data) : '';

  return `${method}:${url}:${dataStr}`;
}

export function resolveCacheKey(
  api: ExecutableApiRequest,
  control?: { cacheTTL?: number; cacheKey?: string },
): string | null {
  if (control?.cacheTTL === undefined || control.cacheTTL <= 0) {
    return null;
  }
  return control.cacheKey ?? generateCacheKey(api);
}
