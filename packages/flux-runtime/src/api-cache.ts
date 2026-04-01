import type { ApiObject } from '@nop-chaos/flux-core';

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

interface LRUNode {
  key: string;
  data: unknown;
  expiresAt: number;
  prev: LRUNode | null;
  next: LRUNode | null;
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
    }
  };
}

export function generateCacheKey(api: ApiObject): string {
  const method = api.method ?? 'get';
  const url = api.url;
  
  const dataStr = api.data ? JSON.stringify(api.data) : '';
  const paramsStr = api.params ? JSON.stringify(api.params) : '';
  
  return `${method}:${url}:${dataStr}:${paramsStr}`;
}

export function resolveCacheKey(api: ApiObject): string | null {
  if (api.cacheTTL === undefined || api.cacheTTL <= 0) {
    return null;
  }
  return api.cacheKey ?? generateCacheKey(api);
}
