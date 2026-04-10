import { useEffect } from 'react';
import type {
  ComponentHandleRegistry,
  NodeInstance,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/flux-core';

export function useNodeDebugData(
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  cid: number | undefined,
  nodeInstance: NodeInstance,
  activeScope: ScopeRef,
  resolvedMeta: ResolvedNodeMeta,
  resolvedPropsValue: ResolvedNodeProps['value']
): void {
  useEffect(() => {
    if (!activeComponentRegistry || typeof cid !== 'number') {
      return;
    }

    if (!activeComponentRegistry.debugEnabled) {
      return;
    }

    activeComponentRegistry.setHandleDebugData?.(cid, {
      nodeId: nodeInstance.templateNode.id,
      path: nodeInstance.templateNode.templatePath,
      rendererType: nodeInstance.templateNode.rendererType,
      nodeInstance,
      scope: activeScope,
      resolvedMeta,
      resolvedProps: resolvedPropsValue,
      updatedAt: Date.now()
    });

    return () => {
      activeComponentRegistry.setHandleDebugData?.(cid, undefined);
    };
  }, [activeComponentRegistry, activeComponentRegistry?.debugEnabled, cid, nodeInstance, activeScope, resolvedMeta, resolvedPropsValue]);
}
