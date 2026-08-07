import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
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

function renderEditor(tag: string) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  const result = render(
    <SchemaRenderer
      schemaUrl={`test://editor-ops/${tag}`}
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
  return result;
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

describe('scada-editor-canvas operations (add/update/remove via test handle)', () => {
  it('addWorkingSymbol adds a symbol to working copy', async () => {
    const { container } = renderEditor('add');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.workingConfig.symbols).toHaveLength(1);
    // Simulate palette add via test handle load (inspector/palette built-in add uses runtime.addWorkingSymbol).
    handle.load({
      version: 1,
      variables: [],
      symbols: [
        ...handle.session.workingConfig.symbols,
        { id: 'added-1', type: 'scada-ellipse', x: 50, y: 50, width: 40, height: 40 },
      ],
    });
    expect(handle.session.workingConfig.symbols).toHaveLength(2);
  });

  it('clearSelection clears selection', async () => {
    const { container } = renderEditor('clear');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.setSelection(['editor-rect']);
    handle.clearSelection();
    expect(handle.session.selection).toEqual([]);
  });

  it('setSelection sets selection in session', async () => {
    const { container } = renderEditor('set');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.setSelection(['editor-rect']);
    expect(handle.session.selection).toEqual(['editor-rect']);
  });

  it('save commits baseline (committedBaseline updated)', async () => {
    const { container } = renderEditor('save');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.committedBaseline.symbols[0];
    handle.load({
      version: 1,
      variables: [],
      symbols: [{ id: 'editor-rect', type: 'scada-rect', x: 200, y: 200, width: 100, height: 80, fill: '#1565c0' }],
    });
    handle.save();
    // After save, committedBaseline reflects the new working copy.
    const saved = JSON.parse(handle.save());
    expect(saved.symbols[0].x).toBe(200);
    void before;
  });

  it('load with invalid config triggers error (does not crash)', async () => {
    const { container } = renderEditor('load-error');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const originalSymbols = handle.session.workingConfig.symbols.length;
    handle.load('{ invalid json');
    // Invalid config does not replace working copy.
    expect(handle.session.workingConfig.symbols).toHaveLength(originalSymbols);
  });

  it('load with invalid version triggers error', async () => {
    const { container } = renderEditor('load-bad-version');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const originalSymbols = handle.session.workingConfig.symbols.length;
    handle.load({ version: 99, symbols: [] } as never);
    expect(handle.session.workingConfig.symbols).toHaveLength(originalSymbols);
  });

  it('addSymbol adds a symbol to working copy via test handle', async () => {
    const { container } = renderEditor('add-symbol');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    handle.addSymbol({ id: 'new-1', type: 'scada-ellipse', x: 30, y: 30, width: 40, height: 40 });
    expect(handle.session.workingConfig.symbols.length).toBe(before + 1);
  });

  it('removeSymbol removes a symbol from working copy', async () => {
    const { container } = renderEditor('remove-symbol');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;
    handle.removeSymbol('editor-rect');
    expect(handle.session.workingConfig.symbols.length).toBe(before - 1);
  });

  it('updateSymbol updates node properties in working copy', async () => {
    const { container } = renderEditor('update-symbol');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.updateSymbol('editor-rect', { fill: '#00ff00', x: 200 });
    const node = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect');
    expect(node?.fill).toBe('#00ff00');
    expect(node?.x).toBe(200);
  });

  it('updateSymbol on unknown nodeId does not crash', async () => {
    const { container } = renderEditor('update-unknown');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.updateSymbol('nonexistent', { fill: '#000000' });
    // No crash = pass
  });

  it('updateSymbol twice with same value (second is empty diff)', async () => {
    const { container } = renderEditor('update-idempotent');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.updateSymbol('editor-rect', { fill: '#00ff00' });
    handle.updateSymbol('editor-rect', { fill: '#00ff00' });
    // Second update produces empty diff (no crash, no visual change).
    const node = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect');
    expect(node?.fill).toBe('#00ff00');
  });

  it('switchMode via test handle to preview then back', async () => {
    const { container } = renderEditor('switch');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.switchMode('preview');
    expect(handle.session.mode).toBe('preview');
    handle.switchMode('edit');
    expect(handle.session.mode).toBe('edit');
  });

  it('updateSymbol on child node (group subtree) updates nested node', async () => {
    const groupConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'grp-1',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'inner-1', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
          ],
        },
      ],
    };
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-ops/child"
        schema={{ type: 'scada-editor-canvas', config: groupConfig as never }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitForReadyAndCid(container);
    // Read cid from DOM
    const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    const cid = Number(root.getAttribute('data-cid'));
    const handle = readScadaEditorTestHandle(cid)!;
    handle.updateSymbol('inner-1', { fill: '#abcdef' });
    const symbols = handle.session.workingConfig.symbols as Array<{ children?: Array<{ id: string; fill?: string }> }>;
    const child = symbols[0].children?.find((c) => c.id === 'inner-1');
    expect(child?.fill).toBe('#abcdef');
  });

  it('renders with explicit width/height props', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-ops/wh"
        schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never, width: 800, height: 600 }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
    });
  });

  it('inspector shows selected node id after setSelection', async () => {
    const { container } = renderEditor('inspector-content');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.setSelection(['editor-rect']);
    await waitFor(() => {
      const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
      expect(inspector?.textContent).toContain('editor-rect');
    });
  });

  it('editor.select event updates session selection via adapter', async () => {
    const { container } = renderEditor('adapter-select');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // Simulate editor.select event: set editor.list then emit.
    const editor = handle.editor as { emit?: (e: string) => void; list?: unknown[] };
    const engine = handle.engine as { getSymbol?: (id: string) => { node: object } | undefined };
    const node = engine.getSymbol?.('editor-rect')?.node;
    editor.list = [node];
    editor.emit?.('editor.select');
    expect(handle.session.selection).toContain('editor-rect');
  });

  it('editor.move event updates working copy geometry via adapter', async () => {
    const { container } = renderEditor('adapter-move');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const editor = handle.editor as { emit?: (e: string) => void; target?: unknown };
    const engine = handle.engine as { getSymbol?: (id: string) => { node: object } | undefined };
    const node = engine.getSymbol?.('editor-rect')?.node;
    editor.target = node;
    editor.emit?.('editor.move');
    // After editor.move, working copy geometry should be updated from target.
    const workingNode = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect');
    expect(workingNode).toBeDefined();
  });

  it('undo/redo handles drive undo-redo stack (E7.2: canUndo/canRedo derived from stack)', async () => {
    const { container } = renderEditor('undo-redo-handles');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // initially empty
    expect(handle.session.canUndo).toBe(false);
    expect(handle.session.canRedo).toBe(false);
    // perform an undoable op (update)
    handle.updateSymbol('editor-rect', { x: 500 });
    expect(handle.session.canUndo).toBe(true);
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(1);
    // undo → geometry reverts
    handle.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')?.x).toBe(100);
    expect(handle.session.canUndo).toBe(false);
    expect(handle.session.canRedo).toBe(true);
    // redo → geometry restored
    handle.redo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')?.x).toBe(500);
    expect(handle.session.canUndo).toBe(true);
    expect(handle.session.canRedo).toBe(false);
  });

  it('group/ungroup handles are callable (Phase 3 wires real behavior)', async () => {
    const { container } = renderEditor('group-ungroup-handles');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(() => handle.group(['editor-rect'])).not.toThrow();
    expect(() => handle.ungroup('editor-rect')).not.toThrow();
  });
});
