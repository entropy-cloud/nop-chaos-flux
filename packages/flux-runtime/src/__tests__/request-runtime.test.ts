import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import type { ApiObject, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '../registry';
import { createRendererRuntime } from '../index';
import { createScopeRef, createScopeStore } from '../scope';
import {
  createApiRequestExecutor,
  extractScopeData,
  buildUrlWithParams,
  finalizeApiRequest,
  prepareApiData,
  prepareApiRequestForExecution
} from '../request-runtime';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

function createTestScope(data: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data)
  });
}

function createChildScope(parent: ScopeRef, ownData: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'child-scope',
    path: 'child',
    parent,
    store: createScopeStore(ownData)
  });
}

describe('extractScopeData', () => {
  it('returns empty object when includeScope is undefined', () => {
    const scope = createTestScope({ userId: 1, name: 'Alice' });
    const result = extractScopeData(scope, undefined);
    expect(result).toEqual({});
  });

  it('returns all scope data when includeScope is "*" (wildcard)', () => {
    const scope = createTestScope({ userId: 1, name: 'Alice', active: true });
    const result = extractScopeData(scope, '*');
    expect(result).toEqual({ userId: 1, name: 'Alice', active: true });
  });

  it('extracts only specified keys when includeScope is a string array', () => {
    const scope = createTestScope({ userId: 1, name: 'Alice', role: 'admin' });
    const result = extractScopeData(scope, ['userId', 'role']);
    expect(result).toEqual({ userId: 1, role: 'admin' });
  });

  it('skips keys that do not exist in scope', () => {
    const scope = createTestScope({ userId: 1 });
    const result = extractScopeData(scope, ['userId', 'missing', 'alsoMissing']);
    expect(result).toEqual({ userId: 1 });
  });

  it('returns empty object when none of the specified keys exist', () => {
    const scope = createTestScope({ userId: 1 });
    const result = extractScopeData(scope, ['foo', 'bar']);
    expect(result).toEqual({});
  });

  it('reads from parent scope via lexical path resolution', () => {
    const parent = createTestScope({ token: 'abc', shared: 42 });
    const child = createChildScope(parent, { local: 'child-value' });
    const result = extractScopeData(child, ['token', 'shared']);
    expect(result).toEqual({ token: 'abc', shared: 42 });
  });

  it('prefers own-scope value over parent for same key', () => {
    const parent = createTestScope({ role: 'parent-role' });
    const child = createChildScope(parent, { role: 'child-role' });
    const result = extractScopeData(child, ['role']);
    expect(result).toEqual({ role: 'child-role' });
  });

  it('returns empty object for empty string array', () => {
    const scope = createTestScope({ userId: 1 });
    const result = extractScopeData(scope, []);
    expect(result).toEqual({});
  });

  it('extracts nested values via dot-path keys', () => {
    const scope = createTestScope({ user: { name: 'Alice', address: { city: 'NYC' } } });
    const result = extractScopeData(scope, ['user.name']);
    expect(result).toEqual({ 'user.name': 'Alice' });
  });

  it('handles null and falsy scope values', () => {
    const scope = createTestScope({ a: null, b: undefined, c: 0, d: '' });
    const result = extractScopeData(scope, ['a', 'b', 'c', 'd']);
    expect(result).toEqual({ a: null, c: 0, d: '' });
  });
});

describe('buildUrlWithParams', () => {
  it('returns original url when params is undefined', () => {
    expect(buildUrlWithParams('/api/users', undefined)).toBe('/api/users');
  });

  it('returns original url when params is empty object', () => {
    expect(buildUrlWithParams('/api/users', {})).toBe('/api/users');
  });

  it('appends single param with ? separator', () => {
    const result = buildUrlWithParams('/api/users', { status: 'active' });
    expect(result).toBe('/api/users?status=active');
  });

  it('appends multiple params with & separator', () => {
    const result = buildUrlWithParams('/api/users', { status: 'active', page: 1 });
    expect(result).toBe('/api/users?status=active&page=1');
  });

  it('uses & separator when url already has query string', () => {
    const result = buildUrlWithParams('/api/users?existing=true', { page: 2 });
    expect(result).toBe('/api/users?existing=true&page=2');
  });

  it('filters out null and undefined param values', () => {
    const result = buildUrlWithParams('/api/users', { a: null, b: undefined, c: 'keep' });
    expect(result).toBe('/api/users?c=keep');
  });

  it('converts numeric and boolean values to strings', () => {
    const result = buildUrlWithParams('/api', { n: 42, flag: true });
    expect(result).toBe('/api?n=42&flag=true');
  });

  it('returns original url when all param values are null or undefined', () => {
    const result = buildUrlWithParams('/api', { a: null, b: undefined });
    expect(result).toBe('/api');
  });
});

