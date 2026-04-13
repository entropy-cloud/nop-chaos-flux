import { describe, expect, it, vi } from 'vitest';
import type { ActionSchema, ApiObject, ApiRequestContext, RendererPlugin } from '@nop-chaos/flux-core';
import type { ActionSchema, ApiObject, ApiRequestContext, RendererPlugin } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createActionScope,
  createRendererRegistry,
  createRendererRuntime
} from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
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

});
