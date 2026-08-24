import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function createFailingEnv(msg = 'internal error'): RendererEnv {
  const fetcher = vi.fn(async () => ({
    ok: false as const,
    status: 500,
    msg,
    data: null,
  }));
  return { ...env, fetcher: fetcher as unknown as RendererEnv['fetcher'] };
}

describe('refresh failure propagation (2026-08-11-1929-3 Phase 4)', () => {
  it('exposes ok/error channels on DataSourceRefreshResult when the underlying request fails', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createFailingEnv(),
      expressionCompiler,
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
          args: { url: '/api/failing' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(registration.controller.getState().status).toBe('error');
    });

    const result = await registration.controller.refresh();
    expect(result.skipped).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);

    registration.dispose();
  });

  it('propagates request failure through refreshDataSource as { found: true, result: { ok: false } }', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createFailingEnv(),
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const registration = runtime.registerDataSource({
      id: 'failing-api-source-2',
      scope: page.scope,
      compiledSource: compileDataSource(
        'failing-api-source-2',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/failing' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(registration.controller.getState().status).toBe('error');
    });

    const outcome = await runtime.refreshDataSource({ name: 'payload', scope: page.scope });
    expect(outcome.found).toBe(true);
    expect(outcome.result?.skipped).toBe(false);
    expect(outcome.result?.ok).toBe(false);
    expect(outcome.result?.error).toBeInstanceOf(Error);

    registration.dispose();
  });

  it('distinguishes source-not-found from request failure at the refreshSource action level', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createFailingEnv(),
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const registration = runtime.registerDataSource({
      id: 'failing-api-source-3',
      scope: page.scope,
      compiledSource: compileDataSource(
        'failing-api-source-3',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/failing' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(registration.controller.getState().status).toBe('error');
    });

    const notFound = await runtime.dispatch(
      { action: 'refreshSource', targetId: 'missing-source' },
      { runtime, scope: page.scope, page },
    );
    expect(notFound.ok).toBe(false);
    expect((notFound.error as Error).message).toContain('Source not found: missing-source');

    const failed = await runtime.dispatch(
      { action: 'refreshSource', targetId: 'payload' },
      { runtime, scope: page.scope, page },
    );
    expect(failed.ok).toBe(false);
    expect(failed.error).toBeInstanceOf(Error);
    expect((failed.error as Error).message).not.toContain('Source not found');

    registration.dispose();
  });

  it('refreshNearest reports failure when the nearest data-source request fails', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createFailingEnv(),
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const registration = runtime.registerDataSource({
      id: 'failing-api-source-4',
      scope: page.scope,
      compiledSource: compileDataSource(
        'failing-api-source-4',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/failing' },
          name: 'payload',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(registration.controller.getState().status).toBe('error');
    });

    const childScope = runtime.createChildScope(page.scope, {});
    const result = await runtime.dispatch(
      { action: 'refreshNearest', args: { targetType: 'data-source' } },
      { runtime, scope: childScope, page },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.data).toMatchObject({ found: true, kind: 'source', name: 'payload' });

    registration.dispose();
  });

  it('keeps sendOn-gate skips as { skipped: true } without ok/error channels', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ enabled: false });
    const registration = runtime.registerDataSource({
      id: 'gated-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'gated-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/gated' },
          name: 'gated',
          sendOn: 'enabled === true',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(registration.controller.getState().started).toBe(true);
    });

    const result = await registration.controller.refresh();
    expect(result).toEqual({ skipped: true });

    registration.dispose();
  });

  it('reports a runtime host issue and conservatively fetches when initFetch evaluation throws', async () => {
    const notify = vi.fn();
    const fetcher = vi.fn(async <T>() => ({ ok: true as const, status: 200, data: null as T }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        notify,
        fetcher: fetcher as unknown as RendererEnv['fetcher'],
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'broken-init-fetch-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'broken-init-fetch-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/init-fetch' },
          name: 'initFetchPayload',
          initFetch: '${missingRef.deepMember}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    expect(notify).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('initFetch'),
    );

    registration.dispose();
  });
});