describe('prepareApiData', () => {
  it('returns undefined data and params when no includeScope and no explicit data', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = { url: '/api/test', type: 'test' };
    const result = prepareApiData(api, scope);
    expect(result.data).toBeUndefined();
    expect(result.params).toBeUndefined();
  });

  it('returns extracted scope data when includeScope is set and no explicit data', () => {
    const scope = createTestScope({ userId: 1, projectId: 5 });
    const api: ApiObject = { url: '/api/test', type: 'test', includeScope: ['userId', 'projectId'] };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual({ userId: 1, projectId: 5 });
  });

  it('returns wildcard scope data when includeScope is "*" and no explicit data', () => {
    const scope = createTestScope({ userId: 1, name: 'Alice' });
    const api: ApiObject = { url: '/api/test', type: 'test', includeScope: '*' };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual({ userId: 1, name: 'Alice' });
  });

  it('merges scope data with explicit data, explicit data takes precedence', () => {
    const scope = createTestScope({ userId: 1, projectId: 5 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      includeScope: ['userId', 'projectId'],
      data: { userId: 999, extra: 'value' }
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual({ userId: 999, projectId: 5, extra: 'value' });
  });

  it('uses explicit data as-is when it is not a plain object (string)', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      includeScope: ['userId'],
      data: 'raw-string-data'
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toBe('raw-string-data');
  });

  it('uses explicit array data as-is, ignoring includeScope merge', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      includeScope: ['userId'],
      data: [1, 2, 3]
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it('extracts params when params is a plain object', () => {
    const scope = createTestScope({});
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      params: { page: 1, size: 10 }
    };
    const result = prepareApiData(api, scope);
    expect(result.params).toEqual({ page: 1, size: 10 });
    expect(result.data).toBeUndefined();
  });

  it('ignores params when it is not a plain object', () => {
    const scope = createTestScope({});
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      params: 'not-an-object'
    };
    const result = prepareApiData(api, scope);
    expect(result.params).toBeUndefined();
  });

  it('returns both merged data and params together', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      includeScope: ['userId'],
      data: { extra: 'value' },
      params: { version: 'v2' }
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual({ userId: 1, extra: 'value' });
    expect(result.params).toEqual({ version: 'v2' });
  });

  it('returns data as undefined when includeScope matches no keys and no explicit data', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      includeScope: ['missing']
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toBeUndefined();
  });

  it('handles explicit data without includeScope', () => {
    const scope = createTestScope({ userId: 1 });
    const api: ApiObject = {
      url: '/api/test',
      type: 'test',
      data: { name: 'test' }
    };
    const result = prepareApiData(api, scope);
    expect(result.data).toEqual({ name: 'test' });
  });
});

