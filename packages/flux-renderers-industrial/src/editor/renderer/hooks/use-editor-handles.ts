import { useEffect, useRef } from 'react';
import type { ComponentCapabilities, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { ScadaConfig, ScadaSymbolNode } from '../../../serialization/config-types.js';
import type { EditorEngineRuntime } from './use-editor-engine.js';

/**
 * editor 扩展句柄方法名（design-renderer.md §8.5.2）。
 * runtime 9 句柄（fit/center/getSymbols/...）属 runtime `use-scada-handles`，经独立注册；
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

export interface UseEditorHandlesArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | undefined;
  cid: number | undefined;
  runtime: EditorEngineRuntime | null;
}

/**
 * editor 扩展句柄注册（design-renderer.md §8.5.2）。
 *
 * 经同一 `ComponentHandleRegistry` 注册 `scada-editor-canvas` 类型组件，
 * 句柄方法转发到 `EditorEngineRuntime` 的编辑操作（addSymbol/removeSymbol/updateSymbol/save/load）。
 * runtime 9 句柄由 runtime `use-scada-handles` 独立注册（runtime 保留），编辑扩展句柄在此注册。
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
        return (EDITOR_HANDLE_METHODS as readonly string[]).includes(method);
      },
      listMethods() {
        return EDITOR_HANDLE_METHODS;
      },
      invoke(method, payload) {
        const current = latest.current.runtime;
        if (!current) return { ok: false, error: new Error('scada editor is not mounted') };

        switch (method) {
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
            if (typeof nodeId !== 'string') return { ok: false, error: new Error('symbol id required') };
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
            current.groupSymbols(nodeIds as string[]);
            return { ok: true };
          }
          case 'ungroup': {
            const groupId = (payload as { groupId?: unknown } | undefined)?.groupId;
            if (typeof groupId !== 'string') return { ok: false, error: new Error('symbol id required') };
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
