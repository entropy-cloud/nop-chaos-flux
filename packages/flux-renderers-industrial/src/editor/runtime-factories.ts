import { ScadaEditorEngine } from './renderer/editor-engine.js';
import { errorMessage } from '../renderer/scada-errors.js';
import {
  createScadaEditorSession,
  type ScadaEditorMode,
  type ScadaEditorSession,
} from './editor-session.js';
import { attachEditorAdapter } from './editor-adapter.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { diffScadaConfig } from '../serialization/diff.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import {
  cloneConfigSnapshot,
  applyPatchToWorkingNode,
  recomputeLinkagesForMovedNode,
} from './editor-working-helpers.js';
import { UndoRedoAdapter } from './undo-redo/undo-redo-adapter.js';
import type { EditorClipboard } from './toolbox/clipboard.js';
import type { AlignDirection, DistributeDirection } from './toolbox/align-distribute.js';
import type { ZOrderAction } from './toolbox/z-order.js';

/**
 * Editor runtime 拆分模块（plan 2026-08-07-1835-2 Phase 1 / multi P1-03）：
 * 从 `use-editor-engine.ts` 抽出的纯工厂 + 核心上下文装配。无 React 依赖，
 * 经共享 `EditorRuntimeContext` 闭包与 runtime-mutators / toolbox-runtime / connection-wiring
 * / test-handle-factory 共享同一份语义（机械迁移，行为不变）。
 */

export interface UseEditorEngineArgs {
  containerRef: { current: HTMLDivElement | null };
  cid?: number;
  width?: number;
  height?: number;
  /** 初始 config（props.config 经 parse/validate 后的 ScadaConfig）。 */
  initialConfig: ScadaConfig;
  /** 初始模式（缺省 edit）。 */
  initialMode?: ScadaEditorMode;
  /** 提交策略（manual 缺省 / auto；plan 2026-08-07-1835-2 Phase 2 / multi P1-05）。auto 时每次 session 变更触发 save + onSave。 */
  commitPolicy?: 'manual' | 'auto';
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
  /** 保存（manual 提交 / auto 持久化；载荷含 serializedConfig，plan 2026-08-07-1835-2 Phase 2 / multi P1-04）。 */
  onSave?: (serializedConfig: string) => void;
  /** 装入外部 config（load 句柄触发；plan 2026-08-07-1835-2 Phase 2 / multi P1-04）。 */
  onLoad?: (config: ScadaConfig) => void;
}

/**
 * Editor runtime 共享上下文（plan 2026-08-07-1835-2 Phase 1）。
 *
 * 持有 engine/session/undoRedo + 可变 holder（synced/clipboard/paste/group）+ 核心回调
 * （notifySession/setSessionSelection/syncWorkingCopy）。各 `build*` 工厂以此闭包稳定引用，
 * 与原先单一 hook effect 内闭包语义等价（机械迁移）。
 */
export interface EditorRuntimeContext {
  engine: ScadaEditorEngine;
  session: ScadaEditorSession;
  undoRedo: UndoRedoAdapter;
  latest: { current: UseEditorEngineArgs };
  /** 连线拖拽激活标记（端点拖动模式时抑制 transform 写回）。 */
  connectionDragActiveRef: { current: boolean };
  /** 引擎已同步的 config 快照 holder（防引用共享：diff 需对快照而非 live config）。 */
  synced: { config: ScadaConfig };
  /** 编辑器内 clipboard holder（域内部，不进 scope）。 */
  clipboard: { current: EditorClipboard | null };
  /** 粘贴 id 计数器 holder（防 T4）。 */
  paste: { counter: number };
  /** group id 单调计数器 holder（plan 2026-08-07-1835-1 Phase 2 / open P1-D）。 */
  group: { counter: number };
  notifySession: () => void;
  setSessionSelection: (next: string[]) => void;
  syncWorkingCopy: () => void;
  /**
   * editor.target 对齐 helper（plan 2026-08-08-1931-4 Phase 2 / Decision）：把当前 `session.selection`
   * 经 `engine.getSymbol(id)?.node` 重解析到 live registry，并装配到 `editor.target`（或清空）。
   *
   * 在所有可能改变 leafer 节点 identity 的代码路径后无条件调用——applyUpdate 的 patch.children 子树重建
   * （P1-2 common edit path）、engine.build 全量重建（P1-3 / P1-4 catches）都会替换 LeafNode 对象；
   * `editor.target` 是强节点引用，不重解析会指向被销毁的旧节点（dangle），下次 transform 命中 detached
   * 节点。长度门控（"selection id 集不变则跳过"）不够——identity 在 id 不变时也会变。
   */
  reconcileEditorTargets: () => void;
  /**
   * save 句柄（plan 2026-08-07-1835-2 Phase 2 / multi P1-04/05）：由 runtime-mutators 装配后回填。
   * notifySession 在 commitPolicy='auto' 时调用此句柄触发 save + onSave（编辑即持久化）。
   * 经回填而非构造期注入，避免与 mutators 的构造环依赖（mutators 闭包捕获 notifySession）。
   */
  save?: () => string;
}