describe('prepareApiRequestForExecution', () => {
  it('merges includeScope, builds final url, and strips params from executable request', () => {
    const scope = createTestScope({ token: 'abc', projectId: 7 });
    const env = { fetcher: vi.fn(), notify: vi.fn() } as unknown as RendererEnv;
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    const prepared = prepareApiRequestForExecution(
      {
        url: '/api/tasks',
        method: 'post',
        includeScope: ['token'],
        data: { projectId: 99 },
        params: { page: 2, status: 'open' }
      },
      scope,
      env,
      expressionCompiler
    );

    expect(prepared.finalUrl).toBe('/api/tasks?page=2&status=open');
    expect(prepared.data).toEqual({ token: 'abc', projectId: 99 });
    expect(prepared.params).toEqual({ page: 2, status: 'open' });
    expect(prepared.request).toMatchObject({
      url: '/api/tasks?page=2&status=open',
      method: 'post',
      data: { token: 'abc', projectId: 99 }
    });
    expect(prepared.request.params).toBeUndefined();
  });

  it('rebuilds final url after requestAdaptor mutates params and data', () => {
    const scope = createTestScope({ token: 'secure-token' });
    const env = { fetcher: vi.fn(), notify: vi.fn() } as unknown as RendererEnv;
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    const prepared = prepareApiRequestForExecution(
      {
        url: '/api/users',
        method: 'get',
        params: { page: 1 },
        requestAdaptor: 'return {params: {page: api.params.page, token: scope.token}, data: {query: scope.token}};'
      },
      scope,
      env,
      expressionCompiler
    );

    expect(prepared.finalUrl).toBe('/api/users?page=1&token=secure-token');
    expect(prepared.request).toMatchObject({
      url: '/api/users?page=1&token=secure-token',
      method: 'get',
      data: { query: 'secure-token' }
    });
    expect(prepared.request.params).toBeUndefined();
  });
});

describe('finalizeApiRequest', () => {
  it('uses final url instead of params in canonical executable request', () => {
    const finalized = finalizeApiRequest({
      url: '/api/items',
      method: 'get',
      params: { page: 3, filter: 'active' },
      data: { q: 'demo' }
    });

    expect(finalized.finalUrl).toBe('/api/items?page=3&filter=active');
    expect(finalized.request).toEqual({
      url: '/api/items?page=3&filter=active',
      method: 'get',
      data: { q: 'demo' },
      params: undefined
    });
  });
});

