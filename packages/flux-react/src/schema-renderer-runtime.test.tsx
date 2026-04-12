import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RendererDefinition, RendererEnv, RendererPlugin } from '@nop-chaos/flux-core';
import { createSchemaRenderer, NodeMetaContext, RenderNodes, RuntimeContext, ScopeContext } from './index';
import {
  actionScopeProbeRenderer,
  buttonRenderer,
  cidProbeRenderer,
  compositeProbeRenderer,
  countingTextRenderer,
  createExpressionCompiler,
  createFormulaCompiler,
  createRendererRegistry,
  createRendererRuntime,
  env,
  formRenderer,
  fragmentRenderHostRenderer,
  fragmentScopeProbeHostRenderer,
  namespaceProviderRenderer,
  nodeIdentityProbeRenderer,
  ownScopeValueProbeRenderer,
  pageRenderer,
  pageValueProbeRenderer,
  pageWithProbeFormSchema,
  pollingSourceRenderer,
  probeFormSchema,
  probeInputRenderer,
  renderWithRuntimeProviders,
  scopedHostRenderer,
  scopeLayerProbeRenderer,
  selectorRenderer,
  sharedFormulaCompiler,
  textRenderer,
  toggleHostRenderer,
  wrapProbeRenderer,
  componentHandleProviderRenderer,
  createDispatchCaptureRenderer
} from './test-support';

