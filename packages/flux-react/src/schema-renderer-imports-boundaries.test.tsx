import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from './index';
import {
  componentHandleProviderRenderer,
  createDispatchCaptureRenderer,
  dispatchProbeRenderer,
  env,
  namespaceProviderRenderer,
  pageRenderer,
  scopedHostRenderer,
  sharedFormulaCompiler,
  toggleHostRenderer
} from './test-support';

describe('createSchemaRenderer import scope boundaries', () => {
  it('keeps child imports scoped locally and disposes them on unmount', async () => {
    const dispose = vi.fn();
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          dispose,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.as}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    let retainedDispatch: any;
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
      retainedDispatch = dispatch;
    });
    const SchemaRenderer = createSchemaRenderer([pageRenderer, toggleHostRenderer, scopedHostRenderer, dispatchCaptureRenderer, dispatchProbeRenderer]);

    render(
      <SchemaRenderer
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
                    { type: 'dispatch-probe', label: 'Run child scoped import', resultKey: 'child-scoped-import-result', runAction: { action: 'child:ping', args: { value: 'mounted' } } }
                  ]
                }
              ]
            },
            { type: 'dispatch-probe', label: 'Run root child import', resultKey: 'root-child-import-result', runAction: { action: 'child:ping', args: { value: 'root' } } }
          ]
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(retainedDispatch).toBeTypeOf('function');
    });

    fireEvent.click(screen.getByText('Run child scoped import'));
    await waitFor(() => {
      expect(screen.getByTestId('child-scoped-import-result').textContent).toBe('child:ping:mounted');
    });

    fireEvent.click(screen.getByText('Hide child boundary'));
    await waitFor(() => {
      expect(dispose).toHaveBeenCalled();
    });
  });

  it('prefers nested action scopes and component registries over parent providers', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, scopedHostRenderer, namespaceProviderRenderer, componentHandleProviderRenderer, dispatchProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
            { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
            { type: 'dispatch-probe', label: 'Run outer namespace', resultKey: 'outer-namespace-result', runAction: { action: 'demo:ping', args: { value: 'root' } } },
            { type: 'dispatch-probe', label: 'Run outer handle', resultKey: 'outer-handle-result', runAction: { action: 'component:ping', componentName: 'shared', args: { value: 'root' } } },
            {
              type: 'scoped-host',
              body: [
                { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                { type: 'component-handle-provider', componentName: 'shared', label: 'inner-handle' },
                { type: 'dispatch-probe', label: 'Run inner namespace', resultKey: 'inner-namespace-result', runAction: { action: 'demo:ping', args: { value: 'child' } } },
                { type: 'dispatch-probe', label: 'Run inner handle', resultKey: 'inner-handle-result', runAction: { action: 'component:ping', componentName: 'shared', args: { value: 'child' } } }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Run outer namespace'));
    fireEvent.click(screen.getByText('Run inner namespace'));

    await waitFor(() => {
      expect(screen.getByTestId('outer-namespace-result').textContent).toBe('outer-ns:ping:root');
      expect(screen.getByTestId('inner-namespace-result').textContent).toBe('inner-ns:ping:child');
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
              type: 'toggle-host',
              body: [
                {
                  type: 'scoped-host',
                  body: [
                    { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                    { type: 'component-handle-provider', componentName: 'shared', label: 'inner-handle' },
                    { type: 'dispatch-capture' }
                  ]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(retainedDispatch).toBeTypeOf('function');
    });

    fireEvent.click(screen.getByText('Hide child boundary'));
    await waitFor(() => {
      expect(screen.getByText('Show child boundary')).toBeTruthy();
    });

    const fallbackNamespaceResult = await retainedDispatch({ action: 'demo:ping', args: { value: 'after-unmount' } } as any);
    expect(fallbackNamespaceResult).toMatchObject({ ok: true, data: 'outer-ns:ping:after-unmount' });
  });
});