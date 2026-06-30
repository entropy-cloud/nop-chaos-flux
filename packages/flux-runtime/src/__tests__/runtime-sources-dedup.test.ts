import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime source dedup strategies and isolation', () => {
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

    await expect(runtime.refreshDataSource({ name: 'derived', scope: secondScope })).resolves.toBe(true);

    expect(firstScope.get('derived')).toBe(1);
    expect(secondScope.get('derived')).toBe(11);

    first.dispose();
    second.dispose();
  });

  it('returns false when refreshing an unknown data source name', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    await expect(runtime.refreshDataSource({ name: 'missing-source', scope: page.scope })).resolves.toBe(false);
  });

  it('A15: two co-mounted runtime instances with the same source name are isolated — refresh hits only its own instance', async () => {
    const fetcherA = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url, from: 'A' } as T,
    }));
    const fetcherB = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url, from: 'B' } as T,
    }));

    const runtimeA = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, fetcher: fetcherA as RendererEnv['fetcher'] },
      expressionCompiler,
    });
    const runtimeB = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, fetcher: fetcherB as RendererEnv['fetcher'] },
      expressionCompiler,
    });

    const pageA = runtimeA.createPageRuntime({});
    const pageB = runtimeB.createPageRuntime({});

    // both runtimes register a data-source with the SAME name
    const regA = runtimeA.registerDataSource({
      id: 'shared-name',
      scope: pageA.scope,
      compiledSource: compileDataSource(
        'shared-name',
        { type: 'data-source', action: 'ajax', args: { url: '/api/a' }, name: 'payload' },
        expressionCompiler,
      ),
    });
    const regB = runtimeB.registerDataSource({
      id: 'shared-name',
      scope: pageB.scope,
      compiledSource: compileDataSource(
        'shared-name',
        { type: 'data-source', action: 'ajax', args: { url: '/api/b' }, name: 'payload' },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcherA).toHaveBeenCalledTimes(1);
      expect(fetcherB).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(pageA.scope.get('payload')).toMatchObject({ from: 'A' });
      expect(pageB.scope.get('payload')).toMatchObject({ from: 'B' });
    });

    // refresh in runtime A must not touch runtime B
    await expect(
      runtimeA.refreshDataSource({ name: 'payload', scope: pageA.scope }),
    ).resolves.toBe(true);
    await vi.waitFor(() => {
      expect(fetcherA).toHaveBeenCalledTimes(2);
    });
    expect(fetcherB).toHaveBeenCalledTimes(1);

    // refresh in runtime B touches only B
    await expect(
      runtimeB.refreshDataSource({ name: 'payload', scope: pageB.scope }),
    ).resolves.toBe(true);
    await vi.waitFor(() => {
      expect(fetcherB).toHaveBeenCalledTimes(2);
    });
    expect(fetcherA).toHaveBeenCalledTimes(2);

    regA.dispose();
    regB.dispose();
  });
});
