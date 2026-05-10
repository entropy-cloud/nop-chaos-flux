// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useCurrentComponentRegistry } from '../hooks.js';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { env, pageRenderer, textRenderer } from '../test-support-core.js';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { createDefaultRegistry } from '../defaults.js';

const openDialogButtonRenderer = {
  type: 'open-dialog-button',
  component: (props: any) => (
    <Button onClick={(event) => props.events.onClick?.(event)}>
      {String(props.props.label ?? '')}
    </Button>
  ),
};

describe('SchemaRenderer callbacks', () => {
  it('calls onRuntimeChange on mount and null on unmount', async () => {
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Callback test' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    expect(onRuntimeChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(2));
    expect(onRuntimeChange.mock.calls[1][0]).toBeNull();
  });

  it('calls onComponentRegistryChange on mount and null on unmount', async () => {
    const onComponentRegistryChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Registry callback' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    expect(onComponentRegistryChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(2));
    expect(onComponentRegistryChange.mock.calls[1][0]).toBeNull();
  });

  it('calls onActionScopeChange on mount and null on unmount', async () => {
    const onActionScopeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Scope callback' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(1));
    expect(onActionScopeChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(2));
    expect(onActionScopeChange.mock.calls[1][0]).toBeNull();
  });
});

describe('SchemaRenderer data update', () => {
  it('updates page data when data prop changes', async () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Data test ${name}' }}
        data={{ name: 'Alice' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Data test Alice')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Data test ${name}' }}
        data={{ name: 'Bob' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Data test Bob')).toBeTruthy());
  });
});

describe('SchemaRenderer import preparation', () => {
  it('shows a root fallback when import preparation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failingLoader = {
      load: vi.fn(async () => {
        throw new Error('Import load failed');
      }),
    };

    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={
          {
            type: 'text',
            text: 'Import fail test',
            'xui:imports': [{ from: 'failing-lib', as: 'fail' }],
          } as any
        }
        env={{ ...env, importLoader: failingLoader }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(failingLoader.load).toHaveBeenCalled());

    expect(container.querySelector('[data-slot="schema-root-error"]')?.textContent).toContain(
      'Import load failed',
    );
    consoleSpy.mockRestore();
  });
});

describe('SchemaRenderer null rendering', () => {
  it('renders nothing for null compiled root (compilation in progress)', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Visible' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(container.textContent).toContain('Visible');
  });
});

describe('SchemaRenderer page modalContainer', () => {
  it('sets modalContainer on page runtime from schema', async () => {
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          modalContainer: 'my-container',
          body: [{ type: 'text', text: 'Modal test' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalled());
  });
});

describe('SchemaRenderer surface runtime seam', () => {
  it('uses caller-supplied surfaceRuntime for managed surfaces', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      openDialogButtonRenderer,
    ]);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([pageRenderer, textRenderer, openDialogButtonRenderer]),
      env,
    });
    const externalSurfaceRuntime = runtime.createSurfaceRuntime();

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'open-dialog-button',
              label: 'Open external dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'External dialog',
                  body: [{ type: 'text', text: 'External surface runtime' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        surfaceRuntime={externalSurfaceRuntime}
      />,
    );

    screen.getByText('Open external dialog').click();
    await waitFor(() => expect(externalSurfaceRuntime.store.getState().entries).toHaveLength(1));
    expect(screen.getByText('External surface runtime')).toBeTruthy();
    runtime.dispose();
  });

});

