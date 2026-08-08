import type { ScadaEditorTestHandle } from './editor-test-handle.js';
import {
  listAllConnections,
  programmaticConnect,
  programmaticDisconnect,
} from './connection/connection-adapter.js';
import { findNodeInWorking } from './editor-working-helpers.js';
import type { EditorOperationKind } from './undo-redo/undo-stack.js';
import type { EditorRuntimeContext } from './runtime-factories.js';
import type { EditorRuntimeMutators } from './runtime-mutators.js';
import type { EditorToolboxRuntime } from './toolbox-runtime.js';

/**
 * 测试句柄工厂（plan 2026-08-07-1835-2 Phase 1 / multi P1-03）：
 * 从 `use-editor-engine.ts` 抽出的 `buildEditorTestHandle`（design-renderer.md §8.4：session 投影 +
 * editor/engine/app + 操作方法 + connection/undoRedo/toolbox 子句柄）。机械迁移，行为不变。
 */
export function buildEditorTestHandle(
  ctx: EditorRuntimeContext,
  mutators: EditorRuntimeMutators,
  toolbox: EditorToolboxRuntime,
): ScadaEditorTestHandle {
  const { engine, session, undoRedo, notifySession } = ctx;
  const { writeConnection } = mutators;

  const connectionHandle: ScadaEditorTestHandle['connection'] = {
    connect(connectArgs) {
      const junctionNode = findNodeInWorking(session.workingConfig.symbols, connectArgs.junctionId);
      const targetNode = findNodeInWorking(session.workingConfig.symbols, connectArgs.targetNodeId);
      if (!junctionNode || !targetNode) return;
      const result = programmaticConnect({
        junctionNode,
        connectionId: connectArgs.connectionId,
        targetNodeId: connectArgs.targetNodeId,
        targetAnchor: connectArgs.targetAnchor,
        direction: connectArgs.direction,
        junction: { x: junctionNode.x ?? 0, y: junctionNode.y ?? 0, width: junctionNode.width ?? 0, height: junctionNode.height ?? 0 },
        targetDevice: { x: targetNode.x ?? 0, y: targetNode.y ?? 0, width: targetNode.width ?? 0, height: targetNode.height ?? 0 },
      });
      // m-2 修正：连线写入经 writeConnection 走 'connection-update' operationKind（design-undo-redo.md §4.2）。
      writeConnection(connectArgs.junctionId, result.connections);
    },
    disconnect(disconnectArgs) {
      const junctionNode = findNodeInWorking(session.workingConfig.symbols, disconnectArgs.junctionId);
      if (!junctionNode) return;
      const result = programmaticDisconnect({ junctionNode, connectionId: disconnectArgs.connectionId });
      if (!result) return;
      writeConnection(disconnectArgs.junctionId, result.connections);
    },
    listConnections() {
      return listAllConnections({ symbols: session.workingConfig.symbols });
    },
  };

  return {
    get session() {
      return {
        workingConfig: session.workingConfig,
        committedBaseline: session.committedBaseline,
        canUndo: session.undoStack.canUndo,
        canRedo: session.undoStack.canRedo,
        selection: [...session.selection],
        mode: session.mode,
      };
    },
    get editor() {
      return engine.editor;
    },
    get engine() {
      return engine;
    },
    get app() {
      return engine.app;
    },
    switchMode: mutators.switchMode,
    setSelection: mutators.setSelection,
    clearSelection: mutators.clearSelection,
    save: mutators.save,
    load: mutators.load,
    addSymbol: mutators.addWorkingSymbol,
    removeSymbol: mutators.removeWorkingSymbol,
    // plan 2026-08-08-1931-1 Phase 3 / P2-4：批量删除测试句柄（传 id 数组 → 单 undo entry）。
    removeSymbols: (nodeIds: string[]) => mutators.removeWorkingSymbol(nodeIds),
    updateSymbol: mutators.updateWorkingNode,
    group: mutators.groupSymbols,
    ungroup: mutators.ungroupSymbols,
    undo: mutators.undo,
    redo: mutators.redo,
    connection: connectionHandle,
    undoRedo: {
      undo: mutators.undo,
      redo: mutators.redo,
      getStackState() {
        return {
          canUndo: session.undoStack.canUndo,
          canRedo: session.undoStack.canRedo,
          undoStackDepth: session.undoStack.undoStackDepth,
          redoStackDepth: session.undoStack.redoStackDepth,
          topOperationKind: session.undoStack.topOperationKind,
        };
      },
      pushUndo(forward, prevSnapshot, operationKind) {
        undoRedo.pushForward(
          (operationKind as EditorOperationKind) ?? 'update-symbol',
          forward,
          prevSnapshot,
        );
        notifySession();
      },
    },
    toolbox: {
      fit: toolbox.fitView,
      center: toolbox.centerView,
      zoomAt: toolbox.zoomView,
      resetView: toolbox.resetView,
      getViewport: () => engine.getViewport(),
      align: toolbox.alignSelection,
      distribute: toolbox.distributeSelection,
      toTop: () => toolbox.reorderZOrder('toTop'),
      toBottom: () => toolbox.reorderZOrder('toBottom'),
      moveUp: () => toolbox.reorderZOrder('moveUp'),
      moveDown: () => toolbox.reorderZOrder('moveDown'),
      copy: toolbox.copySelection,
      cut: toolbox.cutSelection,
      paste: toolbox.paste,
      getClipboard: toolbox.getClipboard,
      exportConfig: toolbox.exportConfig,
      importConfig: toolbox.importConfig,
      listSymbolLibrary: toolbox.listSymbolLibrary,
    },
  };
}
