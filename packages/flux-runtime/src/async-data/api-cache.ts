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

interface StableStringifyResult {
  value: string;
  bounded: boolean;
}

function serializePrimitive(value: unknown): string {
  if (value === undefined) return '"[undefined]"';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '"[NaN]"';
    if (value === Infinity) return '"[Infinity]"';
    if (value === -Infinity) return '"[-Infinity]"';
  }
  return JSON.stringify(value);
}

function stableStringifyInternal(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
  budget: { remaining: number },
): StableStringifyResult {
  budget.remaining -= 1;
  if (budget.remaining < 0) {
    return { value: '"[MaxNodesExceeded]"', bounded: true };
  }

  if (value === null || typeof value !== 'object') {
    return { value: serializePrimitive(value), bounded: false };
  }

  if (depth >= MAX_STRINGIFY_DEPTH) {
    return { value: '"[MaxDepthExceeded]"', bounded: true };
  }

  if (seen.has(value)) {
    return { value: '"[Circular]"', bounded: false };
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const entries = value.map((entry) => stableStringifyInternal(entry, seen, depth + 1, budget));
    const result = `[${entries.map((entry) => entry.value).join(',')}]`;
    seen.delete(value);
    return {
      value: result,
      bounded: entries.some((entry) => entry.bounded),
    };
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => ({
    key,
    result: stableStringifyInternal(record[key], seen, depth + 1, budget),
  }));
  const result = `{${entries
    .map((entry) => `${serializePrimitive(entry.key)}:${entry.result.value}`)
    .join(',')}}`;
  seen.delete(value);
  return {
    value: result,
    bounded: entries.some((entry) => entry.result.bounded),
  };
}

export function stableStringify(value: unknown): string {
  return stableStringifyInternal(value, new WeakSet<object>(), 0, {
    remaining: MAX_STRINGIFY_NODES,
  }).value;
}

function stableStringifyForIdentity(value: unknown): string {
  const result = stableStringifyInternal(value, new WeakSet<object>(), 0, {
    remaining: MAX_STRINGIFY_NODES,
  });

  if (!result.bounded) {
    return result.value;
  }

  return `${result.value}#[fnv1a64:${hashValue64(value)}]`;
}

function hashString64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, '0');
}

function hashValue64(value: unknown): string {
  const seen = new Map<object, number>();
  let nextId = 0;

  const visit = (current: unknown): string => {
    if (current === null || typeof current !== 'object') {
      return `primitive:${serializePrimitive(current)}`;
    }

    const existingId = seen.get(current);
    if (existingId !== undefined) {
      return `ref:${existingId}`;
    }

    const currentId = nextId;
    nextId += 1;
    seen.set(current, currentId);

    if (Array.isArray(current)) {
      return `array:${currentId}:[${current.map((entry) => visit(entry)).join(',')}]`;
    }

    const record = current as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `object:${currentId}:{${keys
      .map((key) => `${serializePrimitive(key)}:${visit(record[key])}`)
      .join(',')}}`;
  };

  return hashString64(visit(value));
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

  const dataStr = api.data !== undefined ? stableStringifyForIdentity(api.data) : '';
  const headersStr = api.headers !== undefined ? stableStringifyForIdentity(api.headers) : '';

  return `${method}:${url}:${headersStr}:${dataStr}`;
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
