import { describe, expect, it, vi } from 'vitest';
import type { ApiObject, RendererEnv } from '@nop-chaos/flux-core';
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
});
