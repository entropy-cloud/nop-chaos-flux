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
      applyPatchToWorkingNode(session, nodeId, patch);
      syncWorkingCopy();
      notifySession();
    };
    detachAdapterRef.current = attachEditorAdapter(engine, {
      onSelectionChange: handleSelectionChange,
      onGeometryChange: handleGeometryChange,
    });

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
      applyPatchToWorkingNode(session, nodeId, patch);
      syncWorkingCopy();
      notifySession();
    };

    const addWorkingSymbol = (node: ScadaSymbolNode) => {
      session.workingConfig.symbols = [...session.workingConfig.symbols, node];
      syncWorkingCopy();
      notifySession();
    };

    const removeWorkingSymbol = (nodeId: string) => {
      session.workingConfig.symbols = session.workingConfig.symbols.filter((n) => n.id !== nodeId);
      session.selection = session.selection.filter((id) => id !== nodeId);
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
    };
    runtimeRef.current = next;
    setRuntime(next);

    // 测试句柄挂载（design-renderer.md §8.4：session 投影 + editor/engine/app + 操作方法）。
    if (latest.current.cid !== undefined) {
      const handle: ScadaEditorTestHandle = {
        get session() {
          return {
            workingConfig: session.workingConfig,
            committedBaseline: session.committedBaseline,
            canUndo: false,
            canRedo: false,
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
