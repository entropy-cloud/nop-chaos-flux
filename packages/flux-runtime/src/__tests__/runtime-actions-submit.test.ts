import { describe, expect, it, vi } from 'vitest';
import type { ApiSchema, RendererEnv, RendererPlugin } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createRendererRegistry,
  createRendererRuntime
} from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('uses the latest env fetcher without recreating runtime state', async () => {
    const firstFetcher = vi.fn(async <T,>(api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { tick: api.headers?.['x-tick'], source: 'first' } as T
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: firstFetcher as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const firstResult = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/env',
          method: 'get',
          headers: {
            'x-tick': '0'
          }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(firstResult).toMatchObject({ ok: true, data: { tick: '0', source: 'first' } });

    const secondFetcher = vi.fn(async <T,>(api: ApiSchema) => ({
      ok: true,
      status: 200,
      data: { tick: api.headers?.['x-tick'], source: 'second' } as T
    }));
    Object.assign(runtime.env, {
      ...runtime.env,
      fetcher: secondFetcher as RendererEnv['fetcher']
    });

    const secondResult = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/env',
          method: 'get',
          headers: {
            'x-tick': '1'
          }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(secondResult).toMatchObject({ ok: true, data: { tick: '1', source: 'second' } });
    expect(firstFetcher).toHaveBeenCalledTimes(1);
    expect(secondFetcher).toHaveBeenCalledTimes(1);
  });

  it('cancels concurrent submitForm actions instead of reporting a duplicate failure', async () => {
    let apiCallCount = 0;
    let resolveApi: (() => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          apiCallCount++;
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'concurrent-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const firstPromise = runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(apiCallCount).toBe(1);
    expect(secondResult).toMatchObject({ ok: false, cancelled: true, error: expect.any(Error) });
    expect(form.store.getState().submitting).toBe(true);

    resolveApi?.();

    await expect(firstPromise).resolves.toMatchObject({ ok: true, data: { saved: true } });
    expect(form.store.getState().submitting).toBe(false);
  });

  it('emits cancelled monitor results for guarded duplicate submitForm actions', async () => {
    const onActionEnd = vi.fn();
    let resolveApi: (() => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionEnd
        },
        fetcher: async <T>() => {
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'monitored-concurrent-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const firstPromise = runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(secondResult).toMatchObject({ cancelled: true });
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'submitForm',
        result: expect.objectContaining({ cancelled: true })
      })
    );

    resolveApi?.();
    await firstPromise;
  });

  it('applies adaptors during submitForm api execution', async () => {
    const fetchCalls: ApiSchema[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiSchema) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: {
              payload: {
                saved: true,
                username: 'Alice'
              }
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'page-token' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '/api/profile',
          method: 'post',
          requestAdaptor: 'return {headers: {Authorization: scope.token}, data: {formUser: scope.username}};',
          responseAdaptor: 'return payload.payload;'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      headers: {
        Authorization: 'page-token'
      },
      data: {
        formUser: 'Alice'
      }
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        saved: true,
        username: 'Alice'
      }
    });
  });

  it('supports args as the recommended submitForm api carrier', async () => {
    const fetchCalls: ApiSchema[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiSchema) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ apiPath: '/api/profile' });
    const form = runtime.createFormRuntime({
      id: 'args-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        args: {
          url: '${apiPath}',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(result).toMatchObject({ ok: true, data: { saved: true } });
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/profile',
      method: 'post'
    });
  });

  it('retries submitForm requests through shared request execution', async () => {
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          callCount += 1;

          if (callCount < 3) {
            throw new Error(`submit-fail-${callCount}`);
          }

          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'retry-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        retry: { times: 2, delay: 0 },
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(result).toMatchObject({ ok: true, data: { saved: true }, attempts: 3, failureCount: 2 });
    expect(callCount).toBe(3);
  });

  it('aborts submitForm requests when action timeouts fire', async () => {
    let capturedSignal: AbortSignal | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
          capturedSignal = ctx.signal;

          return new Promise((_, reject) => {
            ctx.signal?.addEventListener('abort', () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            }, { once: true });
          }) as Promise<{ ok: true; status: number; data: T }>;
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'timeout-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const resultPromise = runtime.dispatch(
      {
        action: 'submitForm',
        timeout: 5,
        args: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      timedOut: true
    });
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('applies compile plugins before and after schema compilation', () => {
    const plugin: RendererPlugin = {
      name: 'compile-hooks',
      beforeCompile(schema) {
        if (Array.isArray(schema) || schema.type !== 'text') {
          return schema;
        }

        return {
          ...schema,
          text: 'Prepared text'
        };
      },
      afterCompile(template) {
        const root = Array.isArray(template.root) ? template.root[0] : template.root;

        if (!root || root.type !== 'text') {
          return template;
        }

        return {
          ...template,
          root: {
            ...root,
            propsProgram: createExpressionCompiler(createFormulaCompiler()).compileValue({
              ...root.schema,
              text: 'Prepared text + compiled'
            })
          }
        };
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      plugins: [plugin],
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = runtime.compile({
      type: 'text',
      text: 'Original text'
    });
    const page = runtime.createPageRuntime({});
    const templateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const resolved = runtime.resolveNodeProps(templateNode, page.scope);

    expect(resolved.value.text).toBe('Prepared text + compiled');
  });
});
