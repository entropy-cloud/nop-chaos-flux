import type { ScadaConfig, ScadaSymbolNode, ScadaConfigDiff } from '../serialization/config-types.js';
import type { Bounds } from '../engine/viewport.js';
import {
  cloneConfigSnapshot,
  applyPatchToWorkingNode,
  collectAllSymbols,
  collectWorldBounds,
  pruneDanglingConnections,
} from './editor-working-helpers.js';
import { resetSession } from './editor-session.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { errorMessage } from '../renderer/scada-errors.js';
import { listScadaSymbols } from '../symbols/symbol-registry.js';
import {
  alignSelection,
  distributeSelection,
  type AlignDirection,
  type DistributeDirection,
} from './toolbox/align-distribute.js';
import { reorderZOrder, type ZOrderAction } from './toolbox/z-order.js';
import {
  buildClipboardCopy,
  buildClipboardCut,
  buildClipboardPaste,
  PASTE_OFFSET,
  type EditorClipboard,
} from './toolbox/clipboard.js';
import type { EditorRuntimeContext } from './runtime-factories.js';

/**
 * E9.1 工具箱 runtime（plan 2026-08-07-1835-2 Phase 1 / multi P1-03）：
 * 从 `use-editor-engine.ts` 抽出的五项工具（视图/对齐分布/层级/复制粘贴/导入导出/图元库浏览）。
 * 机械迁移，行为不变；闭包稳定 ctx。
 */
export interface EditorToolboxRuntime {
  fitView: () => boolean;
  centerView: () => boolean;
  resetView: () => void;
  zoomView: (factor: number) => void;
  alignSelection: (direction: AlignDirection) => boolean;
  distributeSelection: (direction: DistributeDirection) => boolean;
  reorderZOrder: (action: ZOrderAction) => boolean;
  copySelection: () => number;
  cutSelection: () => number;
  paste: () => string[];
  getClipboard: () => { symbols: ScadaSymbolNode[]; operation: 'copy' | 'cut' } | null;
  exportConfig: () => string;
  importConfig: (config: string | ScadaConfig) => boolean;
  listSymbolLibrary: () => Array<{ type: string; name: string; category?: string }>;
}

