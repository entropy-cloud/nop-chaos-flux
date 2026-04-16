import { describe, expect, it, vi } from 'vitest';
import type { ApiObject, RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('registers data sources in a scope-local runtime registry and replaces same-id entries', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { value: api.url } as T
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const first = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/first' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/first' });
    });

    const second = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/second' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/second' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    first.dispose();
    second.dispose();
  });

  it('disposes registered data sources and aborts their active requests', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
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
        data: { ok: true } as T
      };
    };
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'slow-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/slow' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    registration.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
  });

  it('exposes source state for api-backed sources across loading and success', async () => {
    let releaseRequest: ((value: { ok: boolean; status: number; data: { value: string } }) => void) | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async () => new Promise((resolve) => {
      releaseRequest = resolve as typeof releaseRequest;
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'stateful-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/stateful' },
        dataPath: 'payload',
        initialData: { value: 'initial' }
      }
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'fetching',
      stale: true,
      data: { value: 'initial' },
      error: undefined
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
      data: { value: 'loaded' },
      error: undefined
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
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'failing-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/fail' },
        dataPath: 'payload',
        initialData: { value: 'initial' }
      }
    });

    await vi.waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'source failed');
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      status: 'success',
      fetchStatus: 'idle',
      stale: true,
      data: { value: 'initial' },
      failureCount: 1
    });
    expect(registration.controller.getState().error).toBeInstanceOf(Error);

    registration.dispose();
  });

  it('registers formula data sources and refreshes derived values through runtime ownership', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
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
      data: 15,
      error: undefined
    });

    registration.dispose();
  });

  it('publishes named data-source values without requiring dataPath', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ existing: 'keep' });

    const registration = runtime.registerDataSource({
      id: 'implicit-merge-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/object' },
        initialData: { merged: true }
      }
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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ existing: 'keep' });

    const registration = runtime.registerDataSource({
      id: 'merge-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'payload',
        mergeToScope: true,
        formula: '${{ merged: true, count: 3 }}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ merged: true, count: 3 });
      expect(page.scope.get('merged')).toBe(true);
      expect(page.scope.get('count')).toBe(3);
    });

    registration.dispose();
  });
});