/**
 * ScadaEditorEngine mount/build 装配（design-renderer.md §8.3 + design-architecture.md §4.3）。
 *
 * 创建 engine + session，注入初始 config 装载（editable:true 注入）。失败时经 onError 上报并返回 null。
 */
export function mountEditorEngine(
  container: HTMLDivElement,
  latest: { current: UseEditorEngineArgs },
): { engine: ScadaEditorEngine; session: ScadaEditorSession } | null {
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
    return null;
  }

  const session = createScadaEditorSession(latest.current.initialConfig, {
    mode: latest.current.initialMode ?? 'edit',
  });

  try {
    engine.build(session.workingConfig);
  } catch (error) {
    latest.current.onError?.('editor-mount-failed', errorMessage(error));
    engine.destroy();
    return null;
  }

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-08：build 后校正 engine.mode → session.mode。
  // engine.mode 默认 'edit'，build 用 engine.mode 决定 editable 注入；若 initialMode='preview'，
  // session.mode='preview' 但 engine.mode 仍 'edit'（desync）。此处显式同步，使 preview 态图元不可编辑（R5）。
  if (engine.currentMode !== session.mode) {
    engine.setMode(session.mode);
  }

  return { engine, session };
}

/**
 * 装配 runtime 核心（undoRedo + 可变 holder + notifySession/setSessionSelection/syncWorkingCopy）+
 * Editor 事件族适配层（R5 隔离：抽纯 payload + nodeId → 更新 working copy + session.selection）。
 *
 * 返回共享 `EditorRuntimeContext` + adapter detach 函数；装配失败返回 null（plan 2026-08-08-0900-1 Phase 2 / P2 #18：
 * 经 onError 派发 editor-mount-failed，不使整 hook 静默半初始化；调用方据 null 退出 + 销毁 engine）。
 */
