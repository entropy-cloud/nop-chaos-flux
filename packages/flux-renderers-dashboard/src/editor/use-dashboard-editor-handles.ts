import { useEffect, useRef } from 'react';
import type {
  ComponentCapabilities,
  ComponentHandleRegistry,
} from '@nop-chaos/flux-core';
import type { EditorCore } from '@nop-chaos/editor-core';
import type { DashboardDocument } from './dashboard-domain-adapter.js';

const EDITOR_HANDLE_METHODS = ['save', 'undo', 'redo', 'getLayout'] as const;
const ALL_HANDLE_METHOD_SET = new Set<string>(EDITOR_HANDLE_METHODS);

export interface UseDashboardEditorHandlesArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | undefined;
  cid: number | undefined;
  core: EditorCore<DashboardDocument, unknown> | null;
  /** commit 成功后的回调（host 下游同步 + schema onSave 事件派发）。 */
  onCommitted?: (serialized: string, layout: DashboardDocument) => void;
}

/**
 * dashboard editor 组件句柄（`component:save()` / `undo` / `redo` / `getLayout`，
 * 对齐 hmi editor 句柄注册模式 design-architecture.md §8.5）。
 */
export function useDashboardEditorHandles(args: UseDashboardEditorHandlesArgs): void {
  const { componentRegistry, id, cid } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  useEffect(() => {
    if (!componentRegistry || id === undefined) return undefined;

    const capabilities: ComponentCapabilities = {
      hasMethod(method) {
        return ALL_HANDLE_METHOD_SET.has(method);
      },
      listMethods() {
        return [...EDITOR_HANDLE_METHODS];
      },
      invoke(method) {
        const current = latest.current.core;
        if (!current) return { ok: false, error: new Error('not-mounted') };
        switch (method) {
          case 'save': {
            const result = current.commit();
            if (!result.ok) return { ok: false, error: result.error ?? new Error('commit failed') };
            latest.current.onCommitted?.(result.serialized as string, current.getState().working);
            return { ok: true, data: result.serialized };
          }
          case 'undo': {
            const ok = current.undo();
            return ok ? { ok: true } : { ok: false, error: new Error('no-undo') };
          }
          case 'redo': {
            const ok = current.redo();
            return ok ? { ok: true } : { ok: false, error: new Error('no-redo') };
          }
          case 'getLayout': {
            return { ok: true, data: current.getState().working.panels };
          }
          default:
            return { ok: false, error: new Error(`unknown method "${method}"`) };
        }
      },
    };

    return componentRegistry.register({
      id: String(id),
      _cid: cid,
      type: 'dashboard-editor',
      capabilities,
    });
  }, [componentRegistry, id, cid]);
}
