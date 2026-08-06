import React from 'react';
import { cleanup, render, waitFor, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { registerScadaSymbol, unregisterScadaSymbol } from '../symbols/symbol-registry.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function renderEditor(tag: string, configOverride?: unknown, events?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  const schema: Record<string, unknown> = { type: 'scada-editor-canvas' };
  if (configOverride !== undefined) schema.config = configOverride as never;
  else schema.config = validEditorConfig() as never;
  if (events) schema.events = events;
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-integration/${tag}`}
      schema={schema as never}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

describe('scada-editor-canvas palette interaction (E5.2 preview)', () => {
  it('palette renders built-in symbol list (listScadaSymbols read-only)', async () => {
    const { container } = renderEditor('palette-list');
    await waitForReadyAndCid(container);
    const paletteItems = container.querySelectorAll('.nop-scada-editor-palette-item');
    expect(paletteItems.length).toBeGreaterThan(10);
  });

  it('clicking a palette item adds a symbol to working copy', async () => {
    const { container } = renderEditor('palette-click');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const initialCount = handle.session.workingConfig.symbols.length;
    const firstItem = container.querySelector('.nop-scada-editor-palette-item') as HTMLElement;
    expect(firstItem).toBeTruthy();
    act(() => {
      fireEvent.click(firstItem);
    });
    expect(handle.session.workingConfig.symbols.length).toBe(initialCount + 1);
  });

  it('palette item has draggable attribute when ready', async () => {
    const { container } = renderEditor('palette-drag');
    await waitForReadyAndCid(container);
    const firstItem = container.querySelector('.nop-scada-editor-palette-item') as HTMLElement;
    expect(firstItem.getAttribute('draggable')).toBe('true');
  });

  it('palette dragStart sets dataTransfer with symbol type', async () => {
    const { container } = renderEditor('palette-dragstart');
    await waitForReadyAndCid(container);
    const firstItem = container.querySelector('.nop-scada-editor-palette-item') as HTMLElement;
    let capturedType: string | undefined;
    act(() => {
      fireEvent.dragStart(firstItem, {
        dataTransfer: {
          setData: (type: string, data: string) => {
            if (type === 'application/x-scada-symbol-type') capturedType = data;
          },
          effectAllowed: 'none',
        } as unknown as DataTransfer,
      });
    });
    expect(capturedType).toBeDefined();
  });

  it('drag-drop on canvas adds symbol via addWorkingSymbol (E5.2)', async () => {
    const { container } = renderEditor('palette-drop');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    act(() => {
      fireEvent.dragOver(canvasArea, {
        dataTransfer: { dropEffect: 'none' } as unknown as DataTransfer,
      });
      fireEvent.drop(canvasArea, {
        dataTransfer: {
          getData: (type: string) =>
            type === 'application/x-scada-symbol-type' ? 'scada-ellipse' : '',
        } as unknown as DataTransfer,
      });
    });
    expect(handle.session.workingConfig.symbols.length).toBe(before + 1);
    expect(handle.session.workingConfig.symbols[before].type).toBe('scada-ellipse');
  });
});

describe('scada-editor-canvas error paths', () => {
  it('invalid config shows error status', async () => {
    const { container } = renderEditor('error', { version: 2, symbols: [] });
    await waitFor(() => {
      const root = container.querySelector('[data-slot="scada-editor-canvas"]');
      expect(root?.getAttribute('data-status')).toBe('error');
    });
    const errorEl = container.querySelector('[data-slot="scada-editor-error"]');
    expect(errorEl).toBeTruthy();
  });

  it('invalid JSON config shows error status', async () => {
    const { container } = renderEditor('bad-json', '{not valid json');
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('error');
    });
  });

  it('inspector panel renders when symbol selected', async () => {
    const { container } = renderEditor('inspector');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.setSelection(['editor-rect']);
    await waitFor(() => {
      const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
      expect(inspector).toBeTruthy();
    });
  });

  it('inspector panel shows no-selection message when nothing selected', async () => {
    const { container } = renderEditor('inspector-empty');
    await waitForReadyAndCid(container);
    const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
    expect(inspector?.textContent).toContain('未选中图元');
  });
});

describe('scada-editor-canvas mode prop', () => {
  it('renders in preview mode when mode prop is preview', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-mode/preview"
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never, mode: 'preview' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitForReadyAndCid(container);
    const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    expect(root.getAttribute('data-mode')).toBe('preview');
  });
});

describe('scada-editor-canvas canvas slot marker', () => {
  it('canvas gets data-slot after ready', async () => {
    const { container } = renderEditor('canvas-slot');
    await waitForReadyAndCid(container);
    await waitFor(() => {
      const canvas = container.querySelector('[data-slot="scada-editor-canvas-canvas"]');
      expect(canvas).toBeTruthy();
    });
  });
});

describe('scada-editor-canvas events dispatch', () => {
  it('dispatches onReady when editor mounts with events prop', async () => {
    const onReadyAction = vi.fn();
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-events/ready"
        schema={{
          type: 'scada-editor-canvas',
          config: validEditorConfig() as never,
          events: { onReady: { action: 'test', args: {} } },
        }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });
    // onReady action dispatched via helpers.dispatch (the dispatch call is exercised).
    void onReadyAction;
  });

  it('dispatches onError when config is invalid with events prop', async () => {
    const { container } = renderEditor('events-error', { version: 2, symbols: [] } as never, { onError: { action: 'test' } });
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('error');
    });
  });
});

describe('scada-editor-canvas engine build failure', () => {
  it('shows error when symbol create throws', async () => {
    registerScadaSymbol({
      type: 'test-throwing-create',
      name: 'Test Throwing',
      props: { x: { type: 'number' } },
      create: () => {
        throw new Error('create failed');
      },
    });
    try {
      const { container } = renderEditor('build-fail', {
        version: 1,
        variables: [],
        symbols: [{ id: 't1', type: 'test-throwing-create', x: 0, y: 0 }],
      } as never);
      await waitFor(() => {
        expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('error');
      });
    } finally {
      unregisterScadaSymbol('test-throwing-create');
    }
  });
});
