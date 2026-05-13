import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime', () => {
  it('refreshes registered data sources by id within an explicit scope', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'scoped-total',
      scope: page.scope,
      compiledSource: compileDataSource(
        'scoped-total',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(price || 0) * (qty || 0)}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 5);

    await expect(
      runtime.refreshDataSource({ id: 'scoped-total', scope: page.scope }),
    ).resolves.toBe(true);
    expect(page.scope.get('total')).toBe(10);

    registration.dispose();
  });

  it('auto-recomputes formula sources when dependent scope paths change', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'auto-total',
      scope: page.scope,
      compiledSource: compileDataSource(
        'auto-total',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(price || 0) * (qty || 0)}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('note', 'still ignore');
    await Promise.resolve();
    expect(page.scope.get('total')).toBe(6);

    page.scope.update('qty', 4);

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(8);
    });

    registration.dispose();
  });

  it('auto-refreshes api sources when request dependencies change', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ userId: 1, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'user-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'user-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/1' });
    });

    page.scope.update('note', 'still ignore');
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    registration.dispose();
  });

  it('supersedes an in-flight api source refresh with the latest request', async () => {
    let callCount = 0;
    let releaseSecond: (() => void) | undefined;
    const fetcher = vi.fn(async <T>(api: { url: string }, ctx: { signal?: AbortSignal }) => {
      callCount += 1;

      if (callCount === 1) {
        return new Promise((_, reject) => {
          ctx.signal?.addEventListener(
            'abort',
            () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            },
            { once: true },
          );
        }) as Promise<{ ok: true; status: number; data: T }>;
      }

      await new Promise<void>((resolve) => {
        releaseSecond = resolve;
      });

      return {
        ok: true,
        status: 200,
        data: { url: api.url } as T,
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
    const page = runtime.createPageRuntime({ userId: 1 });

    const registration = runtime.registerDataSource({
      id: 'latest-user-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'latest-user-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    releaseSecond?.();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    registration.dispose();
  });

  it('keeps the in-flight api source request when refresh dedup is ignore-new', async () => {
    let callCount = 0;
    let firstSignal: AbortSignal | undefined;
    let releaseFirst: (() => void) | undefined;
    const fetcher = vi.fn(async <T>(api: { url: string }, ctx: { signal?: AbortSignal }) => {
      callCount += 1;

      if (callCount === 1) {
        firstSignal = ctx.signal;
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }

      return {
        ok: true,
        status: 200,
        data: { url: api.url } as T,
      };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ userId: 1 });

    const registration = runtime.registerDataSource({
      id: 'stable-user-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'stable-user-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
          control: {
            dedup: 'ignore-new',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    page.scope.update('userId', 2);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(firstSignal?.aborted).toBe(false);

    releaseFirst?.();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/1' });
    });

    registration.dispose();
  });

  it('allows parallel in-flight api source refreshes when refresh dedup is parallel', async () => {
    let callCount = 0;
    let firstSignal: AbortSignal | undefined;
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const fetcher = vi.fn(async <T>(api: { url: string }, ctx: { signal?: AbortSignal }) => {
      callCount += 1;

      if (callCount === 1) {
        firstSignal = ctx.signal;
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      } else {
        await new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
      }

      return {
        ok: true,
        status: 200,
        data: { url: api.url } as T,
      };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ userId: 1 });

    const registration = runtime.registerDataSource({
      id: 'parallel-user-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'parallel-user-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
          control: {
            dedup: 'parallel',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    expect(firstSignal?.aborted).toBe(false);
    expect(registration.controller.getState()).toMatchObject({
      fetchStatus: 'fetching',
      isInitialLoading: true,
      isRefreshing: false,
      inFlightCount: 2,
      hasData: false,
      hasError: false,
    });

    releaseFirst?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(page.scope.get('payload')).toBeUndefined();

    expect(registration.controller.getState()).toMatchObject({
      fetchStatus: 'fetching',
      isInitialLoading: true,
      isRefreshing: false,
      inFlightCount: 2,
      hasData: false,
      hasError: false,
    });

    releaseSecond?.();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    registration.dispose();
  });

  it('drops late parallel api source results from superseded runs and exposes async diagnostics', async () => {
    let callCount = 0;
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const fetcher = vi.fn(async <T>(api: { url: string }, _ctx?: { signal?: AbortSignal }) => {
      callCount += 1;

      if (callCount === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      } else {
        await new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
      }

      return {
        ok: true,
        status: 200,
        data: { url: api.url } as T,
      };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ userId: 1 });

    const registration = runtime.registerDataSource({
      id: 'parallel-latest-authoritative',
      scope: page.scope,
      compiledSource: compileDataSource(
        'parallel-latest-authoritative',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
          control: {
            dedup: 'parallel',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    releaseSecond?.();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    releaseFirst?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });

    await vi.waitFor(() => {
      const debugSnapshot = runtime.getSourceDebugSnapshot?.();
      const debugEntry = debugSnapshot?.sources.find(
        (entry) => entry.id === 'parallel-latest-authoritative',
      );

      expect(debugEntry?.async?.recentRuns.some((run) => run.outcome === 'stale-dropped')).toBe(
        true,
      );
      expect(debugEntry?.async?.recentRuns.some((run) => run.outcome === 'succeeded')).toBe(true);
    });

    registration.dispose();
  });

  it('drops earlier parallel api source results as soon as a newer run starts', async () => {
    let callCount = 0;
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const fetcher = vi.fn(async <T>(api: { url: string }, _ctx?: { signal?: AbortSignal }) => {
      callCount += 1;

      if (callCount === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      } else {
        await new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
      }

      return {
        ok: true,
        status: 200,
        data: { url: api.url } as T,
      };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ userId: 1 });

    const registration = runtime.registerDataSource({
      id: 'parallel-stale-early-drop',
      scope: page.scope,
      compiledSource: compileDataSource(
        'parallel-stale-early-drop',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}' },
          name: 'payload',
          control: {
            dedup: 'parallel',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    releaseFirst?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(page.scope.get('payload')).toBeUndefined();

    releaseSecond?.();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    await vi.waitFor(() => {
      const debugSnapshot = runtime.getSourceDebugSnapshot?.();
      const debugEntry = debugSnapshot?.sources.find((entry) => entry.id === 'parallel-stale-early-drop');

      expect(debugEntry?.async?.recentRuns.some((run) => run.outcome === 'stale-dropped')).toBe(
        true,
      );
    });

    registration.dispose();
  });

  it('refreshes the matching source inside the provided scope when ids collide', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const firstScope = runtime.createChildScope(
      page.scope,
      { value: 1 },
      { pathSuffix: 'first-source-scope' },
    );
    const secondScope = runtime.createChildScope(
      page.scope,
      { value: 10 },
      { pathSuffix: 'second-source-scope' },
    );

    const first = runtime.registerDataSource({
      id: 'shared-source',
      scope: firstScope,
      compiledSource: compileDataSource(
        'shared-source',
        {
          type: 'data-source',
          name: 'derived',
          formula: '${value}',
        },
        expressionCompiler,
      ),
    });
    const second = runtime.registerDataSource({
      id: 'shared-source',
      scope: secondScope,
      compiledSource: compileDataSource(
        'shared-source',
        {
          type: 'data-source',
          name: 'derived',
          formula: '${value}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(firstScope.get('derived')).toBe(1);
      expect(secondScope.get('derived')).toBe(10);
    });

    secondScope.update('value', 11);

    await expect(
      runtime.refreshDataSource({ id: 'shared-source', scope: secondScope }),
    ).resolves.toBe(true);

    expect(firstScope.get('derived')).toBe(1);
    expect(secondScope.get('derived')).toBe(11);

    first.dispose();
    second.dispose();
  });

  it('returns false when refreshing an unknown data source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    await expect(
      runtime.refreshDataSource({ id: 'missing-source', scope: page.scope }),
    ).resolves.toBe(false);
  });
});
