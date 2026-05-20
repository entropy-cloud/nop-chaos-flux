import { describe, expect, it, vi } from 'vitest';
import type { ApiSchema, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createScopeRef, createScopeStore } from '../scope.js';
import { createApiRequestExecutor, executeApiSchema } from '../async-data/request-runtime.js';

function createTestScope(data: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

describe('executeApiSchema error path', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('throws generic error when response is not ok and data has no message', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 500,
        data: { error: 'internal' },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    await expect(
      executeApiSchema({ url: '/api/fail', type: 'test' }, scope, env, expressionCompiler),
    ).rejects.toThrow('Request failed with status 500');
  });

  it('throws with message from response data', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 422,
        data: { message: 'Validation failed' },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    await expect(
      executeApiSchema({ url: '/api/fail', type: 'test' }, scope, env, expressionCompiler),
    ).rejects.toThrow('Validation failed');
  });

  it('handles ok:false with undefined or null data', async () => {
    const scope = createTestScope({});
    const missingDataEnv = {
      fetcher: vi.fn(async () => ({ ok: false, status: 404, data: undefined as any })),
      notify: vi.fn(),
    } as unknown as RendererEnv;
    const nullDataEnv = {
      fetcher: vi.fn(async () => ({ ok: false, status: 500, data: null as any })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    await expect(
      executeApiSchema({ url: '/api/fail', type: 'test' }, scope, missingDataEnv, expressionCompiler),
    ).rejects.toThrow('Request failed with status 404');
    await expect(
      executeApiSchema({ url: '/api/fail', type: 'test' }, scope, nullDataEnv, expressionCompiler),
    ).rejects.toThrow('Request failed with status 500');
  });

  it('preserves retry metadata on fetcher-thrown errors', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => {
        throw new Error('network error');
      }),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      { url: '/api/fail', type: 'test' },
      scope,
      env,
      expressionCompiler,
      { control: { retry: { times: 2, delay: 0 } } },
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('network error');
    expect(error.attempts).toBe(3);
    expect(error.failureCount).toBe(3);
  });

  it('aborts request execution when control.timeout expires', async () => {
    const scope = createTestScope({});
    let capturedSignal: AbortSignal | undefined;
    const env = {
      fetcher: vi.fn(
        (_api: ApiSchema, options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            capturedSignal = options?.signal;
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason ?? new DOMException('aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    await expect(
      executeApiSchema({ url: '/api/slow', type: 'test' }, scope, env, expressionCompiler, {
        control: { timeout: 5 },
      }),
    ).rejects.toMatchObject({ name: 'TimeoutError', message: 'Request timed out after 5ms' });
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('retries timeout failures before surfacing the final timeout', async () => {
    const scope = createTestScope({});
    let attempts = 0;
    const env = {
      fetcher: vi.fn(
        (_api: ApiSchema, options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            attempts += 1;
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason ?? new DOMException('aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      { url: '/api/slow', type: 'test' },
      scope,
      env,
      expressionCompiler,
      {
        control: { timeout: 5, retry: { times: 2, delay: 0 } },
      },
    ).catch((caught) => caught);

    expect(attempts).toBe(3);
    expect(error).toMatchObject({
      name: 'TimeoutError',
      message: 'Request timed out after 5ms',
      attempts: 3,
      failureCount: 3,
    });
  });

  it('honors parent abort before timeout completion', async () => {
    const scope = createTestScope({});
    const controller = new AbortController();
    const env = {
      fetcher: vi.fn(
        (_api: ApiSchema, options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason ?? new DOMException('aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const pending = executeApiSchema(
      { url: '/api/slow', type: 'test' },
      scope,
      env,
      expressionCompiler,
      {
        signal: controller.signal,
        control: { timeout: 50 },
      },
    );

    controller.abort(new DOMException('Parent cancelled', 'AbortError'));

    await expect(pending).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Parent cancelled',
    });
  });
});

describe('createApiRequestExecutor', () => {
  it('forwards pre-aborted signals to the fetcher path', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: 'completed' }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});
    const controller = new AbortController();

    controller.abort();

    const result = await execute('ajax', { url: '/api/test' }, scope, undefined, {
      signal: controller.signal,
    });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('treats different params as distinct requests', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const fetcher = vi.fn(
      (api: ApiSchema) =>
        new Promise((resolve) => {
          if (api.url.includes('page=1')) {
            resolveFirst = resolve;
            return;
          }

          resolve({ ok: true, status: 200, data: { page: 2 } });
        }),
    );
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const firstPromise = execute('ajax', { url: '/api/items', params: { page: 1 } }, scope);
    const secondPromise = execute('ajax', { url: '/api/items', params: { page: 2 } }, scope);

    resolveFirst?.({ ok: true, status: 200, data: { page: 1 } });

    await expect(firstPromise).resolves.toMatchObject({ ok: true, data: { page: 1 } });
    await expect(secondPromise).resolves.toMatchObject({ ok: true, data: { page: 2 } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('supports parallel dedup strategy without cancelling earlier requests', async () => {
    const fetcher = vi.fn(async (api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { requestId: api.data },
    }));
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', data: { requestId: 1 } }, scope, undefined, {
      control: { dedup: 'parallel' },
    });
    const second = execute(
      'ajax',
      { url: '/api/items', data: { requestId: 2 } },
      scope,
      undefined,
      { control: { dedup: 'parallel' } },
    );

    await expect(first).resolves.toMatchObject({ ok: true, data: { requestId: { requestId: 1 } } });
    await expect(second).resolves.toMatchObject({
      ok: true,
      data: { requestId: { requestId: 2 } },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns the in-flight promise for ignore-new dedup strategy', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', data: { requestId: 1 } }, scope, undefined, {
      control: { dedup: 'ignore-new' },
    });
    const second = execute(
      'ajax',
      { url: '/api/items', data: { requestId: 1 } },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFirst?.({ ok: true, status: 200, data: { requestId: 1 } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { requestId: 1 } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { requestId: 1 } });
  });

  it('does not reuse an aborted in-flight promise for ignore-new dedup strategy', async () => {
    const parentController = new AbortController();
    let resolveSecond: ((value: any) => void) | undefined;
    const fetcher = vi.fn((api: ApiSchema, ctx: { signal?: AbortSignal }) => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise((_resolve, reject) => {
          ctx.signal?.addEventListener(
            'abort',
            () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            },
            { once: true },
          );
        });
      }

      return new Promise((resolve) => {
        resolveSecond = resolve;
      }).then(() => ({ ok: true, status: 200, data: { requestId: api.data } }));
    });
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute(
      'ajax',
      { url: '/api/items', data: { requestId: 1 } },
      scope,
      undefined,
      {
        signal: parentController.signal,
        control: { dedup: 'ignore-new' },
      },
    );

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    parentController.abort(new DOMException('Parent cancelled', 'AbortError'));

    const second = execute(
      'ajax',
      { url: '/api/items', data: { requestId: 1 } },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );

    expect(fetcher).toHaveBeenCalledTimes(2);

    resolveSecond?.({ ok: true, status: 200, data: { requestId: 1 } });

    await expect(second).resolves.toMatchObject({ ok: true, data: { requestId: { requestId: 1 } } });
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('treats different params as distinct requests for ignore-new dedup strategy', async () => {
    let resolvePageOne: ((value: any) => void) | undefined;
    const fetcher = vi.fn(
      (api: ApiSchema) =>
        new Promise((resolve) => {
          if (api.url.includes('page=1')) {
            resolvePageOne = resolve;
            return;
          }

          resolve({ ok: true, status: 200, data: { page: 2 } });
        }),
    );
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/items', params: { page: 1 } }, scope, undefined, {
      control: { dedup: 'ignore-new' },
    });
    const second = execute('ajax', { url: '/api/items', params: { page: 2 } }, scope, undefined, {
      control: { dedup: 'ignore-new' },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    resolvePageOne?.({ ok: true, status: 200, data: { page: 1 } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { page: 1 } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { page: 2 } });
  });

  it('reuses the same in-flight fetch only for identical ignore-new request keys', async () => {
    let release: ((value: any) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute(
      'ajax',
      {
        url: '/api/items',
        params: { page: 1 },
        data: { filter: 'active' },
        headers: { 'x-mode': 'live' },
      },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );
    const second = execute(
      'ajax',
      {
        url: '/api/items',
        params: { page: 1 },
        data: { filter: 'active' },
        headers: { 'x-mode': 'live' },
      },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    release?.({ ok: true, status: 200, data: { ok: true } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { ok: true } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { ok: true } });
  });

  it('dedupes identical final executable requests after adaptor rewrites params into the url', async () => {
    let release: ((value: any) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute(
      'ajax',
      {
        url: '/api/items?page=1',
        method: 'get',
      },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );
    const second = execute(
      'ajax',
      {
        url: '/api/items',
        method: 'get',
        params: { page: 1 },
      },
      scope,
      undefined,
      { control: { dedup: 'ignore-new' } },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    release?.({ ok: true, status: 200, data: { ok: true } });

    await expect(first).resolves.toMatchObject({ ok: true, data: { ok: true } });
    await expect(second).resolves.toMatchObject({ ok: true, data: { ok: true } });
  });

  it('preserves retry metadata on ok:false request failures', async () => {
    const scope = createTestScope({});
    const failedResponse = { ok: false, status: 500, data: { message: 'server failed' } };
    const env = {
      fetcher: vi.fn(async () => failedResponse),
    } as unknown as RendererEnv;
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    await expect(
      executeApiSchema(
        { url: '/api/fail', type: 'test' },
        scope,
        env,
        expressionCompiler,
        { control: { retry: { times: 2, delay: 0 } } },
      ),
    ).rejects.toMatchObject({
      message: 'server failed',
      attempts: 3,
      failureCount: 3,
      status: 500,
      response: failedResponse,
      responseData: failedResponse.data,
      lastFailureReason: failedResponse,
    });
  });

  it('aborts all active requests on dispose', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcher = vi.fn(async (_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });
      if (ctx.signal?.aborted) {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }
      return { ok: true, status: 200, data: null };
    });
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const promise = execute('ajax', { url: '/api/test' }, scope);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    execute.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();

    await expect(promise).rejects.toThrow('aborted');
  });

  it('detaches parent abort listener after a normal request settles', async () => {
    const addEventListener = vi.spyOn(AbortSignal.prototype, 'addEventListener');
    const removeEventListener = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const env = {
      fetcher: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true } })),
    } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});
    const parentController = new AbortController();

    try {
      await expect(
        execute('ajax', { url: '/api/test' }, scope, undefined, { signal: parentController.signal }),
      ).resolves.toMatchObject({ ok: true, data: { ok: true } });

      expect(addEventListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    } finally {
      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    }
  });

  it('cancel-previous aborts the in-flight request', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;
    const fetcher = vi.fn(async (_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;
      if (fetcher.mock.calls.length === 1) {
        return new Promise((_resolve, reject) => {
          ctx.signal?.addEventListener(
            'abort',
            () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            },
            { once: true },
          );
        });
      }
      return new Promise((resolve) => {
        resolveSecond = resolve;
      }).then(() => ({ ok: true, status: 200, data: null }));
    });
    const env = { fetcher } as unknown as RendererEnv;
    const execute = createApiRequestExecutor(() => env);
    const scope = createTestScope({});

    const first = execute('ajax', { url: '/api/test' }, scope);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const firstSignal = capturedSignal;

    const second = execute('ajax', { url: '/api/test' }, scope);
    expect(firstSignal?.aborted).toBe(true);

    resolveSecond?.(undefined);
    await expect(second).resolves.toMatchObject({ ok: true });
    await expect(first).rejects.toThrow('aborted');
  });
});
