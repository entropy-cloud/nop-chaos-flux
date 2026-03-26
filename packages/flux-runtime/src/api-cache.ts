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

export function createApiCacheStore(): ApiCacheStore {
  const cache = new Map<string, CacheEntry<unknown>>();

  function isExpired<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  return {
    get<T>(key: string): CacheEntry<T> | undefined {
      const entry = cache.get(key) as CacheEntry<T> | undefined;
      if (isExpired(entry)) {
        cache.delete(key);
        return undefined;
      }
      return entry;
    },

    set<T>(key: string, data: T, ttl: number): void {
      const expiresAt = Date.now() + ttl;
      cache.set(key, { data, expiresAt });
    },

    has(key: string): boolean {
      const entry = cache.get(key);
      if (isExpired(entry)) {
        cache.delete(key);
        return false;
      }
      return true;
    },

    delete(key: string): boolean {
      return cache.delete(key);
    },

    clear(): void {
      cache.clear();
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
