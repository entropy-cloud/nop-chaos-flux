import type { UndoCommandStack } from '@nop-chaos/editor-core';
import type {
  SpreadsheetDocument,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetSelection,
  SpreadsheetEditingState,
  ClipboardData,
} from '../types.js';
import { createDefaultLayout } from '../types.js';

/**
 * P1.2 迁移（plan 547）：undo/redo 栈存储单源 editor-core `UndoCommandStack<SpreadsheetDocument>`。
 *
 * 快照对 entry 裁定（editor-core.md §6.2）：SpreadsheetDocument 无结构化域 diff，entry 的
 * `inverse` = undo 恢复目标文档、`forward` = redo 恢复目标文档（全量快照即自逆 diff，
 * forward/inverse 对称契约平凡满足，undo 恢复语义与旧数组快照栈逐字节一致）。
 * **操作时点语义**：undo/redo 恢复目标取 entry.inverse/forward，但 redo/undo 时会以操作时点
 * `current.document` 重建对侧 entry（见 history-handlers）——事务开启期间文档可漂移
 * （事务内 mutation / recalc 不入栈），操作时点语义与旧数组实现一致。
 * 事务起点快照 `transactionDoc` 映射 editor-core 事务三件套的 `txStart`（域协调层持有）。
 */
export interface SpreadsheetInternalState {
  document: SpreadsheetDocument;
  activeSheetId: string;
  selection: SpreadsheetSelection;
  editing: SpreadsheetEditingState | undefined;
  viewport: { scrollX: number; scrollY: number; zoom: number };
  readonly: boolean;
  dirty: boolean;
  /** undo/redo 栈（editor-core 单源；实例引用跨 setState 稳定，快照对 entry 见类注释）。 */
  undo: UndoCommandStack<SpreadsheetDocument>;
  transactionDoc: SpreadsheetDocument | null;
  clipboard: ClipboardData | null;
  maxUndoDepth: number;
}

import { cloneDeep } from '@nop-chaos/flux-core';
export function cloneSpreadsheetDocument(document: SpreadsheetDocument): SpreadsheetDocument {
  return cloneDeep(document);
}

export function buildSnapshot(state: SpreadsheetInternalState): SpreadsheetRuntimeSnapshot {
  return {
    document: state.document,
    activeSheetId: state.activeSheetId,
    selection: state.selection,
    editing: state.editing,
    history: {
      canUndo: state.undo.canUndo,
      canRedo: state.undo.canRedo,
      undoDepth: state.undo.undoDepth,
      redoDepth: state.undo.redoDepth,
    },
    viewport: state.viewport,
    layout: createDefaultLayout(),
    readonly: state.readonly,
    dirty: state.dirty,
  };
}

export function pushUndo(
  state: SpreadsheetInternalState,
): SpreadsheetInternalState {
  return pushUndoDocument(state, state.document);
}

function pushUndoDocument(
  state: SpreadsheetInternalState,
  previousDocument: SpreadsheetDocument,
): SpreadsheetInternalState {
  if (state.transactionDoc) {
    state.undo.clearRedo();
    return { ...state };
  }
  state.undo.push({
    forward: state.document,
    inverse: previousDocument,
    timestamp: Date.now(),
  });
  return { ...state };
}

export function clearTransientState(
  _state: SpreadsheetInternalState,
): Pick<SpreadsheetInternalState, 'selection' | 'editing'> {
  return {
    selection: { kind: 'none' },
    editing: undefined,
  };
}

export function applySimpleDocumentMutation(
  state: SpreadsheetInternalState,
  nextDoc: SpreadsheetDocument,
): SpreadsheetInternalState {
  return {
    ...pushUndo(state),
    document: nextDoc,
    dirty: true,
  };
}
