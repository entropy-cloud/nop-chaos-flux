import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRendererRegistry, type ApiSchema, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileAction as _compileAction, compileDataSource } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';
import {
  generateCacheKey,
  createApiCacheStore,
  stableStringify,
  resolveCacheKey,
} from '../async-data/api-cache.js';
import {
  createApiRequestExecutor,
  executeApiSchema,
  buildUrlWithParams,
  extractScopeData as _extractScopeData,
  prepareApiData as _prepareApiData,
  finalizeApiRequest,
} from '../async-data/request-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { createSourceObserver } from '../async-data/source-observer.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function createTestScope(data: Record<string, any>) {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

describe('async data contracts', () => {
  describe('C1 [FIXED]: generateCacheKey falsy data collision', () => {
    it('produces DIFFERENT keys for data:0 and data:undefined', () => {
      const keyWithZero = generateCacheKey({
        url: '/api/test',
        method: 'get',
        data: 0,
      });
      const keyWithUndefined = generateCacheKey({
        url: '/api/test',
        method: 'get',
      });

      expect(keyWithZero).not.toBe(keyWithUndefined);
    });

    it('produces DIFFERENT keys for data:false and data:undefined', () => {
      const keyWithFalse = generateCacheKey({
        url: '/api/test',
        method: 'get',
        data: false,
      });
      const keyWithUndefined = generateCacheKey({
        url: '/api/test',
        method: 'get',
      });

      expect(keyWithFalse).not.toBe(keyWithUndefined);
    });

    it('produces DIFFERENT keys for data:"" and data:undefined', () => {
      const keyWithEmpty = generateCacheKey({
        url: '/api/test',
        method: 'get',
        data: '',
      });
      const keyWithUndefined = generateCacheKey({
        url: '/api/test',
        method: 'get',
      });

      expect(keyWithEmpty).not.toBe(keyWithUndefined);
    });

    it('produces DIFFERENT keys for data:null and data:undefined', () => {
      const keyWithNull = generateCacheKey({
        url: '/api/test',
        method: 'get',
        data: null,
      });
      const keyWithUndefined = generateCacheKey({
        url: '/api/test',
        method: 'get',
      });

      expect(keyWithNull).not.toBe(keyWithUndefined);
    });

    it('regression: generateCacheKey uses undefined check instead of truthy check', () => {
      const keyWithZero = generateCacheKey({ url: '/api', method: 'post', data: 0 });
      const keyWithFalse = generateCacheKey({ url: '/api', method: 'post', data: false });
      const keyWithEmpty = generateCacheKey({ url: '/api', method: 'post', data: '' });
      const keyWithNull = generateCacheKey({ url: '/api', method: 'post', data: null });
      const keyWithUndefined = generateCacheKey({ url: '/api', method: 'post' });

      expect(keyWithZero).not.toBe(keyWithFalse);
      expect(keyWithFalse).not.toBe(keyWithEmpty);
      expect(keyWithEmpty).not.toBe(keyWithNull);
      expect(keyWithNull).not.toBe(keyWithUndefined);
    });
  });

  describe('C2 [BUG]: stableStringify returns undefined for undefined input', () => {
    it('returns undefined (not a string) for undefined input', () => {
      const result = stableStringify(undefined);
      expect(typeof result).not.toBe('string');
      expect(result).toBeUndefined();
    });

    it('returns string for null input', () => {
      const result = stableStringify(null);
      expect(typeof result).toBe('string');
      expect(result).toBe('null');
    });

    it('returns string for NaN input', () => {
      const result = stableStringify(NaN);
      expect(typeof result).toBe('string');
    });

    it('returns string for Infinity input', () => {
      const result = stableStringify(Infinity);
      expect(typeof result).toBe('string');
    });

    it('produces stable keys regardless of object key order', () => {
      const a = stableStringify({ x: 1, y: 2, z: 3 });
      const b = stableStringify({ z: 3, x: 1, y: 2 });
      expect(a).toBe(b);
    });
  });

  describe('C3 [OK]: canonicalizeUrlWithParams via finalizeApiRequest', () => {
    it('canonicalizes single-valued params into the final URL', () => {
      const finalized = finalizeApiRequest({
        url: '/api/items',
        method: 'get',
        params: { page: 1, status: 'active' },
      });

      expect(finalized.finalUrl).toBe('/api/items?page=1&status=active');
      expect(finalized.request.url).toBe('/api/items?page=1&status=active');
      expect(finalized.request.params).toBeUndefined();
    });

    it('overwrites existing query params with canonicalization', () => {
      const finalized = finalizeApiRequest({
        url: '/api/items?page=0',
        method: 'get',
        params: { page: 1 },
      });

      expect(finalized.finalUrl).toBe('/api/items?page=1');
    });

    it('removes params with null values from the URL', () => {
      const finalized = finalizeApiRequest({
        url: '/api/items?debug=1',
        method: 'get',
        params: { debug: null },
      });

      expect(finalized.finalUrl).toBe('/api/items');
    });

    it('converts array params to comma-separated string (not bracket notation)', () => {
      const finalized = finalizeApiRequest({
        url: '/api/items',
        method: 'get',
        params: { ids: [1, 2, 3] },
      });

      expect(finalized.finalUrl).toBe('/api/items?ids=1%2C2%2C3');
    });
  });

  describe('C4 [OK]: cache TTL exact boundary', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('entry is still valid at exactly expiresAt (Date.now() === expiresAt)', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', 1000);

      vi.advanceTimersByTime(1000);

      expect(cache.has('key1')).toBe(true);
      expect(cache.get('key1')!.data).toBe('data');
    });

    it('entry expires 1ms after expiresAt', () => {
      const cache = createApiCacheStore();
      cache.set('key1', 'data', 1000);

      vi.advanceTimersByTime(1001);

      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('C5 [OK]: executeApiSchema error path', () => {
    it('throws generic error when response is not ok and data has no message', async () => {
      const scope = createTestScope({});
      const testEnv = {
        fetcher: vi.fn(async () => ({
          ok: false,
          status: 500,
          data: { error: 'internal' },
        })),
        notify: vi.fn(),
      } as unknown as RendererEnv;

      await expect(
        executeApiSchema({ url: '/api/fail', type: 'test' }, scope, testEnv, expressionCompiler),
      ).rejects.toThrow('Request failed with status 500');
    });

    it('throws with message from response data', async () => {
      const scope = createTestScope({});
      const testEnv = {
        fetcher: vi.fn(async () => ({
          ok: false,
          status: 422,
          data: { message: 'Validation failed' },
        })),
        notify: vi.fn(),
      } as unknown as RendererEnv;

      await expect(
        executeApiSchema({ url: '/api/fail', type: 'test' }, scope, testEnv, expressionCompiler),
      ).rejects.toThrow('Validation failed');
    });

    it('handles ok:false with undefined data', async () => {
      const scope = createTestScope({});
      const testEnv = {
        fetcher: vi.fn(async () => ({
          ok: false,
          status: 404,
          data: undefined as any,
        })),
        notify: vi.fn(),
      } as unknown as RendererEnv;

      await expect(
        executeApiSchema({ url: '/api/fail', type: 'test' }, scope, testEnv, expressionCompiler),
      ).rejects.toThrow('Request failed with status 404');
    });

    it('handles ok:false with null data', async () => {
      const scope = createTestScope({});
      const testEnv = {
        fetcher: vi.fn(async () => ({
          ok: false,
          status: 500,
          data: null as any,
        })),
        notify: vi.fn(),
      } as unknown as RendererEnv;

      await expect(
        executeApiSchema({ url: '/api/fail', type: 'test' }, scope, testEnv, expressionCompiler),
      ).rejects.toThrow('Request failed with status 500');
    });

    it('preserves retry metadata on fetcher-thrown errors', async () => {
      const scope = createTestScope({});
      const testEnv = {
        fetcher: vi.fn(async () => {
          throw new Error('network error');
        }),
        notify: vi.fn(),
      } as unknown as RendererEnv;

      const error = await executeApiSchema(
        { url: '/api/fail', type: 'test' },
        scope,
        testEnv,
        expressionCompiler,
        { control: { retry: { times: 2, delay: 0 } } },
      ).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('network error');
      expect(error.attempts).toBe(3);
      expect(error.failureCount).toBe(3);
    });
  });

  describe('C6 [BUG]: createApiRequestExecutor ignores pre-aborted signal', () => {
    it('does NOT reject when signal is already aborted - forwards to fetcher', async () => {
      const fetcher = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: 'completed',
      }));
      const testEnv = { fetcher } as unknown as RendererEnv;
      const execute = createApiRequestExecutor(() => testEnv);
      const scope = createTestScope({});

      const controller = new AbortController();
      controller.abort();

      const result = await execute('ajax', { url: '/api/test' }, scope, undefined, {
        signal: controller.signal,
      });

      expect(result.ok).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('C7 [OK]: data source controller reset lifecycle', () => {
    it('allows start after reset', async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200, data: { run: 1 } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { run: 2 } });
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});

      const registration = runtime.registerDataSource({
        id: 'reset-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'reset-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/data' },
            name: 'payload',
          },
          expressionCompiler,
        ),
      });

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ run: 1 });
      });

      registration.controller.reset();
      expect(page.scope.get('payload')).toBeUndefined();
      expect(registration.controller.getState()).toMatchObject({
        started: false,
        status: 'idle',
        fetchStatus: 'idle',
        hasData: false,
      });

      registration.controller.start();

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ run: 2 });
      });

      expect(registration.controller.getState()).toMatchObject({
        started: true,
        status: 'success',
        hasData: true,
      });

      registration.dispose();
    });
  });

  describe('C8 [OK]: data source parallel dedup with mixed success/failure', () => {
    it('clears error when second parallel request succeeds after first fails', async () => {
      let callCount = 0;
      let releaseSecond: (() => void) | undefined;
      const fetcher = vi.fn(async <T>(
        _api: ApiSchema,
        _ctx: { signal?: AbortSignal },
      ) => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error('first request failed');
        }
        await new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
        return {
          ok: true,
          status: 200,
          data: { value: 'success' } as T,
        };
      });
      const notify = vi.fn();
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          notify,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({ userId: 1 });

      const registration = runtime.registerDataSource({
        id: 'parallel-mixed-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'parallel-mixed-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/items/${userId}' },
            name: 'payload',
            control: { dedup: 'parallel' },
          },
          expressionCompiler,
        ),
      });

      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });

      await vi.waitFor(() => {
        expect(notify).toHaveBeenCalledWith('error', 'first request failed');
      });

      page.scope.update('userId', 2);

      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(2);
      });

      releaseSecond?.();

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ value: 'success' });
      });

      expect(registration.controller.getState()).toMatchObject({
        status: 'success',
        fetchStatus: 'idle',
        hasData: true,
        hasError: false,
        inFlightCount: 0,
        error: undefined,
      });

      registration.dispose();
    });
  });

  describe('C9 [OK]: data source polling stop', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stops polling when stopWhen condition is met', async () => {
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount += 1;
        return {
          ok: true,
          status: 200,
          data: { status: callCount >= 2 ? 'done' : 'running' },
        };
      });
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});

      const registration = runtime.registerDataSource({
        id: 'polling-stop-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'polling-stop-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/job' },
            name: 'payload',
            interval: 50,
            stopWhen: '${payload.status === "done"}',
          },
          expressionCompiler,
        ),
      });

      await vi.runAllTimersAsync();

      expect(callCount).toBe(2);
      expect(page.scope.get('payload')).toEqual({ status: 'done' });

      registration.dispose();
    });
  });

  describe('C10 [OK]: cache key resolution', () => {
    it('resolveCacheKey returns null when cacheTTL is undefined', () => {
      const result = resolveCacheKey(
        { url: '/api/test', method: 'get' },
        {},
      );
      expect(result).toBeNull();
    });

    it('resolveCacheKey returns null when cacheTTL is 0', () => {
      const result = resolveCacheKey(
        { url: '/api/test', method: 'get' },
        { cacheTTL: 0 },
      );
      expect(result).toBeNull();
    });

    it('resolveCacheKey returns null when cacheTTL is negative', () => {
      const result = resolveCacheKey(
        { url: '/api/test', method: 'get' },
        { cacheTTL: -100 },
      );
      expect(result).toBeNull();
    });

    it('resolveCacheKey uses custom cacheKey when provided', () => {
      const result = resolveCacheKey(
        { url: '/api/test', method: 'get' },
        { cacheTTL: 1000, cacheKey: 'my-custom-key' },
      );
      expect(result).toBe('my-custom-key');
    });

    it('resolveCacheKey generates key from request when no custom key', () => {
      const result = resolveCacheKey(
        { url: '/api/test', method: 'post', data: { a: 1 } },
        { cacheTTL: 1000 },
      );
      expect(result).toBe('post:/api/test:{"a":1}');
    });
  });

  describe('C11 [OK]: buildUrlWithParams array handling', () => {
    it('serializes array values with bracket notation', () => {
      const result = buildUrlWithParams('/api', { ids: [1, 2, 3] });
      expect(result).toBe('/api?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3');
    });

    it('handles empty array by omitting the param', () => {
      const result = buildUrlWithParams('/api', { ids: [] });
      expect(result).toBe('/api');
    });

    it('handles mixed null/undefined items in arrays', () => {
      const result = buildUrlWithParams('/api', { ids: [1, null, undefined, 3] });
      expect(result).toBe('/api?ids%5B%5D=1&ids%5B%5D=3');
    });
  });

  describe('C12 [OK]: createApiRequestExecutor dispose', () => {
    it('aborts all active requests on dispose', async () => {
      let capturedSignal: AbortSignal | undefined;
      let releaseRequest: (() => void) | undefined;
      const fetcher = vi.fn(
        async (_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
          capturedSignal = ctx.signal;
          await new Promise<void>((resolve) => {
            releaseRequest = resolve;
          });
          if (ctx.signal?.aborted) {
            throw Object.assign(new Error('aborted'), { name: 'AbortError' });
          }
          return { ok: true, status: 200, data: null };
        },
      );
      const testEnv = { fetcher } as unknown as RendererEnv;
      const execute = createApiRequestExecutor(() => testEnv);
      const scope = createTestScope({});

      const promise = execute('ajax', { url: '/api/test' }, scope);

      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });

      execute.dispose();

      expect(capturedSignal?.aborted).toBe(true);
      releaseRequest?.();

      await expect(promise).rejects.toThrow('aborted');
    });
  });

  describe('C13 [OK]: source-observer', () => {
    it('resolves all entries and publishes values', async () => {
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env,
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});
      const observer = createSourceObserver(runtime);

      observer.run({
        scope: page.scope,
        entries: [
          { key: 'a', source: { formula: '${1 + 1}' } as any },
          { key: 'b', source: { formula: '${2 + 2}' } as any },
        ],
      });

      await vi.waitFor(() => {
        expect(observer.getSnapshot().value.a).toBe(2);
        expect(observer.getSnapshot().value.b).toBe(4);
      });

      observer.dispose();
    });

    it('aborts previous run when a new run starts', async () => {
      let firstResolve: ((value: unknown) => void) | undefined;
      let secondResolve: ((value: unknown) => void) | undefined;
      let callCount = 0;
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: async <T>() => {
            callCount += 1;
            return new Promise((resolve) => {
              if (callCount === 1) {
                firstResolve = resolve;
              } else {
                secondResolve = resolve;
              }
            }).then(() => ({ ok: true, status: 200, data: { run: callCount } as T }));
          },
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});
      const observer = createSourceObserver(runtime);

      observer.run({
        scope: page.scope,
        entries: [
          {
            key: 'data',
            source: { action: 'ajax', args: { url: '/api/first' } } as any,
          },
        ],
      });

      await vi.waitFor(() => expect(callCount).toBe(1));

      observer.run({
        scope: page.scope,
        entries: [
          {
            key: 'data',
            source: { action: 'ajax', args: { url: '/api/second' } } as any,
          },
        ],
      });

      await vi.waitFor(() => expect(callCount).toBe(2));

      secondResolve?.(undefined);

      await vi.waitFor(() => {
        expect(observer.getSnapshot().value.data).toEqual({ run: 2 });
      });

      firstResolve?.(undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(observer.getSnapshot().value.data).toEqual({ run: 2 });

      observer.dispose();
    });
  });

  describe('C14 [OK]: cache collision with large payloads', () => {
    it('does not collide different payloads truncated at MaxNodesExceeded', () => {
      const payload1 = Array.from({ length: 2505 }, (_, i) => ({ index: i }));
      const payload2 = Array.from({ length: 2505 }, (_, i) => ({ index: i, extra: true }));

      const key1 = stableStringify(payload1);
      const key2 = stableStringify(payload2);

      expect(key1).toContain('[MaxNodesExceeded]');
      expect(key2).toContain('[MaxNodesExceeded]');
      expect(key1).not.toBe(key2);
    });
  });

  describe('C15 [OK]: request dedup strategies', () => {
    it('cancel-previous aborts the in-flight request', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveSecond: ((value: unknown) => void) | undefined;
      const fetcher = vi.fn(
        async (_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
          capturedSignal = ctx.signal;
          if (fetcher.mock.calls.length === 1) {
            return new Promise((_resolve, reject) => {
              ctx.signal?.addEventListener('abort', () => {
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
              }, { once: true });
            });
          }
          return new Promise((resolve) => {
            resolveSecond = resolve;
          }).then(() => ({ ok: true, status: 200, data: null }));
        },
      );
      const testEnv = { fetcher } as unknown as RendererEnv;
      const execute = createApiRequestExecutor(() => testEnv);
      const scope = createTestScope({});

      const first = execute('ajax', { url: '/api/test' }, scope);
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      const firstSignal = capturedSignal;

      const second = execute('ajax', { url: '/api/test' }, scope);
      expect(firstSignal?.aborted).toBe(true);

      resolveSecond?.(undefined);
      const secondResult = await second;
      expect(secondResult.ok).toBe(true);

      await expect(first).rejects.toThrow('aborted');
    });
  });
});