export function createRuntimeCore(
  engine: ScadaEditorEngine,
  session: ScadaEditorSession,
  latest: { current: UseEditorEngineArgs },
  connectionDragActiveRef: { current: boolean },
): { ctx: EditorRuntimeContext; detachAdapter: () => void } | null {
  const undoRedo = new UndoRedoAdapter(session.undoStack);
  const synced = { config: cloneConfigSnapshot(session.workingConfig) };
  const clipboard = { current: null as EditorClipboard | null };
  const paste = { counter: 0 };
  const group = { counter: 0 };

  /**
   * selection 单一写入入口（plan 2026-08-07-1835-1 Phase 1 / multi P1-07）：
   * 同时更新 canonical `session.selection` 与 React mirror（经 onSelectionChange 回调）。
   */
  const setSessionSelection = (next: string[]) => {
    session.selection = [...next];
    latest.current.onSelectionChange?.(next);
  };
  /**
   * editor.target 重解析 helper（plan 2026-08-08-1931-4 Phase 2 / P1-2a Decision）：把当前
   * `session.selection` 经 `engine.getSymbol(id)?.node` 重解析到 live registry，装配到 editor.target
   * （或 clearEditorSelection）。在所有可能改变 leafer 节点 identity 的路径后无条件调用。
   */
  const reconcileEditorTargets = () => {
    const resolvedNodes = session.selection
      .map((id) => engine.getSymbol(id)?.node)
      .filter((n): n is NonNullable<typeof n> => n !== undefined);
    if (resolvedNodes.length === 0) {
      engine.clearEditorSelection();
    } else {
      engine.setEditorTargets(resolvedNodes);
    }
  };
  const syncWorkingCopy = () => {
    const diff = diffScadaConfig(synced.config, session.workingConfig);
    const hasChanges =
      diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0 || diff.variables !== undefined;
    if (!hasChanges) return;
    // plan 2026-08-08-0900-1 Phase 2 / P2 #17：applyDiff 失败可回滚——还原 working copy 到 engine 实际态
    // （synced.config）+ 弹出 mutator 刚入栈条目（或中止事务）+ 经 onError 派发 editor-internal-error。
    try {
      engine.applyDiff(diff, session.workingConfig);
      synced.config = cloneConfigSnapshot(session.workingConfig);
      // plan 2026-08-08-1931-4 Phase 2 / P1-2a：applyDiff 中的 applyUpdate 收到 patch.children 时
      // 重建 group 子树，LeafNode 对象 identity 变化；editor.target 是强节点引用，不重解析会指向被销毁
      // 的旧子节点（P1-2 defect：选中嵌套子图元改 fill 后选区/变换框 dangle 在 destroyed node）。
      // 所有 syncWorkingCopy 调用者（updateWorkingNode / addWorkingSymbol / removeWorkingSymbol /
      // group / ungroup / connection-write）经此统一对齐 target，与 success-path 重建对称。
      reconcileEditorTargets();
    } catch (error) {
      // plan 2026-08-08-1931-4 Phase 2 / P1-4：backport 1910-2 A6 全量重建模式到此 catch。
      // 旧实现仅回滚 working copy + undoRedo.rollbackOnApplyFailure + onError——但 leafer 无事务，
      // engine.applyDiff 半途抛错时场景树已半变（如 applyUpdate remove→buildNode 链中段失败）；
      // synced.config === working copy 还原态，下轮 syncWorkingCopy diff 为空 → 引擎永不愈合，
      // 画布与 working copy 永久背离（1910-2 注释已定义为 defect，但仅 backport 到 applyUndoRedoDiff）。
      // 现闭合：catch 经 engine.build(synced.config) 全量重建到 pre-call 已知良好态（O(n) 但仅错误路径），
      // 再 reconcileEditorTargets 对齐 target。与 applyUndoRedoDiff catch 行为对称——同一失败类两 catch 一致。
      session.workingConfig = cloneConfigSnapshot(synced.config);
      undoRedo.rollbackOnApplyFailure();
      engine.build(synced.config);
      reconcileEditorTargets();
      latest.current.onError?.('editor-internal-error', errorMessage(error));
    }
  };

  const ctx: EditorRuntimeContext = {
    engine,
    session,
    undoRedo,
    latest,
    connectionDragActiveRef,
    synced,
    clipboard,
    paste,
    group,
    notifySession: () => latest.current.onSessionChange?.(session),
    setSessionSelection,
    syncWorkingCopy,
    reconcileEditorTargets,
  };

  /**
   * plan 2026-08-07-1835-2 Phase 2 / multi P1-05：commitPolicy='auto' 时 notifySession 触发 save + onSave
   * （编辑即持久化；方案 A 裁定）。事务期间（transform 拖拽逐帧）跳过，由 commitTransaction 的 notifySession
   * 兜底（防逐帧序列化）。save 句柄由 runtime-mutators 装配后回填到 ctx.save。
   */
  ctx.notifySession = () => {
    latest.current.onSessionChange?.(session);
    if (latest.current.commitPolicy === 'auto' && ctx.save && !undoRedo.isInTransaction) {
      ctx.save();
    }
  };
  const notifySession = ctx.notifySession;

  const handleSelectionChange = (nodeIds: string[]) => {
    setSessionSelection(nodeIds);
    notifySession();
  };
  // plan 2026-08-07-1835-2 Phase 4 / multi P1-13：几何变更 trailing sync 批处理。
  // 适配层 onTransform 对选区内 s 个图元逐个同步触发 onGeometryChange；此前每帧每节点调 syncWorkingCopy（O(n) diff）
  // → 单帧 O(s·n)。现用 microtask trailing：一帧内首节点调度一次 microtask，后续节点跳过；microtask 在帧末
  // 一次性 syncWorkingCopy + notifySession，单帧收敛为 O(n + k)（去掉 s 乘子）。
  let geometrySyncPending = false;
  const handleGeometryChange = (nodeId: string, patch: Partial<ScadaSymbolNode>) => {
    // 连线端点拖动模式启用时 Editor transform 不写回（design-connection.md §4.2 关键约束 1 互斥）。
    if (connectionDragActiveRef.current) return;
    // transform 事务语义（design-undo-redo.md §4.2）：适配层 editor.move/scale/rotate/skew 每帧只更新 working copy（不入栈），
    // 防逐帧入栈爆炸（U2）。undo 入栈由事务终止（pointerup → onTransformEnd → commitTransaction）触发，一拖拽 = 一 diff。
    applyPatchToWorkingNode(session, nodeId, patch);
    // 图元移动联动（design-connection.md §4.4 + §4.5）：目标设备移动后重算所有指向它的 connection.x/y。
    recomputeLinkagesForMovedNode(session, nodeId);
    if (!geometrySyncPending) {
      geometrySyncPending = true;
      queueMicrotask(() => {
        geometrySyncPending = false;
        syncWorkingCopy();
        notifySession();
      });
    }
  };
  // transform 事务边界（design-undo-redo.md §4.2）：首帧快照 working copy，pointerup 一次性 diff 入栈。
  const handleTransformStart = () => {
    undoRedo.beginTransaction('transform-move', session.workingConfig);
  };
  const handleTransformEnd = () => {
    undoRedo.commitTransaction(session.workingConfig);
    notifySession();
  };
  // plan 2026-08-08-0900-1 Phase 2 / P2 #18：装配段 try/catch——adapter 装配或上游步骤抛错时不静默半初始化，
  // 经 onError 派发 editor-mount-failed + 返回 null（调用方据 null 销毁 engine + 退出 mount）。
  let detachAdapter: () => void = () => undefined;
  try {
    detachAdapter = attachEditorAdapter(engine, {
      onSelectionChange: handleSelectionChange,
      onGeometryChange: handleGeometryChange,
      onTransformStart: handleTransformStart,
      onTransformEnd: handleTransformEnd,
      onError: (code, message) => latest.current.onError?.(code, message),
    });
    return { ctx, detachAdapter };
  } catch (error) {
    detachAdapter();
    latest.current.onError?.('editor-mount-failed', errorMessage(error));
    return null;
  }
}

export type { ScadaConfig, ScadaSymbolNode, AlignDirection, DistributeDirection, ZOrderAction };
export { serializeScadaConfig, parseScadaConfig, validateScadaConfig };
