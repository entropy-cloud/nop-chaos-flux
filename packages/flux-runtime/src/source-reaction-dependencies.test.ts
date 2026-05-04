import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type RendererDefinition,
  type RendererEnv,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileDataSource, compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from './index';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
};

const env: RendererEnv = {
  fetcher: async <T>() => ({
    ok: true,
    status: 200,
    data: {} as T,
  }),
  notify: () => undefined,
};

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('explicit dependency roots', () => {
  it('uses explicit dependsOn roots for formula sources instead of runtime-collected fallback', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'explicit-formula-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'explicit-formula-source',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(price || 0) * (qty || 0)}',
          dependsOn: ['price'],
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);
    await Promise.resolve();
    await Promise.resolve();
    expect(page.scope.get('total')).toBe(6);

    page.scope.update('price', 5);

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(20);
    });

    registration.dispose();
  });

  it('uses explicit dependsOn roots for api sources instead of request-config fallback', async () => {
    const fetcher = vi.fn(async <T>(api: { url: string }, ctx?: unknown) => {
      void ctx;

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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ userId: 1, note: 'alpha' });

    const registration = runtime.registerDataSource({
      id: 'explicit-api-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'explicit-api-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/users/${userId}/${note}' },
          name: 'payload',
          dependsOn: ['userId'],
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/1/alpha' });
    });

    page.scope.update('note', 'beta');
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(page.scope.get('payload')).toEqual({ url: '/api/users/1/alpha' });

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2/beta' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    registration.dispose();
  });

  it('filters self-published roots before dependency matching on mixed scope changes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ total: 0, note: 'a' });

    const registration = runtime.registerDataSource({
      id: 'self-guarded-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'self-guarded-source',
        {
          type: 'data-source',
          name: 'total',
          formula: '${(total || 0) + 1}',
          dependsOn: ['total'],
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(1);
    });

    page.scope.merge({ total: 99, note: 'b' });
    await Promise.resolve();
    await Promise.resolve();

    expect(page.scope.get('total')).toBe(99);
    registration.dispose();
  });

  it('uses explicit dependsOn roots for reactions instead of runtime-collected fallback', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerReaction({
      id: 'explicit-reaction',
      scope: page.scope,
      compiledReaction: compileReaction(
        'explicit-reaction',
        {
          type: 'reaction',
          watch: '${(price || 0) * (qty || 0)}',
          dependsOn: ['price'],
          actions: {
            action: 'setValue',
            args: {
              path: 'message',
              value: '${price}:${qty}',
            },
          },
        },
        expressionCompiler,
      ),
      dispatch: (action, ctx) =>
        runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page,
        }),
    });

    page.scope.update('qty', 4);
    await Promise.resolve();
    await Promise.resolve();
    expect(page.scope.get('message')).toBeUndefined();

    page.scope.update('price', 5);

    await vi.waitFor(() => {
      expect(page.scope.get('message')).toBe('5:4');
    });

    registration.dispose();
  });
});
