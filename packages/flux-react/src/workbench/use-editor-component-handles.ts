import { useEffect, useRef } from 'react';
import type {
  ComponentCapabilities,
  ComponentHandleRegistry,
} from '@nop-chaos/flux-core';

/**
 * 统一编辑器组件句柄注册 helper（P4.3，plan 557；editor-designer-standard.md §2.8）。
 *
 * capabilities（hasMethod/listMethods/invoke）+ `componentRegistry.register` + latest-ref
 * 模式——dashboard/industrial 等家族句柄 hook 的共享注册骨架；`invoke` 由家族提供
 * （EditorCore ops 映射）。ctx 第三参（ComponentCapabilities.invoke 签名）两家族现均未
 * 消费，不透出；家族未来需要时为加法扩展。
 */

interface EditorHandleResult {
  ok: boolean;
  data?: unknown;
  error?: Error;
}

export interface UseEditorComponentHandlesArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | undefined;
  cid: number | undefined;
  /** 组件类型（registry handle 的 type 面，如 `dashboard-editor`）。 */
  componentType: string;
  /** 声明方法面（hasMethod/listMethods 依据；与 manifest/domainCommands 声明对齐）。 */
  methods: readonly string[];
  /** 家族调用实现（payload 未消费的方法可忽略第二参）。 */
  invoke: (method: string, payload: unknown) => EditorHandleResult;
}

export function useEditorComponentHandles(args: UseEditorComponentHandlesArgs): void {
  const { componentRegistry, id, cid } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  useEffect(() => {
    if (!componentRegistry || id === undefined) return undefined;
    const methodSet = new Set<string>(latest.current.methods);

    const capabilities: ComponentCapabilities = {
      hasMethod(method) {
        return methodSet.has(method);
      },
      listMethods() {
        return [...latest.current.methods];
      },
      invoke(method, payload) {
        return latest.current.invoke(method, payload);
      },
    };

    return componentRegistry.register({
      id: String(id),
      _cid: cid,
      type: latest.current.componentType,
      capabilities,
    });
  }, [componentRegistry, id, cid]);
}
