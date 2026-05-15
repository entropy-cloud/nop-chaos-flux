import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ResolvedNodeProps, ScopeRef, TemplateNode } from '@nop-chaos/flux-core';
import { useRendererRuntime } from './hooks.js';
import { isSourceSchema } from './use-source-value.js';
import {
  createNodeSourcePropController,
  type NodeSourcePropController,
} from './node-source-prop-controller.js';

export type { SourceTransientState } from '@nop-chaos/flux-core';

function createIdleSourcePropController(): NodeSourcePropController {
  const snapshot = { sourceInputs: [], value: {} };

  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    run: () => undefined,
    dispose: () => undefined,
  };
}

export function hasSourcePropsInValue(
  propsValue: ResolvedNodeProps['value'],
  sourcePropKeys: readonly string[],
): boolean {
  if (sourcePropKeys.some((key) => isSourceSchema(propsValue[key]))) {
    return true;
  }

  const stack: unknown[] = Object.values(propsValue);
  const visited = new Set<object>();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== 'object') {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

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
}

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: ResolvedNodeProps['value'],
  scope: ScopeRef,
): ResolvedNodeProps['value'] {
  const runtime = useRendererRuntime();
  const sourcePropKeys = node.sourcePropKeys;
  const hasSourceProps = useMemo(
    () => hasSourcePropsInValue(propsValue, sourcePropKeys),
    [propsValue, sourcePropKeys],
  );
  const controller = useMemo(
    () =>
      hasSourceProps
        ? createNodeSourcePropController(node, runtime)
        : createIdleSourcePropController(),
    [node, runtime, hasSourceProps],
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    if (!hasSourceProps) {
      return;
    }

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
