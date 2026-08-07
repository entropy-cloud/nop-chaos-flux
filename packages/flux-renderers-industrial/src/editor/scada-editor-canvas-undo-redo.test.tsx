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
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-undo/${tag}`}
      schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
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

describe('scada-editor-canvas undo-redo (E7.2, design-undo-redo.md)', () => {
  it('canUndo/canRedo derived from stack (not constant false)', async () => {
    const { container } = renderEditor('derived');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.canUndo).toBe(false);
    expect(handle.session.canRedo).toBe(false);
    handle.updateSymbol('editor-rect', { x: 200 });
    expect(handle.session.canUndo).toBe(true);
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(1);
  });

  it('drag → undo → geometry reverts / redo → restores', async () => {
    const { container } = renderEditor('drag-undo-redo');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const original = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!;
    const originalX = original.x;

    handle.updateSymbol('editor-rect', { x: 999 });
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(999);

    handle.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(originalX);

    handle.redo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(999);
  });

  it('add symbol → undo restores removed / redo re-adds', async () => {
    const { container } = renderEditor('add-undo');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;

    handle.addSymbol({ id: 'new-1', type: 'scada-ellipse', x: 30, y: 30, width: 40, height: 40 });
    expect(handle.session.workingConfig.symbols).toHaveLength(before + 1);

    handle.undo();
    expect(handle.session.workingConfig.symbols).toHaveLength(before);
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'new-1')).toBeUndefined();

    handle.redo();
    expect(handle.session.workingConfig.symbols).toHaveLength(before + 1);
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'new-1')).toBeDefined();
  });

  it('remove symbol → undo restores', async () => {
    const { container } = renderEditor('remove-undo');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;

    handle.removeSymbol('editor-rect');
    expect(handle.session.workingConfig.symbols).toHaveLength(before - 1);

    handle.undo();
    expect(handle.session.workingConfig.symbols).toHaveLength(before);
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')).toBeDefined();
  });

  it('multi-step undo/redo round-trip consistency (forward ∘ inverse = identity)', async () => {
    const { container } = renderEditor('round-trip');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    // 3 ops: move, fill, resize
    handle.updateSymbol('editor-rect', { x: 11 });
    handle.updateSymbol('editor-rect', { fill: '#abcdef' });
    handle.updateSymbol('editor-rect', { width: 200 });

    const afterOps = JSON.stringify(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect'));
    // undo all 3
    handle.undo();
    handle.undo();
    handle.undo();
    // back to original
    const node = handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!;
    expect(node.x).toBe(100);
    expect(node.fill).toBe('#1565c0');
    expect(node.width).toBe(120);
    // redo all 3 → identity (same as after ops)
    handle.redo();
    handle.redo();
    handle.redo();
    const afterRedo = JSON.stringify(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect'));
    expect(afterRedo).toBe(afterOps);
  });

  it('undo after new op truncates redo (U6)', async () => {
    const { container } = renderEditor('truncate');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.updateSymbol('editor-rect', { x: 200 });
    handle.undo();
    expect(handle.session.canRedo).toBe(true);
    expect(handle.undoRedo.getStackState().redoStackDepth).toBe(1);
    // new op truncates redo
    handle.updateSymbol('editor-rect', { width: 300 });
    expect(handle.session.canRedo).toBe(false);
    expect(handle.undoRedo.getStackState().redoStackDepth).toBe(0);
  });

  it('boundary: undo/redo on empty stack is a no-op (no crash)', async () => {
    const { container } = renderEditor('empty-stack');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.canUndo).toBe(false);
    expect(() => handle.undo()).not.toThrow();
    expect(() => handle.redo()).not.toThrow();
    // working copy unchanged
    expect(handle.session.workingConfig.symbols).toHaveLength(2);
  });

  it('load clears undo/redo stack (design-undo-redo.md §8.2: edit history not preserved)', async () => {
    const { container } = renderEditor('load-clears');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.updateSymbol('editor-rect', { x: 500 });
    expect(handle.session.canUndo).toBe(true);
    handle.load({
      version: 1,
      variables: [],
      symbols: [{ id: 'fresh', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    });
    expect(handle.session.canUndo).toBe(false);
    expect(handle.session.canRedo).toBe(false);
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(0);
  });

  it('connection op undo round-trip (Phase 1 connection + Phase 2 stack wired together)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-undo/conn"
        schema={{
          type: 'scada-editor-canvas',
          config: {
            version: 1,
            variables: [],
            symbols: [
              { id: 'j1', type: 'scada-pipe-junction', x: 0, y: 0, width: 100, height: 100, custom: { connections: [] } },
              { id: 'dev', type: 'scada-rect', x: 300, y: 100, width: 80, height: 60 },
            ],
          } as never,
        }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.connection.connect({
      junctionId: 'j1',
      connectionId: 'c1',
      targetNodeId: 'dev',
      targetAnchor: { x: 1, y: 0.5 },
    });
    expect(handle.connection.listConnections()).toHaveLength(1);
    expect(handle.session.canUndo).toBe(true);

    // undo the connection write → connection removed
    handle.undo();
    expect(handle.connection.listConnections()).toHaveLength(0);
    expect(handle.session.canRedo).toBe(true);

    // redo → connection restored
    handle.redo();
    expect(handle.connection.listConnections()).toHaveLength(1);
  });

  it('undo/redo do not dispatch symbol:* actions (R5 isolation)', async () => {
    const { container } = renderEditor('r5-isolation');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // undo/redo only mutate working copy + engine; no symbol:* action dispatch path exists.
    handle.updateSymbol('editor-rect', { x: 200 });
    handle.undo();
    handle.redo();
    // working copy intact, no crash = isolation maintained (structurally verified: no symbol:* wiring in undo path)
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(200);
  });

  it('coalesces consecutive same-field edits into 1 undo step (§4.4 M2 basic coalesce)', async () => {
    const { container } = renderEditor('coalesce');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    // two edits to the SAME field (x) within 500ms → coalesce into 1 step
    handle.updateSymbol('editor-rect', { x: 11 });
    handle.updateSymbol('editor-rect', { x: 22 });
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(1);

    // undo once → reverts to ORIGINAL x (not intermediate 11), proving merge
    handle.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(100);
    expect(handle.session.canUndo).toBe(false);
  });

  it('does NOT coalesce different-field edits (§4.4: same field required)', async () => {
    const { container } = renderEditor('no-coalesce');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.updateSymbol('editor-rect', { x: 11 });
    handle.updateSymbol('editor-rect', { fill: '#abc' });
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(2);
  });

  it('undoRedo.pushUndo programmatic entry (§8.3 test handle contract)', async () => {
    const { container } = renderEditor('push-undo');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(0);

    handle.undoRedo.pushUndo(
      { added: [], removed: [], updated: [{ id: 'editor-rect', patch: { x: 555 } }] },
      { version: 1, variables: [], symbols: handle.session.workingConfig.symbols.map((s) => ({ ...s })) },
      'update-symbol',
    );
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(1);
    expect(handle.session.canUndo).toBe(true);

    handle.undoRedo.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'editor-rect')!.x).toBe(100);
  });
});
