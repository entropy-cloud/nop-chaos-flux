import { useEffect } from 'react';
import type {
  ComponentHandleRegistry,
  FormRuntime,
  NodeInstance,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/flux-core';

function readMetaRule(schema: Record<string, unknown>, key: 'visible' | 'hidden' | 'disabled') {
  const value = schema[key];
  return typeof value === 'string' ? value : undefined;
}

export function useNodeDebugData(
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  cid: number | undefined,
  nodeInstance: NodeInstance,
  activeScope: ScopeRef,
  resolvedMeta: ResolvedNodeMeta,
  resolvedPropsValue: ResolvedNodeProps['value'],
  currentForm?: FormRuntime
): void {
  useEffect(() => {
    if (!activeComponentRegistry || typeof cid !== 'number') {
      return;
    }

    const schema = nodeInstance.templateNode.schema as Record<string, unknown>;
    const fieldName = typeof resolvedPropsValue.name === 'string'
      ? resolvedPropsValue.name
      : typeof schema.name === 'string'
        ? schema.name
        : undefined;

    activeComponentRegistry.setHandleDebugData?.(cid, {
      nodeId: nodeInstance.templateNode.id,
      path: nodeInstance.templateNode.templatePath,
      rendererType: nodeInstance.templateNode.rendererType,
      nodeInstance,
      scope: activeScope,
      resolvedMeta,
      resolvedProps: resolvedPropsValue,
      sourceHints: {
        fieldName,
        formValue: fieldName ? currentForm?.store.getState().values?.[fieldName] : undefined,
        scopeValue: fieldName ? activeScope.readVisible?.()?.[fieldName] : undefined,
        metaRules: {
          visible: readMetaRule(schema, 'visible'),
          hidden: readMetaRule(schema, 'hidden'),
          disabled: readMetaRule(schema, 'disabled')
        }
      },
      updatedAt: Date.now()
    });

    return () => {
      activeComponentRegistry.setHandleDebugData?.(cid, undefined);
    };
  }, [activeComponentRegistry, cid, nodeInstance, activeScope, resolvedMeta, resolvedPropsValue, currentForm]);
}
