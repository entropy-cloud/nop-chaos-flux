import { useCallback, useEffect, useRef, useState } from 'react';
import { ScadaEditorEngine } from '../editor-engine.js';
import { errorMessage } from '../../../renderer/scada-errors.js';
import {
  createScadaEditorSession,
  resetSession,
  type ScadaEditorMode,
  type ScadaEditorSession,
} from '../../editor-session.js';
import { attachEditorAdapter } from '../../editor-adapter.js';
import {
  mountScadaEditorTestHandle,
  removeScadaEditorTestHandle,
  type ScadaEditorTestHandle,
} from '../../editor-test-handle.js';
import { serializeScadaConfig } from '../../../serialization/serialize.js';
import { parseScadaConfig } from '../../../serialization/parse.js';
import { validateScadaConfig } from '../../../serialization/validate.js';
import { diffScadaConfig } from '../../../serialization/diff.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../../serialization/config-types.js';
import {
  listAllConnections,
  programmaticConnect,
  programmaticDisconnect,
} from '../../connection/connection-adapter.js';
import { ConnectionDragController } from '../../connection/connection-drag-controller.js';
import { ConnectionOverlayRenderer } from '../../connection/connection-overlay-renderer.js';
import { UndoRedoAdapter } from '../../undo-redo/undo-redo-adapter.js';
import { listScadaSymbols } from '../../../symbols/symbol-registry.js';
import {
  alignSelection,
  distributeSelection,
  type AlignDirection,
  type DistributeDirection,
} from '../../toolbox/align-distribute.js';
import { reorderZOrder, type ZOrderAction } from '../../toolbox/z-order.js';
import {
  buildClipboardCopy,
  buildClipboardCut,
  buildClipboardPaste,
  type EditorClipboard,
} from '../../toolbox/clipboard.js';
import type { Bounds } from '../../../engine/viewport.js';
import {
  cloneConfigSnapshot,
  applyPatchToWorkingNode,
  findNodeInWorking,
  recomputeLinkagesForMovedNode,
  collectAllSymbols,
  collectWorldBounds,
} from '../../editor-working-helpers.js';

export interface UseEditorEngineArgs {
  containerRef: React.RefObject<HTMLDivElement | null>;
  cid?: number;
  width?: number;
  height?: number;
  /** 初始 config（props.config 经 parse/validate 后的 ScadaConfig）。 */
  initialConfig: ScadaConfig;
  /** 初始模式（缺省 edit）。 */
  initialMode?: ScadaEditorMode;
  /** Editor 装配 + 初始 config 装载完成。 */
  onReady?: () => void;
  /** 装配/构建失败（config 校验失败等）。 */
  onError?: (code: string, message: string) => void;
  /** 选区变更（派发 onSelectionChange schema 事件）。 */
  onSelectionChange?: (nodeIds: string[]) => void;
  /** 模式变更（派发 onModeChange schema 事件）。 */
  onModeChange?: (mode: ScadaEditorMode) => void;
  /** session 变更（派发 onSessionChange schema 事件；canUndo/canRedo M1 恒 false）。 */
  onSessionChange?: (session: ScadaEditorSession) => void;
}

