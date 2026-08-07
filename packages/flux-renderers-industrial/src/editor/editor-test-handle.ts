import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import type { ScadaEditorMode } from './editor-session.js';
import type { ScadaPipeConnection } from '../symbols/pipe/pipe-junction.js';
import type { AlignDirection, DistributeDirection } from './toolbox/align-distribute.js';

/**
 * `window.__flux_scada_editor_<cid>` 测试句柄契约（design-renderer.md §8.4）。
 *
 * 与 runtime `window.__flux_scada_<cid>`（`engine/test-handle.ts`）**双态独立 cid 命名空间**——
 * 编辑态测试句柄经 `__flux_scada_editor_<cid>` 挂载，运行态经 `__flux_scada_<cid>`，互不覆盖。
 *
 * **session 投影**：workingConfig/committedBaseline/canUndo/canRedo/selection/mode +
 * editor/engine/app 实例 + switchMode/setSelection/clearSelection/save/load/addSymbol/removeSymbol/updateSymbol。
 * **M2 子句柄**：connection（design-connection.md §8.3）/ undoRedo（design-undo-redo.md §8.3）。
 */
export interface ScadaEditorTestHandle {
  /** 编辑会话只读投影（canUndo/canRedo 经 undo-redo 栈派生，E7.2 落地）。 */
  session: {
    workingConfig: ScadaConfig;
    committedBaseline: ScadaConfig;
    canUndo: boolean;
    canRedo: boolean;
    selection: string[];
    mode: ScadaEditorMode;
  };
  /** leafer Editor 实例（unknown 避免循环导入）。 */
  editor: unknown;
  /** ScadaEditorEngine 实例。 */
  engine: unknown;
  /** leafer App 实例。 */
  app: unknown;
  /** 切换模式（edit ↔ preview）。 */
  switchMode(mode: ScadaEditorMode): void;
  /** 设置选区（nodeId 列表）。 */
  setSelection(nodeIds: string[]): void;
  /** 清空选区（spike 约束 #4：经 editor.cancel()）。 */
  clearSelection(): void;
  /** 序列化 working copy → 返回 serializedConfig（manual 提交语义）。 */
  save(): string;
  /** 装入外部 config → 替换 working copy + 重置 session。 */
  load(config: string | ScadaConfig): void;
  /** 新增图元到 working copy（测试投影 addSymbol 句柄）。 */
  addSymbol(node: import('../serialization/config-types.js').ScadaSymbolNode): void;
  /** 从 working copy 删除图元（测试投影 removeSymbol 句柄）。 */
  removeSymbol(nodeId: string): void;
  /** 更新 working copy 节点属性（测试投影 updateSymbol 句柄）。 */
  updateSymbol(nodeId: string, patch: Partial<import('../serialization/config-types.js').ScadaSymbolNode>): void;
  /** group 句柄（E7.2，design-renderer.md §8.5.2）。 */
  group(nodeIds: string[]): void;
  /** ungroup 句柄（E7.2，design-renderer.md §8.5.2）。 */
  ungroup(groupId: string): void;
  /** undo 句柄（E7.2，design-renderer.md §8.5.2）。 */
  undo(): void;
  /** redo 句柄（E7.2，design-renderer.md §8.5.2）。 */
  redo(): void;
  /** connection 测试句柄子能力（design-connection.md §8.3）。 */
  connection: {
    /** 程序化端点吸附（e2e 用）。 */
    connect(args: {
      junctionId: string;
      connectionId: string;
      targetNodeId: string;
      targetAnchor: { x: number; y: number };
      direction?: 'in' | 'out' | 'bidirectional';
    }): void;
    /** 程序化断开连接。 */
    disconnect(args: { junctionId: string; connectionId: string }): void;
    /** 查询当前 working copy 的所有 connections（含 dangling 标记）。 */
    listConnections(): Array<{ junctionId: string; connection: ScadaPipeConnection; dangling: boolean }>;
  };
  /** undoRedo 测试句柄子能力（design-undo-redo.md §8.3）。 */
  undoRedo: {
    /** 程序化 undo（e2e 用，等同 component:undo 句柄）。 */
    undo(): void;
    /** 程序化 redo（e2e 用，等同 component:redo 句柄）。 */
    redo(): void;
    /** 查询栈状态。 */
    getStackState(): {
      canUndo: boolean;
      canRedo: boolean;
      undoStackDepth: number;
      redoStackDepth: number;
      topOperationKind?: string;
    };
    /** 程序化入栈（构造测试场景用；entry 经 computeInverse 预计算后入栈）。 */
    pushUndo(
      forward: import('../serialization/config-types.js').ScadaConfigDiff,
      prevSnapshot: import('../serialization/config-types.js').ScadaConfig,
      operationKind?: string,
    ): void;
  };
  /** toolbox 测试句柄子能力（design-toolbox.md §8.3，E9.1 落地）。 */
  toolbox: {
    /** 程序化触发视图工具（e2e 用；返回 viewport 状态）。 */
    fit(): boolean;
    center(): boolean;
    zoomAt(factor: number): void;
    resetView(): void;
    getViewport(): { x: number; y: number; scale: number };
    /** 程序化对齐/分布/层级。 */
    align(direction: AlignDirection): boolean;
    distribute(direction: DistributeDirection): boolean;
    toTop(): boolean;
    toBottom(): boolean;
    moveUp(): boolean;
    moveDown(): boolean;
    /** 程序化复制/剪切/粘贴。 */
    copy(): number;
    cut(): number;
    paste(): string[];
    /** 查询 clipboard 状态。 */
    getClipboard(): { symbols: ScadaSymbolNode[]; operation: 'copy' | 'cut' } | null;
    /** 程序化导入/导出（复用 serialization 面）。 */
    exportConfig(): string;
    importConfig(config: string | ScadaConfig): boolean;
    /** 列出图元库（只读，复用 listScadaSymbols）。 */
    listSymbolLibrary(): Array<{ type: string; name: string; category?: string }>;
  };
}

export function scadaEditorTestHandleKey(cid: number): string {
  return `__flux_scada_editor_${cid}`;
}

export function mountScadaEditorTestHandle(cid: number, handle: ScadaEditorTestHandle): void {
  (window as unknown as Record<string, unknown>)[scadaEditorTestHandleKey(cid)] = handle;
}

export function removeScadaEditorTestHandle(cid: number): void {
  delete (window as unknown as Record<string, unknown>)[scadaEditorTestHandleKey(cid)];
}

/** 读取已挂载的编辑态测试句柄（e2e/integration 经此读 session 投影）；未挂载返回 undefined。 */
export function readScadaEditorTestHandle(cid: number): ScadaEditorTestHandle | undefined {
  return (window as unknown as Record<string, unknown>)[scadaEditorTestHandleKey(cid)] as
    | ScadaEditorTestHandle
    | undefined;
}
