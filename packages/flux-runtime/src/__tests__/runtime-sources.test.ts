import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type ApiSchema, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime', () => {
  it('registers data sources in a scope-local runtime registry and replaces same-id entries', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { value: api.url } as T,
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const first = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      compiledSource: compileDataSource(
        'users',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/first' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/first' });
    });

    const second = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      compiledSource: compileDataSource(
        'users',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/second' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/second' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    first.dispose();
    second.dispose();
  });

  it('executes ajax data-source producers through action dispatch', async () => {
    const onActionStart = vi.fn();
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { value: api.url } as T,
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: { onActionStart },
        fetcher: fetcherImpl,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'action-routed-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'action-routed-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/action-routed' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/action-routed' });
    });

    expect(onActionStart).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ajax',
        interactionId: expect.any(String),
      }),
    );

    registration.dispose();
  });

  it('disposes registered data sources and aborts their active requests', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(
      _api: ApiSchema,
      ctx: { signal?: AbortSignal },
    ) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });

      if (ctx.signal?.aborted) {
        const error = new Error('aborted');
        (error as Error & { name: string }).name = 'AbortError';
        throw error;
      }

      return {
        ok: true,
        status: 200,
        data: { ok: true } as T,
      };
    };
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'slow-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'slow-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/slow' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    registration.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
  });

  it('exposes source state for api-backed sources across loading and success', async () => {
    let releaseRequest:
      | ((value: { ok: boolean; status: number; data: { value: string } }) => void)
      | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async () =>
      new Promise((resolve) => {
        releaseRequest = resolve as typeof releaseRequest;
      });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'stateful-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'stateful-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/stateful' },
          name: 'payload',
          initialData: { value: 'initial' },
        },
        expressionCompiler,
      ),
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'fetching',
      stale: true,
      hasData: true,
      hasError: false,
      isInitialLoading: false,
      isRefreshing: true,
      inFlightCount: 1,
      data: { value: 'initial' },
      error: undefined,
    });

    releaseRequest?.({ ok: true, status: 200, data: { value: 'loaded' } });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'loaded' });
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'idle',
      stale: false,
      hasData: true,
      hasError: false,
      isInitialLoading: false,
      isRefreshing: false,
      inFlightCount: 0,
      data: { value: 'loaded' },
      error: undefined,
    });

    registration.dispose();
  });

  it('exposes source state for api-backed sources after request failure', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async () => {
      throw new Error('source failed');
    };
    const fetcher = vi.fn(fetcherImpl);
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        notify,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'failing-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'failing-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/fail' },
          name: 'payload',
          initialData: { value: 'initial' },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'source failed');
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'idle',
      stale: true,
      hasData: true,
      hasError: true,
      isInitialLoading: false,
      isRefreshing: false,
      inFlightCount: 0,
      data: { value: 'initial' },
      failureCount: 1,
    });
    expect(registration.controller.getState().error).toBeInstanceOf(Error);

    registration.dispose();
  });

  it('reports publish failures after a successful api response instead of swallowing them', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>() => ({
      ok: true,
      status: 200,
      data: { value: 'loaded' } as T,
    });
    const fetcher = vi.fn(fetcherImpl);
    const notify = vi.fn();
    const onError = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        notify,
        monitor: { onError },
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const originalUpdate = page.scope.update.bind(page.scope);
    const updateSpy = vi.spyOn(page.scope, 'update').mockImplementation((path, value) => {
      if (path === 'payload') {
        throw new Error('publish exploded');
      }

      return originalUpdate(path, value);
    });

    const registration = runtime.registerDataSource({
      id: 'publish-failing-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'publish-failing-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/publish-fail' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'publish exploded');
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'api',
        error: expect.objectContaining({ message: 'publish exploded' }),
      }),
    );
    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'error',
      fetchStatus: 'idle',
      stale: false,
      hasData: false,
      hasError: true,
      isInitialLoading: false,
      isRefreshing: false,
      inFlightCount: 0,
      failureCount: 1,
    });
    expect(registration.controller.getState().error).toBeInstanceOf(Error);

    updateSpy.mockRestore();
    registration.dispose();
  });

  it('registers formula data sources and refreshes derived values through runtime ownership', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'total-source',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(price || 0) * (qty || 0)}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(12);
    });

    page.scope.update('qty', 5);
    await registration.controller.refresh();

    expect(page.scope.get('total')).toBe(15);
    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'idle',
      stale: false,
      hasData: true,
      hasError: false,
      isInitialLoading: false,
      isRefreshing: false,
      inFlightCount: 0,
      data: 15,
      error: undefined,
    });

    registration.dispose();
  });

  it('publishes named data-source values', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'total-source',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(price || 0) * (qty || 0)}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(12);
    });

    registration.dispose();
  });

  it('does not implicitly merge unnamed object-valued data sources into scope', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ existing: 'keep' });

    const registration = runtime.registerDataSource({
      id: 'implicit-merge-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'implicit-merge-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/object' },
          initialData: { merged: true },
        },
        expressionCompiler,
      ),
    });

    await Promise.resolve();

    expect(page.scope.get('merged')).toBeUndefined();
    expect(page.scope.get('existing')).toBe('keep');

    registration.dispose();
  });

  it('shallow-merges named object-valued data sources only when mergeToScope is enabled', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ existing: 'keep' });

    const registration = runtime.registerDataSource({
      id: 'merge-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'merge-source',
        {
          type: 'data-source',
          name: 'payload',
          mergeToScope: true,
          formula: '${{ merged: true, count: 3 }}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ merged: true, count: 3 });
      expect(page.scope.get('merged')).toBe(true);
      expect(page.scope.get('count')).toBe(3);
    });

    registration.dispose();
  });

  it('propagates top-level data-source retry into compiled control and runtime execution', async () => {
    let callCount = 0;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>() => {
      callCount += 1;

      if (callCount < 3) {
        return {
          ok: false,
          status: 500,
          data: { message: `fail-${callCount}` } as T,
        };
      }

      return {
        ok: true,
        status: 200,
        data: { value: 'loaded' } as T,
      };
    };
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const compiledSource = compileDataSource(
      'retrying-source',
      {
        type: 'data-source',
        action: 'ajax',
        args: { url: '/api/retry-source' },
        name: 'payload',
        retry: { times: 2, delay: 0 },
      },
      expressionCompiler,
    );

    expect(compiledSource.control?.retry).toEqual({ times: 2, delay: 0 });

    const registration = runtime.registerDataSource({
      id: 'retrying-source',
      scope: page.scope,
      compiledSource,
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'loaded' });
    });

    expect(callCount).toBe(3);
    registration.dispose();
  });
});
