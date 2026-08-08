import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import type { ScadaConfigDiff } from '../serialization/config-types.js';
import {
  cloneConfigSnapshot,
  applyPatchToWorkingNode,
  recomputeLinkagesForMovedNode,
  findNodeInWorking,
  collectAllSymbols,
} from './editor-working-helpers.js';
import { resetSession } from './editor-session.js';
import type { ConnectionWriteResult } from './connection/connection-adapter.js';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { errorMessage } from '../renderer/scada-errors.js';
import type { EditorOperationKind } from './undo-redo/undo-stack.js';
import type { EditorRuntimeContext } from './runtime-factories.js';

/**
 * runtime mutators + session ops（plan 2026-08-07-1835-2 Phase 1 / multi P1-03）：
 * 从 `use-editor-engine.ts` 抽出的 9 mutators（闭包稳定 ctx）+ save/load/switchMode/setSelection/clearSelection。
 * 机械迁移，行为不变；undo 栈 + working copy 写回经 ctx 共享。
 */

export interface EditorRuntimeMutators {
  updateWorkingNode: (nodeId: string, patch: Partial<ScadaSymbolNode>) => void;
  /** 写入 pipe-junction custom.connections（内部，经 connection-wiring / test-handle 消费）。 */
  writeConnection: (
    junctionId: string,
    connections: ConnectionWriteResult['connections'],
  ) => void;
  addWorkingSymbol: (node: ScadaSymbolNode) => void;
  removeWorkingSymbol: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  groupSymbols: (nodeIds: string[]) => void;
  ungroupSymbols: (groupId: string) => void;
  switchMode: (mode: 'edit' | 'preview') => void;
  setSelection: (nodeIds: string[]) => void;
  clearSelection: () => void;
  save: () => string;
  load: (input: string | ScadaConfig) => void;
}

