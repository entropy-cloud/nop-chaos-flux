import { useEffect, useRef } from 'react';
import type {
  ActionSchema,
  CompiledActionProgram,
  NodeInstance,
  RendererHelpers,
  ResolvedNodeMeta,
  TemplateNode,
} from '@nop-chaos/flux-core';

export function useRenderMonitor(input: {
  monitor: import('@nop-chaos/flux-core').RendererEnv['monitor'];
  templateNode: TemplateNode;
  resolvedMeta: ResolvedNodeMeta;
}) {
  const startedAtRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!input.monitor) {
      startedAtRef.current = undefined;
      return;
    }

    if (
      input.resolvedMeta.when === false ||
      !input.resolvedMeta.visible ||
      input.resolvedMeta.hidden
    ) {
      startedAtRef.current = undefined;
      return;
    }

    const payload = {
      nodeId: input.templateNode.id,
      path: input.templateNode.templatePath,
      type: input.templateNode.rendererType,
    };

    startedAtRef.current = Date.now();

    input.monitor.onRenderStart?.(payload);

    return () => {
      const startedAt = startedAtRef.current;
      startedAtRef.current = undefined;

      if (startedAt == null) {
        return;
      }

      input.monitor?.onRenderEnd?.({
        ...payload,
        durationMs: Math.max(0, Date.now() - startedAt),
      });
    };
  }, [
    input.monitor,
    input.templateNode.id,
    input.templateNode.templatePath,
    input.templateNode.rendererType,
    input.resolvedMeta.when,
    input.resolvedMeta.visible,
    input.resolvedMeta.hidden,
  ]);
}

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
