import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScadaConfig, ScadaSymbolNode } from '../../../serialization/config-types.js';
import type { ScadaEditorMode, ScadaEditorSession } from '../../editor-session.js';
import type { UndoRedoAdapter } from '../../undo-redo/undo-redo-adapter.js';
import type { AlignDirection, DistributeDirection } from '../../toolbox/align-distribute.js';
import type { ZOrderAction } from '../../toolbox/z-order.js';
import type { ScadaEditorEngine } from '../editor-engine.js';
import {
  mountScadaEditorTestHandle,
  removeScadaEditorTestHandle,
} from '../../editor-test-handle.js';
import {
  mountEditorEngine,
  createRuntimeCore,
  type UseEditorEngineArgs,
} from '../../runtime-factories.js';
import { buildRuntimeMutators } from '../../runtime-mutators.js';
import { buildToolboxRuntime } from '../../toolbox-runtime.js';
import { wireConnectionDrag } from '../../connection-wiring.js';
import { buildEditorTestHandle } from '../../test-handle-factory.js';

export type { UseEditorEngineArgs } from '../../runtime-factories.js';
export type { ScadaEditorMode, ScadaEditorSession };
export type { AlignDirection, DistributeDirection, ZOrderAction };

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
 *
 * plan 2026-08-07-1835-2 Phase 1 / multi P1-03：纯生命周期编排，责任带拆到 runtime-factories /
 * runtime-mutators / toolbox-runtime / connection-wiring / test-handle-factory（机械迁移，行为不变）。
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

    const mounted = mountEditorEngine(container, latest);
    if (!mounted) return;
    const { engine, session } = mounted;

    const { ctx, detachAdapter } = createRuntimeCore(engine, session, latest, connectionDragActiveRef);
    detachAdapterRef.current = detachAdapter;

    const mutators = buildRuntimeMutators(ctx);
    const toolbox = buildToolboxRuntime(ctx);
    // plan 2026-08-07-1835-2 Phase 2 / multi P1-05：回填 ctx.save，使 notifySession 在 commitPolicy='auto'
    // 时可触发 save + onSave（编辑即持久化）。回填而非构造期注入，避免与 mutators 的构造环依赖。
    ctx.save = mutators.save;
    const cleanupConnection = wireConnectionDrag(ctx, container, mutators.writeConnection);

    const next: EditorEngineRuntime = {
      engine,
      session,
      switchMode: mutators.switchMode,
      setSelection: mutators.setSelection,
      clearSelection: mutators.clearSelection,
      save: mutators.save,
      load: mutators.load,
      syncWorkingCopy: ctx.syncWorkingCopy,
      updateWorkingNode: mutators.updateWorkingNode,
      addWorkingSymbol: mutators.addWorkingSymbol,
      removeWorkingSymbol: mutators.removeWorkingSymbol,
      undoRedo: ctx.undoRedo,
      undo: mutators.undo,
      redo: mutators.redo,
      groupSymbols: mutators.groupSymbols,
      ungroupSymbols: mutators.ungroupSymbols,
      fitView: toolbox.fitView,
      centerView: toolbox.centerView,
      resetView: toolbox.resetView,
      zoomView: toolbox.zoomView,
      alignSelection: toolbox.alignSelection,
      distributeSelection: toolbox.distributeSelection,
      reorderZOrder: toolbox.reorderZOrder,
      copySelection: toolbox.copySelection,
      cutSelection: toolbox.cutSelection,
      paste: toolbox.paste,
      getClipboard: toolbox.getClipboard,
      exportConfig: toolbox.exportConfig,
      importConfig: toolbox.importConfig,
      listSymbolLibrary: toolbox.listSymbolLibrary,
    };
    runtimeRef.current = next;
    setRuntime(next);

    // 测试句柄挂载（design-renderer.md §8.4：session 投影 + editor/engine/app + 操作方法）。
    if (latest.current.cid !== undefined) {
      const handle = buildEditorTestHandle(ctx, mutators, toolbox);
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
      cleanupConnection();
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

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-09：controlled-mode config 推回（方案 A 裁定）。
  // host 改 config prop → parsedConfig 变 → runtime.load(next) 反映进画布（此前 mount-once guard 静默丢弃）。
  // 初次 mount 由 mount effect 直接用 initialConfig 装配，此处仅在「mount 后 config prop 变化」时触发，
  // 故用 ref 记录已装入的 config identity，跳过首次（runtimeRef 未就绪也跳过），避免 load ↔ config 循环。
  const loadedConfigRef = useRef(args.initialConfig);
  useEffect(() => {
    const current = runtimeRef.current;
    if (!current) return;
    if (args.initialConfig === loadedConfigRef.current) return;
    loadedConfigRef.current = args.initialConfig;
    current.load(args.initialConfig);
  }, [args.initialConfig]);

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-09：controlled-mode mode 推回（方案 A 裁定）。
  // host 改 mode prop → runtime.switchMode(next)。同 config 推回纪律：跳过首次，避免 mode ↔ switchMode 循环。
  const loadedModeRef = useRef(args.initialMode);
  useEffect(() => {
    const current = runtimeRef.current;
    if (!current || !args.initialMode || args.initialMode === loadedModeRef.current) return;
    loadedModeRef.current = args.initialMode;
    current.switchMode(args.initialMode);
  }, [args.initialMode]);

  return runtime;
}
