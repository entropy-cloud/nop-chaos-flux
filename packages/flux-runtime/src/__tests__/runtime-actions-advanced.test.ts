import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type ApiSchema,
  type ApiRequestContext,
  type RendererEnv,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime', () => {
  it('treats nested scope ownership by lexical level instead of materialized fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ record: { from: 'page' } });
    const rowScope = runtime.createChildScope(page.scope, { record: { name: 'Alice' } });

    expect(rowScope.has('record')).toBe(true);
    expect(rowScope.has('record.name')).toBe(true);
    expect(rowScope.has('record.from')).toBe(false);
    expect(rowScope.get('record.from')).toBe(undefined);
  });

  it('cancels the previous ajax request when a new matching request starts', async () => {
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(_api: ApiSchema, ctx: ApiRequestContext) => {
          callCount += 1;

          if (callCount === 1) {
            return await new Promise((resolve, reject) => {
              ctx.signal?.addEventListener('abort', () => {
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
              });
            });
          }

          return {
            ok: true,
            status: 200,
            data: { request: callCount } as T,
          };
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const firstPromise = runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/search',
          method: 'get',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/search',
          method: 'get',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    const firstResult = await firstPromise;

    expect(firstResult).toMatchObject({ ok: false, cancelled: true });
    expect(secondResult).toMatchObject({ ok: true, data: { request: 2 } });
  });

  it('increments page refresh tick through refreshTable actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const first = await runtime.dispatch(
      {
        action: 'refreshTable',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    const second = await runtime.dispatch(
      {
        action: 'refreshTable',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(first).toMatchObject({ ok: true, data: 1 });
    expect(second).toMatchObject({ ok: true, data: 2 });
    expect(page.store.getState().refreshTick).toBe(2);
  });

  it('refreshes registered sources through refreshSource actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

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
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'total',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);

    registration.dispose();
  });

  it('refreshes registered sources through refreshSource actions using data-source names', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'total-source-id',
      scope: page.scope,
      compiledSource: compileDataSource(
        'total-source-id',
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

    page.scope.update('qty', 4);

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'total',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);

    registration.dispose();
  });

  it('does not bump page refreshTick through refreshSource actions (reload targets named source, not page)', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

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
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);
    const tickBefore = page.store.getState().refreshTick;

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'total',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);
    expect(page.store.getState().refreshTick).toBe(tickBefore);

    registration.dispose();
  });

  it('skips actions when the when precondition evaluates false', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ enabled: false, message: 'initial' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        when: '${enabled}',
        args: {
          path: 'message',
          value: 'updated',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(page.scope.get('message')).toBe('initial');
  });

  it('runs parallel actions and returns aggregated results', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ left: 'a', right: 'b' });

    const result = await runtime.dispatch(
      {
        action: 'noop',
        parallel: [
          {
            action: 'setValue',
            args: {
              path: 'left',
              value: 'left-updated',
            },
          },
          {
            action: 'setValue',
            args: {
              path: 'right',
              value: 'right-updated',
            },
          },
        ],
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(page.scope.get('left')).toBe('left-updated');
    expect(page.scope.get('right')).toBe('right-updated');
  });

  it('treats cancelled parallel children as aggregate failures', async () => {
    vi.useFakeTimers();

    try {
      const fetcherImpl: RendererEnv['fetcher'] = async <T>(
        _api: ApiSchema,
        ctx: { signal?: AbortSignal },
      ) => {
        return new Promise((resolve, reject) => {
          ctx.signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted');
              (error as Error & { name: string }).name = 'AbortError';
              reject(error);
            },
            { once: true },
          );
        }) as Promise<{ ok: true; status: number; data: T }>;
      };
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcherImpl,
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      });
      const page = runtime.createPageRuntime({});

      const resultPromise = runtime.dispatch(
        {
          action: 'noop',
          parallel: [
            {
              action: 'setValue',
              args: {
                path: 'left',
                value: 'ok',
              },
            },
            {
              action: 'ajax',
              timeout: 5,
              args: { url: '/api/slow' },
            },
          ],
        },
        {
          runtime,
          scope: page.scope,
          page,
        },
      );

      await vi.advanceTimersByTimeAsync(5);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        results: [
          expect.objectContaining({ ok: true }),
          expect.objectContaining({ ok: false, timedOut: true, cancelled: true }),
        ],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a timedOut result for actions that exceed timeout', async () => {
    vi.useFakeTimers();

    try {
      const fetcherImpl: RendererEnv['fetcher'] = async <T>(
        _api: ApiSchema,
        ctx: { signal?: AbortSignal },
      ) => {
        return new Promise((resolve, reject) => {
          ctx.signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted');
              (error as Error & { name: string }).name = 'AbortError';
              reject(error);
            },
            { once: true },
          );
        }) as Promise<{ ok: true; status: number; data: T }>;
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

      const resultPromise = runtime.dispatch(
        {
          action: 'ajax',
          timeout: 10,
          args: { url: '/api/slow' },
        },
        {
          runtime,
          scope: page.scope,
          page,
        },
      );

      await vi.advanceTimersByTimeAsync(10);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        cancelled: true,
        timedOut: true,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts ajax requests when action timeouts fire', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(
      _api: ApiSchema,
      ctx: { signal?: AbortSignal },
    ) => {
      capturedSignal = ctx.signal;

      return new Promise((resolve, reject) => {
        ctx.signal?.addEventListener(
          'abort',
          () => {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
          },
          { once: true },
        );
      }) as Promise<{ ok: true; status: number; data: T }>;
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

    const resultPromise = runtime.dispatch(
      {
        action: 'ajax',
        timeout: 5,
        args: { url: '/api/slow' },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      timedOut: true,
    });
    expect(capturedSignal?.aborted).toBe(true);
  });
});