describe('SchemaRenderer debug data gating', () => {
  it('does not publish node debug data until registry debug capture is enabled', async () => {
    const onComponentRegistryChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Debug gated' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    const registry = onComponentRegistryChange.mock.calls[0][0];
    const setHandleDebugDataSpy = vi.spyOn(registry, 'setHandleDebugData');

    expect(setHandleDebugDataSpy).not.toHaveBeenCalled();

    registry.setDebugEnabled?.(true);

    await waitFor(() => expect(setHandleDebugDataSpy).toHaveBeenCalled());
  });

  it('disposes owned root component registries on unmount', async () => {
    const onComponentRegistryChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Registry dispose' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    const registry = onComponentRegistryChange.mock.calls[0][0];
    const disposeSpy = vi.spyOn(registry, 'dispose');

    unmount();

    await waitFor(() => expect(disposeSpy).toHaveBeenCalledTimes(1));
  });

  it('provides node-owned component registries to descendant regions', async () => {
    function RegistryProbe() {
      const componentRegistry = useCurrentComponentRegistry();
      return <span data-testid="registry-probe">{componentRegistry?.id ?? ''}</span>;
    }

    const formLikeRenderer = {
      type: 'form-like',
      component: (props: any) => <>{props.regions.body?.render()}</>,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      componentRegistryPolicy: 'new' as const,
    };
    const registryProbeRenderer = {
      type: 'registry-probe',
      component: RegistryProbe,
    };
    const SchemaRenderer = createSchemaRenderer([
      formLikeRenderer as never,
      registryProbeRenderer as never,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'form-like',
          body: [{ type: 'registry-probe' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('registry-probe').textContent).toContain(':component-registry'),
    );
    expect(screen.getByTestId('registry-probe').textContent).not.toBe('root-component-registry');
  });

  it('stores debug data inside child registries created by componentRegistryPolicy=new', async () => {
    const onComponentRegistryChange = vi.fn();
    const formLikeRenderer = {
      type: 'form-like',
      component: (props: any) => <>{props.regions.body?.render()}</>,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      componentRegistryPolicy: 'new' as const,
    };
    const SchemaRenderer = createSchemaRenderer([formLikeRenderer as never, textRenderer as never]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'form-like',
          body: [{ type: 'text', text: 'Nested debug' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    const rootRegistry = onComponentRegistryChange.mock.calls[0][0];
    rootRegistry.setDebugEnabled?.(true);

    await waitFor(() => {
      const rootInspect = rootRegistry.inspectCid?.(2);
      expect(rootInspect?.kind).toBe('resolved');
      expect(rootInspect?.payload?.state?.resolvedMeta ?? rootInspect?.payload?.resolvedMeta).toBeTruthy();
    });
  });

  it('keeps form subtree inspectable from the root registry', async () => {
    const onComponentRegistryChange = vi.fn();
    const registry = createDefaultRegistry();
    registerFormRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'form',
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
          ],
        }}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    const rootRegistry = onComponentRegistryChange.mock.calls[0][0];
    rootRegistry.setDebugEnabled?.(true);

    await waitFor(() => {
      const field = document.querySelector('.nop-field[data-cid]');
      expect(field).toBeTruthy();
      const cid = Number(field?.getAttribute('data-cid'));
      const inspected = rootRegistry.inspectCid?.(cid);
      expect(inspected?.kind).toBe('resolved');
      expect(inspected?.payload?.state?.resolvedMeta ?? inspected?.payload?.resolvedMeta).toBeTruthy();
    });
  });

  it('keeps form subtree inspectable from the root registry in StrictMode', async () => {
    const onComponentRegistryChange = vi.fn();
    const registry = createDefaultRegistry();
    registerFormRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema.json"
          schema={{
            type: 'form',
            body: [
              {
                type: 'input-text',
                name: 'username',
                label: 'Username',
                visible: '${true}',
              },
            ],
          }}
          env={env}
          registry={registry}
          formulaCompiler={createFormulaCompiler()}
          onComponentRegistryChange={onComponentRegistryChange}
        />
      </React.StrictMode>
    );

    await waitFor(() => {
      const registryCalls = onComponentRegistryChange.mock.calls.filter((call) => call[0] != null);
      expect(registryCalls.length).toBeGreaterThan(1);
    });
    const rootRegistry = onComponentRegistryChange.mock.calls
      .map((call) => call[0])
      .filter(Boolean)
      .at(-1);
    expect(rootRegistry).toBeTruthy();
    rootRegistry.setDebugEnabled?.(true);

    await waitFor(() => {
      const field = document.querySelector('.nop-field[data-cid]');
      expect(field).toBeTruthy();
      const cid = Number(field?.getAttribute('data-cid'));
      const inspected = rootRegistry.inspectCid?.(cid);
      expect(inspected?.kind).toBe('resolved');
      expect(inspected?.payload?.state?.resolvedMeta ?? inspected?.payload?.resolvedMeta).toBeTruthy();
    });
  });
});
