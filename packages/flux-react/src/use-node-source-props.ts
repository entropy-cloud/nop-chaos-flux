import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActionContext, ResolvedNodeProps, ScopeRef, TemplateNode } from '@nop-chaos/flux-core';
import { useRendererRuntimeContext } from './runtime-context-hooks.js';
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
  // plan 2026-09-28-6 P14: a `sourcePropKeys.length === 0` fast path was
  // attempted and REVERTED — the cyclic-graph contract tests
  // (use-node-source-props.test.tsx "still finds nested source schemas inside
  // cyclic graphs") pin that source schemas can reach props through
  // undeclared channels (runtime/expression-constructed values), so the DFS
  // must stay as the safety net regardless of declared keys.
  if (sourcePropKeys.some((key) => isSourceSchema(propsValue[key]))) {
    return true;
  }

  // Allocation-frugal traversal (plan 2026-09-29-4 R2-P4): the previous
  // version pushed whole arrays/objects with spread (`stack.push(...current)`)
  // and `Object.values()` per record — one 1000-row source produced ~1000
  // intermediate arrays per re-resolution. Cursor frames (one per container)
  // keep identical semantics (own-enumerable keys only, cycle-safe via the
  // visited set; the boolean result is order-independent even though array
  // children now visit forward instead of LIFO) with O(depth) allocations
  // instead of O(nodes). The declared-key fast path above stays; the DFS
  // remains the safety net.
  interface Frame {
    container: unknown[] | Record<string, unknown>;
    keys: readonly string[] | null;
    index: number;
  }

  const stack: Frame[] = [{ container: propsValue, keys: Object.keys(propsValue), index: 0 }];
  const visited = new Set<object>();

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.index >= (frame.keys ? frame.keys.length : (frame.container as unknown[]).length)) {
      stack.pop();
      continue;
    }

    const current = frame.keys
      ? (frame.container as Record<string, unknown>)[frame.keys[frame.index]!]
      : (frame.container as unknown[])[frame.index];
    frame.index += 1;

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
      stack.push({ container: current as unknown[], keys: null, index: 0 });
      continue;
    }

    stack.push({ container: current as Record<string, unknown>, keys: Object.keys(current as Record<string, unknown>), index: 0 });
  }

  return false;
}

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: ResolvedNodeProps['value'],
  scope: ScopeRef,
  ctx?: Partial<ActionContext>,
): ResolvedNodeProps['value'] {
  const runtime = useRendererRuntimeContext();
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

    controller.run(propsValue, scope, ctx);
  }, [controller, hasSourceProps, propsValue, scope, ctx]);

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
