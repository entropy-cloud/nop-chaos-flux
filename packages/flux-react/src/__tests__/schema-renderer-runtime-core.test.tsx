import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { createSchemaRenderer, NodeMetaContext, RenderNodes, RuntimeContext, ScopeContext, useDataSourceStatus, useRenderScope, useRendererRuntime, useScopeSelector } from '../index';
import {
  cidProbeRenderer,
  createExpressionCompiler,
  createFormulaCompiler,
  createRendererRegistry,
  createRendererRuntime,
  env,
  formRenderer,
  nodeIdentityProbeRenderer,
  pageRenderer,
  probeFormSchema,
  probeInputRenderer,
  scopedHostRenderer,
  selectorRenderer,
  sharedFormulaCompiler,
  textRenderer,
  wrapProbeRenderer,
} from '../test-support';

describe('createSchemaRenderer runtime core behavior', () => {
  it('compiles runtime boundary flags for form, scope, provider, and class alias changes', () => {
    const runtime = createRendererRuntime({ registry: createRendererRegistry([formRenderer, scopedHostRenderer, textRenderer]), env, expressionCompiler: createExpressionCompiler(sharedFormulaCompiler) });
    const compiled = runtime.compile({ type: 'form', classAliases: { local: 'stack-2' }, 'xui:imports': [{ from: 'demo-lib', as: 'demo' }], body: [{ type: 'scoped-host', body: [{ type: 'text', text: 'child' }] }] } as any);
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.scopePlan.kind).toBe('form');
    const scopedHost = Array.isArray(root.regions.body.node) ? root.regions.body.node[0] : root.regions.body.node;
    expect(scopedHost!.component.actionScopePolicy).toBe('new');
  });

  it('renders compiled schema in React', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'text', text: 'Hello renderer' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByText('Hello renderer')).toBeTruthy();
  });

  it('releases root-level imported namespaces when the schema changes', async () => {
    const dispose = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const actionScope = createActionScope({ id: 'root-import-scope' });
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          dispose,
          invoke: async () => ({ ok: true })
        })
      }))
    };

    const { rerender } = render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'text', text: 'A', 'xui:imports': [{ from: 'demo-lib', as: 'demo' }] } as any}
        env={{ ...env, importLoader }}
        formulaCompiler={createFormulaCompiler()}
        actionScope={actionScope}
      />
    );

    await waitFor(() => {
      expect(importLoader.load).toHaveBeenCalledTimes(1);
    });

    rerender(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'text', text: 'B' } as any}
        env={{ ...env, importLoader }}
        formulaCompiler={createFormulaCompiler()}
        actionScope={actionScope}
      />
    );

    await waitFor(() => {
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  it('compiles the root schema before passing it to RenderNodes', async () => {
    const capturedInputs: unknown[] = [];

    vi.resetModules();
    const actualHelpers = await vi.importActual<typeof import('../helpers')>('../helpers');
    vi.doMock('../helpers', () => ({
      ...actualHelpers,
      RenderNodes(props: Parameters<typeof actualHelpers.RenderNodes>[0]) {
        capturedInputs.push(props.input);
        return actualHelpers.RenderNodes(props);
      }
    }));

    try {
      const { createSchemaRenderer: createSchemaRendererWithMock } = await import('../schema-renderer');
      const SchemaRenderer = createSchemaRendererWithMock([textRenderer]);

      render(
        <SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'text', text: 'Compiled at boundary' }}
          env={env}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      expect(screen.getByText('Compiled at boundary')).toBeTruthy();
      expect(capturedInputs).toHaveLength(1);
      expect(capturedInputs[0]).toMatchObject({
        root: expect.objectContaining({
          type: 'text',
          rendererType: 'text',
          schema: { type: 'text', text: 'Compiled at boundary' }
        })
      });
    } finally {
      vi.doUnmock('../helpers');
      vi.resetModules();
    }
  });

  it('renders precompiled nodes passed through helpers.render', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env, expressionCompiler: createExpressionCompiler(createFormulaCompiler()) });
    const compiledNode = runtime.compile({ type: 'text', text: 'Compiled hello' });
    const hostRenderer = { type: 'host', component: (props: any) => <section>{props.helpers.render(compiledNode as any)}</section> };
    const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);
    render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'host' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByText('Compiled hello')).toBeTruthy();
  });

  it('derives inline fragment paths from the current node instance when no compiled owner context exists', () => {
    const pathProbeRenderer = { type: 'path-probe', component: (props: any) => <span data-testid="path-probe">{props.path}</span> };
    const runtime = createRendererRuntime({ registry: createRendererRegistry([pathProbeRenderer]), env, expressionCompiler: createExpressionCompiler(createFormulaCompiler()) });
    const page = runtime.createPageRuntime({});
    const ownerNodeInstance = { cid: 1, instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-1' }], templateNode: { templateNodeId: 1, id: 'inline-owner', type: 'host', schema: { type: 'host' }, templatePath: 'host.root', rendererType: 'host', propsProgram: { kind: 'static', value: {} }, metaProgram: {}, eventPlans: {}, regions: {}, scopePlan: { kind: 'inherit' }, sourcePropKeys: [], sourceStatePropKeys: {} }, scope: page.scope, state: { metaState: {}, mounted: true } } as any;
    render(<RuntimeContext.Provider value={runtime}><ScopeContext.Provider value={page.scope}><NodeMetaContext.Provider value={{ id: ownerNodeInstance.templateNode.id, path: ownerNodeInstance.templateNode.templatePath, type: ownerNodeInstance.templateNode.rendererType, cid: ownerNodeInstance.cid, templateNode: ownerNodeInstance.templateNode, node: ownerNodeInstance }}><RenderNodes input={{ type: 'path-probe' }} options={{ pathSuffix: 'inline' }} /></NodeMetaContext.Provider></ScopeContext.Provider></RuntimeContext.Provider>);
    expect(screen.getByTestId('path-probe').textContent).toBe('host.root.inline');
  });

  it('exposes template nodes through renderer props and current-node meta hooks', () => {
    const SchemaRenderer = createSchemaRenderer([nodeIdentityProbeRenderer]);
    render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'node-identity-probe', id: 'identity-node' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByTestId('props-template-path').textContent).toBe('$');
  });

  it('supports useScopeSelector with parent scopes that do not expose a store', () => {
    const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
    const { rerender } = render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'selector-text' }} env={env} formulaCompiler={createFormulaCompiler()} parentScope={{ id: 'root', path: '$', get: (path: string) => (path === 'message' ? 'Scoped hello' : undefined), has: (path: string) => path === 'message', readOwn: () => ({ message: 'Scoped hello' }), readVisible: () => ({ message: 'Scoped hello' }), materializeVisible: () => ({ message: 'Scoped hello' }), value: { message: 'Scoped hello' }, update: () => undefined, merge: () => {} }} />);
    expect(screen.getByText('Scoped hello')).toBeTruthy();
    rerender(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'selector-text' }} env={env} formulaCompiler={createFormulaCompiler()} parentScope={{ id: 'root', path: '$', get: (path: string) => (path === 'message' ? 'Scoped update' : undefined), has: (path: string) => path === 'message', readOwn: () => ({ message: 'Scoped update' }), readVisible: () => ({ message: 'Scoped update' }), materializeVisible: () => ({ message: 'Scoped update' }), value: { message: 'Scoped update' }, update: () => undefined, merge: () => {} }} />);
    expect(screen.getByText('Scoped update')).toBeTruthy();
  });

  it('reads published data-source status summaries through useDataSourceStatus', async () => {
    let releaseRequest: ((value: { ok: boolean; status: number; data: { name: string } }) => void) | undefined;
    const fetcher = vi.fn(async () => new Promise((resolve) => {
      releaseRequest = resolve as typeof releaseRequest;
    }));
    const capturedStatuses: Array<Record<string, unknown> | undefined> = [];
    const statusProbeRenderer = {
      type: 'status-probe',
      component: function StatusProbe() {
        const status = useDataSourceStatus('userStatus');
        React.useEffect(() => {
          capturedStatuses.push(status as Record<string, unknown> | undefined);
        }, [status]);
        return <span data-testid="status-probe">{status?.loading ? 'loading' : status?.ready ? 'ready' : 'idle'}</span>;
      }
    };
    const apiSourceRenderer = {
      type: 'api-source-probe',
      component: function ApiSourceProbe(props: any) {
        const runtime = useRendererRuntime();
        const scope = useRenderScope();

        React.useEffect(() => {
          const registration = runtime.registerDataSource({
            id: props.id,
            scope,
            schema: {
              type: 'data-source',
              api: { url: '/api/user/1' },
              name: 'user',
              statusPath: 'userStatus'
            }
          });

          return () => {
            registration.dispose();
          };
        }, [props.id, runtime, scope]);

        return null;
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, statusProbeRenderer, apiSourceRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'page',
          body: [
            { type: 'api-source-probe', id: 'probe-source' },
            { type: 'status-probe' }
          ]
        }}
        env={{ ...env, fetcher: fetcher as any }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status-probe').textContent).toBe('loading');
    });

    expect(capturedStatuses.at(-1)).toMatchObject({
      loading: true,
      ready: false,
      hasData: false,
      hasError: false,
      isInitialLoading: true,
      isRefreshing: false,
      inFlightCount: 1
    });

    releaseRequest?.({ ok: true, status: 200, data: { name: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByTestId('status-probe').textContent).toBe('ready');
    });

    expect(capturedStatuses.at(-1)).toMatchObject({
      loading: false,
      ready: true,
      hasData: true,
      hasError: false,
      isInitialLoading: false,
      isRefreshing: false,
      inFlightCount: 0
    });
  });

  it('preserves field state across unrelated host rerenders', () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);
    function Host() {
      const [tick, setTick] = React.useState(0);
      return <div><button type="button" onClick={() => setTick((current) => current + 1)}>Rerender host {tick}</button><SchemaRenderer schemaUrl="test://schema.json" schema={probeFormSchema} data={{ currentUser: { name: 'Architect' } }} env={env} formulaCompiler={sharedFormulaCompiler} /></div>;
    }
    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('rerenders sibling consumers after async scope updates', async () => {
    const asyncPublisherRenderer = {
      type: 'async-scope-publisher',
      component: function AsyncScopePublisher() {
        const scope = useRenderScope();

        React.useEffect(() => {
          void Promise.resolve().then(() => {
            scope.update('user', { name: 'Alice' });
          });
        }, [scope]);

        return null;
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, asyncPublisherRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'page',
          body: [
            { type: 'async-scope-publisher' },
            { type: 'text', text: 'Hello, ${user?.name}' }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice')).toBeTruthy();
    });
  });

  it('preserves async scope updates across page refresh ticks', async () => {
    const asyncPublisherRenderer = {
      type: 'async-scope-publisher-with-refresh',
      component: function AsyncScopePublisherWithRefresh(props: any) {
        const scope = useRenderScope();

        React.useEffect(() => {
          props.helpers.dispatch({ action: 'refreshTable' });
          void Promise.resolve().then(() => {
            scope.update('user', { name: 'Alice' });
          });
        }, [props.helpers, scope]);

        return null;
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, asyncPublisherRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'page',
          body: [
            { type: 'async-scope-publisher-with-refresh' },
            { type: 'text', text: 'Hello, ${user?.name}' }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice')).toBeTruthy();
    });
  });

  it('rerenders sibling consumers after a renderer registers an api data source', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { name: 'Alice' } }));
    let capturedRuntime: ReturnType<typeof createRendererRuntime> | undefined;
    let capturedScope: import('@nop-chaos/flux-core').ScopeRef | undefined;
    const userProbeRenderer = {
      type: 'user-probe',
      component: function UserProbe() {
        const userName = useScopeSelector((scope: { user?: { name?: string } }) => scope.user?.name ?? '');
        return <span data-testid="user-probe">{userName}</span>;
      }
    };
    const apiSourceRenderer = {
      type: 'api-source-probe',
      component: function ApiSourceProbe(props: any) {
        const runtime = useRendererRuntime();
        const scope = useRenderScope();

        capturedRuntime = runtime as ReturnType<typeof createRendererRuntime>;
        capturedScope = scope;

        React.useEffect(() => {
          const registration = runtime.registerDataSource({
            id: props.id,
            scope,
            schema: {
              type: 'data-source',
              api: { url: '/api/user/1' },
              name: 'user'
            }
          });

          return () => {
            registration.dispose();
          };
        }, [props.id, runtime, scope]);

        return null;
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, userProbeRenderer, apiSourceRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'page',
          body: [
            { type: 'api-source-probe', id: 'probe-source' },
            { type: 'user-probe' },
            { type: 'text', text: 'Hello, ${user?.name}' }
          ]
        }}
        env={{ ...env, fetcher: fetcher as any }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    await expect(fetcher.mock.results[0]?.value).resolves.toMatchObject({
      ok: true,
      status: 200,
      data: { name: 'Alice' }
    });

    await waitFor(() => {
      expect(capturedRuntime?.getSourceDebugSnapshot?.()).toMatchObject({
        sources: [
          expect.objectContaining({
            id: 'probe-source',
            status: 'success',
            hasValue: true,
            fetchStatus: 'idle'
          })
        ]
      });
    });

    expect(capturedScope?.get('user')).toEqual({ name: 'Alice' });

    await waitFor(() => {
      expect(screen.getByTestId('user-probe').textContent).toBe('Alice');
    });

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice')).toBeTruthy();
    });
  });

  it('skips FieldFrame when frameWrap is false', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'wrap-probe', label: 'Standalone editor', frameWrap: false }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(container.querySelector('label.nop-field')).toBeNull();
  });

  it('uses group layout when frameWrap is group', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'wrap-probe', label: 'Grouped editor', frameWrap: 'group' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(container.querySelector('fieldset.nop-field')).toBeTruthy();
  });

  it('does not fabricate a cid for createNodeInstance when none is provided', async () => {
    const { createNodeInstance } = await import('../node-instance');
    const templateNode = { templateNodeId: 99, id: 'probe', type: 'text', schema: { type: 'text' }, templatePath: '$', rendererType: 'text', component: {} as any, propsProgram: { kind: 'static', value: {} }, metaProgram: {}, eventPlans: {}, regions: {}, scopePlan: { kind: 'inherit' }, sourcePropKeys: [], sourceStatePropKeys: {} } as any;
    const nodeInstance = createNodeInstance({ templateNode, scope: { id: 'scope', path: '$', readOwn: () => ({}), readVisible: () => ({}), materializeVisible: () => ({}), get: () => undefined, has: () => false, update: () => undefined, merge: () => undefined } as any, state: { meta: {}, props: undefined }, cid: undefined, mounted: false });
    expect(nodeInstance.cid).toBeUndefined();
  });

  it('does not insert an extra wrapper for non-wrap nodes with cid', () => {
    const SchemaRenderer = createSchemaRenderer([cidProbeRenderer]);
    render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'cid-probe', text: 'CID probe' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    const root = screen.getByTestId('cid-root');
    const cid = root.getAttribute('data-cid');
    expect(document.querySelectorAll(`[data-cid="${cid}"]`)).toHaveLength(1);
  });
});