describe('createSchemaRenderer runtime behavior', () => {
  it('compiles runtime boundary flags for form, scope, provider, and class alias changes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, scopedHostRenderer, textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(sharedFormulaCompiler)
    });

    const compiled = runtime.compile({
      type: 'form',
      classAliases: { local: 'stack-2' },
      'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
      body: [{ type: 'scoped-host', body: [{ type: 'text', text: 'child' }] }]
    } as any);

    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.scopePlan.kind).toBe('form');
    expect(root.component.actionScopePolicy).not.toBe('new');
    expect(root.component.componentRegistryPolicy).toBe('new');
    expect(root.schema.classAliases).toBeTruthy();

    const scopedHost = Array.isArray(root.regions.body.node) ? root.regions.body.node[0] : root.regions.body.node;
    expect(scopedHost!.scopePlan.kind).toBe('inherit');
    expect(scopedHost!.component.actionScopePolicy).toBe('new');
    expect(scopedHost!.component.componentRegistryPolicy).toBe('new');
    expect(scopedHost!.schema.classAliases).toBeFalsy();
  });

  it('renders compiled schema in React', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Hello renderer' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Hello renderer')).toBeTruthy();
  });

  it('renders precompiled nodes passed through helpers.render', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const compiledNode = runtime.compile({
      type: 'text',
      text: 'Compiled hello'
    });
    const hostRenderer: RendererDefinition = {
      type: 'host',
      component: (props) => <section>{props.helpers.render(compiledNode as any)}</section>
    };
    const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Compiled hello')).toBeTruthy();
  });

  it('derives inline fragment paths from the current node instance when no compiled owner context exists', () => {
    const pathProbeRenderer: RendererDefinition = {
      type: 'path-probe',
      component: (props) => <span data-testid="path-probe">{props.path}</span>
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([pathProbeRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const ownerNodeInstance = {
      cid: 1,
      instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-1' }],
      templateNode: {
        templateNodeId: 1,
        id: 'inline-owner',
        type: 'host',
        schema: { type: 'host' },
        templatePath: 'host.root',
        rendererType: 'host',
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {}
      },
      scope: page.scope,
      state: {
        metaState: {},
        mounted: true
      }
    } as any;

    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <NodeMetaContext.Provider value={{
            id: ownerNodeInstance.templateNode.id,
            path: ownerNodeInstance.templateNode.templatePath,
            type: ownerNodeInstance.templateNode.rendererType,
            cid: ownerNodeInstance.cid,
            templateNode: ownerNodeInstance.templateNode,
            node: ownerNodeInstance
          }}>
            <RenderNodes input={{ type: 'path-probe' }} options={{ pathSuffix: 'inline' }} />
          </NodeMetaContext.Provider>
        </ScopeContext.Provider>
      </RuntimeContext.Provider>
    );

    expect(screen.getByTestId('path-probe').textContent).toBe('host.root.inline');
  });

  it('exposes template nodes through renderer props and current-node meta hooks', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, nodeIdentityProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [{ id: 'identity-node', type: 'node-identity-probe' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByTestId('props-template-path').textContent).toBe('$.body[0]');
    expect(screen.getByTestId('meta-template-path').textContent).toBe('$.body[0]');
  });

  it('supports useScopeSelector with parent scopes that do not expose a store', () => {
    const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={{
          id: 'root',
          path: '$',
          get(path: string) {
            return path === 'message' ? 'Scoped hello' : undefined;
          },
          has(path: string) {
            return path === 'message';
          },
          readOwn: () => ({ message: 'Scoped hello' }),
          value: { message: 'Scoped hello' },
          read: () => ({ message: 'Scoped hello' }),
          update: () => undefined,
          merge: () => {}
        }}
      />
    );

    expect(screen.getByText('Scoped hello')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={{
          id: 'root',
          path: '$',
          get(path: string) {
            return path === 'message' ? 'Scoped update' : undefined;
          },
          has(path: string) {
            return path === 'message';
          },
          readOwn: () => ({ message: 'Scoped update' }),
          value: { message: 'Scoped update' },
          read: () => ({ message: 'Scoped update' }),
          update: () => undefined,
          merge: () => {}
        }}
      />
    );

    expect(screen.getByText('Scoped update')).toBeTruthy();
  });

  it('does not recompute unrelated NodeRenderer props and meta on unrelated path changes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([pageRenderer, countingTextRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(sharedFormulaCompiler)
    });
    const page = runtime.createPageRuntime({ user: { name: 'Alice' }, title: 'Architect' });
    const originalResolveNodeMeta = runtime.resolveNodeMeta;
    const originalResolveNodeProps = runtime.resolveNodeProps;
    const metaCalls: string[] = [];
    const propCalls: string[] = [];

    runtime.resolveNodeMeta = ((node, scope, state) => {
      metaCalls.push(node.id);
      return originalResolveNodeMeta(node, scope, state);
    }) as typeof runtime.resolveNodeMeta;
    runtime.resolveNodeProps = ((node, scope, state) => {
      propCalls.push(node.id);
      return originalResolveNodeProps(node, scope, state);
    }) as typeof runtime.resolveNodeProps;

    renderWithRuntimeProviders({
      runtime,
      page,
      schema: {
        type: 'page',
        body: [
          { id: 'user-node', type: 'counting-text', text: 'User ${user.name}', visible: '${user.name !== ""}' },
          { id: 'title-node', type: 'counting-text', text: 'Title ${title}', visible: '${title !== ""}' }
        ]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('User Alice')).toBeTruthy();
      expect(screen.getByText('Title Architect')).toBeTruthy();
    });

    metaCalls.length = 0;
    propCalls.length = 0;

    page.scope.update('user.name', 'Bob');

    await waitFor(() => {
      expect(screen.getByText('User Bob')).toBeTruthy();
    });

    expect(propCalls.filter((id) => id.includes('user-node')).length).toBeGreaterThan(0);
    expect(metaCalls.filter((id) => id.includes('user-node')).length).toBeGreaterThan(0);
    expect(propCalls.filter((id) => id.includes('title-node')).length).toBe(0);
    expect(metaCalls.filter((id) => id.includes('title-node')).length).toBe(0);
  });

  it('uses lexical scope data by default and isolates own-scope subscriptions when requested', async () => {
    const pageStore = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(sharedFormulaCompiler)
    }).createPageRuntime({ data: { shared: 'parent-a' } }).store;
    const SchemaRenderer = createSchemaRenderer([fragmentScopeProbeHostRenderer, scopeLayerProbeRenderer, ownScopeValueProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'fragment-scope-probe-host',
          body: [{ type: 'scope-layer-probe' }, { type: 'own-scope-value-probe' }]
        } as any}
        data={{ shared: 'parent-a' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
        pageStore={pageStore}
      />
    );

    expect(screen.getByTestId('lexical-value').textContent).toBe('parent-a');
    expect(screen.getByTestId('own-value').textContent).toBe('');
    expect(screen.getByTestId('own-child-value').textContent).toBe('child-a');

    pageStore.updateData('shared', 'parent-b');

    await waitFor(() => {
      expect(screen.getByTestId('lexical-value').textContent).toBe('parent-b');
      expect(screen.getByTestId('own-child-value').textContent).toBe('child-a');
    });

    fireEvent.click(screen.getByText('Refresh fragment 0'));

    await waitFor(() => {
      expect(screen.getByTestId('own-child-value').textContent).toBe('child-b');
    });
  });

  it('provides nested action scope and component registry boundaries through the render tree', () => {
    const SchemaRenderer = createSchemaRenderer([scopedHostRenderer, actionScopeProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'scoped-host', body: [{ type: 'action-scope-probe' }] }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    expect(screen.getByTestId('action-scope-id').textContent).toContain('action-scope');
    expect(screen.getByTestId('component-registry-id').textContent).toContain('component-registry');
  });

  it('reports root component registry lifecycle through an explicit callback', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
    const onComponentRegistryChange = vi.fn();

    const { unmount } = render(
      <SchemaRenderer
        schema={{ type: 'page', body: [{ type: 'text', text: 'Hello' }] }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />
    );

    expect(onComponentRegistryChange).toHaveBeenCalledTimes(1);
    unmount();
    expect(onComponentRegistryChange).toHaveBeenCalledTimes(2);
    expect(onComponentRegistryChange.mock.calls[1]?.[0]).toBeNull();
  });

  it('reports root action scope lifecycle through an explicit callback', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
    const onActionScopeChange = vi.fn();

    const { unmount } = render(
      <SchemaRenderer
        schema={{ type: 'page', body: [{ type: 'text', text: 'Hello' }] }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
        onActionScopeChange={onActionScopeChange}
      />
    );

    expect(onActionScopeChange).toHaveBeenCalledTimes(1);
    unmount();
    expect(onActionScopeChange).toHaveBeenCalledTimes(2);
    expect(onActionScopeChange.mock.calls[1]?.[0]).toBeNull();
  });

  it('reopens dialog with fresh child providers and falls back after close', async () => {
    const capturedDispatches: Array<(input: any) => Promise<any>> = [];
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
      capturedDispatches.push(dispatch);
    });
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      scopedHostRenderer,
      namespaceProviderRenderer,
      componentHandleProviderRenderer,
      dispatchCaptureRenderer
    ]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
            { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
            {
              type: 'button',
              label: 'Open provider dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Provider dialog',
                  body: [
                    {
                      type: 'scoped-host',
                      body: [
                        { type: 'namespace-provider', namespace: 'demo', label: 'dialog-ns' },
                        { type: 'component-handle-provider', componentName: 'shared', label: 'dialog-handle' },
                        { type: 'dispatch-capture' },
                        { type: 'text', text: 'Dialog provider content' }
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open provider dialog'));
    expect(await screen.findByText('Dialog provider content')).toBeTruthy();

    await waitFor(() => {
      expect(capturedDispatches.length).toBe(1);
    });

    const firstDialogDispatch = capturedDispatches[0]!;
    expect(await firstDialogDispatch({ action: 'demo:ping', args: { value: 'first-open' } } as any)).toMatchObject({
      ok: true,
      data: 'dialog-ns:ping:first-open'
    });

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => {
      expect(screen.queryByText('Dialog provider content')).toBeNull();
    });

    expect(await firstDialogDispatch({ action: 'demo:ping', args: { value: 'after-close' } } as any)).toMatchObject({
      ok: true,
      data: 'outer-ns:ping:after-close'
    });

    fireEvent.click(screen.getByText('Open provider dialog'));
    expect(await screen.findByText('Dialog provider content')).toBeTruthy();

    await waitFor(() => {
      expect(capturedDispatches.length).toBe(2);
    });

    expect(await capturedDispatches[1]!({ action: 'demo:ping', args: { value: 'second-open' } } as any)).toMatchObject({
      ok: true,
      data: 'dialog-ns:ping:second-open'
    });
  });

  it('preserves field state across unrelated host rerenders', () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);

    function Host() {
      const [tick, setTick] = React.useState(0);

      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Rerender host {tick}
          </button>
          <SchemaRenderer
            schema={probeFormSchema}
            data={{ currentUser: { name: 'Architect' } }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('updates page scope data without recreating the form runtime', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeInputRenderer, pageValueProbeRenderer]);

    function Host() {
      const [name, setName] = React.useState('Architect');

      return (
        <div>
          <button type="button" onClick={() => setName('Operator')}>
            Rename user
          </button>
          <SchemaRenderer
            schema={pageWithProbeFormSchema}
            data={{ currentUser: { name } }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rename user'));
    expect(canvas.getByTestId('page-value').textContent).toBe('Operator');
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('preserves form state when fragment render data is recreated on host rerender', () => {
    const SchemaRenderer = createSchemaRenderer([fragmentRenderHostRenderer, formRenderer, probeInputRenderer]);
    const view = render(
      <SchemaRenderer
        schema={{ type: 'fragment-render-host' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Refresh fragment 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('preserves the form runtime when env identity changes', () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);

    function Host() {
      const [tick, setTick] = React.useState(0);
      const unstableEnv = React.useMemo<RendererEnv>(
        () => ({ ...env, functions: { tick: () => tick } }),
        [tick]
      );

      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Refresh env {tick}
          </button>
          <SchemaRenderer
            schema={probeFormSchema}
            data={{ currentUser: { name: 'Architect' } }}
            env={unstableEnv}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Refresh env 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('renders dialog content after dispatching a dialog action', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: { action: 'dialog', dialog: { title: 'Inspect record', body: [{ type: 'text', text: 'Dialog hello' }] } }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Inspect record')).toBeTruthy();
    expect(await screen.findByText('Dialog hello')).toBeTruthy();
  });

  it('renders schema-based dialog titles through the unified render path', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open compiled dialog',
              onClick: { action: 'dialog', dialog: { title: { type: 'text', text: 'Compiled dialog title' }, body: [{ type: 'text', text: 'Dialog body' }] } }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Open compiled dialog'));
    expect(await screen.findByText('Compiled dialog title')).toBeTruthy();
    expect(await screen.findByText('Dialog body')).toBeTruthy();
  });

  it('dispatches lifecycle actions on mount and unmount', async () => {
    const onActionStart = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, toggleHostRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'toggle-host',
              body: [
                {
                  type: 'text',
                  text: 'Lifecycle child',
                  onMount: {
                    action: 'probe:lifecycle',
                    args: { stage: 'mounted' }
                  },
                  onUnmount: {
                    action: 'probe:lifecycle',
                    args: { stage: 'unmounted' }
                  }
                }
              ]
            }
          ]
        } as any}
        env={{
          ...env,
          monitor: {
            onActionStart
          }
        }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(onActionStart).toHaveBeenCalled();
    });
    expect(onActionStart.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ actionType: 'probe:lifecycle' }));

    const mountCalls = onActionStart.mock.calls.length;
    fireEvent.click(screen.getByText('Hide child boundary'));

    await waitFor(() => {
      expect(onActionStart.mock.calls.length).toBeGreaterThan(mountCalls);
    });
    expect(onActionStart.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ actionType: 'probe:lifecycle' }));
  });

  it('normalizes click events into structured action context events', async () => {
    let capturedEvent: any;
    const actionScope = {
      id: 'root-action-scope',
      resolve(actionName: string) {
        if (actionName !== 'probe:captureEvent') {
          return undefined;
        }

        return {
          namespace: 'probe',
          method: 'captureEvent',
          sourceScopeId: 'root-action-scope',
          provider: {
            invoke(_method: string, _payload: Record<string, unknown> | undefined, ctx: any) {
              capturedEvent = ctx.event;
              return { ok: true };
            }
          }
        };
      },
      registerNamespace() {
        return () => undefined;
      },
      unregisterNamespace() {
        return undefined;
      },
      listNamespaces() {
        return ['probe'];
      }
    } as any;
    const eventProbeRenderer: RendererDefinition = {
      type: 'event-probe',
      component: (props) => (
        <button type="button" onClick={(event) => void props.events.onClick?.(event)}>
          Probe click
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };
    const SchemaRenderer = createSchemaRenderer([eventProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'event-probe',
          onClick: { action: 'probe:captureEvent' }
        }}
        env={env}
        actionScope={actionScope}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Probe click'));

    await waitFor(() => {
      expect(capturedEvent?.type).toBe('click');
      expect(typeof capturedEvent?.preventDefault).toBe('function');
      expect(typeof capturedEvent?.stopPropagation).toBe('function');
      expect(capturedEvent?.target).toBeTruthy();
    });
  });

  it('preserves dialog form state across host rerenders and page data updates', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, formRenderer, probeInputRenderer]);

    function Host() {
      const [tick, setTick] = React.useState(0);
      const [name, setName] = React.useState('Architect');

      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>Rerender host {tick}</button>
          <button type="button" onClick={() => setName('Operator')}>Rename user</button>
          <SchemaRenderer
            schema={{
              type: 'page',
              body: [
                {
                  type: 'button',
                  label: 'Open dialog',
                  onClick: {
                    action: 'dialog',
                    dialog: { title: { type: 'text', text: 'Dialog ${currentUser.name}' }, body: [{ type: 'text', text: 'Dialog user ${currentUser.name}' }, probeFormSchema] }
                  }
                }
              ]
            }}
            data={{ currentUser: { name } }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Open dialog'));
    await screen.findByText('Dialog Architect');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    fireEvent.click(canvas.getByText('Rename user'));
    expect(await screen.findByText('Dialog Operator')).toBeTruthy();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('alice@example.com');
  });

  it('updates dialog title and body when dialog scope changes', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open scoped dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: { type: 'text', text: 'Dialog ${message}' },
                  body: [
                    { type: 'text', text: 'Body ${message}' },
                    { type: 'button', label: 'Update dialog message', onClick: { action: 'setValue', componentPath: 'message', value: 'updated' } }
                  ]
                }
              }
            }
          ]
        }}
        data={{ message: 'initial' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open scoped dialog'));
    fireEvent.click(await screen.findByText('Update dialog message'));
    expect(await screen.findByText('Dialog updated')).toBeTruthy();
    expect(await screen.findByText('Body updated')).toBeTruthy();
  });

  it('creates a fresh dialog scope when reopening a dialog', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open fresh dialog',
              onClick: {
                action: 'dialog',
                dialog: { title: 'Fresh dialog', body: [{ type: 'text', text: '${draft}' }, { type: 'button', label: 'Set draft', onClick: { action: 'setValue', componentPath: 'draft', value: 'changed' } }] }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open fresh dialog'));
    fireEvent.click(await screen.findByText('Set draft'));
    expect(await screen.findByText('changed')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => {
      expect(screen.queryByText('changed')).toBeNull();
    });
    fireEvent.click(screen.getByText('Open fresh dialog'));
    expect(await screen.findByText('Fresh dialog')).toBeTruthy();
    expect(screen.queryByText('changed')).toBeNull();
  });

  it('stops dialog-scoped polling data sources after closing the dialog', async () => {
    const fetcherSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'polled' }
    }));
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, pollingSourceRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open polling dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Polling dialog',
                  body: [
                    { type: 'polling-source', id: 'dialog-poller', api: { url: '/api/dialog-poll' }, dataPath: 'payload', interval: 50 },
                    { type: 'text', text: '${payload.value}' }
                  ]
                }
              }
            }
          ]
        }}
        env={{ ...env, fetcher: fetcherSpy as RendererEnv['fetcher'] }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open polling dialog'));
    await waitFor(() => {
      expect(fetcherSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    }, { timeout: 1000 });

    const callsBeforeClose = fetcherSpy.mock.calls.length;
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => {
      expect(screen.queryByText('Polling dialog')).toBeNull();
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    const callsAfterClose = fetcherSpy.mock.calls.length;
    expect(callsAfterClose).toBeLessThanOrEqual(callsBeforeClose + 2);
  });

  it('supports wrapComponent plugins in the renderer pipeline', () => {
    const wrapped = vi.fn();
    const plugin: RendererPlugin = {
      name: 'wrap-text',
      wrapComponent(definition) {
        if (definition.type !== 'text') {
          return definition;
        }

        return {
          ...definition,
          component: (props) => {
            wrapped(props.props.label ?? props.props.text);
            return (
              <div>
                <span data-testid="wrapped-prefix">Wrapped</span>
                <definition.component {...props} />
              </div>
            );
          }
        };
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'page', body: [{ type: 'text', text: 'Wrapped hello' }] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        plugins={[plugin]}
      />
    );

    expect(screen.getByTestId('wrapped-prefix')).toBeTruthy();
    expect(wrapped).toHaveBeenCalledWith('Wrapped hello');
  });

  it('emits render monitor callbacks for rendered nodes', async () => {
    const onRenderStart = vi.fn();
    const onRenderEnd = vi.fn();
    const monitoredEnv = { ...env, monitor: { onRenderStart, onRenderEnd } };
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    const view = render(
      <SchemaRenderer
        schema={{ type: 'text', text: 'Monitored render' }}
        env={monitoredEnv}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(onRenderStart).toHaveBeenCalled();
    });

    const initialStartCalls = onRenderStart.mock.calls.length;
    const initialEndCalls = onRenderEnd.mock.calls.length;

    view.rerender(
      <SchemaRenderer
        schema={{ type: 'text', text: 'Monitored render' }}
        env={monitoredEnv}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(onRenderStart).toHaveBeenCalledTimes(initialStartCalls);
    expect(onRenderEnd).toHaveBeenCalledTimes(initialEndCalls);

    view.unmount();

    await waitFor(() => {
      expect(onRenderEnd).toHaveBeenCalled();
    });

    const renderEndPayload = onRenderEnd.mock.calls.at(-1)?.[0];
    expect(renderEndPayload).toEqual(expect.objectContaining({
      nodeId: expect.any(String),
      path: expect.any(String),
      type: 'text',
      durationMs: expect.any(Number)
    }));
    expect(renderEndPayload.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('projects form errors by owner path and source kind', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, compositeProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'form', body: [{ type: 'composite-probe' }] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Validate root'));
    fireEvent.click(screen.getByText('Validate child'));

    await waitFor(() => {
      expect(screen.getByTestId('root-error').textContent).toBe('Metadata requires at least one entry');
      expect(screen.getByTestId('child-error').textContent).toBe('Entry 1 value is required');
      expect(screen.getByTestId('owned-count').textContent).toBe('2');
    });
  });

  it('does not insert an extra wrapper for non-wrap nodes with cid', () => {
    const SchemaRenderer = createSchemaRenderer([cidProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'cid-probe', text: 'CID probe' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const root = screen.getByTestId('cid-root');
    const cid = root.getAttribute('data-cid');
    expect(cid).toMatch(/^\d+$/);
    expect(document.querySelectorAll(`[data-cid="${cid}"]`)).toHaveLength(1);
  });

  it('skips FieldFrame when frameWrap is false', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(
      <SchemaRenderer
        schema={{ type: 'wrap-probe', label: 'Standalone editor', frameWrap: false }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(container.querySelector('label.nop-field')).toBeNull();
  });

  it('uses group layout when frameWrap is group', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(
      <SchemaRenderer
        schema={{ type: 'wrap-probe', label: 'Grouped editor', frameWrap: 'group' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(container.querySelector('fieldset.nop-field')).toBeTruthy();
  });
});
