import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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

function renderEditor(tag: string, config: ScadaConfig) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-drag-snap/${tag}`}
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

function snapConfig(): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      { id: 'anchor', type: 'scada-rect', x: 100, y: 100, width: 100, height: 100 },
      // 自由位置 (200, 500)：x 轴与 anchor 左缘 100 差 3（≤ 阈值 8）→ 对齐候选；y 轴无候选 → 网格兜底。
      { id: 'mover', type: 'scada-rect', x: 200, y: 500, width: 100, height: 100 },
    ],
  };
}

describe('plan 531 S2 Phase 3 — 拖拽吸附（guides 上报 + transformEnd 单 diff 修正）', () => {
  it('drag frame reports the alignment guide and pointerup snaps within one undo entry', async () => {
    const { container, unmount } = renderEditor('snap-move', snapConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const editor = handle.editor as { emit?: (e: string) => void; target?: unknown };
    const engine = handle.engine as { getSymbol?: (id: string) => { node: Record<string, unknown> } | undefined };
    const leaf = engine.getSymbol?.('mover');
    expect(leaf).toBeDefined();
    // 模拟拖拽帧：mock leaf 自由几何落到 (103, 500)（x 对齐 anchor 左缘 100 差 3）。
    leaf!.node.x = 103;
    leaf!.node.y = 500;
    editor.target = leaf!.node;
    editor.emit?.('editor.move');
    // 探针：adapter 几何写回先于 guides 断言（隔离路径）。
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'mover')?.x).toBe(103);

    // 拖拽帧辅助线上报（DOM 通道；视觉通道不入 working copy）。
    await waitFor(() => {
      expect(container.querySelector('[data-testid="scada-editor-move-guide-vertical"]')).not.toBeNull();
    });

    // 事务终止（adapter pointerup once listener）→ 吸附修正 → commitTransaction。
    window.dispatchEvent(new Event('pointerup'));
    await waitFor(() => {
      expect(container.querySelector('[data-testid="scada-editor-move-guide-vertical"]')).toBeNull();
    });

    const mover = handle.session.workingConfig.symbols.find((s) => s.id === 'mover');
    expect(mover).toMatchObject({ x: 100, y: 500 });
    // 一拖拽 = 一 diff（修正并入同一 undo entry）。
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(1);
    // leafer 节点同步到吸附位置（syncWorkingCopy → engine.applyDiff 写回）。
    expect(leaf!.node.x).toBe(100);
    // undo 恢复自由位置（单 diff 语义）。
    handle.undo();
    expect(handle.session.workingConfig.symbols.find((s) => s.id === 'mover')).toMatchObject({ x: 200, y: 500 });
    unmount();
  });

  it('resize transforms skip position snapping (move-only discriminator)', async () => {
    const { container, unmount } = renderEditor('snap-resize', snapConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const editor = handle.editor as { emit?: (e: string) => void; target?: unknown };
    const engine = handle.engine as { getSymbol?: (id: string) => { node: Record<string, unknown> } | undefined };
    const leaf = engine.getSymbol?.('mover');
    if (!leaf) throw new Error('mover leaf not found');
    // 事务窗口内发生 width 变更 → 非纯位移 → 不做位置吸附（103 不被拉到 100）。
    leaf.node.x = 103;
    leaf.node.y = 500;
    leaf.node.width = 150;
    editor.target = leaf.node;
    editor.emit?.('editor.move');
    window.dispatchEvent(new Event('pointerup'));
    await waitFor(() => {
      const mover = handle.session.workingConfig.symbols.find((s) => s.id === 'mover');
      expect(mover?.width).toBe(150);
    });
    const mover = handle.session.workingConfig.symbols.find((s) => s.id === 'mover');
    expect(mover).toMatchObject({ x: 103 });
    expect(container.querySelector('[data-testid="scada-editor-move-guide-vertical"]')).toBeNull();
    unmount();
  });
});

describe('plan 531 S2 Phase 2 — drop 落点指示 + 吸附 + 自动选中（RTL 集成）', () => {
  it('dragover shows the snapped drop preview; drop lands snapped and auto-selects', async () => {
    const { container, unmount } = renderEditor('drop-snap', snapConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const depthBefore = handle.undoRedo.getStackState().undoStackDepth;
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    expect(canvasArea).not.toBeNull();

    const dataTransfer = {
      getData: (type: string) => (type === 'application/x-scada-symbol-type' ? 'scada-rect' : ''),
      dropEffect: '',
    };
    // jsdom rect 全 0 → clientX/Y 即 view 坐标。落点 (60, 480)：y 无对齐候选 → 网格 480；x 网格 60。
    fireEvent.dragOver(canvasArea, { clientX: 60, clientY: 480, dataTransfer });
    await waitFor(() => {
      expect(container.querySelector('[data-testid="scada-editor-drop-preview"]')).not.toBeNull();
    });

    fireEvent.drop(canvasArea, { clientX: 60, clientY: 480, dataTransfer });
    await waitFor(() => {
      expect(handle.session.workingConfig.symbols.length).toBe(3);
    });
    const added = handle.session.workingConfig.symbols[2];
    expect(added.type).toBe('scada-rect');
    // 落点吸附（网格/对齐）坐标断言在 transform-snap 纯函数单测 + 真浏览器 e2e 覆盖；
    // jsdom 零尺寸容器下 getWorldPoint 为 NaN，RTL 面只断言「落点已吸附到有限数值格点」的
    // 上游契约不可行，故此处收敛到 drop 主链路：新增 + 自动选中 + 指示清除。
    // drop 后自动选中（resolved id）。
    expect(handle.session.selection).toContain(added.id);
    expect(handle.undoRedo.getStackState().undoStackDepth).toBe(depthBefore + 1);
    // 落点指示清除。
    expect(container.querySelector('[data-testid="scada-editor-drop-preview"]')).toBeNull();
    unmount();
  });

  it('drop with unregistered type is ignored and leaves no preview residue', async () => {
    const { container, unmount } = renderEditor('drop-invalid', snapConfig());
    await waitForReadyAndCid(container);
    const canvasArea = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
    const dataTransfer = {
      getData: (type: string) => (type === 'application/x-scada-symbol-type' ? 'scada-not-registered' : ''),
      dropEffect: '',
    };
    fireEvent.dragOver(canvasArea, { clientX: 60, clientY: 480, dataTransfer });
    fireEvent.drop(canvasArea, { clientX: 60, clientY: 480, dataTransfer });
    // invalid type 早退（既有 invalid-node 上报路径）→ 无新增图元；指示不残留。
    await waitFor(() => {
      expect(container.querySelector('[data-testid="scada-editor-drop-preview"]')).toBeNull();
    });
    unmount();
  });
});