export interface EditorEngineRuntime {
  engine: ScadaEditorEngine;
  session: ScadaEditorSession;
  /** 切换模式（edit ↔ preview）。 */
  switchMode: (mode: ScadaEditorMode) => void;
  /** 设置选区（nodeId 列表）。 */
  setSelection: (nodeIds: string[]) => void;
  /** 清空选区。 */
  clearSelection: () => void;
  /** 序列化 working copy → 返回 serializedConfig（manual 提交语义）。 */
  save: () => string;
  /** 装入外部 config → 替换 working copy + 重置 session。 */
  load: (config: string | ScadaConfig) => void;
  /** 同步 working copy 变更到画布（经 diff → engine.applyDiff）。 */
  syncWorkingCopy: () => void;
  /** 更新 working copy 节点（inspector/palette 经此写回）。 */
  updateWorkingNode: (nodeId: string, patch: Partial<ScadaSymbolNode>) => void;
  /** 新增图元到 working copy（palette 拖入经此写回）。 */
  addWorkingSymbol: (node: ScadaSymbolNode) => void;
  /** 从 working copy 删除图元。 */
  removeWorkingSymbol: (nodeId: string) => void;
  /** undo-redo 适配层（事务边界 + 入栈协调；E7.2 落地）。 */
  undoRedo: UndoRedoAdapter;
  /** 撤销（design-renderer.md §8.5.2）。 */
  undo: () => void;
  /** 重做（design-renderer.md §8.5.2）。 */
  redo: () => void;
  /** 成组（design-renderer.md §8.5.2，Phase 3）。 */
  groupSymbols: (nodeIds: string[]) => void;
  /** 解组（design-renderer.md §8.5.2，Phase 3）。 */
  ungroupSymbols: (groupId: string) => void;
  // ---- E9.1 工具箱扩展（design-toolbox.md 五项工具） ----
  /** 视图工具：fit 适应画布（复用 engine.fit，runtime 复用点 #1）。空场景返回 false。 */
  fitView: () => boolean;
  /** 视图工具：center 居中（复用 engine.center）。空场景返回 false。 */
  centerView: () => boolean;
  /** 视图工具：reset 恢复初始视口（复用 engine.setViewport）。 */
  resetView: () => void;
  /** 视图工具：缩放（复用 engine.zoomAt，minScale/maxScale 钳制由 viewport 层处理）。 */
  zoomView: (factor: number) => void;
  /** 对齐（design-toolbox.md §4.2.1，基于 selection 包围盒重排；入 undo 栈 operationKind=transform-move）。 */
  alignSelection: (direction: AlignDirection) => boolean;
  /** 分布（design-toolbox.md §4.2.1）。 */
  distributeSelection: (direction: DistributeDirection) => boolean;
  /** 层级（design-toolbox.md §4.2.2，经 symbols 数组重排，不调 leafer Editor toTop 防 T3）。 */
  reorderZOrder: (action: ZOrderAction) => boolean;
  /** 复制（深拷贝 selection → 编辑器内 clipboard，不修改 working copy）。 */
  copySelection: () => number;
  /** 剪切（深拷贝 + 移除 selection；入 undo 栈 operationKind=remove-symbol）。 */
  cutSelection: () => number;
  /** 粘贴（分配新 id 防 T4 + 位移偏移；入 undo 栈 operationKind=add-symbol；新 selection = 新 id）。 */
  paste: () => string[];
  /** 读取编辑器内 clipboard 状态（测试句柄/UI 用）。 */
  getClipboard: () => { symbols: ScadaSymbolNode[]; operation: 'copy' | 'cut' } | null;
  /** 导出（复用 runtime serialize 面，返回序列化 config 字符串）。 */
  exportConfig: () => string;
  /** 导入（弹确认对话框由 UI 层处理；本方法经 validateScadaConfig 校验后替换 working copy + 重置 undo 栈 T5）。 */
  importConfig: (config: string | ScadaConfig) => boolean;
  /** 图元库只读浏览（复用 listScadaSymbols，design-toolbox.md §4.5）。 */
  listSymbolLibrary: () => Array<{ type: string; name: string; category?: string }>;
}

/**
 * Editor 实例生命周期（design-renderer.md §8.3 + design-architecture.md §4.3）：
 *
 * mount：ScadaEditorEngine.create（new App({ editor: {} })）+ 初始 config 装载（editable:true 注入）+
 *   适配层 attach + 测试句柄挂载 + ResizeObserver。
 * unmount：destroy 幂等 + 适配层 detach + 测试句柄移除（R5 不泄漏验证 #4：unmount 无残留）。
 * resize：ResizeObserver → engine.setSize 防抖到帧（design-renderer.md §8.3）。
 *
 * **INV-4**：engine + session + adapter 为域内部 state（ref 持有），不进 flux scope。
 * env 引用变化不重建（latest ref 模式，与 runtime use-scada-engine 同纪律）。
 */
