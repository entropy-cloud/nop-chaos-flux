import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActionSchema, NodeInstance, RendererHelpers } from '@nop-chaos/flux-core';
import { useNodeLifecycleActions } from './node-renderer-effects.js';

function LifecycleProbe(props: {
  helpers: RendererHelpers;
  lifecycleActions:
    | {
        onMount?: ActionSchema | ActionSchema[];
        onUnmount?: ActionSchema | ActionSchema[];
      }
    | undefined;
  nodeInstance: NodeInstance;
}) {
  useNodeLifecycleActions(props);
  return null;
}

describe('useNodeLifecycleActions', () => {
  it('dispatches mount once per node instance and uses latest refs on unmount', () => {
    const mountAction = { actionType: 'custom', action: 'mount-a' } as unknown as ActionSchema;
    const unmountActionA = { actionType: 'custom', action: 'unmount-a' } as unknown as ActionSchema;
    const unmountActionB = { actionType: 'custom', action: 'unmount-b' } as unknown as ActionSchema;
    const dispatchA = vi.fn(async () => ({ ok: true }));
    const dispatchB = vi.fn(async () => ({ ok: true }));
    const helpersA = { dispatch: dispatchA } as unknown as RendererHelpers;
    const helpersB = { dispatch: dispatchB } as unknown as RendererHelpers;
    const nodeInstance = { id: 'node-1' } as unknown as NodeInstance;

    const rendered = render(
      <LifecycleProbe
        helpers={helpersA}
        lifecycleActions={{ onMount: mountAction, onUnmount: unmountActionA }}
        nodeInstance={nodeInstance}
      />,
    );

    expect(dispatchA).toHaveBeenCalledTimes(1);
    expect(dispatchA).toHaveBeenCalledWith(mountAction, { nodeInstance });

    rendered.rerender(
      <LifecycleProbe
        helpers={helpersB}
        lifecycleActions={{ onMount: mountAction, onUnmount: unmountActionB }}
        nodeInstance={nodeInstance}
      />,
    );

    expect(dispatchA).toHaveBeenCalledTimes(1);
    expect(dispatchB).toHaveBeenCalledTimes(0);

    rendered.unmount();

    expect(dispatchB).toHaveBeenCalledTimes(1);
    expect(dispatchB).toHaveBeenCalledWith(unmountActionB, { nodeInstance });
  });

  it('dispatches mount again when the node instance changes', () => {
    const mountAction = { actionType: 'custom', action: 'mount' } as unknown as ActionSchema;
    const dispatch = vi.fn(async () => ({ ok: true }));
    const helpers = { dispatch } as unknown as RendererHelpers;
    const nodeA = { id: 'node-a' } as unknown as NodeInstance;
    const nodeB = { id: 'node-b' } as unknown as NodeInstance;

    const rendered = render(
      <LifecycleProbe
        helpers={helpers}
        lifecycleActions={{ onMount: mountAction }}
        nodeInstance={nodeA}
      />,
    );

    rendered.rerender(
      <LifecycleProbe
        helpers={helpers}
        lifecycleActions={{ onMount: mountAction }}
        nodeInstance={nodeB}
      />,
    );

    expect(dispatch).toHaveBeenNthCalledWith(1, mountAction, { nodeInstance: nodeA });
    expect(dispatch).toHaveBeenNthCalledWith(2, mountAction, { nodeInstance: nodeB });
  });
});
