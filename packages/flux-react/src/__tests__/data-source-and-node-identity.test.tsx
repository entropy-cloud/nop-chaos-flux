import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import {
  useDataSourceStatus,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
} from '../hooks.js';
import { ScopeContext } from '../contexts.js';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  cidProbeRenderer,
  createExpressionCompiler,
  createFormulaCompiler,
  createRendererRuntime,
  env,
  pageRenderer,
  textRenderer,
  wrapProbeRenderer,
} from '../test-support.js';
import { NodeFrameWrapper } from '../node-frame-wrapper.js';

const testState: {
  expressionCompiler: ReturnType<typeof createExpressionCompiler>;
} = {
  expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
};

describe('createSchemaRenderer data sources and node identity', () => {
  beforeEach(() => {
    testState.expressionCompiler = createExpressionCompiler(createFormulaCompiler());
  });

  it('reads published data-source status summaries through useDataSourceStatus', async () => {
    let releaseRequest:
      | ((value: { ok: boolean; status: number; data: { name: string } }) => void)
      | undefined;
    const fetcher = vi.fn(
      async () =>
        new Promise((resolve) => {
          releaseRequest = resolve as typeof releaseRequest;
        }),
    );
    const capturedStatuses: Array<Record<string, unknown> | undefined> = [];
    const statusProbeRenderer = {
      type: 'status-probe',
      component: function StatusProbe() {
        const status = useDataSourceStatus('userStatus');
        React.useEffect(() => {
          capturedStatuses.push(status as Record<string, unknown> | undefined);
        }, [status]);
        return (
          <span data-testid="status-probe">
            {status?.loading ? 'loading' : status?.ready ? 'ready' : 'idle'}
          </span>
        );
      },
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
            compiledSource: compileDataSource(
              props.id,
              {
                type: 'data-source',
                action: 'ajax',
                args: { url: '/api/user/1' },
                name: 'user',
                statusPath: 'userStatus',
              },
              testState.expressionCompiler,
            ),
          });

          return () => {
            registration.dispose();
          };
        }, [props.id, runtime, scope]);

        return null;
      },
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      statusProbeRenderer,
      apiSourceRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [{ type: 'api-source-probe', id: 'probe-source' }, { type: 'status-probe' }],
        }}
        env={{ ...env, fetcher: fetcher as any }}
        formulaCompiler={createFormulaCompiler()}
      />,
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
      inFlightCount: 1,
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
      inFlightCount: 0,
    });
  });

  it('narrows useDataSourceStatus to its status path', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const scope = runtime.createChildScope(page.scope, { userStatus: { ready: false }, other: 0 }, { scopeKey: 'status' });
    let renders = 0;
    function StatusProbeNarrow() {
      const status = useDataSourceStatus('userStatus');
      React.useEffect(() => {
        renders += 1;
      });
      return <span data-testid="narrow-status">{status?.ready ? 'ready' : 'idle'}</span>;
    }

    render(
      <ScopeContext.Provider value={scope}>
        <StatusProbeNarrow />
      </ScopeContext.Provider>,
    );

    expect(screen.getByTestId('narrow-status').textContent).toBe('idle');
    await waitFor(() => expect(renders).toBe(1));

    scope.update('other', 1);
    await Promise.resolve();
    expect(renders).toBe(1);

    scope.update('userStatus', { ready: true });
    await waitFor(() => expect(screen.getByTestId('narrow-status').textContent).toBe('ready'));
    expect(renders).toBe(2);
  });

  it('rerenders sibling consumers after a renderer registers an api data source', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { name: 'Alice' } }));
    let capturedRuntime: ReturnType<typeof createRendererRuntime> | undefined;
    let capturedScope: import('@nop-chaos/flux-core').ScopeRef | undefined;
    const userProbeRenderer = {
      type: 'user-probe',
      component: function UserProbe() {
        const userName = useScopeSelector(
          (scope: { user?: { name?: string } }) => scope.user?.name ?? '',
        );
        return <span data-testid="user-probe">{userName}</span>;
      },
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
            compiledSource: compileDataSource(
              props.id,
              {
                type: 'data-source',
                action: 'ajax',
                args: { url: '/api/user/1' },
                name: 'user',
              },
              testState.expressionCompiler,
            ),
          });

          return () => {
            registration.dispose();
          };
        }, [props.id, runtime, scope]);

        return null;
      },
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      userProbeRenderer,
      apiSourceRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'api-source-probe', id: 'probe-source' },
            { type: 'user-probe' },
            { type: 'text', text: 'Hello, ${user?.name}' },
          ],
        }}
        env={{ ...env, fetcher: fetcher as any }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    await expect(fetcher.mock.results[0]?.value).resolves.toMatchObject({
      ok: true,
      status: 200,
      data: { name: 'Alice' },
    });

    await waitFor(() => {
      expect(capturedRuntime?.getSourceDebugSnapshot?.()).toMatchObject({
        sources: [
          expect.objectContaining({
            id: 'probe-source',
            status: 'success',
            hasValue: true,
            fetchStatus: 'idle',
          }),
        ],
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
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'wrap-probe', label: 'Standalone editor', frameWrap: false }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(container.querySelector('label.nop-field')).toBeNull();
  });

  it('uses group layout when frameWrap is group', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'wrap-probe', label: 'Grouped editor', frameWrap: 'group' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(container.querySelector('fieldset.nop-field')).toBeTruthy();
  });

  it('does not fall back to raw schema field chrome when resolved props omit it', () => {
    const { container } = render(
      <NodeFrameWrapper
        templateNode={{
          type: 'wrap-probe',
          schema: {
            type: 'wrap-probe',
            label: 'Schema label',
            hint: 'Schema hint',
            description: 'Schema description',
            remark: { content: 'Schema remark' },
            labelRemark: { content: 'Schema label remark' },
          },
        } as any}
        definitionWrap
        resolvedMeta={{} as any}
        resolvedPropsValue={{ label: 'Resolved label' }}
        regions={{} as any}
      >
        <input />
      </NodeFrameWrapper>,
    );

    expect(container.querySelector('[data-slot="field-label"]')?.textContent).toContain('Resolved label');
    expect(container.textContent).not.toContain('Schema hint');
    expect(container.textContent).not.toContain('Schema description');
    expect(container.querySelector('[data-slot="field-remark"]')).toBeNull();
    expect(container.querySelector('[data-slot="field-label-remark"]')).toBeNull();
  });

  it('associates composite field-control roots with the rendered label when rootTag is div', () => {
    const { container } = render(
      <NodeFrameWrapper
        templateNode={{
          type: 'tag-list',
          schema: { type: 'tag-list', label: 'Tags' },
        } as any}
        definitionWrap
        resolvedMeta={{} as any}
        resolvedPropsValue={{ label: 'Tags' }}
        regions={{} as any}
      >
        <div data-testid="composite-root" />
      </NodeFrameWrapper>,
    );

    const labelNode = container.querySelector('[data-slot="field-label"] [id]');
    const control = container.querySelector('[data-slot="field-control"]');
    const childRoot = container.querySelector('[data-testid="composite-root"]');

    expect(labelNode).toBeTruthy();
    expect(control?.getAttribute('aria-labelledby')).toBe(labelNode?.getAttribute('id'));
    expect(childRoot?.getAttribute('aria-labelledby')).toBe(labelNode?.getAttribute('id'));
  });

  it('does not fabricate a cid for createNodeInstance when none is provided', async () => {
    const { createNodeInstance } = await import('../node-instance.js');
    const templateNode = {
      templateNodeId: 99,
      id: 'probe',
      type: 'text',
      schema: { type: 'text' },
      templatePath: '$',
      rendererType: 'text',
      component: {} as any,
      propsProgram: { kind: 'static', value: {} },
      metaProgram: {},
      eventPlans: {},
      regions: {},
      scopePlan: { kind: 'inherit' },
      sourcePropKeys: [],
      sourceStatePropKeys: {},
    } as any;
    const nodeInstance = createNodeInstance({
      templateNode,
      scope: {
        id: 'scope',
        path: '$',
        readOwn: () => ({}),
        readVisible: () => ({}),
        materializeVisible: () => ({}),
        get: () => undefined,
        has: () => false,
        update: () => undefined,
        merge: () => undefined,
      } as any,
      state: { meta: {}, props: undefined },
      cid: undefined,
      mounted: false,
    });
    expect(nodeInstance.cid).toBeUndefined();
  });

  it('does not insert an extra wrapper for non-wrap nodes with cid', () => {
    const SchemaRenderer = createSchemaRenderer([cidProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'cid-probe', text: 'CID probe' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = screen.getByTestId('cid-root');
    const cid = root.getAttribute('data-cid');
    expect(document.querySelectorAll(`[data-cid="${cid}"]`)).toHaveLength(1);
  });
});