describe('createApiRequestExecutor', () => {
  it('treats different params as distinct requests', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const fetcher = vi.fn((api: ApiObject) => new Promise((resolve) => {
      if (api.url.includes('page=1')) {
        resolveFirst = resolve;
        return;
      }

      resolve({ ok: true, status: 200, data: { page: 2 } });
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const firstPromise = execute('ajax', { url: '/api/items', params: { page: 1 } }, scope);
    const secondPromise = execute('ajax', { url: '/api/items', params: { page: 2 } }, scope);

    resolveFirst?.({ ok: true, status: 200, data: { page: 1 } });

    await expect(firstPromise).resolves.toMatchObject({ ok: true, data: { page: 1 } });
    await expect(secondPromise).resolves.toMatchObject({ ok: true, data: { page: 2 } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('supports parallel dedup strategy without cancelling earlier requests', async () => {
    const fetcher = vi.fn(async (api: ApiObject) => ({ ok: true, status: 200, data: { requestId: api.data } }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', data: { requestId: 1 }, dedupStrategy: 'parallel' }, scope);
    const second = execute('ajax', { url: '/api/items', data: { requestId: 2 }, dedupStrategy: 'parallel' }, scope);

    await expect(first).resolves.toMatchObject({ ok: true, data: { requestId: { requestId: 1 } } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { requestId: { requestId: 2 } } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns the in-flight promise for ignore-new dedup strategy', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const fetcher = vi.fn(() => new Promise((resolve) => {
      resolveFirst = resolve;
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', data: { requestId: 1 }, dedupStrategy: 'ignore-new' }, scope);
    const second = execute('ajax', { url: '/api/items', data: { requestId: 1 }, dedupStrategy: 'ignore-new' }, scope);

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFirst?.({ ok: true, status: 200, data: { requestId: 1 } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { requestId: 1 } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { requestId: 1 } });
  });

  it('treats different params as distinct requests for ignore-new dedup strategy', async () => {
    let resolvePageOne: ((value: any) => void) | undefined;
    const fetcher = vi.fn((api: ApiObject) => new Promise((resolve) => {
      if (api.url.includes('page=1')) {
        resolvePageOne = resolve;
        return;
      }

      resolve({ ok: true, status: 200, data: { page: 2 } });
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', params: { page: 1 }, dedupStrategy: 'ignore-new' }, scope);
    const second = execute('ajax', { url: '/api/items', params: { page: 2 }, dedupStrategy: 'ignore-new' }, scope);

    expect(fetcher).toHaveBeenCalledTimes(2);

    resolvePageOne?.({ ok: true, status: 200, data: { page: 1 } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { page: 1 } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { page: 2 } });
  });

  it('reuses the same in-flight fetch only for identical ignore-new request keys', async () => {
    let release: ((value: any) => void) | undefined;
    const fetcher = vi.fn(() => new Promise((resolve) => {
      release = resolve;
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', {
      url: '/api/items',
      params: { page: 1 },
      data: { filter: 'active' },
      headers: { 'x-mode': 'live' },
      dedupStrategy: 'ignore-new'
    }, scope);
    const second = execute('ajax', {
      url: '/api/items',
      params: { page: 1 },
      data: { filter: 'active' },
      headers: { 'x-mode': 'live' },
      dedupStrategy: 'ignore-new'
    }, scope);

    expect(fetcher).toHaveBeenCalledTimes(1);

    release?.({ ok: true, status: 200, data: { ok: true } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { ok: true } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { ok: true } });
  });

  it('dedupes identical final executable requests after adaptor rewrites params into the url', async () => {
    let release: ((value: any) => void) | undefined;
    const fetcher = vi.fn(() => new Promise((resolve) => {
      release = resolve;
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', {
      url: '/api/items?page=1',
      method: 'get',
      dedupStrategy: 'ignore-new'
    }, scope);
    const second = execute('ajax', {
      url: '/api/items',
      method: 'get',
      params: { page: 1 },
      dedupStrategy: 'ignore-new'
    }, scope);

    expect(fetcher).toHaveBeenCalledTimes(1);

    release?.({ ok: true, status: 200, data: { ok: true } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { ok: true } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { ok: true } });
  });
});

describe('createDataSourceController', () => {
  it('stops polling once stopWhen becomes true', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher: vi.fn(async () => {
          callCount += 1;
          return {
            ok: true,
            status: 200,
            data: { status: callCount >= 2 ? 'done' : 'running' }
          };
        }),
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/job' },
      scope: page.scope,
      dataPath: 'job',
      interval: 10,
      stopWhen: '${job.status === "done"}'
    });

    controller.start();
    await vi.runAllTimersAsync();

    expect(callCount).toBe(2);
    expect(page.scope.get('job')).toEqual({ status: 'done' });

    await vi.advanceTimersByTimeAsync(50);
    expect(callCount).toBe(2);
    controller.stop();
    vi.useRealTimers();
  });

  it('aborts the active request when stopped', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcher = vi.fn(async (_api: ApiObject, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });
      if (ctx.signal?.aborted) {
        const error = new Error('aborted');
        (error as Error & { name: string }).name = 'AbortError';
        throw error;
      }
      return { ok: true, status: 200, data: { ok: true } };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/slow' },
      scope: page.scope,
      dataPath: 'payload'
    });

    controller.start();
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    controller.stop();
    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
  });

  it('reuses runtime-local cache across controller refreshes', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'cached' }
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/cache', cacheTTL: 60_000, cacheKey: 'shared-cache' },
      scope: page.scope,
      dataPath: 'payload'
    });

    controller.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    page.scope.update('payload', { value: 'stale-local' });
    await controller.refresh();

    expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('reuses cache for equivalent final executable requests after params canonicalization', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'cached' }
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({ page: 1 });
    const first = runtime.createDataSourceController({
      api: { url: '/api/cache?page=1', cacheTTL: 60_000 },
      scope: page.scope,
      dataPath: 'payload'
    });
    const second = runtime.createDataSourceController({
      api: { url: '/api/cache', params: { page: 1 }, cacheTTL: 60_000 },
      scope: page.scope,
      dataPath: 'payload2'
    });

    first.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    });

    second.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload2')).toEqual({ value: 'cached' });
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    first.stop();
    second.stop();
  });
});
