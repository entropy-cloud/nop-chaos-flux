import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { TemplateNode, ScopeRef } from '@nop-chaos/flux-core';
import { useRendererRuntime } from './hooks';
import { isSourceSchema } from './use-source-value';
import { createNodeSourcePropController } from './node-source-prop-controller';

export type { SourceTransientState } from './node-source-prop-controller';

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: Readonly<Record<string, unknown>>,
  scope: ScopeRef,
): Readonly<Record<string, unknown>> {
  const runtime = useRendererRuntime();
  const sourcePropKeys = node.sourcePropKeys;
  const hasSourceProps = useMemo(
    () => sourcePropKeys.some((key) => isSourceSchema(propsValue[key])),
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
