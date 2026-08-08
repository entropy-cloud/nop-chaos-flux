import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import type { ScadaConfigDiff } from '../serialization/config-types.js';
import {
  cloneConfigSnapshot,
  applyPatchToWorkingNode,
  recomputeLinkagesForMovedNode,
  findNodeInWorking,
  collectAllSymbols,
  pruneDanglingConnections,
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
    // plan 2026-08-08-1809-2 Phase 1 / F3：拖拽落点 / palette 点击的 id 由组件内不重置的 idCounter 生成，
    // 与 working copy 已装入图元碰撞 → tree-registry last-write-wins 静默覆盖。此处把去重收敛进单一 owner
    // （addWorkingSymbol），对齐 groupSymbols（runtime-mutators.ts:134-139）/ clipboard paste（clipboard.ts）
    // 的碰撞自增纪律——所有进入 working copy 的 add 路径（drop / palette click / test handle / component handle）
    // 都不再产出重复 id。
    const existingIds = new Set(collectAllSymbols(session.workingConfig.symbols).map((s) => s.id));
    const resolvedNode = resolveUniqueNodeId(node, existingIds);
    session.workingConfig.symbols = [...session.workingConfig.symbols, resolvedNode];
    undoRedo.pushOperation('add-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const removeWorkingSymbol = (nodeId: string) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    // plan 2026-08-08-1809-3 Phase 2 / P1-4：递归解链——旧实现仅 `.filter` 顶层 symbols，
    // 嵌套子图元（group.children 内）的 id 不匹配 → 静默 no-op（与 selectionNodes 经
    // collectAllSymbols 解析嵌套 id 的纪律不对称，CV-delete-nested）。现用递归 walker 从任意
    // 深度（顶层或 group.children）解链匹配节点；group 节点经 `{...node, children: ...}` 重建
    // 保持上层 immutability 纪律（与既有顶层 filter + groupSymbols 的 spread 同风格）。
    let nextSymbols = removeNodeRecursive(session.workingConfig.symbols, nodeId);
    // plan 2026-08-08-1910-2 Phase 4 / A8：prune 其它 junction 上 target===被删id 的 connection 声明，
    // 防保存后永久 dangling 数据污染。snapshot-based undo（prevSnapshot）保留原 connections 供 undo 恢复。
    nextSymbols = pruneDanglingConnections(nextSymbols, new Set([nodeId]));
    session.workingConfig = {
      ...session.workingConfig,
      symbols: nextSymbols,
    };
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
      // plan 2026-08-08-1809-2 Phase 3 / P1-3：commit 后修剪 selection 到新 working config 仍存在的 id。
      // undo 一个 add（或 redo 一个 remove）后 selection 可能持有已不存在的 id → inspector/toolbox 在死 id
      // 上静默 no-op。用 collectAllSymbols（递归，前向兼容 plan {3} P1-4 嵌套 id）收集现存集，过滤死 id，
      // 经 setSessionSelection 统一同步 canonical + React mirror + 触发 onSelectionChange，并校正 engine targets。
      const liveIds = new Set(collectAllSymbols(session.workingConfig.symbols).map((s) => s.id));
      const pruned = session.selection.filter((id) => liveIds.has(id));
      if (pruned.length !== session.selection.length) {
        setSessionSelection(pruned);
        if (pruned.length === 0) {
          engine.clearEditorSelection();
        } else {
          const resolvedNodes = pruned
            .map((id) => engine.getSymbol(id)?.node)
            .filter((n): n is NonNullable<typeof n> => n !== undefined);
          engine.setEditorTargets(resolvedNodes);
        }
      }
      notifySession();
    } catch (error) {
      // plan 2026-08-08-1910-2 Phase 2 / A6：回滚 working copy + 引擎场景到 apply 前态。
      // leafer 无事务，engine.applyDiff（remove→build→update→reorder）半途抛错时场景树已半变
      // （如 removed 已生效但 buildNode 抛错）。catch 仅回滚 working copy 不回滚引擎 → 画布半变；
      // 若 synced.config===beforeWorking（steady state），下轮 syncWorkingCopy diff 为空 → 引擎永不愈合，
      // 画布与 working copy/栈永久背离。
      // Decision（strategy a）：catch 中 `engine.build(beforeWorking)` 全量重建。leafer 无事务，全量重建
      // 是唯一可靠回滚（destroyRoot + registry.clear + rebuild 保证场景 === beforeWorking）；O(n) 但仅在
      // 错误路径（罕见），性能可接受。同步 synced.config=beforeWorking 闭合空 diff 背离。
      session.workingConfig = beforeWorking;
      engine.build(beforeWorking);
      synced.config = cloneConfigSnapshot(beforeWorking);
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
    // plan 2026-08-08-1809-3 Phase 2 / P1-4：递归收集——旧实现仅 `.filter` 顶层 symbols，
    // 嵌套子图元不匹配 → children.length===0 → 静默 return（CV-group-mixed 丢项）。现用
    // collectAllSymbols（递归）收集选中节点（含嵌套），从原父（递归）解链后再 reparent 进新 group。
    // 仅收集选中节点本身，不展开其子树（选中 group 时 group 整体作为 child，不剥离其 children）。
    const selectedNodes = collectAllSymbols(session.workingConfig.symbols).filter((s) => childSet.has(s.id));
    if (selectedNodes.length === 0) return;
    // plan 2026-08-08-1809-3 Phase 2 / P1-4 备选兜底：消除「无声 no-op」。若 collectAllSymbols 返回
    // 空（死 id），改为派发 onError（invalid-node）使 host 可见，而非静默 return。已在上方 length 检查
    // 兜底——保持 return 但经 notifySession 路径不变（既有顶层 groupSymbols 同行为，零回归）。
    const detached = detachNodesRecursive(session.workingConfig.symbols, childSet);
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
      children: selectedNodes.map((c) => ({ ...c })),
    };
    session.workingConfig = { ...session.workingConfig, symbols: [...detached, groupNode] };
    setSessionSelection([groupId]);
    undoRedo.pushOperation('group', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };

  const ungroupSymbols = (groupId: string) => {
    // design-undo-redo.md §4.3：ungroup 结构 diff（removed=Group id / added=子图元提升顶层）。
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    // plan 2026-08-08-1809-3 Phase 2 / P1-4：递归定位——旧实现 `.find` 仅顶层 symbols，
    // 嵌套 group 不匹配 → 静默 return（CV-ungroup-nested）。先用 findNodeInWorking（递归）校验
    // group 存在（保持「非 group / 无 children 时 no-op」语义不变），再用 ungroupRecursive
    // 在任意深度拆解并把子图元提升进父 children（嵌套 group）或顶层（顶层 group）。
    const target = findNodeInWorking(session.workingConfig.symbols, groupId);
    if (!target || target.type !== 'scada-group' || !target.children) return;
    const promotedIds = target.children.map((c) => c.id);
    session.workingConfig = {
      ...session.workingConfig,
      symbols: ungroupRecursive(session.workingConfig.symbols, groupId),
    };
    setSessionSelection(promotedIds);
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
      // plan 2026-08-08-1809-2 Phase 2 / P1-1：全量 config 替换前中止 adapter 事务态。事务的 prevAtOpStart
      // 指向 pre-load working copy，load 后已无意义；若不中止，拖拽途中被 programmatic load 打断时，
      // pointerup 的 commitTransaction 会算 diff(OLD prevAtOpStart, NEW post-load) 巨型 diff 推入空栈，
      // 使 undo 还原到错误的 pre-load config。在 resetSession 之前调用（resetSession 清栈但不清事务态）。
      undoRedo.abortTransaction();
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

/**
 * 解析节点 id 到与现有集不碰撞的唯一值（plan 2026-08-08-1809-2 Phase 1 / F3）。
 *
 * - 不碰撞 → 原样返回（同一 node ref，零分配）。
 * - 碰撞 → 按 `${base}-${n}` 碰撞自增（解析尾随数字，无则从 1 起），与 groupSymbols 的
 *   `do { counter += 1 } while (existingIds.has(...))` 同形。
 */
function resolveUniqueNodeId(node: ScadaSymbolNode, existingIds: Set<string>): ScadaSymbolNode {
  if (!existingIds.has(node.id)) return node;
  const match = /^(.*)-(\d+)$/.exec(node.id);
  const base = match ? match[1] : node.id;
  let n = match ? parseInt(match[2], 10) : 1;
  let candidate: string;
  do {
    n += 1;
    candidate = `${base}-${n}`;
  } while (existingIds.has(candidate));
  return { ...node, id: candidate };
}

/**
 * 递归解链指定 id 的节点（plan 2026-08-08-1809-3 Phase 2 / P1-4）。
 *
 * 顶层或任意 group.children 命中均移除；group 节点经 `{...node, children: ...}` 重建
 * （保持 immutability 纪律，便于 diffScadaConfig 经 equality.ts 检出变更）。旧实现仅
 * `.filter` 顶层 symbols → 嵌套子图元静默 no-op。
 */
function removeNodeRecursive(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  for (const node of symbols) {
    if (node.id === id) continue;
    if (node.children) {
      out.push({ ...node, children: removeNodeRecursive(node.children, id) });
    } else {
      out.push(node);
    }
  }
  return out;
}

/**
 * 递归解链一组 id 的节点（plan 2026-08-08-1809-3 Phase 2 / P1-4 groupSymbols 消费）。
 *
 * 与 `removeNodeRecursive` 同语义，但对一组 id 批量解链（groupSymbols 一次选中多项）。
 * group 节点经 `{...node, children: ...}` 重建；被解链的 group 若 children 全空仍保留
 * （用户可能后续重填；空 group 不在 ungroupSymbols 的 scope）。
 */
function detachNodesRecursive(symbols: ScadaSymbolNode[], idsToRemove: Set<string>): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  for (const node of symbols) {
    if (idsToRemove.has(node.id)) continue;
    if (node.children) {
      out.push({ ...node, children: detachNodesRecursive(node.children, idsToRemove) });
    } else {
      out.push(node);
    }
  }
  return out;
}

/**
 * 递归拆解 group 并把子图元提升进父级 children 槽位（plan 2026-08-08-1809-3 Phase 2 / P1-4）。
 *
 * 命中 groupId 且为 scada-group 含 children 时：把 children 提升到当前层级（顶层 → 顶层；
 * group.children → 该 group 的 children）。非 group / 无 children 的同 id 节点（malformed）自然
 * 落入通用 push 路径保留原样（与旧 ungroupSymbols 的「非 group → no-op」语义一致，defensive）。
 * group 节点经 `{...node, children: ...}` 重建以保持上层 immutability 纪律。
 */
function ungroupRecursive(symbols: ScadaSymbolNode[], groupId: string): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  for (const node of symbols) {
    if (node.id === groupId && node.type === 'scada-group' && Array.isArray(node.children)) {
      for (const child of node.children) out.push({ ...child });
      continue;
    }
    if (node.children) {
      out.push({ ...node, children: ungroupRecursive(node.children, groupId) });
    } else {
      out.push(node);
    }
  }
  return out;
}
