import { describe, expect, it, vi } from 'vitest';
import type { ActionSchema, ApiObject, ApiRequestContext, RendererEnv, RendererPlugin } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createActionScope,
  createComponentHandleRegistry,
  createFormComponentHandle,
  createRendererRegistry,
  createRendererRuntime
} from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('treats nested scope ownership by lexical level instead of materialized fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
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
        fetcher: async <T>(_api: ApiObject, ctx: ApiRequestContext) => {
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
            data: { request: callCount } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const firstPromise = runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/search',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/search',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const firstResult = await firstPromise;

    expect(firstResult).toMatchObject({ ok: false, cancelled: true });
    expect(secondResult).toMatchObject({ ok: true, data: { request: 2 } });
  });

  it('increments page refresh tick through refreshTable actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const first = await runtime.dispatch(
      {
        action: 'refreshTable'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const second = await runtime.dispatch(
      {
        action: 'refreshTable'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(first).toMatchObject({ ok: true, data: 1 });
    expect(second).toMatchObject({ ok: true, data: 2 });
    expect(page.store.getState().refreshTick).toBe(2);
  });

  it('refreshes registered sources through refreshSource actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

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
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'total-source'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);

    registration.dispose();
  });

  it('refreshes registered sources through refreshSource actions using data-source names', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'total-source-id',
      scope: page.scope,
      schema: {
        type: 'data-source',
        name: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'total'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);

    registration.dispose();
  });

  it('skips actions when the when precondition evaluates false', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ enabled: false, message: 'initial' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        when: '${enabled}',
        componentPath: 'message',
        value: 'updated'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(page.scope.get('message')).toBe('initial');
  });

  it('runs parallel actions and returns aggregated results', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ left: 'a', right: 'b' });

    const result = await runtime.dispatch(
      {
        action: 'noop',
        parallel: [
          {
            action: 'setValue',
            componentPath: 'left',
            value: 'left-updated'
          },
          {
            action: 'setValue',
            componentPath: 'right',
            value: 'right-updated'
          }
        ]
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(page.scope.get('left')).toBe('left-updated');
    expect(page.scope.get('right')).toBe('right-updated');
  });

  it('treats cancelled parallel children as aggregate failures', async () => {
    vi.useFakeTimers();

    try {
      const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          ctx.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
          }, { once: true });
        }) as Promise<{ ok: true; status: number; data: T }>;
      };
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcherImpl
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({});

      const resultPromise = runtime.dispatch(
        {
          action: 'noop',
          parallel: [
            {
              action: 'setValue',
              componentPath: 'left',
              value: 'ok'
            },
            {
              action: 'ajax',
              timeout: 5,
              api: { url: '/api/slow' }
            }
          ]
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await vi.advanceTimersByTimeAsync(5);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        results: [
          expect.objectContaining({ ok: true }),
          expect.objectContaining({ ok: false, timedOut: true, cancelled: true })
        ]
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a timedOut result for actions that exceed timeout', async () => {
    vi.useFakeTimers();

    try {
      const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          ctx.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
          }, { once: true });
        }) as Promise<{ ok: true; status: number; data: T }>;
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

      const resultPromise = runtime.dispatch(
        {
          action: 'ajax',
          timeout: 10,
          api: { url: '/api/slow' }
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await vi.advanceTimersByTimeAsync(10);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        cancelled: true,
        timedOut: true
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts ajax requests when action timeouts fire', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;

      return new Promise((resolve, reject) => {
        ctx.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          (error as Error & { name: string }).name = 'AbortError';
          reject(error);
        }, { once: true });
      }) as Promise<{ ok: true; status: number; data: T }>;
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

    const resultPromise = runtime.dispatch(
      {
        action: 'ajax',
        timeout: 5,
        api: { url: '/api/slow' }
      },
      {
        runtime,
        scope: page.scope,
        page
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

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        retry: { times: 2, delay: 0 },
        api: { url: '/api/retry-success' }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, attempts: 3, data: { ok: true } });
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
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        retry: { times: 2, delay: 0 },
        api: { url: '/api/retry-fail' }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toBeInstanceOf(Error);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('returns a failure result when refreshSource cannot resolve a source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        targetId: 'missing-source'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
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
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({ status: 'idle' });

      const firstPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'first',
          debounce: 50
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      const secondPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'second',
          debounce: 50
        },
        {
          runtime,
          scope: page.scope,
          page
        }
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

  it('emits action and api monitor callbacks during ajax execution', async () => {
    const onActionStart = vi.fn();
    const onActionEnd = vi.fn();
    const onApiRequest = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionStart,
          onActionEnd,
          onApiRequest
        },
        fetcher: async <T>() => ({
          ok: true,
          status: 200,
          data: { items: [1] } as T
        })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const compiled = runtime.compile({ type: 'text', text: 'trigger' });
    const page = runtime.createPageRuntime({});
    const templateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const nodeInstance = {
      cid: templateNode.templateNodeId,
      templateNode,
      scope: page.scope,
      state: { metaState: {}, mounted: true }
    } as any;

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/monitored',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        nodeInstance
      }
    );

    expect(result.ok).toBe(true);
    expect(onActionStart).toHaveBeenCalledWith({
      actionType: 'ajax',
      interactionId: expect.any(String),
      nodeId: templateNode.id,
      path: templateNode.templatePath
    });
    expect(onApiRequest).toHaveBeenCalledWith(expect.objectContaining({
      api: expect.objectContaining({ url: '/api/monitored', method: 'get', data: undefined }),
      nodeId: templateNode.id,
      path: templateNode.templatePath,
      interactionId: expect.any(String)
    }));
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ajax',
        dispatchMode: 'built-in',
        nodeId: templateNode.id,
        path: templateNode.templatePath,
        result: expect.objectContaining({ ok: true })
      })
    );
  });

  it('monitors the final executable ajax request after params canonicalization', async () => {
    const onApiRequest = vi.fn();
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
        monitor: {
          onApiRequest
        },
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'live' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/items',
          method: 'get',
          params: { mode: '${token}' }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(onApiRequest).toHaveBeenCalledWith(expect.objectContaining({
      api: expect.objectContaining({
        url: '/api/items?mode=live',
        method: 'get',
        data: undefined
      }),
      nodeId: undefined,
      path: undefined,
      interactionId: expect.any(String)
    }));
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/items?mode=live'
      }),
      expect.any(Object)
    );
  });

  it('reuses compiled action payload/api objects across repeated dispatches', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10, token: 'cached' });
    const actionScope = createActionScope({ id: 'cached-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      args: {
        nodeType: 'task',
        position: {
          x: '${baseX}',
          y: 20
        }
      }
    } as any;

    const ajaxAction = {
      action: 'ajax',
      api: {
        url: '/api/items/${baseX}',
        params: {
          token: '${token}'
        }
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });

    const compiledArgsCount = compileValueSpy.mock.calls.filter(([input]) => input === action.args).length;
    const compiledApiCount = compileValueSpy.mock.calls.filter(([input]) => input === ajaxAction.api).length;

    expect(compiledArgsCount).toBe(1);
    expect(compiledApiCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('supports top-level action payload compatibility with cached extraction', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10 });
    const actionScope = createActionScope({ id: 'top-level-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      nodeType: 'task',
      position: {
        x: '${baseX}',
        y: 20
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });

    const compiledTopLevelPayloadCount = compileValueSpy.mock.calls.filter(
      ([input]) => input !== action && !!input && typeof input === 'object' && (input as any).nodeType === 'task'
    ).length;

    expect(compiledTopLevelPayloadCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('emits delegated action monitor metadata for component and namespace dispatch', async () => {
    const onActionEnd = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionEnd
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = createActionScope({ id: 'monitor-scope' });
    const componentRegistry = createComponentHandleRegistry({ id: 'monitor-components' });
    const form = runtime.createFormRuntime({
      id: 'monitored-form',
      name: 'monitoredForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    componentRegistry.register(createFormComponentHandle(form));
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke: async () => ({ ok: true })
    });

    await runtime.dispatch(
      {
        action: 'component:validate',
        componentId: 'monitored-form'
      },
      {
        runtime,
        scope: page.scope,
        page,
        componentRegistry,
        actionScope
      }
    );

    await runtime.dispatch(
      {
        action: 'designer:export'
      },
      {
        runtime,
        scope: page.scope,
        page,
        componentRegistry,
        actionScope
      }
    );

    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'component:validate',
        dispatchMode: 'component',
        componentId: 'monitored-form',
        componentType: 'form',
        method: 'validate'
      })
    );
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'designer:export',
        dispatchMode: 'namespace',
        namespace: 'designer',
        method: 'export',
        sourceScopeId: 'monitor-scope',
        providerKind: 'host'
      })
    );
  });

  it('emits action monitor callbacks for cancelled debounced actions', async () => {
    vi.useFakeTimers();

    try {
      const onActionStart = vi.fn();
      const onActionEnd = vi.fn();
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          monitor: {
            onActionStart,
            onActionEnd
          }
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({ status: 'idle' });

      const firstPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'first',
          debounce: 25
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      const secondPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'second',
          debounce: 25
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await expect(firstPromise).resolves.toMatchObject({ cancelled: true });
      await vi.advanceTimersByTimeAsync(25);
      await secondPromise;

      expect(onActionStart).toHaveBeenCalledTimes(1);
      expect(onActionEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'setValue',
          result: expect.objectContaining({ cancelled: true })
        })
      );
      expect(onActionEnd).toHaveBeenLastCalledWith(
        expect.objectContaining({
          actionType: 'setValue',
          result: expect.objectContaining({ ok: true, data: 'second' })
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops chained actions on ajax failure by default', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      [
        {
          action: 'ajax',
          api: {
            url: '/api/fail',
            method: 'get'
          }
        },
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'done'
        }
      ],
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('boom');
    expect(page.store.getState().data.status).toBe('idle');
  });

  it('continues action arrays when continueOnError is enabled', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      [
        {
          action: 'ajax',
          api: {
            url: '/api/fail',
            method: 'get'
          },
          continueOnError: true
        },
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'done'
        }
      ],
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data.status).toBe('done');
  });


  it('runs then actions after a successful action', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle', lastResult: 'none' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'status',
        value: 'loading',
        then: {
          action: 'setValue',
          componentPath: 'lastResult',
          value: '${result.data}'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data).toMatchObject({
      status: 'loading',
      lastResult: 'loading'
    });
  });

  it('does not run then actions for skipped results', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle', marker: 'unchanged' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'status',
        value: 'loading',
        when: '${false}',
        then: {
          action: 'setValue',
          componentPath: 'marker',
          value: 'then-ran'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(page.store.getState().data).toMatchObject({
      status: 'idle',
      marker: 'unchanged'
    });
  });

  it('runs onError by default for failure-class results', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle', failure: 'none' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/fail',
          method: 'get'
        },
        onError: {
          action: 'setValue',
          componentPath: 'failure',
          value: '${error.message}:${result.ok}:${prevResult.ok}'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(page.store.getState().data).toMatchObject({
      status: 'idle',
      failure: 'boom:false:true'
    });
  });

  it('does not run then actions for failure-class results even when continueOnError is enabled', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle', failure: 'none', success: 'none' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/fail',
          method: 'get'
        },
        continueOnError: true,
        then: {
          action: 'setValue',
          componentPath: 'success',
          value: 'then-ran'
        },
        onError: {
          action: 'setValue',
          componentPath: 'failure',
          value: '${error.message}'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data).toMatchObject({
      status: 'idle',
      failure: 'boom',
      success: 'none'
    });
  });

  it('does not leak onError as top-level payload to namespaced actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = createActionScope({ id: 'designer-scope' });
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    await runtime.dispatch(
      {
        action: 'designer:addNode',
        nodeType: 'task',
        onError: {
          action: 'setValue',
          componentPath: 'ignored',
          value: 'ignored'
        }
      } as any,
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(invoke).toHaveBeenCalledWith(
      'addNode',
      {
        nodeType: 'task'
      },
      expect.objectContaining({ actionScope })
    );
  });

  it('lets beforeAction plugins rewrite actions before dispatch', async () => {
    const plugin: RendererPlugin = {
      name: 'rewrite-action',
      async beforeAction(action) {
        if (action.action !== 'setValue') {
          return action;
        }

        return {
          ...action,
          value: 'rewritten'
        } as ActionSchema;
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      plugins: [plugin],
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'status',
        value: 'original'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, data: 'rewritten' });
    expect(page.store.getState().data.status).toBe('rewritten');
  });

  it('reports action errors through onActionError and plugin onError hooks', async () => {
    const onActionError = vi.fn();
    const onError = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          throw new Error('network down') as unknown as T;
        }
      },
      plugins: [
        {
          name: 'error-monitor',
          onError
        }
      ],
      onActionError,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/fail',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(onActionError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[1]).toMatchObject({
      phase: 'action'
    });
  });

  it('submits form values through submitForm actions', async () => {
    const fetchCalls: Array<{ api: unknown; scopeData: Record<string, any> }> = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject, ctx: ApiRequestContext) => {
          fetchCalls.push({ api, scopeData: ctx.scope.readOwn() });
          return {
            ok: true,
            status: 200,
            data: { submitted: ctx.scope.readOwn() } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', email: 'alice@example.com' },
      parentScope: page.scope,
      page
    });

    form.setValue('role', 'admin');

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        api: {
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

    expect(result.ok).toBe(true);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].api).toMatchObject({ url: '/api/profile', method: 'post' });
    expect(fetchCalls[0].scopeData).toMatchObject({ username: 'Alice', email: 'alice@example.com', role: 'admin' });
    expect(result.data).toEqual({
      submitted: {
        username: 'Alice',
        email: 'alice@example.com',
        role: 'admin'
      }
    });
  });

  it('updates multiple form values through setValues action with bounded commits', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await runtime.dispatch(
      {
        action: 'setValues',
        formId: 'profile-form',
        values: {
          username: 'Bob',
          role: 'admin'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribe();

    expect(result).toMatchObject({
      ok: true,
      data: {
        username: 'Bob',
        role: 'admin'
      }
    });
    expect(form.scope.get('username')).toBe('Bob');
    expect(form.scope.get('role')).toBe('admin');
    expect(commits).toBeLessThanOrEqual(1);
  });

  it('can replace chained setValue actions with one setValues action for equivalent form updates', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page
    });

    let chainedCommits = 0;
    const unsubscribeChained = form.store.subscribe(() => {
      chainedCommits += 1;
    });

    await runtime.dispatch(
      [
        {
          action: 'setValue',
          formId: 'profile-form',
          componentPath: 'username',
          value: 'Bob'
        },
        {
          action: 'setValue',
          formId: 'profile-form',
          componentPath: 'role',
          value: 'admin'
        }
      ],
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribeChained();

    const chainedSnapshot = form.store.getState();

    form.reset({ username: 'Alice', role: 'viewer' });

    let batchedCommits = 0;
    const unsubscribeBatched = form.store.subscribe(() => {
      batchedCommits += 1;
    });

    await runtime.dispatch(
      {
        action: 'setValues',
        formId: 'profile-form',
        values: {
          username: 'Bob',
          role: 'admin'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribeBatched();

    const batchedSnapshot = form.store.getState();

    expect(chainedSnapshot.values).toEqual(batchedSnapshot.values);
    expect(chainedSnapshot.errors).toEqual(batchedSnapshot.errors);
    expect(batchedCommits).toBeLessThan(chainedCommits);
  });

  it('uses the latest env fetcher without recreating runtime state', async () => {
    const firstFetcher = vi.fn(async <T,>(api: ApiObject) => ({
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
        api: {
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

    const secondFetcher = vi.fn(async <T,>(api: ApiObject) => ({
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
        api: {
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
        api: {
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
        api: {
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
        api: {
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
        api: {
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
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
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
        api: {
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
      afterCompile(node) {
        if (Array.isArray(node)) {
          return node;
        }

        return {
          ...node,
          props: createExpressionCompiler(createFormulaCompiler()).compileValue({
            ...node.schema,
            text: 'Prepared text + compiled'
          })
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
