import type { ScadaConfig } from '../serialization/config-types.js';
import type { ScadaEditorMode } from './editor-session.js';

/**
 * `window.__flux_scada_editor_<cid>` 测试句柄契约（design-renderer.md §8.4）。
 *
 * 与 runtime `window.__flux_scada_<cid>`（`engine/test-handle.ts`）**双态独立 cid 命名空间**——
 * 编辑态测试句柄经 `__flux_scada_editor_<cid>` 挂载，运行态经 `__flux_scada_<cid>`，互不覆盖。
 *
 * **M1 子集**：session 只读投影（workingConfig/committedBaseline/canUndo/canRedo/selection/mode）+
 * editor/engine/app 实例 + switchMode/setSelection/clearSelection/save/load。
 * undoRedo/connection/toolbox 子句柄属 M2/M3（design-renderer.md §8.4「3 sub-handle + folded declaration」）。
 */
export interface ScadaEditorTestHandle {
  /** 编辑会话只读投影（M1 子集，无 undo/redo 栈；canUndo/canRedo 恒 false）。 */
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
  /** 新增图元到 working copy（测试投影 Phase 4 addSymbol 句柄）。 */
  addSymbol(node: import('../serialization/config-types.js').ScadaSymbolNode): void;
  /** 从 working copy 删除图元（测试投影 Phase 4 removeSymbol 句柄）。 */
  removeSymbol(nodeId: string): void;
  /** 更新 working copy 节点属性（测试投影 Phase 4 updateSymbol 句柄）。 */
  updateSymbol(nodeId: string, patch: Partial<import('../serialization/config-types.js').ScadaSymbolNode>): void;
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
