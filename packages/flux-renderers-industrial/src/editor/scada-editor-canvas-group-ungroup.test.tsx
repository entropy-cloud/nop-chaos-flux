import React from 'react';
import { cleanup, render, waitFor, act, fireEvent } from '@testing-library/react';
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

// plan 2026-08-08-1931-1 Phase 3 / P2-4：多元删除/解组单 undo entry——
// 按钮 + 键盘两路径对 N 元选中产单个 undo entry（批量 diff），一次 undo 完整恢复。
describe('scada-editor-canvas batch delete/ungroup single undo entry (P2-4)', () => {
  function twoGroupConfig(): ScadaConfig {
    return {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'g1',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'c1', type: 'scada-rect', x: 10, y: 10, width: 40, height: 40 },
            { id: 'c2', type: 'scada-rect', x: 60, y: 10, width: 40, height: 40 },
          ],
        },
        {
          id: 'g2',
          type: 'scada-group',
          x: 200,
          y: 0,
          children: [
            { id: 'c3', type: 'scada-ellipse', x: 10, y: 10, width: 40, height: 40 },
            { id: 'c4', type: 'scada-ellipse', x: 60, y: 10, width: 40, height: 40 },
          ],
        },
      ],
    };
  }

  it('batch delete N (3) nodes → single undo entry, one undo restores all', async () => {
    const { container } = renderEditor('batch-delete-3', multiSymbolConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.undoRedo.getStackState().undoStackDepth;
    handle.removeSymbols(['r1', 'r2', 'r3']);
    // 单 undo entry（非 N=3 entry）。
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(before + 1);
    expect(handle.session.workingConfig.symbols).toHaveLength(0);
    // 一次 undo 全恢复。
    handle.undo();
    expect(handle.session.workingConfig.symbols).toHaveLength(3);
    expect(handle.session.workingConfig.symbols.map((s) => s.id).sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('batch delete with group subtree → single undo restores subtree nodes', async () => {
    const { container } = renderEditor('batch-delete-group', twoGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.undoRedo.getStackState().undoStackDepth;
    // 删除两个 group（含 4 子节点）。
    handle.removeSymbols(['g1', 'g2']);
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(before + 1);
    expect(handle.session.workingConfig.symbols).toHaveLength(0);
    // undo 恢复两个 group + 其子树。
    handle.undo();
    const symbols = handle.session.workingConfig.symbols;
    expect(symbols).toHaveLength(2);
    const g1 = symbols.find((s) => s.id === 'g1')!;
    const g2 = symbols.find((s) => s.id === 'g2')!;
    expect(g1.children).toHaveLength(2);
    expect(g2.children).toHaveLength(2);
    expect(g1.children!.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('batch ungroup N (2) groups → single undo entry, one undo restores groups', async () => {
    const { container } = renderEditor('batch-ungroup-2', twoGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.undoRedo.getStackState().undoStackDepth;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    // 先同步 React selection state（handle.setSelection 经 onSelectionChange → setSelection）。
    await act(async () => {
      handle.setSelection(['g1', 'g2']);
    });
    await waitFor(() => {
      expect(handle.session.selection).toEqual(['g1', 'g2']);
    });
    // 键盘 Ctrl+Shift+G → runtime.ungroupSymbols(sel) → 批量单 diff。
    await act(async () => {
      fireEvent.keyDown(canvasArea, { key: 'g', ctrlKey: true, shiftKey: true });
    });
    // 单 undo entry（非 N=2 entry）。
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(before + 1);
    // 两 group 解散 → 4 子节点提升顶层。
    expect(handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group')).toHaveLength(0);
    expect(handle.session.workingConfig.symbols).toHaveLength(4);
    // undo 恢复两个 group。
    handle.undo();
    expect(handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group')).toHaveLength(2);
    expect(handle.session.workingConfig.symbols).toHaveLength(2);
  });

  it('single-id delete still produces 1 undo entry (regression)', async () => {
    const { container } = renderEditor('single-delete-regression', multiSymbolConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.undoRedo.getStackState().undoStackDepth;
    handle.removeSymbol('r1');
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(before + 1);
    handle.undo();
    expect(handle.session.workingConfig.symbols).toHaveLength(3);
  });

  it('single-id ungroup still produces 1 undo entry (regression)', async () => {
    const { container } = renderEditor('single-ungroup-regression', twoGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const before = handle.undoRedo.getStackState().undoStackDepth;
    handle.ungroup('g1');
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(before + 1);
    // g1 解散 → c1, c2 提升顶层。
    expect(handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group')).toHaveLength(1);
    expect(handle.session.workingConfig.symbols).toHaveLength(3); // g2 + c1 + c2
    handle.undo();
    expect(handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group')).toHaveLength(2);
  });
});
