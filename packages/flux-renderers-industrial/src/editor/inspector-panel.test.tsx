import React from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { EditorInspectorPanel } from './inspector/inspector-panel.js';
import type { EditorEngineRuntime } from './renderer/hooks/use-editor-engine.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import { UndoStack } from './undo-redo/undo-stack.js';
import { UndoRedoAdapter } from './undo-redo/undo-redo-adapter.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'node-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
  ],
};

function makeRuntime(workingConfig: ScadaConfig): EditorEngineRuntime {
  return {
    engine: {} as never,
    session: { workingConfig, committedBaseline: workingConfig, selection: [], mode: 'edit', undoStack: new UndoStack() },
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => '{}',
    load: () => undefined,
    syncWorkingCopy: () => undefined,
    updateWorkingNode: () => undefined,
    addWorkingSymbol: () => undefined,
    removeWorkingSymbol: () => undefined,
    undoRedo: new UndoRedoAdapter(new UndoStack()),
    undo: () => undefined,
    redo: () => undefined,
    groupSymbols: () => undefined,
    ungroupSymbols: () => undefined,
    fitView: () => false,
    centerView: () => false,
    resetView: () => undefined,
    zoomView: () => undefined,
    alignSelection: () => false,
    distributeSelection: () => false,
    reorderZOrder: () => false,
    copySelection: () => 0,
    cutSelection: () => 0,
    paste: () => [],
    getClipboard: () => null,
    exportConfig: () => '{}',
    importConfig: () => false,
    listSymbolLibrary: () => [],
  };
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('EditorInspectorPanel (Phase 1 stub)', () => {
  it('shows "No symbol selected" when no selection', () => {
    const runtime = makeRuntime(config);
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId={undefined} onError={() => undefined} />);
    const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
    expect(inspector?.textContent).toContain('未选中图元');
  });

  it('shows node id/type when a symbol is selected', () => {
    const runtime = makeRuntime(config);
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId="node-1" onError={() => undefined} />);
    const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
    expect(inspector?.textContent).toContain('node-1');
    expect(inspector?.textContent).toContain('scada-rect');
  });

  it('shows "No symbol selected" when selectedNodeId does not match any node', () => {
    const runtime = makeRuntime(config);
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId="nonexistent" onError={() => undefined} />);
    const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
    expect(inspector?.textContent).toContain('未选中图元');
  });

  it('finds nested child in group subtree', () => {
    const groupConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'grp',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'inner', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
          ],
        },
      ],
    };
    const runtime = makeRuntime(groupConfig);
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId="inner" onError={() => undefined} />);
    const inspector = container.querySelector('[data-slot="scada-editor-inspector"]');
    expect(inspector?.textContent).toContain('inner');
  });

  it('renders field groups when a symbol is selected', () => {
    const runtime = makeRuntime(config);
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId="node-1" onError={() => undefined} />);
    // Field group labels present (geometry/style/binding/etc)
    const text = container.textContent ?? '';
    expect(text).toContain('几何');
    expect(text).toContain('样式');
  });

  it('field onChange calls runtime.updateWorkingNode', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #26：从「patch defined」推进到「patch 字段值正确 + workingConfig 反映」。
    let updatedNode: string | undefined;
    let updatedPatch: Record<string, unknown> | undefined;
    const runtime = makeRuntime(config);
    runtime.updateWorkingNode = (nodeId: string, patch: Partial<ScadaSymbolNode>) => {
      updatedNode = nodeId;
      updatedPatch = patch as Record<string, unknown>;
      // 真实 mutator 语义：patch 应用到 workingConfig node（使 workingConfig 反映）。
      const target = runtime.session.workingConfig.symbols.find((s) => s.id === nodeId);
      if (target) Object.assign(target, patch);
    };
    const { container } = render(<EditorInspectorPanel runtime={runtime} selectedNodeId="node-1" onError={() => undefined} />);
    // Find a number input (x field) and change its value.
    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(0);
    // 第一个 number input 是 x 字段（初始值 10 = node-1.x），确认字段身份后再断言 patch 字段值。
    expect((numberInputs[0] as HTMLInputElement).value).toBe('10');
    fireEvent.change(numberInputs[0], { target: { value: '200' } });
    expect(updatedNode).toBe('node-1');
    expect(updatedPatch).toBeDefined();
    // patch 字段值正确（非仅 defined）
    expect(updatedPatch!.x).toBe(200);
    // workingConfig 反映（updateWorkingNode 已应用 patch 到 node）
    const reflectNode = runtime.session.workingConfig.symbols.find((s) => s.id === 'node-1');
    expect(reflectNode?.x).toBe(200);
  });
});
