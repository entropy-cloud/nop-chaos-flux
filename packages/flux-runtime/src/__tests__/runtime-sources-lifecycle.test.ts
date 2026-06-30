import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function createFetcherRuntime(fetcherImpl: RendererEnv['fetcher']) {
  return createRendererRuntime({
    registry: createRendererRegistry([textRenderer]),
    env: {
      ...env,
      fetcher: fetcherImpl,
    },
    expressionCompiler,
  });
}

describe('data-source request-layer lifecycle (X4)', () => {
  it('sendOn truthy → refresh is issued and data lands in scope', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({ featureFlag: true });

    const registration = runtime.registerDataSource({
      id: 'sendon-truthy',
      scope: page.scope,
      compiledSource: compileDataSource(
        'sendon-truthy',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          sendOn: 'featureFlag === true',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/items' });
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    registration.dispose();
  });

  it('sendOn falsy → refresh is skipped and data stays undefined', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({ featureFlag: false });

    const registration = runtime.registerDataSource({
      id: 'sendon-falsy',
      scope: page.scope,
      compiledSource: compileDataSource(
        'sendon-falsy',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          sendOn: 'featureFlag === true',
        },
        expressionCompiler,
      ),
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetcher).not.toHaveBeenCalled();
    expect(page.scope.get('payload')).toBeUndefined();

    registration.dispose();
  });

  it('sendOn evaluation throws → treated as falsy (when semantics), refresh skipped', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'sendon-error',
      scope: page.scope,
      compiledSource: compileDataSource(
        'sendon-error',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          // member access on undefined throws during evaluation
          sendOn: 'missing.path === 1',
        },
        expressionCompiler,
      ),
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetcher).not.toHaveBeenCalled();
    expect(page.scope.get('payload')).toBeUndefined();

    registration.dispose();
  });

  it('initFetch: false → no auto fetch on mount, status stays idle', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'initfetch-false',
      scope: page.scope,
      compiledSource: compileDataSource(
        'initfetch-false',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          statusPath: 'status',
          initFetch: false,
        },
        expressionCompiler,
      ),
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetcher).not.toHaveBeenCalled();
    expect(page.scope.get('payload')).toBeUndefined();
    const status = page.scope.get('status') as { loading?: boolean; hasData?: boolean } | undefined;
    expect(status?.loading).toBe(false);
    expect(status?.hasData).toBe(false);

    registration.dispose();
  });

  it('initFetch: true (or omitted) → auto fetch on mount', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'initfetch-true',
      scope: page.scope,
      compiledSource: compileDataSource(
        'initfetch-true',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          initFetch: true,
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/items' });
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    registration.dispose();
  });

  it('onSuccess → dispatched with { data, dataUpdatedAt } after a successful fetch', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'onsuccess-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'onsuccess-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          onSuccess: {
            action: 'setValue',
            args: {
              path: 'successSignal',
              value: 'fetched:${data.url}',
            },
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/items' });
    });
    await vi.waitFor(() => {
      expect(page.scope.get('successSignal')).toBe('fetched:/api/items');
    });

    registration.dispose();
  });

  it('onError → dispatched with { error, failureCount } after a failed fetch', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 500,
      data: null,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'onerror-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'onerror-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          silent: true,
          onError: {
            action: 'setValue',
            args: {
              path: 'errorSignal',
              value: 'failed:${failureCount}',
            },
          },
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('errorSignal')).toBe('failed:1');
    });

    registration.dispose();
  });

  it('interval + sendOn cooperate: interval polls also pass through the sendOn gate', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async <T>(api: { url: string }) => ({
        ok: true,
        status: 200,
        data: { url: api.url, at: Date.now() } as T,
      }));
      const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
      const page = runtime.createPageRuntime({ enabled: true });

      const registration = runtime.registerDataSource({
        id: 'interval-sendon',
        scope: page.scope,
        compiledSource: compileDataSource(
          'interval-sendon',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/poll' },
            name: 'poll',
            interval: 100,
            sendOn: 'enabled === true',
          },
          expressionCompiler,
        ),
      });

      // initial fetch (enabled=true → passes gate)
      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });

      // disable → interval tick should be skipped
      page.scope.update('enabled', false);
      await vi.advanceTimersByTimeAsync(250);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // re-enable → next interval tick fires again
      page.scope.update('enabled', true);
      await vi.advanceTimersByTimeAsync(150);
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);

      registration.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('A19: refresh path returns {skipped:true} and issues no request when sendOn is falsy', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({ featureFlag: false });

    const registration = runtime.registerDataSource({
      id: 'refresh-skipped',
      scope: page.scope,
      compiledSource: compileDataSource(
        'refresh-skipped',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          sendOn: 'featureFlag === true',
          initFetch: false,
        },
        expressionCompiler,
      ),
    });

    const result = await registration.controller.refresh();
    expect(result).toEqual({ skipped: true });
    expect(fetcher).not.toHaveBeenCalled();

    registration.dispose();
  });

  it('A19: sendOn evaluates against the lexical scope chain and can read an ancestor (cross-owner) value', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
    }));
    const runtime = createFetcherRuntime(fetcher as RendererEnv['fetcher']);
    const page = runtime.createPageRuntime({ gate: true });
    // the data-source owner is a child scope; `gate` lives on the ancestor page scope
    const childScope = runtime.createChildScope(page.scope, { local: 1 });

    const registration = runtime.registerDataSource({
      id: 'cross-owner-sendon',
      scope: childScope,
      compiledSource: compileDataSource(
        'cross-owner-sendon',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/items' },
          name: 'payload',
          sendOn: 'gate === true',
          initFetch: false,
        },
        expressionCompiler,
      ),
    });

    const allowed = await registration.controller.refresh();
    expect(allowed).toEqual({ skipped: false });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // flip the ancestor value → refresh now skipped
    page.scope.update('gate', false);
    const blocked = await registration.controller.refresh();
    expect(blocked).toEqual({ skipped: true });
    expect(fetcher).toHaveBeenCalledTimes(1);

    registration.dispose();
  });
});
