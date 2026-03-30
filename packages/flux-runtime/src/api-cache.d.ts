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
export declare function createApiCacheStore(): ApiCacheStore;
export declare function generateCacheKey(api: ApiObject): string;
export declare function resolveCacheKey(api: ApiObject): string | null;
export {};
