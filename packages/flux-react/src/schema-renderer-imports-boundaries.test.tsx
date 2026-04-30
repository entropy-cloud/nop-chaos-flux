import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from './schema-renderer';
import {
  componentHandleProviderRenderer,
  createDispatchCaptureRenderer,
  dispatchProbeRenderer,
  namespaceProviderRenderer,
  scopedHostRenderer,
  toggleHostRenderer,
} from './test-support-runtime';
import { env, pageRenderer, sharedFormulaCompiler } from './test-support-core';
import { useCurrentActionScope } from './hooks';

describe('createSchemaRenderer import scope boundaries', () => {
  it('creates an import-owned action scope without depending on renderer actionScopePolicy', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.as}:${method}:${String(payload?.value ?? '')}`,
          }),
        }),
      })),
    };
    const actionScopeIds: string[] = [];
    const actionScopeProbeRenderer = {
      type: 'action-scope-probe',
      component: function ActionScopeProbe(props: any) {
        const actionScope = useCurrentActionScope();

        React.useEffect(() => {
          if (actionScope?.id) {
            actionScopeIds.push(actionScope.id);
          }
        }, [actionScope]);

        return <div>{props.regions.body?.render()}</div>;
      },
      regions: ['body'],
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      actionScopeProbeRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'action-scope-probe',
                'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                body: [
                  {
                    type: 'dispatch-probe',
                    label: 'Run import action',
                    resultKey: 'import-action-result',
                    runAction: { action: 'demo:ping', args: { value: 'local' } },
                  },
                ],
              },
            ],
          } as any
        }
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await screen.findByText('Run import action');
    fireEvent.click(screen.getByText('Run import action'));

    await waitFor(() => {
      expect(screen.getByTestId('import-action-result').textContent).toBe('demo:ping:local');
    });

    expect(actionScopeIds).toHaveLength(1);
    expect(actionScopeIds[0]).toMatch(/:action-scope$/);
  });

  it('keeps child imports scoped locally without automatic unload on unmount', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.as}:${method}:${String(payload?.value ?? '')}`,
          }),
        }),
      })),
    };
    let retainedDispatch: any;
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
      retainedDispatch = dispatch;
    });
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      toggleHostRenderer,
      scopedHostRenderer,
      dispatchCaptureRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'toggle-host',
              body: [
                {
                  type: 'scoped-host',
                  'xui:imports': [{ from: 'child-lib', as: 'child' }],
                  body: [
                    { type: 'dispatch-capture' },
                    {
                      type: 'dispatch-probe',
                      label: 'Run child scoped import',
                      resultKey: 'child-scoped-import-result',
                      runAction: { action: 'child:ping', args: { value: 'mounted' } },
                    },
                  ],
                },
              ],
            },
            {
              type: 'dispatch-probe',
              label: 'Run root child import',
              resultKey: 'root-child-import-result',
              runAction: { action: 'child:ping', args: { value: 'root' } },
            },
          ],
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(retainedDispatch).toBeTypeOf('function');
    });

    fireEvent.click(screen.getByText('Run child scoped import'));
    await waitFor(() => {
      expect(screen.getByTestId('child-scoped-import-result').textContent).toBe(
        'child:ping:mounted',
      );
    });

    fireEvent.click(screen.getByText('Hide child boundary'));
    await waitFor(() => {
      expect(screen.queryByText('Run child scoped import')).toBeNull();
    });
  });

  it('prefers nested action scopes and component registries over parent providers', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      scopedHostRenderer,
      namespaceProviderRenderer,
      componentHandleProviderRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
            { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
            {
              type: 'dispatch-probe',
              label: 'Run outer namespace',
              resultKey: 'outer-namespace-result',
              runAction: { action: 'demo:ping', args: { value: 'root' } },
            },
            {
              type: 'dispatch-probe',
              label: 'Run outer handle',
              resultKey: 'outer-handle-result',
              runAction: {
                action: 'component:ping',
                componentName: 'shared',
                args: { value: 'root' },
              },
            },
            {
              type: 'scoped-host',
              body: [
                { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                {
                  type: 'component-handle-provider',
                  componentName: 'shared',
                  label: 'inner-handle',
                },
                {
                  type: 'dispatch-probe',
                  label: 'Run inner namespace',
                  resultKey: 'inner-namespace-result',
                  runAction: { action: 'demo:ping', args: { value: 'child' } },
                },
                {
                  type: 'dispatch-probe',
                  label: 'Run inner handle',
                  resultKey: 'inner-handle-result',
                  runAction: {
                    action: 'component:ping',
                    componentName: 'shared',
                    args: { value: 'child' },
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Run outer namespace'));
    fireEvent.click(screen.getByText('Run inner namespace'));
    fireEvent.click(screen.getByText('Run outer handle'));
    fireEvent.click(screen.getByText('Run inner handle'));

    await waitFor(() => {
      expect(screen.getByTestId('outer-namespace-result').textContent).toBe('outer-ns:ping:root');
      expect(screen.getByTestId('inner-namespace-result').textContent).toBe('inner-ns:ping:child');
      expect(screen.getByTestId('outer-handle-result').textContent).toBe('outer-handle:ping:root');
      expect(screen.getByTestId('inner-handle-result').textContent).toBe('inner-handle:ping:child');
    });
  });

  it('falls back to parent providers after a nested boundary tears down', async () => {
    let retainedDispatch: any;
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
      retainedDispatch = dispatch;
    });
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      toggleHostRenderer,
      scopedHostRenderer,
      namespaceProviderRenderer,
      componentHandleProviderRenderer,
      dispatchCaptureRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
            { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
            {
              type: 'toggle-host',
              body: [
                {
                  type: 'scoped-host',
                  body: [
                    { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                    {
                      type: 'component-handle-provider',
                      componentName: 'shared',
                      label: 'inner-handle',
                    },
                    { type: 'dispatch-capture' },
                  ],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(retainedDispatch).toBeTypeOf('function');
    });

    fireEvent.click(screen.getByText('Hide child boundary'));
    await waitFor(() => {
      expect(screen.getByText('Show child boundary')).toBeTruthy();
    });

    const fallbackNamespaceResult = await retainedDispatch({
      action: 'demo:ping',
      args: { value: 'after-unmount' },
    } as any);
    expect(fallbackNamespaceResult).toMatchObject({
      ok: true,
      data: 'outer-ns:ping:after-unmount',
    });
    const fallbackHandleResult = await retainedDispatch({
      action: 'component:ping',
      componentName: 'shared',
      args: { value: 'after-unmount' },
    } as any);
    expect(fallbackHandleResult).toMatchObject({
      ok: true,
      data: 'outer-handle:ping:after-unmount',
    });
  });
});
