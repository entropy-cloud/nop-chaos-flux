import { useEffect, useRef } from 'react';
import type {
  ActionSchema,
  CompiledActionProgram,
  NodeInstance,
  RendererHelpers,
} from '@nop-chaos/flux-core';

interface NodeLifecycleActions {
  onMount?: ActionSchema | ActionSchema[] | CompiledActionProgram;
  onUnmount?: ActionSchema | ActionSchema[] | CompiledActionProgram;
}

export function useNodeLifecycleActions(input: {
  lifecycleActions: NodeLifecycleActions | undefined;
  helpers: RendererHelpers;
  nodeInstance: NodeInstance;
  enabled?: boolean;
}) {
  const latestHelpersRef = useRef(input.helpers);
  const latestLifecycleActionsRef = useRef(input.lifecycleActions);
  const lastInitKeyRef = useRef<unknown>(undefined);
  const mountedRef = useRef(false);
  // FM-028 F5: StrictMode's mount/cleanup/mount simulation used to dispatch
  // onUnmount for real (and re-fire onMount). The cleanup defers the onUnmount
  // decision to a microtask and skips it when the same node instance re-armed
  // (simulation); a real unmount still dispatches and resets the mount key.
  const lifecycleEpochRef = useRef(0);
  const realUnmountRef = useRef(false);

  useEffect(() => {
    latestHelpersRef.current = input.helpers;
    latestLifecycleActionsRef.current = input.lifecycleActions;
  });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resolveUnmount = (key: unknown, epoch: number, lifecycleActions: NodeLifecycleActions) => {
    // Epoch counter read is the point of the deferred check (may have advanced
    // past `epoch` if the same node re-armed); the read happens at microtask
    // time, not during render.
    const sameNodeRearmed =
      lifecycleEpochRef.current !== epoch && lastInitKeyRef.current === key;
    if (sameNodeRearmed) {
      // StrictMode simulated unmount — the node is still live.
      return;
    }
    realUnmountRef.current = true;
    lastInitKeyRef.current = undefined;
    if (!lifecycleActions.onUnmount) {
      return;
    }
    warnIfPreventionRequestedOnLifecycle(lifecycleActions.onUnmount, 'onUnmount');
    void latestHelpersRef.current.dispatch(lifecycleActions.onUnmount, {
      nodeInstance: key as NodeInstance,
    });
  };

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const key = input.nodeInstance;
    const epoch = ++lifecycleEpochRef.current;
    const isLiveRemount = lastInitKeyRef.current === key && !realUnmountRef.current;
    lastInitKeyRef.current = key;
    realUnmountRef.current = false;

    if (!isLiveRemount) {
      const lifecycleActions = latestLifecycleActionsRef.current;

      if (lifecycleActions?.onMount) {
        warnIfPreventionRequestedOnLifecycle(lifecycleActions.onMount, 'onMount');
        void latestHelpersRef.current.dispatch(lifecycleActions.onMount, {
          nodeInstance: input.nodeInstance,
        });
      }
    }

    return () => {
      const currentLifecycleActions = latestLifecycleActionsRef.current;

      if (!currentLifecycleActions?.onUnmount) {
        lastInitKeyRef.current = undefined;
        return;
      }

      queueMicrotask(() => {
        resolveUnmount(key, epoch, currentLifecycleActions);
      });
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
