import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type ApiSchema, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createRendererRuntime,
} from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('retries failed actions until one succeeds', async () => {
    let callCount = 0;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>() => {
      callCount += 1;

      if (callCount < 3) {
        throw new Error(`fail-${callCount}`);
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

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        retry: { times: 2, delay: 0 },
        args: { url: '/api/retry-success' },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, attempts: 3, data: { ok: true } });
    expect(result.failureCount).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('returns the final failure result after retry attempts are exhausted', async () => {
    let callCount = 0;
    const fetcherImpl: RendererEnv['fetcher'] = async () => {
      callCount += 1;
      throw new Error(`fail-${callCount}`);
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

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        retry: { times: 2, delay: 0 },
        args: { url: '/api/retry-fail' },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.failureCount).toBe(3);
    expect(result.error).toBeInstanceOf(Error);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('supports exponential retry strategy for ajax actions through request execution', async () => {
    vi.useFakeTimers();

    try {
      let callCount = 0;
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: async <T>() => {
            callCount += 1;

            if (callCount < 3) {
              throw new Error(`fail-${callCount}`);
            }

            return {
              ok: true,
              status: 200,
              data: { ok: true } as T,
            };
          },
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      });
      const page = runtime.createPageRuntime({});

      const promise = runtime.dispatch(
        {
          action: 'ajax',
          retry: { times: 2, delay: 10, strategy: 'exponential' },
          args: { url: '/api/retry-exp' },
        },
        {
          runtime,
          scope: page.scope,
          page,
        },
      );

      await vi.advanceTimersByTimeAsync(9);
      expect(callCount).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(callCount).toBe(2);
      await vi.advanceTimersByTimeAsync(19);
      expect(callCount).toBe(2);
      await vi.advanceTimersByTimeAsync(1);

      await expect(promise).resolves.toMatchObject({ ok: true, attempts: 3, failureCount: 2 });
      expect(callCount).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a failure result when refreshSource cannot resolve a source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'missing-source',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('debounces matching actions and cancels superseded executions', async () => {
    vi.useFakeTimers();

    try {
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env,
        expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      });
      const page = runtime.createPageRuntime({ status: 'idle' });

      const firstPromise = runtime.dispatch(
        {
          action: 'setValue',
          args: {
            path: 'status',
            value: 'first',
          },
          debounce: 50,
        },
        {
          runtime,
          scope: page.scope,
          page,
        },
      );

      const secondPromise = runtime.dispatch(
        {
          action: 'setValue',
          args: {
            path: 'status',
            value: 'second',
          },
          debounce: 50,
        },
        {
          runtime,
          scope: page.scope,
          page,
        },
      );

      await expect(firstPromise).resolves.toMatchObject({ ok: false, cancelled: true });
      expect(page.store.getState().data.status).toBe('idle');

      await vi.advanceTimersByTimeAsync(50);

      await expect(secondPromise).resolves.toMatchObject({ ok: true, data: 'second' });
      expect(page.store.getState().data.status).toBe('second');
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports args as the recommended ajax api carrier', async () => {
    const fetcher = vi.fn(async <T>(api: ApiSchema, _ctx?: { signal?: AbortSignal }) => ({
      ok: true,
      status: 200,
      data: { url: api.url, method: api.method } as T,
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ path: '/api/from-args' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '${path}',
          method: 'get',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({ ok: true, data: { url: '/api/from-args', method: 'get' } });
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/from-args',
        method: 'get',
      }),
      expect.any(Object),
    );
  });

  it('monitors the final executable ajax request after params canonicalization', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T,
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
    const page = runtime.createPageRuntime({ token: 'live' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/items',
          method: 'get',
          params: { mode: '${token}' },
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/items?mode=live',
      }),
      expect.any(Object),
    );
  });
});
