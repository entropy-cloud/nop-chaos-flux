import { describe, expect, it, vi } from 'vitest';
import type { ApiSchema, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createManagedFormRuntime } from '../form-runtime';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { env, textRenderer } from './test-fixtures';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {}
  };
}

describe('audit-backed runtime fixes', () => {
  it('calls onSubmitError when submitApi throws', async () => {
    const onSubmitError = vi.fn(async (result) => result);
    const form = createManagedFormRuntime({
      id: 'submit-error-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      lifecycle: { onSubmitError },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => {
        throw new Error('server exploded');
      }
    });

    const result = await form.submit({ url: '/api/submit', method: 'post' });

    expect(onSubmitError).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      error: expect.any(Error)
    });
  });

  it('aborts stale async validation requests for the same path', async () => {
    let firstSignal: AbortSignal | undefined;
    let secondSignal: AbortSignal | undefined;
    let resolveFirst: (() => void) | undefined;
    let resolveSecond: (() => void) | undefined;

    const fetcher = vi.fn(async <T>(_api: ApiSchema, ctx: { signal?: AbortSignal }) => {
      if (!firstSignal) {
        firstSignal = ctx.signal;
        await new Promise<void>((resolve, reject) => {
          resolveFirst = resolve;
          ctx.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          }, { once: true });
        });
      } else {
        secondSignal = ctx.signal;
        await new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
      }

      return {
        ok: true,
        status: 200,
        data: { valid: true } as T
      };
    });

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'async-validation-form',
      initialValues: { email: 'a@example.com' },
      parentScope: page.scope,
      page,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['submit']
        },
        nodes: {
          email: {
            path: 'email',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'email#0:async',
                rule: { kind: 'async', api: { url: '/api/validate-email', method: 'post' } },
                dependencyPaths: []
              }
            ],
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['submit']
            },
            children: [],
            parent: ''
          }
        },
        order: ['email'],
        dependents: {}
      }
    });

    const firstValidation = form.validateField('email', 'change');
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    const secondValidation = form.validateField('email', 'change');

    await vi.waitFor(() => {
      expect(firstSignal?.aborted).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    resolveFirst?.();
    resolveSecond?.();

    await expect(firstValidation).resolves.toEqual({ ok: true, errors: [] });
    await expect(secondValidation).resolves.toEqual({ ok: true, errors: [] });
    expect(secondSignal?.aborted).toBe(false);
  });

  it('reports reaction dispatch failures instead of leaking unhandled rejections', async () => {
    const onError = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: { onError }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'failing-reaction',
      scope: page.scope,
      schema: {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'count:${count}'
          }
        }
      },
      dispatch: async () => {
        throw new Error('reaction exploded');
      }
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
          phase: 'action',
          details: expect.objectContaining({
            reason: 'reaction-run-failed',
            reactionId: 'failing-reaction'
          })
        }));
      });
    } finally {
      registration.dispose();
    }
  });
});
