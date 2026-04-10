import { useEffect } from 'react';
import type {
  NodeInstance,
  RendererHelpers,
  ResolvedNodeMeta,
  TemplateNode
} from '@nop-chaos/flux-core';

export function useRenderMonitor(input: {
  monitor: import('@nop-chaos/flux-core').RendererEnv['monitor'];
  templateNode: TemplateNode;
  resolvedMeta: ResolvedNodeMeta;
}) {
  useEffect(() => {
    if (!input.monitor) {
      return;
    }

    if (!input.resolvedMeta.visible || input.resolvedMeta.hidden) {
      return;
    }

    const startedAt = Date.now();
    const payload = {
      nodeId: input.templateNode.id,
      path: input.templateNode.templatePath,
      type: input.templateNode.rendererType
    };

    input.monitor.onRenderStart?.(payload);
    input.monitor.onRenderEnd?.({
      ...payload,
      durationMs: Math.max(0, Date.now() - startedAt)
    });
  }, [
    input.monitor,
    input.templateNode.id,
    input.templateNode.templatePath,
    input.templateNode.rendererType,
    input.resolvedMeta.visible,
    input.resolvedMeta.hidden
  ]);
}

export function useNodeLifecycleActions(input: {
  lifecycleActions: TemplateNode['lifecycleActions'];
  helpers: RendererHelpers;
  nodeInstance: NodeInstance;
}) {
  useEffect(() => {
    if (input.lifecycleActions?.onMount) {
      void input.helpers.dispatch(input.lifecycleActions.onMount as any, {
        nodeInstance: input.nodeInstance
      });
    }

    return () => {
      if (input.lifecycleActions?.onUnmount) {
        void input.helpers.dispatch(input.lifecycleActions.onUnmount as any, {
          nodeInstance: input.nodeInstance
        });
      }
    };
  }, [input.helpers, input.lifecycleActions, input.nodeInstance]);
}