export function useEditorEngine(args: UseEditorEngineArgs) {
  const { containerRef } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  const [runtime, setRuntime] = useState<EditorEngineRuntime | null>(null);
  const runtimeRef = useRef<EditorEngineRuntime | null>(null);
  const observerRef = useRef<ResizeObserver | undefined>(undefined);
  const rafIdRef = useRef(0);
  const detachAdapterRef = useRef<(() => void) | undefined>(undefined);
  /** 连线拖拽激活标记（端点拖动模式时抑制 transform 写回，design-connection.md §4.2 关键约束 1 互斥）。 */
  const connectionDragActiveRef = useRef(false);

  const cancelPendingResize = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const releaseRuntime = useCallback(() => {
    cancelPendingResize();
    observerRef.current?.disconnect();
    observerRef.current = undefined;
    detachAdapterRef.current?.();
    detachAdapterRef.current = undefined;
    const current = runtimeRef.current;
    if (!current) return;
    if (latest.current.cid !== undefined) {
      removeScadaEditorTestHandle(latest.current.cid);
    }
    current.engine.destroy();
    runtimeRef.current = null;
    setRuntime(null);
  }, [cancelPendingResize]);

  useEffect(() => {
    if (runtimeRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    let engine: ScadaEditorEngine;
    try {
      engine = ScadaEditorEngine.create({
        container,
        cid: latest.current.cid,
        width: latest.current.width,
        height: latest.current.height,
      });
    } catch (error) {
      latest.current.onError?.('editor-mount-failed', errorMessage(error));
      return;
    }

    const session = createScadaEditorSession(latest.current.initialConfig, {
      mode: latest.current.initialMode ?? 'edit',
    });

    try {
      engine.build(session.workingConfig);
    } catch (error) {
      latest.current.onError?.('editor-mount-failed', errorMessage(error));
      engine.destroy();
      return;
    }

    // 适配层 attach：Editor 事件族 → 抽纯 payload + nodeId → 更新 working copy + session.selection（R5 隔离）。
    const notifySession = () => latest.current.onSessionChange?.(session);
    /**
     * selection 单一写入入口（plan 2026-08-07-1835-1 Phase 1 / multi P1-07）：
     * 同时更新 canonical `session.selection` 与 React mirror（经 onSelectionChange 回调）。
     * 消除 6 条 mutation 路径中 5 条静默直写 session.selection 导致 React mirror 过期的隐患。
     */
    const setSessionSelection = (next: string[]) => {
      session.selection = [...next];
      latest.current.onSelectionChange?.(next);
    };
    const handleSelectionChange = (nodeIds: string[]) => {
      setSessionSelection(nodeIds);
      notifySession();
    };
    const handleGeometryChange = (nodeId: string, patch: Partial<ScadaSymbolNode>) => {
      // 连线端点拖动模式启用时 Editor transform 不写回（design-connection.md §4.2 关键约束 1 互斥）。
      if (connectionDragActiveRef.current) return;
      // transform 事务语义（design-undo-redo.md §4.2）：适配层 editor.move/scale/rotate/skew 每帧只更新 working copy（不入栈），
      // 防逐帧入栈爆炸（U2）。undo 入栈由事务终止（pointerup → onTransformEnd → commitTransaction）触发，一拖拽 = 一 diff。
      applyPatchToWorkingNode(session, nodeId, patch);
      // 图元移动联动（design-connection.md §4.4 + §4.5）：目标设备移动后重算所有指向它的 connection.x/y。
      recomputeLinkagesForMovedNode(session, nodeId);
      syncWorkingCopy();
      notifySession();
    };
    // transform 事务边界（design-undo-redo.md §4.2）：首帧快照 working copy，pointerup 一次性 diff 入栈。
    const handleTransformStart = () => {
      undoRedo.beginTransaction('transform-move', session.workingConfig);
    };
    const handleTransformEnd = () => {
      undoRedo.commitTransaction(session.workingConfig);
      notifySession();
    };
    detachAdapterRef.current = attachEditorAdapter(engine, {
      onSelectionChange: handleSelectionChange,
      onGeometryChange: handleGeometryChange,
      onTransformStart: handleTransformStart,
      onTransformEnd: handleTransformEnd,
    });

    // undo-redo 适配层（E7.2，design-undo-redo.md §4.2 事务语义 + §4.1.2 命令栈）。
    const undoRedo = new UndoRedoAdapter(session.undoStack);

    // 引擎已同步的 config 快照（防引用共享：engine.build 存引用，working copy 变更后 diff 需对快照而非 live config）。
    let engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);

    const syncWorkingCopy = () => {
      const diff = diffScadaConfig(engineSyncedConfig, session.workingConfig);
      const hasChanges =
        diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0 || diff.variables !== undefined;
      if (hasChanges) {
        engine.applyDiff(diff, session.workingConfig);
        engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
      }
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

    /**
     * 写入 pipe-junction custom.connections（m-2 修正：operationKind='connection-update'，
     * design-undo-redo.md §4.2 事务边界表）。pointer 驱动 + 测试句柄程序化 connect 共用此路径。
     */
    const writeConnection = (
      junctionId: string,
      connections: import('../../connection/connection-adapter.js').ConnectionWriteResult['connections'],
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

    /** 应用一条 undo/redo diff 到 working copy + engine（不重新入栈）。 */
    const applyUndoRedoDiff = (diff: import('../../../serialization/config-types.js').ScadaConfigDiff) => {
      session.workingConfig = undoRedo.applyDiff(session.workingConfig, diff);
      engine.applyDiff(diff, session.workingConfig);
      engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
      notifySession();
    };

    const undo = () => {
      const diff = undoRedo.undo();
      if (diff) applyUndoRedoDiff(diff);
    };

    const redo = () => {
      const diff = undoRedo.redo();
      if (diff) applyUndoRedoDiff(diff);
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
        groupCounter += 1;
        groupId = `scada-group-${groupCounter}`;
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

    // ---- E9.1 工具箱（design-toolbox.md 五项工具） ----
    // 编辑器内 clipboard（域内部闭包持有，不进 scope，不接 OS clipboard T2）。
    let editorClipboard: EditorClipboard | null = null;
    // 粘贴 id 计数器（编辑会话维护，保证 paste id 唯一，防 T4）。
    let pasteCounter = 0;
    // group id 单调计数器（plan 2026-08-07-1835-1 Phase 2 / open P1-D）：替代 `Date.now()` mint，
    // 保证同毫秒连续两次 group 也得唯一 id（对齐 clipboard pasteCounter / generateConnectionId 纪律）。
    let groupCounter = 0;

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
      result: { ok: boolean; error?: string; diff?: import('../../../serialization/config-types.js').ScadaConfigDiff },
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
      const forward: import('../../../serialization/config-types.js').ScadaConfigDiff = {
        added: [],
        removed: [],
        updated: [],
        reordered: newOrderIds,
      };
      session.workingConfig = { ...session.workingConfig, symbols: res.newOrder.map((n) => ({ ...n })) };
      undoRedo.pushForward('z-order', forward, prevSnapshot, false, `zorder:${action}`);
      // z 序是纯重排（节点内容不变）；reordered 经 engine.applyReorder 重排 leafer root.children。
      engine.applyDiff(forward, session.workingConfig);
      engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
      notifySession();
      return true;
    };

    const copySelectionFn = (): number => {
      const nodes = selectionNodes();
      if (nodes.length === 0) return 0;
      editorClipboard = buildClipboardCopy(nodes);
      return nodes.length;
    };

    const cutSelectionFn = (): number => {
      const nodes = selectionNodes();
      if (nodes.length === 0) return 0;
      const { clipboard, forward } = buildClipboardCut(nodes);
      editorClipboard = clipboard;
      const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
      // 经 remove 路径移除 selection（与 removeWorkingSymbol 同语义，单次入栈）。
      const removedSet = new Set(forward.removed);
      session.workingConfig = {
        ...session.workingConfig,
        symbols: session.workingConfig.symbols.filter((s) => !removedSet.has(s.id)),
      };
      setSessionSelection(session.selection.filter((id) => !removedSet.has(id)));
      undoRedo.pushForward('remove-symbol', forward, prevSnapshot);
      syncWorkingCopy();
      notifySession();
      return nodes.length;
    };

    const pasteFn = (): string[] => {
      if (!editorClipboard) return [];
      const { forward, newIds, counterConsumed } = buildClipboardPaste(editorClipboard, pasteCounter);
      pasteCounter += counterConsumed;
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
      if (!editorClipboard) return null;
      return { symbols: editorClipboard.symbols, operation: editorClipboard.operation };
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
        resetSession(session, parsed);
        // resetSession 清空了 selection（canonical），同步 React mirror（multi P1-07 load 路径）。
        latest.current.onSelectionChange?.([]);
        engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
        engine.build(session.workingConfig);
        notifySession();
        return true;
      } catch (error) {
        latest.current.onError?.('invalid-config', errorMessage(error));
        return false;
      }
    };

    const listSymbolLibraryFn = () =>
      listScadaSymbols().map((d) => ({ type: d.type, name: d.name, category: d.category }));

    const switchMode = (mode: ScadaEditorMode) => {
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
      session.committedBaseline = {
        ...session.workingConfig,
        symbols: session.workingConfig.symbols.map((n) => ({ ...n })),
      };
      return serializeScadaConfig(session.workingConfig);
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
        engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
        engine.build(session.workingConfig);
        notifySession();
      } catch (error) {
        latest.current.onError?.('invalid-config', errorMessage(error));
      }
    };

    // 连线拖拽控制器 + overlay 渲染器（E8 M-1 修正：接通连线三段式 pointer 交互状态机到生产路径，
    // design-connection.md §4.2）。控制器驱动纯逻辑状态机（begin/update/commit）+ overlay 投影，
    // DOM pointer 事件经此入口。提交经 onCommit 写 working copy + undo 栈（operationKind='connection-update'，m-2 修正）。
    const overlayRenderer = new ConnectionOverlayRenderer(engine);
    const connectionController = new ConnectionDragController(
      {
        getSymbols: () => session.workingConfig.symbols,
        findNode: (id) => findNodeInWorking(session.workingConfig.symbols, id),
        viewportToWorld: (p) => engine.getWorldPoint(p),
      },
      {
        onOverlayUpdate: (state) => overlayRenderer.update(state),
        onCommit: (result) => {
          writeConnection(result.junctionId, result.connections);
        },
      },
    );
    const toViewportPoint = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onConnectionPointerDown = (e: PointerEvent) => {
      if (session.mode !== 'edit') return;
      const junction = connectionController.hitTestJunction(toViewportPoint(e));
      if (!junction) return;
      connectionDragActiveRef.current = true;
      connectionController.beginDrag(junction.id);
      e.preventDefault();
    };
    const onConnectionPointerMove = (e: PointerEvent) => {
      if (!connectionDragActiveRef.current) return;
      connectionController.moveDrag(toViewportPoint(e));
    };
    const onConnectionPointerUp = () => {
      if (!connectionDragActiveRef.current) return;
      connectionDragActiveRef.current = false;
      connectionController.endDrag();
    };
    container.addEventListener('pointerdown', onConnectionPointerDown);
    container.addEventListener('pointermove', onConnectionPointerMove);
    container.addEventListener('pointerup', onConnectionPointerUp);

    const next: EditorEngineRuntime = {
      engine,
      session,
      switchMode,
      setSelection,
      clearSelection,
      save,
      load,
      syncWorkingCopy,
      updateWorkingNode,
      addWorkingSymbol,
      removeWorkingSymbol,
      undoRedo,
      undo,
      redo,
      groupSymbols,
      ungroupSymbols,
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
    runtimeRef.current = next;
    setRuntime(next);

    // 测试句柄挂载（design-renderer.md §8.4：session 投影 + editor/engine/app + 操作方法）。
    if (latest.current.cid !== undefined) {
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
      const handle: ScadaEditorTestHandle = {
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
        switchMode,
        setSelection,
        clearSelection,
        save,
        load,
        addSymbol: addWorkingSymbol,
        removeSymbol: removeWorkingSymbol,
        updateSymbol: updateWorkingNode,
        group: groupSymbols,
        ungroup: ungroupSymbols,
        undo,
        redo,
        connection: connectionHandle,
        undoRedo: {
          undo,
          redo,
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
              (operationKind as import('../../undo-redo/undo-stack.js').EditorOperationKind) ?? 'update-symbol',
              forward,
              prevSnapshot,
            );
            notifySession();
          },
        },
        toolbox: {
          fit: fitView,
          center: centerView,
          zoomAt: zoomView,
          resetView,
          getViewport: () => engine.getViewport(),
          align: alignSelectionFn,
          distribute: distributeSelectionFn,
          toTop: () => reorderZOrderFn('toTop'),
          toBottom: () => reorderZOrderFn('toBottom'),
          moveUp: () => reorderZOrderFn('moveUp'),
          moveDown: () => reorderZOrderFn('moveDown'),
          copy: copySelectionFn,
          cut: cutSelectionFn,
          paste: pasteFn,
          getClipboard: getClipboardFn,
          exportConfig: exportConfigFn,
          importConfig: importConfigFn,
          listSymbolLibrary: listSymbolLibraryFn,
        },
      };
      mountScadaEditorTestHandle(latest.current.cid, handle);
    }

    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        cancelPendingResize();
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = 0;
          runtimeRef.current?.engine.setSize(width, height);
        });
      });
      observerRef.current.observe(container);
    }

    latest.current.onReady?.();

    return () => {
      container.removeEventListener('pointerdown', onConnectionPointerDown);
      container.removeEventListener('pointermove', onConnectionPointerMove);
      container.removeEventListener('pointerup', onConnectionPointerUp);
      connectionController.cancel();
      overlayRenderer.clear();
      releaseRuntime();
    };
  }, [containerRef, cancelPendingResize, releaseRuntime]);

  // width/height props 变更 → engine.setSize（design-renderer.md §8.3）。
  useEffect(() => {
    const current = runtimeRef.current;
    if (!current) return;
    const targetWidth = args.width ?? containerRef.current?.clientWidth ?? 0;
    const targetHeight = args.height ?? containerRef.current?.clientHeight ?? 0;
    if (targetWidth > 0 && targetHeight > 0) {
      current.engine.setSize(targetWidth, targetHeight);
    }
  }, [runtime, containerRef, args.width, args.height]);

  return runtime;
}

