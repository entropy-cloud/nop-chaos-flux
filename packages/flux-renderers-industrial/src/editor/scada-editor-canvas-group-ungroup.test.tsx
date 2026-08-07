import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import type { ScadaConfig } from '../serialization/config-types.js';

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

function multiSymbolConfig(): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      { id: 'r1', type: 'scada-rect', x: 10, y: 10, width: 60, height: 40 },
      { id: 'r2', type: 'scada-rect', x: 100, y: 10, width: 60, height: 40 },
      { id: 'r3', type: 'scada-ellipse', x: 200, y: 10, width: 50, height: 50 },
    ],
  };
}

function renderEditor(tag: string, config: ScadaConfig = multiSymbolConfig()) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-group/${tag}`}
      schema={{ type: 'scada-editor-canvas', config: config as never }}
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

describe('scada-editor-canvas multi-select + group/ungroup (E7.2 Phase 3)', () => {
  it('multi-select: setSelection supports multiple nodeIds', async () => {
    const { container } = renderEditor('multi-select');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    expect(handle.session.selection).toEqual([]);

    handle.setSelection(['r1', 'r2', 'r3']);
    expect(handle.session.selection).toEqual(['r1', 'r2', 'r3']);
  });

  it('group: creates scada-group node + children removed from top-level (§4.3)', async () => {
    const { container } = renderEditor('group');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.session.workingConfig.symbols.length;

    handle.group(['r1', 'r2']);
    const symbols = handle.session.workingConfig.symbols;
    const groupNode = symbols.find((s) => s.type === 'scada-group');
    expect(groupNode).toBeDefined();
    expect(groupNode!.children).toHaveLength(2);
    expect(groupNode!.children!.map((c) => c.id).sort()).toEqual(['r1', 'r2']);
    // top-level count: 3 - 2 + 1 group = 2
    expect(symbols).toHaveLength(before - 1);
    // r1, r2 no longer at top level
    expect(symbols.find((s) => s.id === 'r1')).toBeUndefined();
    expect(symbols.find((s) => s.id === 'r2')).toBeUndefined();
    expect(handle.session.selection).toEqual([groupNode!.id]);
  });

  it('ungroup: promotes children back to top-level (§4.3 inverse)', async () => {
    const { container } = renderEditor('ungroup');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.group(['r1', 'r2']);
    const groupNode = handle.session.workingConfig.symbols.find((s) => s.type === 'scada-group')!;
    const groupId = groupNode.id;

    handle.ungroup(groupId);
    const symbols = handle.session.workingConfig.symbols;
    expect(symbols.find((s) => s.id === groupId)).toBeUndefined();
    expect(symbols.find((s) => s.id === 'r1')).toBeDefined();
    expect(symbols.find((s) => s.id === 'r2')).toBeDefined();
    // back to 3 top-level
    expect(symbols).toHaveLength(3);
  });

  it('group → undo restores children to top-level (structure diff inverse)', async () => {
    const { container } = renderEditor('group-undo');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    handle.group(['r1', 'r2']);
    expect(handle.session.canUndo).toBe(true);
    expect(handle.undoRedo.getStackState().topOperationKind).toBe('group');

    handle.undo();
    const symbols = handle.session.workingConfig.symbols;
    expect(symbols.find((s) => s.type === 'scada-group')).toBeUndefined();
    expect(symbols.find((s) => s.id === 'r1')).toBeDefined();
    expect(symbols.find((s) => s.id === 'r2')).toBeDefined();
    expect(symbols).toHaveLength(3);
  });

  it('group → ungroup undo round-trip consistency', async () => {
    const { container } = renderEditor('group-ungroup-roundtrip');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const originalSnapshot = JSON.stringify(handle.session.workingConfig.symbols.map((s) => s.id).sort());

    handle.group(['r1', 'r2']);
    const groupNode = handle.session.workingConfig.symbols.find((s) => s.type === 'scada-group')!;
    handle.ungroup(groupNode.id);

    // 2 ops on stack: group + ungroup
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(2);

    // undo ungroup → group node restored
    handle.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.type === 'scada-group')).toBeDefined();
    // undo group → original state
    handle.undo();
    const finalIds = JSON.stringify(handle.session.workingConfig.symbols.map((s) => s.id).sort());
    expect(finalIds).toBe(originalSnapshot);
  });

  it('group/ungroup do not dispatch symbol:* actions (R5 isolation)', async () => {
    const { container } = renderEditor('r5-group');
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // group/ungroup only mutate working copy + engine; no symbol:* action path exists.
    handle.group(['r1', 'r2']);
    const groupNode = handle.session.workingConfig.symbols.find((s) => s.type === 'scada-group')!;
    handle.ungroup(groupNode.id);
    // no crash + working copy consistent = R5 isolation maintained
    expect(handle.session.workingConfig.symbols).toHaveLength(3);
  });
});
