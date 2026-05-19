// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { Button } from '@nop-chaos/ui';
import { createDefaultRegistry } from '../defaults.js';
import { useCurrentActionScope, useCurrentComponentRegistry } from '../hooks.js';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, pageRenderer, textRenderer } from '../test-support-core.js';

const inputTextRenderer: RendererDefinition = {
  type: 'input-text',
  component: (props: any) => (
    <label className="nop-field" data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}>
      <span>{String(props.props.label ?? '')}</span>
      <input aria-label={String(props.props.label ?? '')} name={String(props.props.name ?? '')} />
    </label>
  ),
};

const formRenderer: RendererDefinition = {
  type: 'form',
  component: (props: any) => <form>{props.regions.body?.render?.()}</form>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const openDialogButtonRenderer = {
  type: 'open-dialog-button',
  component: (props: any) => (
    <Button onClick={(event) => props.events.onClick?.(event)}>
      {String(props.props.label ?? '')}
    </Button>
  ),
};

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

  it('releases node-owned action scopes on unmount', async () => {
    function ActionScopeProbe() {
      const actionScope = useCurrentActionScope();
      return <span data-testid="action-scope-probe">{actionScope?.id ?? ''}</span>;
    }

    const scopeOwnerRenderer = {
      type: 'scope-owner',
      component: (props: any) => <>{props.regions.body?.render()}</>,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      actionScopePolicy: 'new' as const,
    };
    const actionScopeProbeRenderer = {
      type: 'action-scope-probe',
      component: ActionScopeProbe,
    };
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([
      scopeOwnerRenderer as never,
      actionScopeProbeRenderer as never,
    ]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'scope-owner',
          body: [{ type: 'action-scope-probe' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    let nestedActionScopeId = '';
    await waitFor(() => {
      nestedActionScopeId = screen.getByTestId('action-scope-probe').textContent ?? '';
      expect(nestedActionScopeId).toContain(':action-scope');
    });

    const runtime = onRuntimeChange.mock.calls[0][0] as { releaseActionScope: (scope: { id?: string }) => void };
    const releaseSpy = vi.spyOn(runtime, 'releaseActionScope');

    unmount();

    await waitFor(() =>
      expect(
        releaseSpy.mock.calls.some(([scope]) => (scope as { id?: string } | undefined)?.id === nestedActionScopeId),
      ).toBe(true),
    );
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
    registry.register(formRenderer);
    registry.register(inputTextRenderer);
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
    registry.register(formRenderer);
    registry.register(inputTextRenderer);
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
      </React.StrictMode>,
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
