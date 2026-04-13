import { describe, expect, it, vi } from 'vitest';
import { type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env, compiledRule } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('blocks form submit when async validation fails', async () => {
    const fetchCalls: any[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: any) => {
          fetchCalls.push(api);

          if (api.url === '/api/validate-username') {
            return {
              ok: true,
              status: 200,
              data: {
                valid: false,
                message: 'Username already exists'
              } as T
            };
          }

          return {
            ok: true,
            status: 200,
            data: { ok: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username',
                  requestAdaptor: 'return {data: {username: scope.username}};'
                },
                message: 'Username already exists'
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const result = await form.submit({
      method: 'post',
      url: '/api/users'
    });

    expect(result.ok).toBe(false);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('/api/validate-username');
    expect(form.getError('username')?.[0]?.message).toBe('Username already exists');
  });

  it('tracks field-level validating state during async validation', async () => {
    let resolveValidation: ((value: any) => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async () =>
          await new Promise((resolve) => {
            resolveValidation = resolve;
          })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username'
                }
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const validationPromise = form.validateField('username');

    await vi.waitFor(() => {
      expect(resolveValidation).toBeTypeOf('function');
    });

    expect(form.isValidating('username')).toBe(true);

    resolveValidation?.({
      ok: true,
      status: 200,
      data: { valid: true }
    });

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(form.isValidating('username')).toBe(false);
  });

  it('ignores stale async validation results after field value changes', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async () =>
          await new Promise((resolve) => {
            resolveFirst = resolve;
          })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username'
                },
                message: 'Username already exists'
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const firstValidation = form.validateField('username');

    await vi.waitFor(() => {
      expect(resolveFirst).toBeTypeOf('function');
    });

    form.setValue('username', 'alice-2');

    resolveFirst?.({
      ok: true,
      status: 200,
      data: {
        valid: false,
        message: 'Username already exists'
      }
    });

    await expect(firstValidation).resolves.toMatchObject({ ok: true, errors: [] });
    expect(form.getError('username')).toBeUndefined();
    expect(form.isValidating('username')).toBe(false);
  });

  it('debounces async field validation and cancels superseded runs', async () => {
    vi.useFakeTimers();

    try {
      const fetcherMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { valid: true }
      }));
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcherMock as RendererEnv['fetcher']
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({});
      const form = runtime.createFormRuntime({
        id: 'user-form',
        initialValues: {
          username: 'alice'
        },
        parentScope: page.scope,
        validation: {
          behavior: {
            triggers: ['blur'],
            showErrorOn: ['touched', 'submit']
          },
          nodes: {
            username: {
              path: 'username',
              kind: 'field',
              controlType: 'input-text',
              label: 'Username',
              behavior: {
                triggers: ['blur'],
                showErrorOn: ['touched', 'submit']
              },
              rules: [
                compiledRule({
                  kind: 'async',
                  debounce: 50,
                  api: {
                    method: 'post',
                    url: '/api/validate-username'
                  }
                }, 'username')
              ],
              children: [],
              parent: ''
            }
          },
          order: ['username'],
          dependents: {}
        }
      });

      const firstValidation = form.validateField('username');
      const secondValidation = form.validateField('username');

      await expect(firstValidation).resolves.toMatchObject({ ok: true, errors: [] });
      expect(fetcherMock).not.toHaveBeenCalled();
      expect(form.isValidating('username')).toBe(true);

      await vi.advanceTimersByTimeAsync(50);

      await expect(secondValidation).resolves.toMatchObject({ ok: true, errors: [] });
      expect(fetcherMock).toHaveBeenCalledTimes(1);
      expect(form.isValidating('username')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('tracks visited, touched, and dirty state through field interactions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    expect(form.isVisited('username')).toBe(false);
    expect(form.isTouched('username')).toBe(false);
    expect(form.isDirty('username')).toBe(false);

    form.visitField('username');
    form.touchField('username');
    form.setValue('username', 'bob');

    expect(form.isVisited('username')).toBe(true);
    expect(form.isTouched('username')).toBe(true);
    expect(form.isDirty('username')).toBe(true);

    form.reset({ username: 'bob' });

    expect(form.isVisited('username')).toBe(false);
    expect(form.isTouched('username')).toBe(false);
    expect(form.isDirty('username')).toBe(false);
  });
});
