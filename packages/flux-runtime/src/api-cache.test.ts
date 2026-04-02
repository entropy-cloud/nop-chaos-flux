import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiCacheStore, generateCacheKey } from './api-cache';

const LONG_TTL = 60_000;

describe('createApiCacheStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    it('set and get', () => {
      const cache = createApiCacheStore();
      cache.set('key1', { value: 42 }, LONG_TTL);
      const entry = cache.get<{ value: number }>('key1');
      expect(entry).toBeDefined();
      expect(entry!.data).toEqual({ value: 42 });
    });

    it('returns undefined for missing key', () => {
      const cache = createApiCacheStore();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('has returns true for existing entry', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', LONG_TTL);
      expect(cache.has('key1')).toBe(true);
    });

    it('has returns false for missing entry', () => {
      const cache = createApiCacheStore();
      expect(cache.has('missing')).toBe(false);
    });

    it('delete removes entry', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', LONG_TTL);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('delete returns false for missing key', () => {
      const cache = createApiCacheStore();
      expect(cache.delete('missing')).toBe(false);
    });

    it('clear removes all entries', () => {
      const cache = createApiCacheStore();
      cache.set('a', 1, LONG_TTL);
      cache.set('b', 2, LONG_TTL);
      cache.clear();
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('expired entry returns undefined from get', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', 1000);
      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('expired entry returns false from has', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', 1000);
      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });

    it('non-expired entry still accessible', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', 5000);
      vi.advanceTimersByTime(4999);
      expect(cache.get('key1')!.data).toBe('data');
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when exceeding maxEntries (200)', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 201; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      expect(cache.get('key-0')).toBeUndefined();
      expect(cache.get('key-1')).toBeDefined();
      expect(cache.get('key-200')).toBeDefined();
    });

    it('get promotes entry so it is not evicted at capacity', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      expect(cache.get('key-0')!.data).toBe('value-0');
      cache.set('key-200', 'new', LONG_TTL);
      expect(cache.get('key-0')!.data).toBe('value-0');
      expect(cache.get('key-1')).toBeUndefined();
    });

    it('has promotes entry', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      expect(cache.has('key-0')).toBe(true);
      cache.set('key-200', 'new', LONG_TTL);
      expect(cache.has('key-0')).toBe(true);
      expect(cache.has('key-1')).toBe(false);
    });

    it('set on existing key updates value and promotes', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      cache.set('key-0', 'updated', LONG_TTL);
      cache.set('key-200', 'new', LONG_TTL);
      expect(cache.get('key-0')!.data).toBe('updated');
      expect(cache.get('key-1')).toBeUndefined();
    });

    it('delete removes from both map and list', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      cache.delete('key-0');
      cache.set('key-200', 'new', LONG_TTL);
      expect(cache.get('key-0')).toBeUndefined();
      expect(cache.get('key-1')).toBeDefined();
      expect(cache.get('key-200')).toBeDefined();
    });

    it('clear resets everything', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      cache.clear();
      cache.set('new-key', 'new-value', LONG_TTL);
      expect(cache.get('new-key')!.data).toBe('new-value');
      for (let i = 0; i < 200; i++) {
        expect(cache.get(`key-${i}`)).toBeUndefined();
      }
    });

    it('evicts only one entry per insertion over capacity', () => {
      const cache = createApiCacheStore();
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`, LONG_TTL);
      }
      cache.set('key-200', 'v200', LONG_TTL);
      expect(cache.get('key-0')).toBeUndefined();
      cache.set('key-201', 'v201', LONG_TTL);
      expect(cache.get('key-1')).toBeUndefined();
      cache.set('key-202', 'v202', LONG_TTL);
      expect(cache.get('key-2')).toBeUndefined();
    });
  });

  describe('generateCacheKey', () => {
    it('uses stable object-key ordering for params and data', () => {
      const keyA = generateCacheKey({
        method: 'post',
        url: '/api/users',
        data: { a: 1, b: 2 },
        params: { q: 'alice', page: 1 }
      });
      const keyB = generateCacheKey({
        method: 'post',
        url: '/api/users',
        data: { b: 2, a: 1 },
        params: { page: 1, q: 'alice' }
      });

      expect(keyA).toBe(keyB);
    });
  });
});
