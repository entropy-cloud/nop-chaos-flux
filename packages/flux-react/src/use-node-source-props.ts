import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ResolvedNodeProps, ScopeRef, TemplateNode } from '@nop-chaos/flux-core';
import { useRendererRuntime } from './hooks.js';
import { isSourceSchema } from './use-source-value.js';
import { createNodeSourcePropController } from './node-source-prop-controller.js';

export type { SourceTransientState } from '@nop-chaos/flux-core';

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: ResolvedNodeProps['value'],
  scope: ScopeRef,
): ResolvedNodeProps['value'] {
  const runtime = useRendererRuntime();
  const sourcePropKeys = node.sourcePropKeys;
  const hasSourceProps = useMemo(
    () => {
      if (sourcePropKeys.some((key) => isSourceSchema(propsValue[key]))) {
        return true;
      }

      const stack: unknown[] = Object.values(propsValue);
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || typeof current !== 'object') {
          continue;
        }
        if (isSourceSchema(current)) {
          return true;
        }
        if (Array.isArray(current)) {
          stack.push(...current);
          continue;
        }
        stack.push(...Object.values(current as Record<string, unknown>));
      }

      return false;
    },
    [propsValue, sourcePropKeys],
  );

  const controller = useMemo(() => createNodeSourcePropController(node, runtime), [node, runtime]);

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValue, scope);
  }, [controller, hasSourceProps, propsValue, scope]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  if (!hasSourceProps) {
    return propsValue;
  }

  return snapshot.value;
}
