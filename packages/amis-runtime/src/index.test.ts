import { describe, expect, it, vi } from 'vitest';
import type {
  ActionSchema,
  ApiObject,
  ApiRequestContext,
  RendererDefinition,
  RendererEnv,
  RendererPlugin
} from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { setIn } from '@nop-chaos/amis-schema';
import { createRendererRegistry, createRendererRuntime, createSchemaCompiler } from './index';

function compiledRule(rule: any, path: string, index = 0) {
  return {
    id: `${path}#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [rule.path]
        : []
  };
}

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  regions: ['body']
};

const cardRenderer: RendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }, { key: 'body', kind: 'region', regionKey: 'body' }]
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }]
};

const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  regions: ['body', 'actions'],
  scopePolicy: 'form',
  validation: {
    kind: 'container'
  }
};

const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    }
  }
};

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

describe('createSchemaCompiler', () => {
  it('compiles regions and dynamic props', () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'page',
      body: [{ type: 'text', text: '${message}' }]
    });

    expect(Array.isArray(node)).toBe(false);
    expect((node as any).regions.body.node).toBeTruthy();
  });

  it('treats value-or-region fields as plain props when given plain values', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'card',
      title: 'Profile',
      body: [{ type: 'text', text: 'body' }]
    }) as any;

    expect(node.regions.title).toBeUndefined();
    expect(node.props.kind).toBe('static');
    expect(node.props.value.title).toBe('Profile');
  });

  it('treats value-or-region fields as compiled regions when given schema input', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile(
      {
        type: 'card',
        title: { type: 'text', text: 'Profile' },
        body: [{ type: 'text', text: 'body' }]
      } as any
    ) as any;

    expect(node.regions.title.node).toBeTruthy();
    expect(node.props.kind).toBe('static');
    expect(node.props.value.title).toBeUndefined();
  });

  it('lets field metadata override default meta handling for title', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'card',
      title: 'Profile'
    }) as any;
    const page = runtime.createPageRuntime({});
    const meta = runtime.resolveNodeMeta(node, page.scope, node.createRuntimeState());

    expect(meta.title).toBeUndefined();
    expect(node.props.value.title).toBe('Profile');
  });

  it('tracks event fields separately from normal props and regions', () => {
    const registry = createRendererRegistry([actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'action-button',
      onClick: {
        action: 'setValue',
        componentPath: 'message',
        value: 'clicked'
      }
    }) as any;

    expect(node.eventKeys).toEqual(['onClick']);
    expect(node.regions.onClick).toBeUndefined();
    expect(node.props.value.onClick).toBeUndefined();
    expect(node.eventActions.onClick).toMatchObject({ action: 'setValue' });
  });

  it('extracts table operation buttons into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, buttonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'table',
      columns: [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }]
        }
      ]
    }) as any;

    expect(node.regions['columns.0.buttons']?.node).toBeTruthy();
    expect(node.props.value.columns[0].buttons).toBeUndefined();
    expect(node.props.value.columns[0].buttonsRegionKey).toBe('columns.0.buttons');
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }]
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const plainNode = compiler.compile({
      type: 'table',
      empty: 'Nothing here'
    }) as any;
    const regionNode = compiler.compile({
      type: 'table',
      empty: { type: 'text', text: 'No rows' }
    }) as any;

    expect(plainNode.props.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.props.value.empty).toBeUndefined();
    expect(regionNode.regions.empty?.node).toBeTruthy();
  });
});

describe('createRendererRuntime', () => {
  it('preserves arrays when writing nested numeric paths', () => {
    const result = setIn({ reviewers: [] }, 'reviewers.0.value', 'alice');

    expect(Array.isArray(result.reviewers)).toBe(true);
    expect(result.reviewers[0]).toMatchObject({ value: 'alice' });
  });

  it('reuses resolved props references when values stay unchanged', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'text',
      text: '${message}'
    }) as any;

    const page = runtime.createPageRuntime({ message: 'Hello' });
    const state = node.createRuntimeState();
    const first = runtime.resolveNodeProps(node, page.scope, state);
    const second = runtime.resolveNodeProps(node, page.scope, state);

    expect(first.value).toBe(second.value);
    expect(second.reusedReference).toBe(true);
  });

  it('updates page scope through setValue action', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const page = runtime.createPageRuntime({ message: 'Hello' });

    await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'message',
        value: 'World'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(page.store.getState().data.message).toBe('World');
  });

  it('opens and closes dialogs through dialog actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
    const page = runtime.createPageRuntime({ message: 'Hello' });

    const openResult = await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'Runtime dialog',
          body: [{ type: 'text', text: '${message}' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        node
      }
    );

    expect(openResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(1);
    const dialogState = page.store.getState().dialogs[0];
    expect(dialogState.dialog.title).toBe('Runtime dialog');
    expect(dialogState.body).toBeTruthy();
    expect(dialogState.scope.get('dialogId')).toBe(dialogState.id);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog'
      },
      {
        runtime,
        scope: dialogState.scope,
        page,
        node,
        dialogId: dialogState.id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(0);
  });

  it('compiles schema-based dialog title and body when opening dialogs', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
    const page = runtime.createPageRuntime({});

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: { type: 'text', text: 'Compiled title' },
          body: [{ type: 'text', text: 'Compiled body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        node
      }
    );

    const dialogState = page.store.getState().dialogs[0] as any;
    expect(dialogState.title?.component).toBeTruthy();
    expect(Array.isArray(dialogState.body)).toBe(true);
    expect(dialogState.body[0]?.component).toBeTruthy();
  });

  it('evaluates expressions against child row scopes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const rowScope = runtime.createChildScope(page.scope, {
      record: { name: 'Bob' },
      index: 1
    });

    expect(runtime.evaluate('User: ${record.name}', rowScope)).toBe('User: Bob');
  });

  it('resolves lexical scope paths through scope.get', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ rootValue: 'page' });
    const child = runtime.createChildScope(page.scope, { record: { name: 'Alice' } });

    expect(child.get('record.name')).toBe('Alice');
    expect(child.get('rootValue')).toBe('page');
    expect(child.has('record.name')).toBe(true);
    expect(child.has('missing')).toBe(false);
  });

  it('supports unified visible and disabled meta fields', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({
      type: 'text',
      text: 'Status',
      visible: '${canView}',
      disabled: '${isLocked}'
    }) as any;
    const page = runtime.createPageRuntime({ canView: true, isLocked: true });

    const meta = runtime.resolveNodeMeta(node, page.scope, node.createRuntimeState());

    expect(meta.visible).toBe(true);
    expect(meta.hidden).toBe(false);
    expect(meta.disabled).toBe(true);
  });

  it('closes the nearest dialog by default', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
    const page = runtime.createPageRuntime({});

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'First',
          body: [{ type: 'text', text: 'First body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        node
      }
    );

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'Second',
          body: [{ type: 'text', text: 'Second body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        node
      }
    );

    const dialogs = page.store.getState().dialogs;
    expect(dialogs).toHaveLength(2);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog'
      },
      {
        runtime,
        scope: dialogs[1].scope,
        page,
        node,
        dialogId: dialogs[1].id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(1);
    expect(page.store.getState().dialogs[0].id).toBe(dialogs[0].id);
  });

  it('writes ajax response data into page state via dataPath', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          return {
            ok: true,
            status: 200,
            data: {
              users: {
                list: [{ id: 1, name: 'Alice' }]
              }
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ filter: 'active' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/users',
          method: 'get'
        },
        dataPath: 'users.list'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data).toEqual({
      filter: 'active',
      users: {
        list: [{ id: 1, name: 'Alice' }]
      }
    });
  });

  it('applies requestAdaptor before fetcher and responseAdaptor after fetcher', async () => {
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
              items: [{ id: 1, name: 'Alice' }],
              total: 1
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'secure-token' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/users',
          method: 'get',
          requestAdaptor: "return {headers: {Authorization: scope.token}, data: {query: scope.token}};",
          responseAdaptor: 'return {rows: payload.items, count: payload.total};'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/users',
      method: 'get',
      headers: {
        Authorization: 'secure-token'
      },
      data: {
        query: 'secure-token'
      }
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        rows: [{ id: 1, name: 'Alice' }],
        count: 1
      }
    });
  });

  it('evaluates adaptor scope through lexical scope view without eager whole-scope reads', async () => {
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
            data: { ok: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'page-token' });
    const childScope = runtime.createChildScope(page.scope, { username: 'Alice' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/adaptor-check',
          method: 'post',
          requestAdaptor: 'return {headers: {Authorization: scope.token}, data: {username: scope.username}};'
        }
      },
      {
        runtime,
        scope: childScope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls[0]).toMatchObject({
      headers: {
        Authorization: 'page-token'
      },
      data: {
        username: 'Alice'
      }
    });
  });

  it('blocks form submit when async validation fails', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
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
        fields: {
          username: {
            path: 'username',
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
            ]
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
        fields: {
          username: {
            path: 'username',
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
            ]
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
        fields: {
          username: {
            path: 'username',
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
            ]
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
          fields: {
            username: {
              path: 'username',
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
              ]
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
        fields: {
          username: {
            path: 'username',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
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
    const node = runtime.compile({
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
    }) as any;

    expect(node.validation.behavior.triggers).toEqual(['submit']);
    expect(node.validation.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validation.fields.username.behavior.triggers).toEqual(['blur', 'change']);
    expect(node.validation.fields.username.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validation.fields.nickname.behavior.triggers).toEqual(['submit']);
    expect(node.validation.fields.nickname.behavior.showErrorOn).toEqual(['touched', 'submit']);
  });

  it('compiles error visibility policy with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({
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
    }) as any;

    expect(node.validation.behavior.showErrorOn).toEqual(['submit']);
    expect(node.validation.fields.username.behavior.showErrorOn).toEqual(['visited', 'dirty']);
    expect(node.validation.fields.nickname.behavior.showErrorOn).toEqual(['submit']);
  });

  it('compiles relational validation rules and dependency metadata', () => {
    const registry = createRendererRegistry([formRenderer, inputRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
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
    }) as any;

    expect(node.validation.fields.confirmPassword.rules[0].rule).toMatchObject({
      kind: 'equalsField',
      path: 'password'
    });
    expect(node.validation.fields.confirmPassword.rules[0].dependencyPaths).toEqual(['password']);
    expect(node.validation.fields.adminCode.rules[0].rule).toMatchObject({
      kind: 'requiredWhen',
      path: 'role',
      equals: 'admin'
    });
    expect(node.validation.dependents.password).toEqual(['confirmPassword']);
    expect(node.validation.dependents.role).toEqual(['adminCode']);
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
        fields: {
          password: {
            path: 'password',
            controlType: 'input-text',
            label: 'Password',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
          },
          confirmPassword: {
            path: 'confirmPassword',
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
            ]
          },
          role: {
            path: 'role',
            controlType: 'input-text',
            label: 'Role',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
          },
          adminCode: {
            path: 'adminCode',
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
            ]
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
        fields: {
          username: {
            path: 'username',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
          },
          backupUsername: {
            path: 'backupUsername',
            controlType: 'input-text',
            label: 'Backup Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'notEqualsField', path: 'username', message: 'Backup username must differ' }, 'backupUsername')]
          },
          status: {
            path: 'status',
            controlType: 'input-text',
            label: 'Status',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
          },
          publishReason: {
            path: 'publishReason',
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
            ]
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

    const node = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          minItems: 1
        }
      ]
    }) as any;

    expect(node.validation.nodes.reviewers.kind).toBe('array');
    expect(node.validation.nodes[''].children).toContain('reviewers');
    expect(node.validation.fields.reviewers.rules[0].rule).toMatchObject({
      kind: 'minItems',
      value: 1
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
        fields: {
          reviewers: {
            path: 'reviewers',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Add at least one reviewer' }, 'reviewers')]
          }
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
        fields: {
          reviewers: {
            path: 'reviewers',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'maxItems', value: 1, message: 'Only one reviewer is allowed' }, 'reviewers')]
          }
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
        fields: {
          reviewers: {
            path: 'reviewers',
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
            ]
          }
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
        fields: {
          metadata: {
            path: 'metadata',
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
            ]
          }
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
        fields: {
          metadata: {
            path: 'metadata',
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
            ]
          }
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
        fields: {
          contact: {
            path: 'contact',
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
            ]
          }
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
        fields: {
          credentials: {
            path: 'credentials',
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
            ]
          }
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
    const compiled = compiler.compile({
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
    const order = compiled.validation?.validationOrder;

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
        fields: {
          metadata: {
            path: 'metadata',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: []
          }
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
        fields: {
          reviewers: {
            path: 'reviewers',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Need at least one reviewer' }, 'reviewers')]
          }
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
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
    const page = runtime.createPageRuntime({});

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
        node
      }
    );

    expect(result.ok).toBe(true);
    expect(onActionStart).toHaveBeenCalledWith({
      actionType: 'ajax',
      nodeId: node.id,
      path: node.path
    });
    expect(onApiRequest).toHaveBeenCalledWith({
      api: expect.objectContaining({ url: '/api/monitored', method: 'get' }),
      nodeId: node.id,
      path: node.path
    });
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ajax',
        nodeId: node.id,
        path: node.path,
        result: expect.objectContaining({ ok: true })
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
          value: 'success'
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
      lastResult: 'success'
    });
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

    const node = runtime.compile({
      type: 'text',
      text: 'Original text'
    }) as any;
    const page = runtime.createPageRuntime({});
    const resolved = runtime.resolveNodeProps(node, page.scope, node.createRuntimeState());

    expect(resolved.value.text).toBe('Prepared text + compiled');
  });
});
