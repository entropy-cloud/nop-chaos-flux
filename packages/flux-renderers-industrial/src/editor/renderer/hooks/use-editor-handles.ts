import { useEffect, useRef } from 'react';
import type { ComponentCapabilities, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { ScadaConfig, ScadaSymbolNode } from '../../../serialization/config-types.js';
import type { EditorEngineRuntime } from './use-editor-engine.js';

/**
 * runtime 9 句柄（design-renderer.md §8.5 表；与 runtime `use-scada-handles` 同名集）。
 *
 * plan 2026-08-07-1835-2 Phase 2 / multi P1-06：此前 editor renderer 仅注册 9 个 editor 扩展方法，
 * runtime 9 句柄（含 destroy）对 editor 实例不可达（host 调 component:destroy()/fit() 报 unknown method）。
 * 现合并注册，各自委派 EditorEngineRuntime 等价能力。
 */
const RUNTIME_HANDLE_METHODS = [
  'fit',
  'center',
  'getSymbols',
  'getSymbol',
  'setPointValue',
  'getPointTable',
  'exportConfig',
  'importConfig',
  'destroy',
] as const;

/**
 * editor 扩展句柄方法名（design-renderer.md §8.5.2）。
 * editor 扩展：addSymbol/removeSymbol/updateSymbol/save/load（M1）+ undo/redo（E7.2）+
 * group/ungroup（E7.2 Phase 3）。
 */
const EDITOR_HANDLE_METHODS = [
  'addSymbol',
  'removeSymbol',
  'updateSymbol',
  'save',
  'load',
  'undo',
  'redo',
  'group',
  'ungroup',
] as const;

/** editor 实例全部可调句柄（runtime 9 ∪ editor 扩展 9，design-renderer.md §8.5 + §8.5.2）。 */
const ALL_HANDLE_METHODS = [...RUNTIME_HANDLE_METHODS, ...EDITOR_HANDLE_METHODS] as const;
const ALL_HANDLE_METHOD_SET = new Set<string>(ALL_HANDLE_METHODS);

export interface UseEditorHandlesArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | undefined;
  cid: number | undefined;
  runtime: EditorEngineRuntime | null;
  /** plan 2026-08-07-1835-2 Phase 2 / multi P1-06：destroy 句柄触发后的状态面回调（→ setStatus('destroyed')）。 */
  onDestroyed?: () => void;
}

/**
 * editor 扩展句柄注册（design-renderer.md §8.5 + §8.5.2）。
 *
 * 经同一 `ComponentHandleRegistry` 注册 `scada-editor-canvas` 类型组件，
 * 句柄方法转发到 `EditorEngineRuntime` 的编辑操作（addSymbol/removeSymbol/updateSymbol/save/load）+
 * runtime 9 句柄（fit/center/getSymbols/.../destroy，plan 2026-08-07-1835-2 Phase 2 / P1-06 合并注册）。
 */
