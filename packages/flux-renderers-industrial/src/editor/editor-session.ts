import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

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
 * 编辑会话模型 M1 子集（design-architecture.md §4.5）。
 *
 * **M1 不含 undoStack/redoStack**——undo-redo 属 E2.4 设计 / E7.2 落地（design-undo-redo.md §1
 * 明确「M1 不实现 undo-redo」）。`onSessionChange` 载荷 canUndo/canRedo 在 M1 恒为 false。
 *
 * 域内部持有（INV-4）：workingConfig/committedBaseline/selection/mode 不进 flux scope，
 * 经 ref 持有，提交时经 config 同步链传出。
 */
export interface ScadaEditorSession {
  /** 编辑会话 working copy（编辑期变更全部落点；R5 隔离——不直改下游 config）。 */
  workingConfig: ScadaConfig;
  /** 上次提交的基线（用于 diff 计算 + 提交语义判定）。 */
  committedBaseline: ScadaConfig;
  /** 当前选区（nodeId 列表；M1 仅单选，数组长度 ≤1）。 */
  selection: string[];
  /** 当前模式（edit / preview）。 */
  mode: ScadaEditorMode;
}

/**
 * `onSessionChange` 载荷（design-renderer.md §4.1 + §8.1）。
 * M1 中 canUndo/canRedo 恒为 false（无 undo/redo 栈）。
 */
export interface ScadaEditorSessionChangePayload {
  canUndo: boolean;
  canRedo: boolean;
  selection: string[];
  mode: ScadaEditorMode;
}

/**
 * 构造初始编辑会话（M1 子集，无 undo/redo 栈）。
 *
 * working copy + committedBaseline 均深拷贝入参 config（编辑期 working copy 变更不回流 props config，
 * R5 双态隔离 Layer 2）。selection 缺省空（无选中），mode 缺省 edit。
 */
export function createScadaEditorSession(
  config: ScadaConfig,
  options: { mode?: ScadaEditorMode; selection?: string[] } = {},
): ScadaEditorSession {
  return {
    workingConfig: cloneConfig(config),
    committedBaseline: cloneConfig(config),
    selection: options.selection ? [...options.selection] : [],
    mode: options.mode ?? 'edit',
  };
}

/**
 * 重置会话（load 句柄消费，design-renderer.md §4.5）：替换 working copy + committedBaseline +
 * 清空 selection + 重置 mode 为 edit（loaded config 是新画面起点）。
 */
export function resetSession(session: ScadaEditorSession, config: ScadaConfig): void {
  session.workingConfig = cloneConfig(config);
  session.committedBaseline = cloneConfig(config);
  session.selection = [];
  session.mode = 'edit';
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

/** 投影 session → onSessionChange 载荷（canUndo/canRedo M1 恒 false）。 */
export function projectSessionChange(session: ScadaEditorSession): ScadaEditorSessionChangePayload {
  return {
    canUndo: false,
    canRedo: false,
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
  if (node.children) clone.children = node.children.map(cloneNode);
  return clone;
}