export function buildRuntimeMutators(ctx: EditorRuntimeContext): EditorRuntimeMutators {
  const { engine, session, undoRedo, latest, synced, notifySession, setSessionSelection, syncWorkingCopy } = ctx;

  const writeConnection = (
    junctionId: string,
    connections: ConnectionWriteResult['connections'],
  ) => {
    const junctionNode = findNodeInWorking(session.workingConfig.symbols, junctionId);
    if (!junctionNode) return;
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    applyPatchToWorkingNode(session, junctionId, {
      custom: { ...junctionNode.custom, connections },
    });
    undoRedo.pushOperation('connection-update', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const updateWorkingNode = (nodeId: string, patch: Partial<ScadaSymbolNode>) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    applyPatchToWorkingNode(session, nodeId, patch);
    // 图元移动联动（design-connection.md §4.4 + §4.5）：仅当几何字段变更时重算指向该节点 / 该节点持有的 connection.x/y。
    if (patch.x !== undefined || patch.y !== undefined || patch.width !== undefined || patch.height !== undefined) {
      recomputeLinkagesForMovedNode(session, nodeId);
    }
    // 入栈（update-symbol；property-edit 经 tryCoalesce 合并连续同字段编辑，design-undo-redo.md §4.4）。
    undoRedo.pushOperation('update-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const addWorkingSymbol = (node: ScadaSymbolNode) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    session.workingConfig.symbols = [...session.workingConfig.symbols, node];
    undoRedo.pushOperation('add-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const removeWorkingSymbol = (nodeId: string) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    session.workingConfig.symbols = session.workingConfig.symbols.filter((n) => n.id !== nodeId);
    setSessionSelection(session.selection.filter((id) => id !== nodeId));
    undoRedo.pushOperation('remove-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  /**
   * 应用一条 undo/redo diff 到 working copy + engine（不重新入栈）。
   *
   * plan 2026-08-08-0900-1 Phase 2 / P2 #17：applyDiff 失败可回滚——entry 经 peekUndoDiff/peekRedoDiff
   * 预读（不移动），仅 apply 成功后才 commitUndo/commitRedo 移动 entry。失败时还原 working copy +
   * 经 onError 派发 editor-internal-error（entry 保留在原栈，栈/working copy 保持一致）。
   */
  const applyUndoRedoDiff = (diff: ScadaConfigDiff, commit: () => void) => {
    const beforeWorking = cloneConfigSnapshot(session.workingConfig);
    try {
      session.workingConfig = undoRedo.applyDiff(session.workingConfig, diff);
      engine.applyDiff(diff, session.workingConfig);
      synced.config = cloneConfigSnapshot(session.workingConfig);
      commit();
      notifySession();
    } catch (error) {
      // 回滚 working copy 到 apply 前态 + 派发 editor-internal-error（entry 未 commit，保留在原栈）。
      session.workingConfig = beforeWorking;
      latest.current.onError?.('editor-internal-error', errorMessage(error));
    }
  };

  const undo = () => {
    const diff = undoRedo.peekUndoDiff();
    if (diff) applyUndoRedoDiff(diff, () => undoRedo.commitUndo());
  };

  const redo = () => {
    const diff = undoRedo.peekRedoDiff();
    if (diff) applyUndoRedoDiff(diff, () => undoRedo.commitRedo());
  };

  const groupSymbols = (nodeIds: string[]) => {
    // design-undo-redo.md §4.3：group 结构 diff（removed=子图元 id / added=新 Group 节点含 children）。
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    const childSet = new Set(nodeIds);
    const children = session.workingConfig.symbols.filter((s) => childSet.has(s.id));
    if (children.length === 0) return;
    const remaining = session.workingConfig.symbols.filter((s) => !childSet.has(s.id));
    // plan 2026-08-07-1835-1 Phase 2 / open P1-D：group id 用单调计数器 + 碰撞自增（替代 Date.now()），
    // 同毫秒连续 group 也不再碰撞。对齐 clipboard/connection id 站点纪律。
    const existingIds = new Set(collectAllSymbols(session.workingConfig.symbols).map((s) => s.id));
    let groupId: string;
    do {
      ctx.group.counter += 1;
      groupId = `scada-group-${ctx.group.counter}`;
    } while (existingIds.has(groupId));
    const groupNode: ScadaSymbolNode = {
      id: groupId,
      type: 'scada-group',
      x: 0,
      y: 0,
      children: children.map((c) => ({ ...c })),
    };
    session.workingConfig = { ...session.workingConfig, symbols: [...remaining, groupNode] };
    setSessionSelection([groupId]);
    undoRedo.pushOperation('group', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const ungroupSymbols = (groupId: string) => {
    // design-undo-redo.md §4.3：ungroup 结构 diff（removed=Group id / added=子图元提升顶层）。
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    const groupNode = session.workingConfig.symbols.find((s) => s.id === groupId);
    if (!groupNode || groupNode.type !== 'scada-group' || !groupNode.children) return;
    const promoted = groupNode.children.map((c) => ({ ...c }));
    const remaining = session.workingConfig.symbols.filter((s) => s.id !== groupId);
    session.workingConfig = { ...session.workingConfig, symbols: [...remaining, ...promoted] };
    setSessionSelection(promoted.map((c) => c.id));
    undoRedo.pushOperation('ungroup', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const switchMode = (mode: 'edit' | 'preview') => {
    if (session.mode === mode) return;
    session.mode = mode;
    engine.setMode(mode);
    latest.current.onModeChange?.(mode);
    notifySession();
  };

  const setSelection = (nodeIds: string[]) => {
    setSessionSelection(nodeIds);
    const nodes = nodeIds
      .map((id) => engine.getSymbol(id)?.node)
      .filter((n): n is NonNullable<typeof n> => n !== undefined);
    engine.setEditorTargets(nodes);
    notifySession();
  };

  const clearSelection = () => {
    setSessionSelection([]);
    engine.clearEditorSelection();
    notifySession();
  };

  const save = (): string => {
    // commit baseline 到 working copy 当前态（manual 提交后 baseline = 当前 working copy）。
    // plan HCA11 P2-1（扩展 P2 #4）：committedBaseline 经 cloneConfigSnapshot 深克隆（含 custom 深克隆），
    // 与 createScadaEditorSession/resetSession 的 cloneConfig 同 R5 Layer 2 隔离纪律——避免浅 `{...n}`
    // 共享 custom/children ref 致 working in-place 改动串改 baseline。
    session.committedBaseline = cloneConfigSnapshot(session.workingConfig);
    const serialized = serializeScadaConfig(session.workingConfig);
    // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：dispatch scada-editor:save → host onSave 收到 serializedConfig
    // （此前 save 仅 mutate state、0 dispatch 站点；onSave schema 事件声明但永不触发）。
    latest.current.onSave?.(serialized);
    return serialized;
  };

  const load = (input: string | ScadaConfig) => {
    try {
      const config = parseScadaConfig(input);
      const result = validateScadaConfig(config);
      if (!result.ok) {
        latest.current.onError?.('invalid-config', result.errors.join('; '));
        return;
      }
      resetSession(session, config);
      // resetSession 清空了 selection（canonical），同步 React mirror（multi P1-07 load 路径）。
      latest.current.onSelectionChange?.([]);
      synced.config = cloneConfigSnapshot(session.workingConfig);
      engine.build(session.workingConfig);
      // plan 2026-08-07-1835-2 Phase 2 / multi P1-08：build 后校正 engine.mode → session.mode
      // （engine.build 用 engine.mode 决定 editable 注入；resetSession 不改 session.mode，故重建后需重新同步）。
      if (engine.currentMode !== session.mode) {
        engine.setMode(session.mode);
      }
      // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：dispatch scada-editor:load → host onLoad 收到 parsed config
      // （此前 load 仅 mutate state、0 dispatch 站点；onLoad schema 事件声明但永不触发）。
      latest.current.onLoad?.(config);
      notifySession();
    } catch (error) {
      latest.current.onError?.('invalid-config', errorMessage(error));
    }
  };

  return {
    updateWorkingNode,
    writeConnection,
    addWorkingSymbol,
    removeWorkingSymbol,
    undo,
    redo,
    groupSymbols,
    ungroupSymbols,
    switchMode,
    setSelection,
    clearSelection,
    save,
    load,
  };
}

export type { EditorOperationKind };
