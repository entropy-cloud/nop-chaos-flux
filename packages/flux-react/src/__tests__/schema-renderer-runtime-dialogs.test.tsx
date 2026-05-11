import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '../index.js';
import { useCurrentComponentRegistry } from '../hooks.js';
import {
  buttonRenderer,
  componentHandleProviderRenderer,
  createDispatchCaptureRenderer,
  dispatchProbeRenderer,
  env,
  formRenderer,
  namespaceProviderRenderer,
  pageRenderer,
  pollingSourceRenderer,
  probeFormSchema,
  probeInputRenderer,
  scopedHostRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';

function ComponentHandleWithIdProvider(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const componentId = String(props.props.componentId ?? 'shared-id');
  const componentName = String(props.props.componentName ?? 'shared');
  const label = String(props.props.label ?? 'handle');

  React.useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    return componentRegistry.register({
      id: componentId,
      name: componentName,
      type: 'probe',
      capabilities: {
        hasMethod(method) {
          return method === 'ping';
        },
        invoke(method, payload) {
          return {
            ok: true,
            data: `${label}:${method}:${String(payload?.value ?? '')}`,
          };
        },
      },
    });
  }, [componentRegistry, componentId, componentName, label]);

  return <span data-testid={`component-id-registry-scope-${label}`}>{componentRegistry?.id ?? ''}</span>;
}

const componentHandleWithIdProviderRenderer: RendererDefinition = {
  type: 'component-handle-with-id-provider',
  component: ComponentHandleWithIdProvider,
};

afterEach(() => {
  cleanup();
});

