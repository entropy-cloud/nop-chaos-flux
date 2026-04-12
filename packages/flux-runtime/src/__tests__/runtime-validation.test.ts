import { describe, expect, it, vi } from 'vitest';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationNode,
  getCompiledValidationNodeMap,
  getCompiledValidationRootPath,
  getCompiledValidationTraversalOrder,
  hasCompiledValidationNodes,
  buildCompiledValidationDependentMap,
  buildCompiledValidationOrder,
  buildCompiledFormValidationModel,
  type CompiledFormValidationModel,
  type RendererDefinition,
  type RendererEnv
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime, createSchemaCompiler } from '../index';
import { textRenderer, formRenderer, inputRenderer, env, compiledRule } from './test-fixtures';

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

  it('compiles field validation triggers with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const _c1 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          validateOn: ['blur', 'change']
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        }
      ]
    });
    const node = (Array.isArray(_c1.root) ? _c1.root[0] : _c1.root) as any;

    expect(node.validationPlan.behavior.triggers).toEqual(['submit']);
    expect(node.validationPlan.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validationPlan.nodes.username.behavior.triggers).toEqual(['blur', 'change']);
    expect(node.validationPlan.nodes.username.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validationPlan.nodes.nickname.behavior.triggers).toEqual(['submit']);
    expect(node.validationPlan.nodes.nickname.behavior.showErrorOn).toEqual(['touched', 'submit']);
  });

  it('compiles error visibility policy with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const _c3 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          showErrorOn: ['visited', 'dirty']
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        }
      ]
    });
    const node = (Array.isArray(_c3.root) ? _c3.root[0] : _c3.root) as any;

    expect(node.validationPlan.behavior.showErrorOn).toEqual(['submit']);
    expect(node.validationPlan.nodes.username.behavior.showErrorOn).toEqual(['visited', 'dirty']);
    expect(node.validationPlan.nodes.nickname.behavior.showErrorOn).toEqual(['submit']);
  });

  it('reuses pooled validation behavior objects for equivalent field policies', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const _c2 = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: ['touched', 'submit'],
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        },
        {
          type: 'input-text',
          name: 'email',
          label: 'Email',
          required: true,
          validateOn: ['blur', 'change']
        }
      ]
    });
    const node = (Array.isArray(_c2.root) ? _c2.root[0] : _c2.root) as any;

    expect(node.validationPlan.nodes.username.behavior).toBe(node.validationPlan.nodes.nickname.behavior);
    expect(node.validationPlan.nodes.username.behavior).not.toBe(node.validationPlan.nodes.email.behavior);
    expect(node.validationPlan.nodes.username.behavior).toBe(node.validationPlan.nodes.username.behavior);
  });

  it('compiles relational validation rules and dependency metadata', () => {
    const registry = createRendererRegistry([formRenderer, inputRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const _c4 = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'input-text',
          name: 'password',
          label: 'Password'
        },
        {
          type: 'input-text',
          name: 'confirmPassword',
          label: 'Confirm Password',
          equalsField: 'password'
        },
        {
          type: 'input-text',
          name: 'adminCode',
          label: 'Admin Code',
          requiredWhen: {
            path: 'role',
            equals: 'admin',
            message: 'Admin code required for admins'
          }
        }
      ]
    });
    const node = (Array.isArray(_c4.root) ? _c4.root[0] : _c4.root) as any;

    expect(node.validationPlan.nodes.confirmPassword.rules[0].rule).toMatchObject({
      kind: 'equalsField',
      path: 'password'
    });
    expect(node.validationPlan.nodes.confirmPassword.rules[0].dependencyPaths).toEqual(['password']);
    expect(node.validationPlan.nodes.adminCode.rules[0].rule).toMatchObject({
      kind: 'requiredWhen',
      path: 'role',
      equals: 'admin'
    });
    expect(node.validationPlan.dependents.password).toEqual(['confirmPassword']);
    expect(node.validationPlan.dependents.role).toEqual(['adminCode']);
  });

  it('revalidates dependent fields when an upstream value changes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'dependency-form',
      initialValues: {
        password: 'alpha',
        confirmPassword: 'alpha',
        role: 'viewer',
        adminCode: ''
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          password: {
            path: 'password',
            kind: 'field',
            controlType: 'input-text',
            label: 'Password',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          confirmPassword: {
            path: 'confirmPassword',
            kind: 'field',
            controlType: 'input-text',
            label: 'Confirm Password',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              {
                id: 'confirmPassword#0:equalsField',
                rule: {
                  kind: 'equalsField',
                  path: 'password',
                  message: 'Passwords must match'
                },
                dependencyPaths: ['password']
              }
            ],
            children: [],
            parent: ''
          },
          role: {
            path: 'role',
            kind: 'field',
            controlType: 'input-text',
            label: 'Role',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          adminCode: {
            path: 'adminCode',
            kind: 'field',
            controlType: 'input-text',
            label: 'Admin Code',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              {
                id: 'adminCode#0:requiredWhen',
                rule: {
                  kind: 'requiredWhen',
                  path: 'role',
                  equals: 'admin',
                  message: 'Admin code required for admins'
                },
                dependencyPaths: ['role']
              }
            ],
            children: [],
            parent: ''
          }
        },
        order: ['password', 'confirmPassword', 'role', 'adminCode'],
        dependents: {
          password: ['confirmPassword'],
          role: ['adminCode']
        }
      }
    });

    form.touchField('confirmPassword');
    await form.validateField('confirmPassword');
    expect(form.getError('confirmPassword')).toBeUndefined();

    form.setValue('password', 'beta');

    await vi.waitFor(() => {
      expect(form.getError('confirmPassword')?.[0]?.message).toBe('Passwords must match');
    });

    form.touchField('adminCode');
    form.setValue('role', 'admin');

    await vi.waitFor(() => {
      expect(form.getError('adminCode')?.[0]?.message).toBe('Admin code required for admins');
    });

    form.setValue('role', 'viewer');

    await vi.waitFor(() => {
      expect(form.getError('adminCode')).toBeUndefined();
    });
  });

  it('supports not-equals and required-unless relational validators', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'relational-form',
      initialValues: {
        username: 'alice',
        backupUsername: 'bob',
        status: 'draft',
        publishReason: ''
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
          },
          backupUsername: {
            path: 'backupUsername',
            kind: 'field',
            controlType: 'input-text',
            label: 'Backup Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'notEqualsField', path: 'username', message: 'Backup username must differ' }, 'backupUsername')],
            children: [],
            parent: ''
          },
          status: {
            path: 'status',
            kind: 'field',
            controlType: 'input-text',
            label: 'Status',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          publishReason: {
            path: 'publishReason',
            kind: 'field',
            controlType: 'input-text',
            label: 'Publish Reason',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'requiredUnless',
                  path: 'status',
                  equals: 'published',
                  message: 'Publish reason is required before publishing'
                },
                'publishReason'
              )
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username', 'backupUsername', 'status', 'publishReason'],
        dependents: {
          username: ['backupUsername'],
          status: ['publishReason']
        }
      }
    });

    form.touchField('backupUsername');
    form.setValue('username', 'bob');

    await vi.waitFor(() => {
      expect(form.getError('backupUsername')?.[0]?.message).toBe('Backup username must differ');
    });

    form.setValue('username', 'carol');

    await vi.waitFor(() => {
      expect(form.getError('backupUsername')).toBeUndefined();
    });

    form.touchField('publishReason');
    form.setValue('status', 'review');

    await vi.waitFor(() => {
      expect(form.getError('publishReason')?.[0]?.message).toBe('Publish reason is required before publishing');
    });

    form.setValue('status', 'published');

    await vi.waitFor(() => {
      expect(form.getError('publishReason')).toBeUndefined();
    });
  });

  it('compiles validation nodes with array metadata', () => {
    const arrayRenderer: RendererDefinition = {
      type: 'array-editor',
      component: () => null,
      validation: {
        kind: 'field',
        valueKind: 'array',
        getFieldPath(schema) {
          return typeof schema.name === 'string' ? schema.name : undefined;
        },
        collectRules() {
          return [];
        }
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer, arrayRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const _c5 = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          minItems: 1
        }
      ]
    });
    const node = (Array.isArray(_c5.root) ? _c5.root[0] : _c5.root) as any;

    expect(node.validationPlan.nodes.reviewers.kind).toBe('array');
    expect(node.validationPlan.nodes[''].children).toContain('reviewers');
    expect(node.validationPlan.nodes.reviewers.rules[0].rule).toMatchObject({
      kind: 'minItems',
      value: 1
    });
  });

  it('exposes validation compatibility accessors from canonical model data', () => {
    const validation: CompiledFormValidationModel = {
      behavior: {
        triggers: ['blur'],
        showErrorOn: ['touched', 'submit']
      },
      order: ['reviewers'],
      dependents: {
        role: ['adminCode']
      },
      nodes: {
        '': {
          path: '',
          kind: 'form',
          rules: [],
          children: ['reviewers']
        },
        reviewers: {
          path: 'reviewers',
          kind: 'array',
          controlType: 'array-editor',
          label: 'Reviewers',
          behavior: {
            triggers: ['change'],
            showErrorOn: ['dirty']
          },
          rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Need one reviewer' }, 'reviewers')],
          children: [],
          parent: ''
        },
        adminCode: {
          path: 'adminCode',
          kind: 'field',
          controlType: 'input-text',
          label: 'Admin Code',
          behavior: {
            triggers: ['blur'],
            showErrorOn: ['touched', 'submit']
          },
          rules: [compiledRule({ kind: 'requiredWhen', path: 'role', value: 'admin' }, 'adminCode')],
          children: [],
          parent: ''
        }
      },
      validationOrder: ['reviewers'],
      rootPath: ''
    };

    expect(getCompiledValidationTraversalOrder(validation)).toEqual(['reviewers']);
    expect(getCompiledValidationDependents(validation, 'role')).toEqual(['adminCode']);
    expect(getCompiledValidationDependents(validation, 'missing')).toEqual([]);
    expect(getCompiledValidationNodeMap(validation)).toBe(validation.nodes);
    expect(getCompiledValidationNode(validation, 'reviewers')).toBe(validation.nodes?.reviewers);
    expect(getCompiledValidationNode(validation, 'missing')).toBeUndefined();
    expect(getCompiledValidationRootPath(validation)).toBe('');
    expect(hasCompiledValidationNodes(validation)).toBe(true);
    expect(hasCompiledValidationNodes(undefined)).toBe(false);
    expect(buildCompiledValidationDependentMap(validation.nodes)).toEqual({
      role: ['adminCode']
    });
    expect(buildCompiledValidationOrder(validation.nodes, '')).toEqual(['reviewers', 'adminCode']);
    expect(
      buildCompiledFormValidationModel({
        behavior: validation.behavior,
        nodes: validation.nodes,
        rootPath: ''
      })
    ).toMatchObject({
      order: ['reviewers', 'adminCode'],
      validationOrder: ['reviewers', 'adminCode'],
      dependents: {
        role: ['adminCode']
      }
    });
    expect(getCompiledValidationField(validation, 'reviewers')).toMatchObject({
      path: 'reviewers',
      controlType: 'array-editor',
      label: 'Reviewers',
      behavior: {
        triggers: ['change'],
        showErrorOn: ['dirty']
      }
    });
  });

  it('validates array-level rules through field and subtree validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-form',
      initialValues: {
        reviewers: []
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Add at least one reviewer' }, 'reviewers')],
            children: [],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    const fieldResult = await form.validateField('reviewers');
    expect(fieldResult.ok).toBe(false);
    expect(fieldResult.errors[0].message).toBe('Add at least one reviewer');
    expect(fieldResult.errors[0]).toMatchObject({
      path: 'reviewers',
      rule: 'minItems',
      ruleId: 'reviewers#0:minItems',
      ownerPath: 'reviewers',
      sourceKind: 'array'
    });

    const subtreeResult = await form.validateSubtree('reviewers');
    expect(subtreeResult.ok).toBe(false);
    expect(subtreeResult.fieldErrors.reviewers?.[0]?.message).toBe('Add at least one reviewer');

    form.setValue('reviewers', [{ value: 'alice' }]);

    const nextResult = await form.validateSubtree('reviewers');
    expect(nextResult.ok).toBe(true);
  });

  it('supports maxItems and includes runtime-registered child paths in subtree validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-subtree-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'maxItems', value: 1, message: 'Only one reviewer is allowed' }, 'reviewers')],
            children: ['reviewers.0.value', 'reviewers.1.value'],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    const subtreeResult = await form.validateSubtree('reviewers');
    expect(subtreeResult.ok).toBe(false);
    expect(subtreeResult.fieldErrors.reviewers?.[0]?.message).toBe('Only one reviewer is allowed');
    expect(subtreeResult.fieldErrors['reviewers.1.value']?.[0]?.message).toBe('Reviewer 2 is required');
    expect(subtreeResult.fieldErrors['reviewers.1.value']?.[0]).toMatchObject({
      path: 'reviewers.1.value',
      rule: 'required',
      ownerPath: 'reviewers',
      sourceKind: 'runtime-registration'
    });

    form.setValue('reviewers', [{ value: 'alice' }]);

    const nextSubtreeResult = await form.validateSubtree('reviewers');
    expect(nextSubtreeResult.fieldErrors.reviewers).toBeUndefined();
  });

  it('supports aggregate atLeastOneFilled validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'aggregate-array-form',
      initialValues: {
        reviewers: [{ value: '' }, { value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                { kind: 'atLeastOneFilled', itemPath: 'value', message: 'Add at least one reviewer value' },
                'reviewers'
              )
            ],
            children: ['reviewers.0.value', 'reviewers.1.value'],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('reviewers');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.reviewers?.[0]?.message).toBe('Add at least one reviewer value');

    form.setValue('reviewers', [{ value: '' }, { value: 'bob' }]);

    const nextResult = await form.validateSubtree('reviewers');
    expect(nextResult.ok).toBe(true);
  });

  it('supports aggregate allOrNone validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'all-or-none-array-form',
      initialValues: {
        metadata: [
          { key: 'env', value: '' },
          { key: '', value: '' }
        ]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'allOrNone',
                  itemPaths: ['key', 'value'],
                  message: 'Metadata entries must fill both key and value or leave both empty'
                },
                'metadata'
              )
            ],
            children: ['metadata.0.key', 'metadata.0.value'],
            parent: ''
          }
        },
        validationOrder: ['metadata'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('metadata');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.metadata?.[0]?.message).toBe(
      'Metadata entries must fill both key and value or leave both empty'
    );

    form.setValue('metadata', [
      { key: 'env', value: 'prod' },
      { key: '', value: '' }
    ]);

    const nextResult = await form.validateSubtree('metadata');
    expect(nextResult.ok).toBe(true);
  });

  it('supports aggregate uniqueBy validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'unique-array-form',
      initialValues: {
        metadata: [
          { key: 'env', value: 'prod' },
          { key: 'env', value: 'stage' }
        ]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'uniqueBy',
                  itemPath: 'key',
                  message: 'Metadata keys must be unique'
                },
                'metadata'
              )
            ],
            children: ['metadata.0.key', 'metadata.1.key'],
            parent: ''
          }
        },
        validationOrder: ['metadata'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('metadata');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.metadata?.[0]?.message).toBe('Metadata keys must be unique');
    expect(firstResult.fieldErrors.metadata?.[0]).toMatchObject({
      path: 'metadata',
      rule: 'uniqueBy',
      ruleId: 'metadata#0:uniqueBy',
      ownerPath: 'metadata',
      sourceKind: 'array',
      relatedPaths: ['key']
    });

    form.setValue('metadata', [
      { key: 'env', value: 'prod' },
      { key: 'tier', value: 'stage' }
    ]);

    const nextResult = await form.validateSubtree('metadata');
    expect(nextResult.ok).toBe(true);
  });

  it('supports object-level atLeastOneOf validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'contact-form',
      initialValues: {
        contact: {
          email: '',
          phone: ''
        }
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['contact'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['contact']
          },
          contact: {
            path: 'contact',
            kind: 'object',
            controlType: 'contact-group',
            label: 'Contact',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'atLeastOneOf',
                  paths: ['email', 'phone'],
                  message: 'Provide at least an email or phone number'
                },
                'contact'
              )
            ],
            children: ['contact.email', 'contact.phone'],
            parent: ''
          }
        },
        validationOrder: ['contact'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('contact');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.contact?.[0]?.message).toBe('Provide at least an email or phone number');
    expect(firstResult.fieldErrors.contact?.[0]).toMatchObject({
      path: 'contact',
      rule: 'atLeastOneOf',
      ruleId: 'contact#0:atLeastOneOf',
      ownerPath: 'contact',
      sourceKind: 'object',
      relatedPaths: ['email', 'phone']
    });

    form.setValue('contact', { email: 'a@example.com', phone: '' });

    const nextResult = await form.validateSubtree('contact');
    expect(nextResult.ok).toBe(true);
  });

  it('supports object-level allOrNone validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'credentials-form',
      initialValues: {
        credentials: {
          username: 'alice',
          password: ''
        }
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['credentials'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['credentials']
          },
          credentials: {
            path: 'credentials',
            kind: 'object',
            controlType: 'credentials-group',
            label: 'Credentials',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'allOrNone',
                  itemPaths: ['username', 'password'],
                  message: 'Provide both username and password or leave both empty'
                },
                'credentials'
              )
            ],
            children: ['credentials.username', 'credentials.password'],
            parent: ''
          }
        },
        validationOrder: ['credentials'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('credentials');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.credentials?.[0]?.message).toBe('Provide both username and password or leave both empty');

    form.setValue('credentials', { username: 'alice', password: 'secret' });

    const nextResult = await form.validateSubtree('credentials');
    expect(nextResult.ok).toBe(true);
  });

  it('builds node traversal order from validation node relationships', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const _c6 = compiler.compile({
        type: 'form',
        body: [
          {
            type: 'input-text',
            name: 'reviewers',
            label: 'Reviewers'
          },
          {
            type: 'input-text',
            name: 'metadata',
            label: 'Metadata'
          }
        ]
      }) as any;
    const compiledRoot = Array.isArray(_c6.root) ? _c6.root[0] : _c6.root;
    const order = compiledRoot.validationPlan?.order;

    expect(order).toEqual(['reviewers', 'metadata']);
  });

  it('validates subtree targets from node traversal for nested child paths', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'nested-subtree-form',
      initialValues: {
        metadata: [{ key: '', value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: ['metadata.0.key', 'metadata.0.value'],
            parent: ''
          },
          'metadata.0.key': {
            path: 'metadata.0.key',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'metadata'
          },
          'metadata.0.value': {
            path: 'metadata.0.value',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'metadata'
          }
        },
        validationOrder: ['metadata', 'metadata.0.key', 'metadata.0.value'],
        rootPath: ''
      }
    });

    form.registerField({
      path: 'metadata',
      childPaths: ['metadata.0.key', 'metadata.0.value'],
      getValue() {
        return form.store.getState().values.metadata;
      },
      validateChild(path) {
        return [{ path, rule: 'required', message: `${path} is required` }];
      }
    });

    const result = await form.validateSubtree('metadata');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['metadata.0.key']?.[0]?.message).toBe('metadata.0.key is required');
    expect(result.fieldErrors['metadata.0.value']?.[0]?.message).toBe('metadata.0.value is required');
  });

  it('prefers node-driven subtree execution while preserving runtime-registration children', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'node-walker-form',
      initialValues: {
        reviewers: [{ value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Need at least one reviewer' }, 'reviewers')],
            children: ['reviewers.0.value'],
            parent: ''
          },
          'reviewers.0.value': {
            path: 'reviewers.0.value',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'reviewers'
          }
        },
        validationOrder: ['reviewers', 'reviewers.0.value'],
        rootPath: ''
      }
    });

    const visited: string[] = [];

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validate() {
        visited.push('reviewers');
        return [];
      },
      validateChild(path) {
        visited.push(path);
        return [{ path, rule: 'required', message: 'Reviewer value is required' }];
      }
    });

    const result = await form.validateSubtree('reviewers');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['reviewers.0.value']?.[0]?.message).toBe('Reviewer value is required');
    expect(visited).toEqual(['reviewers', 'reviewers.0.value']);
  });

  it('remaps child errors when removing array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-remap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    await form.validateField('reviewers.1.value');
    expect(form.getError('reviewers.1.value')?.[0]?.message).toBe('Reviewer 2 is required');

    form.removeValue('reviewers', 0);

    expect(form.getError('reviewers.1.value')).toBeUndefined();
    expect(form.store.getState().values.reviewers).toEqual([{ value: '' }]);
  });

  it('remaps child errors when removing middle array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-middle-remap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: 'bob' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value', 'reviewers.2.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.2.value'
          ? [{ path, rule: 'required', message: 'Reviewer 3 is required' }]
          : [];
      }
    });

    form.touchField('reviewers.2.value');
    await form.validateField('reviewers.2.value');
    expect(form.getError('reviewers.2.value')?.[0]?.message).toBe('Reviewer 3 is required');

    form.removeValue('reviewers', 1);

    expect(form.store.getState().values.reviewers).toEqual([{ value: 'alice' }, { value: '' }]);
    expect(form.isTouched('reviewers.1.value')).toBe(true);
    expect(form.getError('reviewers.2.value')).toBeUndefined();
    expect(form.getError('reviewers.1.value')?.[0]?.message).toBe('Reviewer 3 is required');
  });

  it('remaps touched and errors when swapping array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-swap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    form.touchField('reviewers.1.value');
    await form.validateField('reviewers.1.value');

    form.swapValue('reviewers', 0, 1);

    expect(form.store.getState().values.reviewers).toEqual([{ value: '' }, { value: 'alice' }]);
    expect(form.isTouched('reviewers.0.value')).toBe(true);
    expect(form.isTouched('reviewers.1.value')).toBe(false);
    expect(form.getError('reviewers.0.value')?.[0]?.message).toBe('Reviewer 2 is required');
    expect(form.getError('reviewers.1.value')).toBeUndefined();
  });

  it('normalizes root runtime-registration validation error metadata', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'runtime-root-form',
      initialValues: {
        tags: []
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'tags',
      getValue() {
        return form.store.getState().values.tags;
      },
      validate() {
        return [{ path: 'tags', rule: 'required', message: 'Tag List requires at least one tag' }];
      }
    });

    const result = await form.validateField('tags');

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({
      path: 'tags',
      rule: 'required',
      message: 'Tag List requires at least one tag',
      ownerPath: 'tags',
      sourceKind: 'runtime-registration'
    });
  });
});