export function useEditorHandles(args: UseEditorHandlesArgs): void {
  const { componentRegistry, id, cid } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  useEffect(() => {
    if (!componentRegistry || id === undefined) return;

    const capabilities: ComponentCapabilities = {
      hasMethod(method) {
        return ALL_HANDLE_METHOD_SET.has(method);
      },
      listMethods() {
        return ALL_HANDLE_METHODS;
      },
      invoke(method, payload) {
        // plan 2026-08-07-1835-2 Phase 2 / multi P1-06：destroy 句柄优先处理（runtime 9 之一），
        // 触发 engine.destroy + onDestroyed 状态面（§8.3 OP-4），无需 runtime 就绪前置检查。
        if (method === 'destroy') {
          const current = latest.current.runtime;
          if (current && !current.engine.isDestroyed()) {
            current.engine.destroy();
          }
          latest.current.onDestroyed?.();
          return { ok: true };
        }
        const current = latest.current.runtime;
        if (!current) return { ok: false, error: new Error('scada editor is not mounted') };
        if (current.engine.isDestroyed()) {
          return { ok: false, error: new Error('scada editor is destroyed') };
        }

        switch (method) {
          // ---- runtime 9 句柄（plan 2026-08-07-1835-2 Phase 2 / P1-06）----
          case 'fit': {
            const ok = current.fitView();
            if (!ok) return { ok: false, error: new Error('not-visible') };
            return { ok: true, data: current.engine.getViewport() };
          }
          case 'center': {
            const ok = current.centerView();
            if (!ok) return { ok: false, error: new Error('not-visible') };
            return { ok: true, data: current.engine.getViewport() };
          }
          case 'getSymbols': {
            const symbols = current.engine.getSymbols().map((leaf) => ({
              id: leaf.id,
              type: leaf.definition?.type ?? String(leaf.node.tag),
            }));
            return { ok: true, data: symbols };
          }
          case 'getSymbol': {
            const symbolId = (payload as { id?: unknown } | undefined)?.id;
            if (typeof symbolId !== 'string') {
              return { ok: false, error: new Error('symbol id is required') };
            }
            const props = current.engine.getSymbolProps(symbolId);
            if (props === undefined) {
              return { ok: false, error: new Error(`symbol not found: ${symbolId}`) };
            }
            return { ok: true, data: props };
          }
          case 'setPointValue': {
            // 编辑态无 live point store（编辑 config 结构，不运行时驱动点位）；句柄可达但返回 not-supported。
            return { ok: false, error: new Error('setPointValue is not supported in editor mode') };
          }
          case 'getPointTable': {
            return { ok: true, data: {} };
          }
          case 'exportConfig': {
            return { ok: true, data: current.exportConfig() };
          }
          case 'importConfig': {
            const input = (payload as { config?: unknown } | undefined)?.config;
            if (input === undefined) return { ok: false, error: new Error('invalid-config') };
            const ok = current.importConfig(input as string | ScadaConfig);
            return ok ? { ok: true } : { ok: false, error: new Error('invalid scada config') };
          }
          // ---- editor 扩展 9 句柄（design-renderer.md §8.5.2）----
          case 'addSymbol': {
            const node = (payload as { node?: unknown } | undefined)?.node;
            if (!node || typeof node !== 'object' || !('id' in node) || !('type' in node)) {
              return { ok: false, error: new Error('invalid-node') };
            }
            const existing = current.session.workingConfig.symbols.find((s) => s.id === (node as ScadaSymbolNode).id);
            if (existing) {
              return { ok: false, error: new Error('duplicate-id') };
            }
            current.addWorkingSymbol(node as ScadaSymbolNode);
            return { ok: true };
          }
          case 'removeSymbol': {
            const nodeId = (payload as { nodeId?: unknown } | undefined)?.nodeId;
            if (typeof nodeId !== 'string') return { ok: false, error: new Error('invalid-node') };
            const exists = current.session.workingConfig.symbols.some((s) => s.id === nodeId);
            if (!exists) return { ok: false, error: new Error('symbol-not-found') };
            current.removeWorkingSymbol(nodeId);
            return { ok: true };
          }
          case 'updateSymbol': {
            const nodeId = (payload as { nodeId?: unknown } | undefined)?.nodeId;
            const patch = (payload as { patch?: unknown } | undefined)?.patch;
            if (typeof nodeId !== 'string' || !patch || typeof patch !== 'object') {
              return { ok: false, error: new Error('invalid-patch') };
            }
            const exists = current.session.workingConfig.symbols.some((s) => s.id === nodeId);
            if (!exists) return { ok: false, error: new Error('symbol-not-found') };
            current.updateWorkingNode(nodeId, patch as Partial<ScadaSymbolNode>);
            return { ok: true };
          }
          case 'save': {
            const serialized = current.save();
            return { ok: true, data: serialized };
          }
          case 'load': {
            const config = (payload as { config?: unknown } | undefined)?.config;
            if (config === undefined) return { ok: false, error: new Error('invalid-config') };
            current.load(config as string | ScadaConfig);
            return { ok: true };
          }
          case 'undo': {
            if (!current.session.undoStack.canUndo) return { ok: false, error: new Error('no-undo') };
            current.undo();
            return { ok: true };
          }
          case 'redo': {
            if (!current.session.undoStack.canRedo) return { ok: false, error: new Error('no-redo') };
            current.redo();
            return { ok: true };
          }
          case 'group': {
            const nodeIds = (payload as { nodeIds?: unknown } | undefined)?.nodeIds;
            if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
              return { ok: false, error: new Error('empty-selection') };
            }
            const ids = nodeIds as string[];
            const allExist = ids.every((id) => current.session.workingConfig.symbols.some((s) => s.id === id));
            if (!allExist) return { ok: false, error: new Error('symbol-not-found') };
            current.groupSymbols(ids);
            return { ok: true };
          }
          case 'ungroup': {
            const groupId = (payload as { groupId?: unknown } | undefined)?.groupId;
            if (typeof groupId !== 'string') return { ok: false, error: new Error('invalid-node') };
            const node = current.session.workingConfig.symbols.find((s) => s.id === groupId);
            if (!node) return { ok: false, error: new Error('symbol-not-found') };
            if (node.type !== 'scada-group') return { ok: false, error: new Error('not-a-group') };
            current.ungroupSymbols(groupId);
            return { ok: true };
          }
          default:
            return { ok: false, error: new Error(`Unknown method: ${method}`) };
        }
      },
    };

    return componentRegistry.register({
      id: String(id),
      _cid: cid,
      type: 'scada-editor-canvas',
      capabilities,
    });
  }, [componentRegistry, id, cid]);
}