describe('createSchemaRenderer dialog and provider behavior', () => {
  it('reopens dialog with fresh child providers and falls back after close', async () => {
    const capturedDispatches: Array<(input: any) => Promise<any>> = [];
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) =>
      capturedDispatches.push(dispatch),
    );
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
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
              type: 'button',
              label: 'Open provider dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Provider dialog',
                  body: [
                    {
                      type: 'scoped-host',
                      body: [
                        { type: 'namespace-provider', namespace: 'demo', label: 'dialog-ns' },
                        {
                          type: 'component-handle-provider',
                          componentName: 'shared',
                          label: 'dialog-handle',
                        },
                        { type: 'dispatch-capture' },
                        { type: 'text', text: 'Dialog provider content' },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Open provider dialog'));
    expect(await screen.findByText('Dialog provider content')).toBeTruthy();
    await waitFor(() => expect(capturedDispatches.length).toBe(1));
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Dialog provider content')).toBeNull());
  });

  it('resolves component actions through the mounted child registry before falling back to outer handles', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      buttonRenderer,
      scopedHostRenderer,
      componentHandleProviderRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
            {
              type: 'scoped-host',
              body: [
                {
                  type: 'component-handle-provider',
                  componentName: 'shared',
                  label: 'inner-handle',
                },
                {
                  type: 'dispatch-probe',
                  label: 'Ping shared handle',
                  resultKey: 'component-dispatch-result',
                  runAction: {
                    action: 'component:ping',
                    componentName: 'shared',
                    args: { value: 'hit' },
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

    fireEvent.click(screen.getByText('Ping shared handle'));
    await waitFor(() => {
      expect(screen.getByTestId('component-dispatch-result').textContent).toBe('inner-handle:ping:hit');
    });
  });

  it('keeps import alias visibility lexical so child shadowing does not leak to siblings', async () => {
    const importLoader = {
      load: vi.fn(async (moduleSpec: { from: string; as: string }) => {
        const from = moduleSpec.from;
        return {
          createNamespace: () => ({
            kind: 'import' as const,
            invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
              ok: true,
              data: `${from}:${method}:${String(payload?.value ?? '')}`,
            }),
          }),
          createExpressionHelpers: () => ({
            format: (value: string) => `${from}:${value}`,
          }),
        };
      }),
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, scopedHostRenderer, textRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          'xui:imports': [{ from: 'parent-lib', as: 'demo' }],
          body: [
            { type: 'text', text: 'parent=${$demo.format("root")}' },
            {
              type: 'scoped-host',
              'xui:imports': [{ from: 'child-lib', as: 'demo' }],
              body: [{ type: 'text', text: 'child=${$demo.format("inner")}' }],
            },
            { type: 'text', text: 'sibling=${$demo.format("sibling")}' },
          ],
        } as any}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(await screen.findByText('parent=parent-lib:root')).toBeTruthy();
    expect(screen.getByText('child=child-lib:inner')).toBeTruthy();
    expect(screen.getByText('sibling=parent-lib:sibling')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          'xui:imports': [{ from: 'parent-lib', as: 'demo' }],
          body: [
            { type: 'text', text: 'parent=${$demo.format("root")}' },
            { type: 'text', text: 'sibling=${$demo.format("sibling")}' },
          ],
        } as any}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('child=child-lib:inner')).toBeNull();
    });
    expect(await screen.findByText('parent=parent-lib:root')).toBeTruthy();
    expect(await screen.findByText('sibling=parent-lib:sibling')).toBeTruthy();
  });

  it('resolves component actions by componentId through mounted child registries', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      scopedHostRenderer,
      componentHandleWithIdProviderRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'component-handle-with-id-provider',
              componentId: 'outer-id',
              componentName: 'shared',
              label: 'outer-handle',
            },
            {
              type: 'scoped-host',
              body: [
                {
                  type: 'component-handle-with-id-provider',
                  componentId: 'inner-id',
                  componentName: 'shared',
                  label: 'inner-handle',
                },
                {
                  type: 'dispatch-probe',
                  label: 'Ping inner id',
                  resultKey: 'component-id-dispatch-result',
                  runAction: {
                    action: 'component:ping',
                    componentId: 'inner-id',
                    args: { value: 'hit' },
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

    fireEvent.click(screen.getByText('Ping inner id'));
    await waitFor(() => {
      expect(screen.getByTestId('component-id-dispatch-result').textContent).toBe(
        'inner-handle:ping:hit',
      );
    });
  });

  it('surfaces ambiguous componentName targets within a mounted child registry', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      scopedHostRenderer,
      componentHandleWithIdProviderRenderer,
      dispatchProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'scoped-host',
              body: [
                {
                  type: 'component-handle-with-id-provider',
                  componentId: 'first-id',
                  componentName: 'shared',
                  label: 'first-handle',
                },
                {
                  type: 'component-handle-with-id-provider',
                  componentId: 'second-id',
                  componentName: 'shared',
                  label: 'second-handle',
                },
                {
                  type: 'dispatch-probe',
                  label: 'Ping ambiguous name',
                  resultKey: 'component-ambiguous-result',
                  runAction: {
                    action: 'component:ping',
                    componentName: 'shared',
                    args: { value: 'hit' },
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

    fireEvent.click(screen.getByText('Ping ambiguous name'));
    await waitFor(() => {
      expect(screen.getByTestId('component-ambiguous-result').textContent).toBe(
        'Error: Ambiguous component target: shared',
      );
    });
  });

  it('renders dialog content after dispatching a dialog action', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: { title: 'Inspect record', body: [{ type: 'text', text: 'Dialog hello' }] },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Inspect record')).toBeTruthy();
  });

  it('preserves dialog form state across host rerenders and page data updates', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      formRenderer,
      probeInputRenderer,
    ]);
    function Host() {
      const [tick, setTick] = React.useState(0);
      const [name, setName] = React.useState('Architect');
      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Rerender host {tick}
          </button>
          <button type="button" onClick={() => setName('Operator')}>
            Rename user
          </button>
          <SchemaRenderer
            schemaUrl="test://schema.json"
            schema={{
              type: 'page',
              body: [
                {
                  type: 'button',
                  label: 'Open dialog',
                  onClick: {
                    action: 'openDialog',
                    args: {
                      title: { type: 'text', text: 'Dialog ${currentUser.name}' },
                      body: [
                        { type: 'text', text: 'Dialog user ${currentUser.name}' },
                        probeFormSchema,
                      ],
                    },
                  },
                },
              ],
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
    expect(await screen.findByText('Dialog Architect')).toBeTruthy();
    expect(screen.getByText('Dialog user Architect')).toBeTruthy();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('alice@example.com');
  });

  it('stops dialog-scoped polling data sources after closing the dialog', async () => {
    const fetcherSpy = vi.fn(async () => ({ ok: true, status: 200, data: { value: 'polled' } }));
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      pollingSourceRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open polling dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Polling dialog',
                  body: [
                    {
                      type: 'polling-source',
                      id: 'dialog-poller',
                      action: 'ajax',
                      args: { url: '/api/dialog-poll' },
                      name: 'payload',
                      interval: 50,
                    },
                    { type: 'text', text: '${payload?.value}' },
                  ],
                },
              },
            },
          ],
        }}
        env={{ ...env, fetcher: fetcherSpy as any }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Open polling dialog'));
    await waitFor(() => expect(fetcherSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Polling dialog')).toBeNull());
  });
});
