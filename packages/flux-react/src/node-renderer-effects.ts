import { useEffect, useRef } from 'react';
import type {
  ActionSchema,
  CompiledActionProgram,
  NodeInstance,
  RendererHelpers,
} from '@nop-chaos/flux-core';

export function useNodeLifecycleActions(input: {
  lifecycleActions:
    | {
        onMount?: ActionSchema | ActionSchema[] | CompiledActionProgram;
        onUnmount?: ActionSchema | ActionSchema[] | CompiledActionProgram;
      }
    | undefined;
  helpers: RendererHelpers;
  nodeInstance: NodeInstance;
  enabled?: boolean;
}) {
  const latestHelpersRef = useRef(input.helpers);
  const latestLifecycleActionsRef = useRef(input.lifecycleActions);
  const lastInitKeyRef = useRef<unknown>(undefined);

  useEffect(() => {
    latestHelpersRef.current = input.helpers;
    latestLifecycleActionsRef.current = input.lifecycleActions;
  });

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const key = input.nodeInstance;
    const alreadyMounted = lastInitKeyRef.current === key;
    lastInitKeyRef.current = key;

    if (!alreadyMounted) {
      const lifecycleActions = latestLifecycleActionsRef.current;

      if (lifecycleActions?.onMount) {
        warnIfPreventionRequestedOnLifecycle(lifecycleActions.onMount, 'onMount');
        void latestHelpersRef.current.dispatch(lifecycleActions.onMount, {
          nodeInstance: input.nodeInstance,
        });
      }
    }

    return () => {
      lastInitKeyRef.current = undefined;
      const currentLifecycleActions = latestLifecycleActionsRef.current;

      if (currentLifecycleActions?.onUnmount) {
        warnIfPreventionRequestedOnLifecycle(currentLifecycleActions.onUnmount, 'onUnmount');
        void latestHelpersRef.current.dispatch(currentLifecycleActions.onUnmount, {
          nodeInstance: input.nodeInstance,
        });
      }
    };
  }, [input.enabled, input.nodeInstance]);
}

function warnIfPreventionRequestedOnLifecycle(
  action: ActionSchema | ActionSchema[] | CompiledActionProgram,
  lifecycleLabel: 'onMount' | 'onUnmount',
): void {
  const nodes = extractActionNodes(action);

  for (const entry of nodes) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry.preventDefault !== undefined || entry.stopPropagation !== undefined)
    ) {
      console.warn(
        `[flux] preventDefault/stopPropagation declared on ${lifecycleLabel} action has no effect: lifecycle actions have no native event to block.`,
      );
      return;
    }
  }
}

function extractActionNodes(
  action: ActionSchema | ActionSchema[] | CompiledActionProgram,
): Array<{ preventDefault?: unknown; stopPropagation?: unknown }> {
  if (action && typeof action === 'object' && 'nodes' in action && Array.isArray(action.nodes)) {
    return action.nodes.map((node) => ({
      preventDefault: (node as { preventDefault?: unknown }).preventDefault,
      stopPropagation: (node as { stopPropagation?: unknown }).stopPropagation,
    }));
  }

  if (Array.isArray(action)) {
    return action.map((entry) => ({
      preventDefault: (entry as { preventDefault?: unknown }).preventDefault,
      stopPropagation: (entry as { stopPropagation?: unknown }).stopPropagation,
    }));
  }

  return [
    {
      preventDefault: (action as { preventDefault?: unknown }).preventDefault,
      stopPropagation: (action as { stopPropagation?: unknown }).stopPropagation,
    },
  ];
}
