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
  recomputeJunctionAfterMove,
} from '../../connection/connection-adapter.js';
import { UndoRedoAdapter } from '../../undo-redo/undo-redo-adapter.js';

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
    const handleSelectionChange = (nodeIds: string[]) => {
      session.selection = [...nodeIds];
      latest.current.onSelectionChange?.(nodeIds);
      notifySession();
    };
    const handleGeometryChange = (nodeId: string, patch: Partial<ScadaSymbolNode>) => {
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
      session.selection = session.selection.filter((id) => id !== nodeId);
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
      const groupId = `scada-group-${Date.now()}`;
      const groupNode: ScadaSymbolNode = {
        id: groupId,
        type: 'scada-group',
        x: 0,
        y: 0,
        children: children.map((c) => ({ ...c })),
      };
      session.workingConfig = { ...session.workingConfig, symbols: [...remaining, groupNode] };
      session.selection = [groupId];
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
      session.selection = promoted.map((c) => c.id);
      undoRedo.pushOperation('ungroup', prevSnapshot, session.workingConfig);
      syncWorkingCopy();
      notifySession();
    };

    const switchMode = (mode: ScadaEditorMode) => {
      if (session.mode === mode) return;
      session.mode = mode;
      engine.setMode(mode);
      latest.current.onModeChange?.(mode);
      notifySession();
    };

    const setSelection = (nodeIds: string[]) => {
      session.selection = [...nodeIds];
      const nodes = nodeIds
        .map((id) => engine.getSymbol(id)?.node)
        .filter((n): n is NonNullable<typeof n> => n !== undefined);
      engine.setEditorTargets(nodes);
      latest.current.onSelectionChange?.(nodeIds);
      notifySession();
    };

    const clearSelection = () => {
      session.selection = [];
      engine.clearEditorSelection();
      latest.current.onSelectionChange?.([]);
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
        engineSyncedConfig = cloneConfigSnapshot(session.workingConfig);
        engine.build(session.workingConfig);
        notifySession();
      } catch (error) {
        latest.current.onError?.('invalid-config', errorMessage(error));
      }
    };

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
          updateWorkingNode(connectArgs.junctionId, { custom: { ...junctionNode.custom, connections: result.connections } });
        },
        disconnect(disconnectArgs) {
          const junctionNode = findNodeInWorking(session.workingConfig.symbols, disconnectArgs.junctionId);
          if (!junctionNode) return;
          const result = programmaticDisconnect({ junctionNode, connectionId: disconnectArgs.connectionId });
          if (!result) return;
          updateWorkingNode(disconnectArgs.junctionId, { custom: { ...junctionNode.custom, connections: result.connections } });
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

/** Shallow snapshot of config for diff comparison (symbols array cloned). */
function cloneConfigSnapshot(config: ScadaConfig): ScadaConfig {
  return {
    ...config,
    symbols: config.symbols.map((s) => ({ ...s })),
    ...(config.variables ? { variables: [...config.variables] } : {}),
  };
}

/** 在 working copy 中按 id 递归查找节点并应用 patch（含 group 子树）。 */
function applyPatchToWorkingNode(
  session: ScadaEditorSession,
  nodeId: string,
  patch: Partial<ScadaSymbolNode>,
): void {
  const node = findNodeInWorking(session.workingConfig.symbols, nodeId);
  if (node) {
    Object.assign(node, patch);
  }
}

function findNodeInWorking(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInWorking(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 图元移动联动（design-connection.md §4.4 + §4.5）：被移动的节点若是某个 pipe-junction connection 的目标设备，
 * 则重算该 connection 的 x/y；若被移动的节点本身是 pipe-junction 主体，重算其全部 connection。
 *
 * 遍历 working copy 中所有 pipe-junction 节点的 connections，凡 target === nodeId 或 节点本身是 junction 的，
 * 经 recomputeJunctionAfterMove 重算 → updateWorkingNode 写回（不派发 symbol:* action，R5 隔离）。
 */
function recomputeLinkagesForMovedNode(session: ScadaEditorSession, movedNodeId: string): void {
  const symbols = session.workingConfig.symbols;
  const movedIsJunction = findNodeInWorking(symbols, movedNodeId)?.type === 'scada-pipe-junction';
  const junctionsToRecompute: string[] = [];
  if (movedIsJunction) {
    junctionsToRecompute.push(movedNodeId);
  }
  // 收集所有 target 指向被移动节点的 pipe-junction。
  for (const node of symbols) {
    if (node.type !== 'scada-pipe-junction') continue;
    const conns = node.custom?.connections;
    if (!Array.isArray(conns)) continue;
    if (movedNodeId !== node.id && conns.some((c) => (c as { target?: string }).target === movedNodeId)) {
      junctionsToRecompute.push(node.id);
    }
  }
  for (const junctionId of junctionsToRecompute) {
    const junctionNode = findNodeInWorking(symbols, junctionId);
    if (!junctionNode || junctionNode.type !== 'scada-pipe-junction') continue;
    const updates = recomputeJunctionAfterMove({ junctionNode, symbols });
    if (!updates || updates.length === 0) continue;
    const existing = Array.isArray(junctionNode.custom?.connections) ? [...junctionNode.custom!.connections as never[]] : [];
    const byId = new Map(updates.map((u) => [u.connectionId, u.point]));
    const nextConnections = existing.map((c) => {
      const point = byId.get((c as { id: string }).id);
      return point ? { ...(c as object), x: point.x, y: point.y } : c;
    });
    applyPatchToWorkingNode(session, junctionId, {
      custom: { ...junctionNode.custom, connections: nextConnections },
    });
  }
}
