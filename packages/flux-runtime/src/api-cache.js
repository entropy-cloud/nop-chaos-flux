export function createApiCacheStore() {
    const cache = new Map();
    function isExpired(entry) {
        if (!entry)
            return true;
        return Date.now() > entry.expiresAt;
    }
    return {
        get(key) {
            const entry = cache.get(key);
            if (isExpired(entry)) {
                cache.delete(key);
                return undefined;
            }
            return entry;
        },
        set(key, data, ttl) {
            const expiresAt = Date.now() + ttl;
            cache.set(key, { data, expiresAt });
        },
        has(key) {
            const entry = cache.get(key);
            if (isExpired(entry)) {
                cache.delete(key);
                return false;
            }
            return true;
        },
        delete(key) {
            return cache.delete(key);
        },
        clear() {
            cache.clear();
        }
    };
}
export function generateCacheKey(api) {
    const method = api.method ?? 'get';
    const url = api.url;
    const dataStr = api.data ? JSON.stringify(api.data) : '';
    const paramsStr = api.params ? JSON.stringify(api.params) : '';
    return `${method}:${url}:${dataStr}:${paramsStr}`;
}
export function resolveCacheKey(api) {
    if (api.cacheTTL === undefined || api.cacheTTL <= 0) {
        return null;
    }
    return api.cacheKey ?? generateCacheKey(api);
}
//# sourceMappingURL=api-cache.js.map