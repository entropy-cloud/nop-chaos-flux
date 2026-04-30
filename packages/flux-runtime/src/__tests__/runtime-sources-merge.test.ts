import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime', () => {
  it('applies resultMapping before publishing api-backed data-source values', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({
          ok: true,
          status: 200,
          data: { items: [{ id: 'a-1', label: 'Alice' }], total: 1 } as T,
        }),
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'users-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'users-source',
        {
          type: 'data-source',
          name: 'usersPayload',
          action: 'ajax',
          args: { url: '/api/users' },
          resultMapping: {
            rows: '${payload.items}',
            count: '${payload.total}',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('usersPayload')).toEqual({
        rows: [{ id: 'a-1', label: 'Alice' }],
        count: 1,
      });
    });

    registration.dispose();
  });

  it('applies resultMapping before mergeToScope for formula-backed data sources', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'pricing-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'pricing-source',
        {
          type: 'data-source',
          name: 'pricing',
          mergeToScope: true,
          formula: '${{ amount: (price || 0) * (qty || 0), currency: "USD" }}',
          resultMapping: {
            total: '${payload.amount}',
            currencyCode: '${payload.currency}',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('pricing')).toEqual({ total: 12, currencyCode: 'USD' });
      expect(page.scope.get('total')).toBe(12);
      expect(page.scope.get('currencyCode')).toBe('USD');
    });

    registration.dispose();
  });

  it('appends formula-backed data-source arrays onto the current published value', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'append-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'append-source',
        {
          type: 'data-source',
          name: 'items',
          mergeStrategy: 'append',
          initialData: [1],
          formula: '${[2, 3]}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('items')).toEqual([1, 2, 3]);
    });

    registration.dispose();
  });

  it('prepends api-backed data-source arrays onto the current published value', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({
          ok: true,
          status: 200,
          data: [1, 2] as T,
        }),
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'prepend-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'prepend-source',
        {
          type: 'data-source',
          name: 'items',
          mergeStrategy: 'prepend',
          initialData: [3],
          action: 'ajax',
          args: { url: '/api/items' },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('items')).toEqual([1, 2, 3]);
    });

    registration.dispose();
  });

  it('merges object-shaped formula-backed data-source values into the current published object', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'merge-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'merge-source',
        {
          type: 'data-source',
          name: 'payload',
          mergeStrategy: 'merge',
          initialData: { keep: true, count: 1 },
          formula: '${{ count: 2, added: "yes" }}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ keep: true, count: 2, added: 'yes' });
    });

    registration.dispose();
  });

  it('upserts keyed array items for formula-backed data sources using mergeKey', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'upsert-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'upsert-source',
        {
          type: 'data-source',
          name: 'rows',
          mergeStrategy: 'upsert',
          mergeKey: 'id',
          initialData: [
            { id: 1, label: 'Old one', keep: true },
            { id: 2, label: 'Keep me' },
            { note: 'passthrough' },
          ],
          formula: '${[{ id: 1, label: "New one" }, { id: 3, label: "Added" }]}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('rows')).toEqual([
        { id: 1, label: 'New one', keep: true },
        { id: 2, label: 'Keep me' },
        { note: 'passthrough' },
        { id: 3, label: 'Added' },
      ]);
    });

    registration.dispose();
  });

  it('applies resultMapping before cached api-backed merge publication', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>() => ({
      ok: true,
      status: 200,
      data: { items: [2, 3] } as T,
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
    const page = runtime.createPageRuntime({});

    const first = runtime.registerDataSource({
      id: 'cached-mapped-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'cached-mapped-source',
        {
          type: 'data-source',
          name: 'payload',
          mergeStrategy: 'merge',
          initialData: { seeded: true },
          action: 'ajax',
          args: { url: '/api/items' },
          control: { cacheTTL: 60_000 },
          resultMapping: {
            rows: '${payload.items}',
            count: '${payload.items.length}',
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({
        seeded: true,
        rows: [2, 3],
        count: 2,
      });
    });

    page.scope.update('payload', { seeded: false, localOnly: true });
    await first.controller.refresh();

    expect(page.scope.get('payload')).toEqual({
      seeded: false,
      localOnly: true,
      rows: [2, 3],
      count: 2,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    first.dispose();
  });

  it('publishes data-source status summaries through statusPath', async () => {
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
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'statusful-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'statusful-source',
        {
          type: 'data-source',
          name: 'payload',
          statusPath: 'payloadStatus',
          action: 'ajax',
          args: { url: '/api/status' },
          initialData: { value: 'initial' },
        },
        expressionCompiler,
      ),
    });

    expect(page.scope.get('payloadStatus')).toMatchObject({
      started: true,
      loading: true,
      ready: false,
      stale: true,
      hasData: true,
      hasError: false,
      isInitialLoading: false,
      isRefreshing: true,
      inFlightCount: 1,
      failureCount: 0,
      error: undefined,
    });

    releaseRequest?.({ ok: true, status: 200, data: { value: 'loaded' } });

    await vi.waitFor(() => {
      expect(page.scope.get('payloadStatus')).toMatchObject({
        started: true,
        loading: false,
        ready: true,
        stale: false,
        hasData: true,
        hasError: false,
        isInitialLoading: false,
        isRefreshing: false,
        inFlightCount: 0,
        failureCount: 0,
        error: undefined,
      });
    });

    registration.dispose();
  });

  it('skips replace-style target publication when the fetched payload is shallow-equal', async () => {
    let callCount = 0;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>() => {
      callCount += 1;
      return {
        ok: true,
        status: 200,
        data: { value: 'same' } as T,
      };
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: fetcherImpl,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'shared-ref-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'shared-ref-source',
        {
          type: 'data-source',
          name: 'payload',
          action: 'ajax',
          args: { url: '/api/same' },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'same' });
    });

    const firstRef = page.scope.get('payload');
    await registration.controller.refresh();
    const secondRef = page.scope.get('payload');

    expect(callCount).toBe(2);
    expect(secondRef).toBe(firstRef);
    registration.dispose();
  });

  it('exposes source debug snapshots through the public runtime contract', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'debug-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'debug-source',
        {
          type: 'data-source',
          name: 'total',
          statusPath: 'totalStatus',
          formula: '${(price || 0) * (qty || 0)}',
        },
        expressionCompiler,
      ),
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
          status: 'success',
          fetchStatus: 'idle',
          loading: false,
          stale: false,
          hasData: true,
          hasError: false,
          isInitialLoading: false,
          isRefreshing: false,
          inFlightCount: 0,
          hasValue: true,
          error: undefined,
        }),
      ],
    });

    registration.dispose();
    expect(runtime.getSourceDebugSnapshot?.()).toEqual({ sources: [] });
  });
});
