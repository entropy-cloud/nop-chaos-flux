import { useEffect } from 'react';
import type {
  ComponentHandleRegistry,
  CompiledSchemaNode,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/flux-core';

export function useNodeDebugData(
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  cid: number | undefined,
  node: CompiledSchemaNode,
  activeScope: ScopeRef,
  resolvedMeta: ResolvedNodeMeta,
  resolvedPropsValue: ResolvedNodeProps['value']
): void {
  useEffect(() => {
    if (!activeComponentRegistry || typeof cid !== 'number') {
      return;
    }

    activeComponentRegistry.setHandleDebugData?.(cid, {
      nodeId: node.id,
      path: node.path,
      rendererType: node.type,
      scope: activeScope,
      resolvedMeta,
      resolvedProps: resolvedPropsValue,
      updatedAt: Date.now()
    });

    return () => {
      activeComponentRegistry.setHandleDebugData?.(cid, undefined);
    };
  }, [activeComponentRegistry, cid, activeScope, node.id, node.path, node.type, resolvedMeta, resolvedPropsValue]);
}
