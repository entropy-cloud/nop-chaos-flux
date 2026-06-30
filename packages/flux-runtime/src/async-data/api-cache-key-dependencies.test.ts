import { describe, expect, it } from 'vitest';
import { generateCacheKey, resolveCacheKey } from './api-cache.js';

// S5 contract: the api cache key is derived from the FULLY MATERIALISED request
// (method/url/headers/data). Upstream, `evaluateSingleAjaxAction` resolves every
// `${dep}` against the scope BEFORE the request reaches `generateCacheKey`, so a
// change in any dependency variable — even when the search keyword is unchanged —
// produces a different materialised `data` payload and therefore a different key,
// forcing a fresh request. These tests lock that dependency-sensitivity at the
// cache-key layer (`api-cache.ts:245` generateCacheKey / `:255` resolveCacheKey).

describe('S5: api cache key includes all materialized dependencies', () => {
  it('produces a different key when a dependency field changes but the keyword stays the same', () => {
    const keyA = generateCacheKey({
      method: 'get',
      url: '/api/search',
      data: { keyword: 'shared-query', region: 'A' },
    });
    const keyB = generateCacheKey({
      method: 'get',
      url: '/api/search',
      data: { keyword: 'shared-query', region: 'B' },
    });

    expect(keyA).not.toBe(keyB);
  });

  it('produces a different key when the keyword changes but the dependency stays the same', () => {
    const keyA = generateCacheKey({
      method: 'get',
      url: '/api/search',
      data: { keyword: 'first', region: 'A' },
    });
    const keyB = generateCacheKey({
      method: 'get',
      url: '/api/search',
      data: { keyword: 'second', region: 'A' },
    });

    expect(keyA).not.toBe(keyB);
  });

  it('produces a stable key when all dependencies are unchanged', () => {
    const data = { keyword: 'q', region: 'A', extra: { nested: true } };
    const keyA = generateCacheKey({ method: 'get', url: '/api/search', data });
    const keyB = generateCacheKey({ method: 'get', url: '/api/search', data });

    expect(keyA).toBe(keyB);
  });

  it('resolveCacheKey returns the dependency-sensitive key when cacheTTL is enabled', () => {
    const request = { method: 'get', url: '/api/search', data: { keyword: 'q', region: 'A' } };
    const control = { cacheTTL: 60_000 };

    const resolvedA = resolveCacheKey(request, control);
    const resolvedB = resolveCacheKey(
      { ...request, data: { keyword: 'q', region: 'B' } },
      control,
    );

    expect(resolvedA).not.toBeNull();
    expect(resolvedB).not.toBeNull();
    expect(resolvedA).not.toBe(resolvedB);
  });

  it('resolveCacheKey returns null when caching is disabled (cacheTTL unset)', () => {
    const request = { method: 'get', url: '/api/search', data: { keyword: 'q', region: 'A' } };
    expect(resolveCacheKey(request, { cacheTTL: 0 })).toBeNull();
    expect(resolveCacheKey(request, undefined)).toBeNull();
  });
});
