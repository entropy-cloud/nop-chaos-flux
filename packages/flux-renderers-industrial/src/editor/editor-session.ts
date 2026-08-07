import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import { UndoStack } from './undo-redo/undo-stack.js';

/**
 * 编辑会话模式（design-architecture.md §4.5）。
 * - `edit`：Editor 装配 + 图元 editable:true + InteractionOverlay 关闭；编辑态事件族不派发 symbol:* action。
 * - `preview`：Editor 卸载 + editable:false + InteractionOverlay 启用；等同运行态 scada-canvas 派发 symbol:* action。
 */
export type ScadaEditorMode = 'edit' | 'preview';

/**
 * 提交策略（design-renderer.md §4.5）。
 * - `manual`（缺省）：显式 `component:save()` 触发序列化 + 下游同步。
 * - `auto`：每次 onSessionChange 即同步（高频，仅"编辑即生效"场景）。
 */
export type ScadaCommitPolicy = 'manual' | 'auto';

/**
 * 编辑会话模型（design-architecture.md §4.5 + design-undo-redo.md §4.1.2/§4.6 方案 A）。
 *
 * 域内部持有（INV-4）：workingConfig/committedBaseline/selection/mode + undoStack/redoStack 不进 flux scope，
 * 经 ref 持有，提交时经 config 同步链传出。
 *
 * **undo-redo 命令栈归属编辑会话模型域核心**（design-undo-redo.md §3 + §4.6 两方案契约一致，差异仅在引擎类结构）。
 * 本 plan 将栈落 editor-session（§4.6 方案 A 的 conformant realization：编辑器域持有栈，undo/redo 经 runtime
 * applyDiff 应用 forward/inverse，不改 runtime 命令面）。canUndo/canRedo = 栈长度派生（非恒 false）。
 */
export interface ScadaEditorSession {
  /** 编辑会话 working copy（编辑期变更全部落点；R5 隔离——不直改下游 config）。 */
  workingConfig: ScadaConfig;
  /** 上次提交的基线（用于 diff 计算 + 提交语义判定）。 */
  committedBaseline: ScadaConfig;
  /** 当前选区（nodeId 列表）。 */
  selection: string[];
  /** 当前模式（edit / preview）。 */
  mode: ScadaEditorMode;
  /**
   * undo-redo 命令栈（E7.2 落地，design-undo-redo.md §4.1.2）。
   * 域内部 ref 持有——不进 scope，不进序列化。canUndo/canRedo/undoStackDepth 经此派生。
   */
  undoStack: UndoStack;
}

/**
 * `onSessionChange` 载荷（design-renderer.md §4.1 + §8.1）。
 * canUndo/canRedo 经 undo-redo 栈派生（E7.2 落地，非恒 false）。
 */
export interface ScadaEditorSessionChangePayload {
  canUndo: boolean;
  canRedo: boolean;
  selection: string[];
  mode: ScadaEditorMode;
}

/**
 * 构造初始编辑会话（含 undo/redo 栈，E7.2 落地）。
 *
 * working copy + committedBaseline 均深拷贝入参 config（编辑期 working copy 变更不回流 props config，
 * R5 双态隔离 Layer 2）。selection 缺省空（无选中），mode 缺省 edit。undoStack 缺省新空栈。
 */
export function createScadaEditorSession(
  config: ScadaConfig,
  options: { mode?: ScadaEditorMode; selection?: string[]; undoStack?: UndoStack } = {},
): ScadaEditorSession {
  return {
    workingConfig: cloneConfig(config),
    committedBaseline: cloneConfig(config),
    selection: options.selection ? [...options.selection] : [],
    mode: options.mode ?? 'edit',
    undoStack: options.undoStack ?? new UndoStack(),
  };
}

/**
 * 重置会话（load 句柄消费，design-renderer.md §4.5 + design-undo-redo.md §8.2）：替换 working copy +
 * committedBaseline + 清空 selection + 重置 mode 为 edit + **清空 undo/redo 栈**（编辑历史不保留）。
 */
export function resetSession(session: ScadaEditorSession, config: ScadaConfig): void {
  session.workingConfig = cloneConfig(config);
  session.committedBaseline = cloneConfig(config);
  session.selection = [];
  session.mode = 'edit';
  session.undoStack.clear();
}

/** working copy 节点查找（含 group 子树）。 */
export function findWorkingNode(session: ScadaEditorSession, nodeId: string): ScadaSymbolNode | undefined {
  return findNodeInSymbols(session.workingConfig.symbols, nodeId);
}

/** 在 symbols 数组中按 id 递归查找节点（含 group 子树）。 */
export function findNodeInSymbols(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInSymbols(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** 投影 session → onSessionChange 载荷（canUndo/canRedo 经 undoStack 派生，E7.2 落地）。 */
export function projectSessionChange(session: ScadaEditorSession): ScadaEditorSessionChangePayload {
  return {
    canUndo: session.undoStack.canUndo,
    canRedo: session.undoStack.canRedo,
    selection: [...session.selection],
    mode: session.mode,
  };
}

function cloneConfig(config: ScadaConfig): ScadaConfig {
  return {
    version: 1,
    ...(config.viewport !== undefined ? { viewport: { ...config.viewport } } : {}),
    ...(config.background !== undefined ? { background: structuredClone(config.background) } : {}),
    ...(config.variables !== undefined ? { variables: config.variables.map((v) => ({ ...v })) } : {}),
    symbols: config.symbols.map(cloneNode),
  };
}

function cloneNode(node: ScadaSymbolNode): ScadaSymbolNode {
  const clone: ScadaSymbolNode = { ...node };
  // plan 2026-08-08-0900-1 Phase 1 / P2 #4：深克隆 custom——浅 `{...node}` 使 working / committedBaseline /
  // clipboard 间共享 custom 子对象引用，undo/redo 或 group 后改 custom.connections 串改多份。structuredClone 隔离。
  if (node.custom) clone.custom = structuredClone(node.custom);
  if (node.children) clone.children = node.children.map(cloneNode);
  return clone;
}
