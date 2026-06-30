import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env as baseEnv } from './test-fixtures.js';

describe('schema-fetch cross-subscriber dedup + cache (A11)', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('dedupes concurrent identical schema-fetches across subscribers into a single in-flight request', async () => {
    let release: ((value: { ok: boolean; status: number; data: unknown }) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const scopeA = runtime.createChildScope(page.scope, { tag: 'A' });
    const scopeB = runtime.createChildScope(page.scope, { tag: 'B' });

    const action = {
      action: 'ajax',
      args: { url: '/api/schema' },
      control: { cacheTTL: 5000 },
    };

    const a = runtime.dispatch(action, { runtime, scope: scopeA, page });
    const b = runtime.dispatch(action, { runtime, scope: scopeB, page });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    release?.({ ok: true, status: 200, data: { type: 'text', text: 'shared' } });

    const [resultA, resultB] = await Promise.all([a, b]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    expect(resultA.data).toEqual({ type: 'text', text: 'shared' });
    expect(resultB.data).toEqual({ type: 'text', text: 'shared' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves a repeated schema-fetch from the runtime cache without a new request', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'cached-schema' },
    }));

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const scopeA = runtime.createChildScope(page.scope, { tag: 'A' });
    const scopeB = runtime.createChildScope(page.scope, { tag: 'B' });

    const action = {
      action: 'ajax',
      args: { url: '/api/schema' },
      control: { cacheTTL: 5000 },
    };

    await runtime.dispatch(action, { runtime, scope: scopeA, page });
    await runtime.dispatch(action, { runtime, scope: scopeB, page });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe requests with a different executable identity (negative)', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'schema' },
    }));

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const scopeA = runtime.createChildScope(page.scope, { tag: 'A' });
    const scopeB = runtime.createChildScope(page.scope, { tag: 'B' });

    const actionA = {
      action: 'ajax',
      args: { url: '/api/schema-a' },
      control: { cacheTTL: 5000 },
    };
    const actionB = {
      action: 'ajax',
      args: { url: '/api/schema-b' },
      control: { cacheTTL: 5000 },
    };

    const [resultA, resultB] = await Promise.all([
      runtime.dispatch(actionA, { runtime, scope: scopeA, page }),
      runtime.dispatch(actionB, { runtime, scope: scopeB, page }),
    ]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not share in-flight for non-safe methods even with cacheTTL', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'created' },
    }));

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const scopeA = runtime.createChildScope(page.scope, { tag: 'A' });
    const scopeB = runtime.createChildScope(page.scope, { tag: 'B' });

    const action = {
      action: 'ajax',
      args: { url: '/api/create', method: 'post' },
      control: { cacheTTL: 5000 },
    };

    await Promise.all([
      runtime.dispatch(action, { runtime, scope: scopeA, page }),
      runtime.dispatch(action, { runtime, scope: scopeB, page }),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns a cancelled result when a cache hit is reached with an already-aborted caller signal (M-06)', async () => {
    // The dispatcher short-circuits an already-aborted signal before reaching
    // the ajax adapter, so this residual is exercised directly against
    // executeRuntimeAjaxAction with a primed cache (the shared fetch is never
    // cancelled by a single subscriber — documented intent — but an aborted
    // caller that hits the cache must not receive a success result).
    const { executeRuntimeAjaxAction } = await import('../runtime-action-helpers.js');
    const { createApiCacheStore } = await import('../async-data/api-cache.js');
    const { createRequestInFlightRegistry } = await import('../async-data/request-in-flight-registry.js');
    const apiCache = createApiCacheStore();
    const inFlight = createRequestInFlightRegistry();
    apiCache.set('fixed-cache-key', { type: 'text', text: 'cached' }, 5000);

    const localRuntime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv } as unknown as RendererEnv,
      expressionCompiler,
    });
    const localPage = localRuntime.createPageRuntime({});
    const scope = localRuntime.createChildScope(localPage.scope, { tag: 'A' });
    const executeApiRequest = Object.assign(
      vi.fn(async () => ({ ok: true, status: 200, data: { type: 'text', text: 'fresh' } })),
      { dispose: vi.fn() },
    ) as unknown as import('../async-data/request-runtime.js').ApiRequestExecutor;

    const reason = new Error('caller cancelled');
    const controller = new AbortController();
    controller.abort(reason);

    const result = await executeRuntimeAjaxAction(
      { url: '/api/schema', method: 'get' },
      // CompiledActionNode: resolveRequestControl reads control.control.
      { control: { control: { cacheTTL: 5000, cacheKey: 'fixed-cache-key' } } } as any,
      { scope } as any,
      controller.signal,
      {
        getEnv: () => ({ ...baseEnv } as unknown as RendererEnv),
        expressionCompiler,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
        sharing: { apiCache, inFlight },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe(reason);
    // Cache was served (no new fetch); the shared fetch is never initiated.
    expect(executeApiRequest).not.toHaveBeenCalled();
  });
});