export function buildToolboxRuntime(ctx: EditorRuntimeContext): EditorToolboxRuntime {
  const { engine, session, undoRedo, latest, synced, clipboard, paste, notifySession, setSessionSelection, syncWorkingCopy } = ctx;

  /**
   * 计算全部节点（含 group 嵌套）的世界包围盒（视图工具 fit/center 用）。
   *
   * plan 2026-08-07-1835-1 Phase 2 / open P1-C3：递归 collectWorldBounds 累加 parent offset，
   * group 节点（无 width/height 但有 children）的世界范围由 children 决定 → 全选 group 后 fit/center
   * 不再退化（{0,0,0,0}）。
   */
  const computeBounds = (): Bounds | undefined => {
    const worldBounds = collectWorldBounds(session.workingConfig.symbols, 0, 0);
    let out: Bounds | undefined;
    for (const b of worldBounds) {
      // 跳过零尺寸节点（无 width/height 的 group 容器自身；其 children 已贡献 bounds）。
      if (b.width <= 0 || b.height <= 0) continue;
      if (out === undefined) {
        out = { x: b.x, y: b.y, width: b.width, height: b.height };
      } else {
        const minX = Math.min(out.x, b.x);
        const minY = Math.min(out.y, b.y);
        const maxX = Math.max(out.x + out.width, b.x + b.width);
        const maxY = Math.max(out.y + out.height, b.y + b.height);
        out = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
    }
    return out;
  };

  const fitView = (): boolean => {
    const bounds = computeBounds();
    if (!bounds) return false;
    engine.fit(bounds, 0);
    return true;
  };

  const centerView = (): boolean => {
    const bounds = computeBounds();
    if (!bounds) return false;
    engine.center(bounds);
    return true;
  };

  const resetView = (): void => {
    engine.setViewport({ x: 0, y: 0, scale: 1 });
  };

  const zoomView = (factor: number): void => {
    const vp = engine.getViewport();
    engine.zoomAt({ x: vp.x + (engine.getSize().width ?? 0) / 2, y: vp.y + (engine.getSize().height ?? 0) / 2 }, factor);
  };

  /**
   * 读取 selection 对应的 working copy 节点（递归含 group 子树）。
   *
   * plan 2026-08-07-1835-1 Phase 2 / open P1-C2：改用 collectAllSymbols 解析 selection → group-child
   * 多选不再被「顶层 symbols.filter」过滤丢弃，align/distribute/copy/cut 操作正确接收嵌套节点。
   */
  const selectionNodes = (): ScadaSymbolNode[] => {
    const set = new Set(session.selection);
    return collectAllSymbols(session.workingConfig.symbols).filter((s) => set.has(s.id));
  };

  const applyAlignOrDistribute = (
    result: { ok: boolean; error?: string; diff?: ScadaConfigDiff },
    coalesceGroup: string,
  ): boolean => {
    if (!result.ok || !result.diff) return false;
    const forward = result.diff;
    if (forward.updated.length === 0) return false;
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    for (const u of forward.updated) {
      applyPatchToWorkingNode(session, u.id, u.patch);
    }
    undoRedo.pushForward('transform-move', forward, prevSnapshot, false, coalesceGroup);
    syncWorkingCopy();
    notifySession();
    return true;
  };

  const alignSelectionFn = (direction: AlignDirection): boolean => {
    const nodes = selectionNodes();
    const res = alignSelection(nodes, direction);
    return applyAlignOrDistribute(res, `align:${direction}`);
  };

  const distributeSelectionFn = (direction: DistributeDirection): boolean => {
    const nodes = selectionNodes();
    const res = distributeSelection(nodes, direction);
    return applyAlignOrDistribute(res, `distribute:${direction}`);
  };

  const reorderZOrderFn = (action: ZOrderAction): boolean => {
    const res = reorderZOrder(session.workingConfig.symbols, session.selection, action);
    if (!res.ok || !res.newOrder || !res.movedIds || res.movedIds.length === 0) return false;
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    // plan 2026-08-07-1835-1 Phase 3 / open P1-E：z-order 增量 diff（替代先前 full-replace added/removed）。
    // forward.reordered = 新顺序 id 列表；inverse.reordered = 旧顺序 id 列表（computeInverse 从 prevSnapshot
    // 自动派生）。栈条目 O(n) strings 而非 O(n) 全量节点对象，R4「无全量快照」严格满足。
    const newOrderIds = res.newOrder.map((n) => n.id);
    const forward: ScadaConfigDiff = {
      added: [],
      removed: [],
      updated: [],
      reordered: newOrderIds,
    };
    session.workingConfig = { ...session.workingConfig, symbols: res.newOrder.map((n) => ({ ...n })) };
    undoRedo.pushForward('z-order', forward, prevSnapshot, false, `zorder:${action}`);
    // z 序是纯重排（节点内容不变）；reordered 经 engine.applyReorder 重排 leafer root.children。
    engine.applyDiff(forward, session.workingConfig);
    synced.config = cloneConfigSnapshot(session.workingConfig);
    notifySession();
    return true;
  };

  const copySelectionFn = (): number => {
    const nodes = selectionNodes();
    if (nodes.length === 0) return 0;
    clipboard.current = buildClipboardCopy(nodes);
    return nodes.length;
  };

  const cutSelectionFn = (): number => {
    const nodes = selectionNodes();
    if (nodes.length === 0) return 0;
    const { clipboard: cb, forward: cutForward } = buildClipboardCut(nodes);
    clipboard.current = cb;
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    const removedSet = new Set(cutForward.removed);
    // 经 remove 路径移除 selection（与 removeWorkingSymbol 同语义，单次入栈）。
    let nextSymbols = session.workingConfig.symbols.filter((s) => !removedSet.has(s.id));
    // plan 2026-08-08-1910-2 Phase 4 / A8：同 removeWorkingSymbol——prune 其它 junction 上
    // target∈removedSet 的 connection 声明，防保存后永久 dangling 数据污染。
    nextSymbols = pruneDanglingConnections(nextSymbols, removedSet);
    session.workingConfig = {
      ...session.workingConfig,
      symbols: nextSymbols,
    };
    setSessionSelection(session.selection.filter((id) => !removedSet.has(id)));
    // pushOperation（snapshot-based）：forward = diffScadaConfig(prev, current) 自动含 removed +
    // updated（pruned junction custom）；inverse 从 prevSnapshot 恢复 pruned connection + 被剪节点，
    // 使 undo 完整恢复（与 removeWorkingSymbol 同型，原 pushForward 手工 forward 仅记 removed 无法恢复 prune）。
    undoRedo.pushOperation('remove-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
    return nodes.length;
  };

  const pasteFn = (): string[] => {
    if (!clipboard.current) return [];
    // plan 2026-08-08-1931-1 Phase 2 / 本轮-11：传 working copy 现有 id 集 → paste id 碰撞自增。
    const existingIds = new Set(collectAllSymbols(session.workingConfig.symbols).map((s) => s.id));
    const { forward, newIds, counterConsumed } = buildClipboardPaste(
      clipboard.current,
      paste.counter,
      PASTE_OFFSET,
      existingIds,
    );
    paste.counter += counterConsumed;
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    session.workingConfig = {
      ...session.workingConfig,
      symbols: [...session.workingConfig.symbols, ...forward.added.map((n) => ({ ...n }))],
    };
    setSessionSelection([...newIds]);
    undoRedo.pushForward('add-symbol', forward, prevSnapshot);
    syncWorkingCopy();
    // 同步 Editor 选区到新粘贴图元（经 engine 选区视觉一致）。
    const nodes = newIds
      .map((id) => engine.getSymbol(id)?.node)
      .filter((n): n is NonNullable<typeof n> => n !== undefined);
    engine.setEditorTargets(nodes);
    notifySession();
    return newIds;
  };

  const getClipboardFn = (): { symbols: ScadaSymbolNode[]; operation: 'copy' | 'cut' } | null => {
    if (!clipboard.current) return null;
    return { symbols: clipboard.current.symbols, operation: clipboard.current.operation };
  };

  const exportConfigFn = (): string => serializeScadaConfig(session.workingConfig);

  const importConfigFn = (config: string | ScadaConfig): boolean => {
    // 导入确认对话框由 UI 层（toolbox-panel）处理（T5）；本方法经 validate 校验后替换 working copy + 重置 undo 栈。
    try {
      const parsed = parseScadaConfig(config);
      const result = validateScadaConfig(parsed);
      if (!result.ok) {
        latest.current.onError?.('invalid-config', result.errors.join('; '));
        return false;
      }
      // plan 2026-08-08-1809-2 Phase 2 / P1-1：与 load() 同边界——全量 config 替换前中止 adapter 事务态
      // （与 HCA11 importConfig/load parity 同精神）。事务 prevAtOpStart 在 import 后无意义，不中止会被
      // 随后 commitTransaction 推入巨型 diff。在 resetSession 之前调用。
      undoRedo.abortTransaction();
      resetSession(session, parsed);
      // resetSession 清空了 selection（canonical），同步 React mirror（multi P1-07 load 路径）。
      latest.current.onSelectionChange?.([]);
      synced.config = cloneConfigSnapshot(session.workingConfig);
      engine.build(session.workingConfig);
      // plan HCA11 P1-1（P1-08 parity）：build 后校正 engine.mode → session.mode。resetSession 强制
      // session.mode='edit'，engine.build 用 engine.mode 决定 editable 注入；若此前在 preview 态调用
      // importConfig，engine.mode 仍 'preview'（desync）。与 load()（runtime-mutators.ts）同型同步。
      if (engine.currentMode !== session.mode) {
        engine.setMode(session.mode);
      }
      notifySession();
      return true;
    } catch (error) {
      latest.current.onError?.('invalid-config', errorMessage(error));
      return false;
    }
  };

  const listSymbolLibraryFn = () =>
    listScadaSymbols().map((d) => ({ type: d.type, name: d.name, category: d.category }));

  return {
    fitView,
    centerView,
    resetView,
    zoomView,
    alignSelection: alignSelectionFn,
    distributeSelection: distributeSelectionFn,
    reorderZOrder: reorderZOrderFn,
    copySelection: copySelectionFn,
    cutSelection: cutSelectionFn,
    paste: pasteFn,
    getClipboard: getClipboardFn,
    exportConfig: exportConfigFn,
    importConfig: importConfigFn,
    listSymbolLibrary: listSymbolLibraryFn,
  };
}

export type { EditorClipboard };
