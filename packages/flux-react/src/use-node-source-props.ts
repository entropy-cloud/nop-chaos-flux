import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { TemplateNode, ScopeRef } from '@nop-chaos/flux-core';
import { useRendererRuntime } from './hooks.js';
import { isSourceSchema } from './use-source-value.js';
import { createNodeSourcePropController } from './node-source-prop-controller.js';

export type { SourceTransientState } from '@nop-chaos/flux-core';

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: Readonly<Record<string, unknown>>,
  scope: ScopeRef,
): Readonly<Record<string, unknown>> {
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

  const [controller] = useState(() => createNodeSourcePropController(node, runtime));

  const propsValueRef = useRef(propsValue);
  const scopeRef = useRef(scope);

  useEffect(() => {
    propsValueRef.current = propsValue;
  });

  useEffect(() => {
    scopeRef.current = scope;
  });

  const sourceInputs = useMemo(
    () => sourcePropKeys.map((key) => propsValue[key]),
    [propsValue, sourcePropKeys],
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputs]);

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
