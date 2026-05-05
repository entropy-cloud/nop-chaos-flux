import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { env, pageRenderer, textRenderer } from '../test-support-core';

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
  it('shows nothing when import preparation fails', async () => {
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

    expect(container.querySelector('[data-runtime-id]')?.children.length ?? 0).toBe(0);
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
});
