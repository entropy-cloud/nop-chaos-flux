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
      loading: true,
      stale: true,
      value: { value: 'initial' },
      error: undefined
    });

    releaseRequest?.({ ok: true, status: 200, data: { value: 'loaded' } });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'loaded' });
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      loading: false,
      stale: false,
      value: { value: 'loaded' },
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
      loading: false,
      stale: true,
      value: { value: 'initial' }
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
      loading: false,
      stale: false,
      value: 15,
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

  it('applies resultMapping before publishing api-backed data-source values', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({
          ok: true,
          status: 200,
          data: { items: [{ id: 'a-1', label: 'Alice' }], total: 1 } as T
        })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'users-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'usersPayload',
        api: { url: '/api/users' },
        resultMapping: {
          rows: '${payload.items}',
          count: '${payload.total}'
        }
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('usersPayload')).toEqual({
        rows: [{ id: 'a-1', label: 'Alice' }],
        count: 1
      });
    });

    registration.dispose();
  });

  it('applies resultMapping before mergeToScope for formula-backed data sources', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'pricing-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'pricing',
        mergeToScope: true,
        formula: '${{ amount: (price || 0) * (qty || 0), currency: "USD" }}',
        resultMapping: {
          total: '${payload.amount}',
          currencyCode: '${payload.currency}'
        }
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('pricing')).toEqual({ total: 12, currencyCode: 'USD' });
      expect(page.scope.get('total')).toBe(12);
      expect(page.scope.get('currencyCode')).toBe('USD');
    });

    registration.dispose();
  });

  it('publishes data-source status summaries through statusPath', async () => {
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
      id: 'statusful-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'payload',
        statusPath: 'payloadStatus',
        api: { url: '/api/status' },
        initialData: { value: 'initial' }
      }
    });

    expect(page.scope.get('payloadStatus')).toMatchObject({
      started: true,
      loading: true,
      ready: false,
      stale: true,
      error: undefined
    });

    releaseRequest?.({ ok: true, status: 200, data: { value: 'loaded' } });

    await vi.waitFor(() => {
      expect(page.scope.get('payloadStatus')).toMatchObject({
        started: true,
        loading: false,
        ready: true,
        stale: false,
        error: undefined
      });
    });

    registration.dispose();
  });

  it('exposes source debug snapshots through the public runtime contract', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'debug-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'total',
        statusPath: 'totalStatus',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(12);
    });

    expect(runtime.getSourceDebugSnapshot?.()).toEqual({
      sources: [
        expect.objectContaining({
          id: 'debug-source',
          scopeId: page.scope.id,
          name: 'total',
          targetPath: 'total',
          statusPath: 'totalStatus',
          started: true,
          loading: false,
          stale: false,
          hasValue: true,
          error: undefined
        })
      ]
    });

    registration.dispose();
    expect(runtime.getSourceDebugSnapshot?.()).toEqual({ sources: [] });
  });

  it('refreshes registered data sources by id within an explicit scope', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'scoped-total',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 5);

    await expect(runtime.refreshDataSource({ id: 'scoped-total', scope: page.scope })).resolves.toBe(true);
    expect(page.scope.get('total')).toBe(10);

    registration.dispose();
  });

  it('auto-recomputes formula sources when dependent scope paths change', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'auto-total',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
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
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T
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
    const page = runtime.createPageRuntime({ userId: 1, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'user-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/users/${userId}' },
        dataPath: 'payload'
      }
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

  it('refreshes the matching source inside the provided scope when ids collide', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const firstScope = runtime.createChildScope(page.scope, { value: 1 }, { pathSuffix: 'first-source-scope' });
    const secondScope = runtime.createChildScope(page.scope, { value: 10 }, { pathSuffix: 'second-source-scope' });

    const first = runtime.registerDataSource({
      id: 'shared-source',
      scope: firstScope,
      schema: {
        type: 'data-source',
        dataPath: 'derived',
        formula: '${value}'
      }
    });
    const second = runtime.registerDataSource({
      id: 'shared-source',
      scope: secondScope,
      schema: {
        type: 'data-source',
        dataPath: 'derived',
        formula: '${value}'
      }
    });

    await vi.waitFor(() => {
      expect(firstScope.get('derived')).toBe(1);
      expect(secondScope.get('derived')).toBe(10);
    });

    secondScope.update('value', 11);

    await expect(runtime.refreshDataSource({ id: 'shared-source', scope: secondScope })).resolves.toBe(true);

    expect(firstScope.get('derived')).toBe(1);
    expect(secondScope.get('derived')).toBe(11);

    first.dispose();
    second.dispose();
  });

  it('returns false when refreshing an unknown data source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    await expect(runtime.refreshDataSource({ id: 'missing-source', scope: page.scope })).resolves.toBe(false);
  });
});
