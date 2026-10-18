import React, { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useNodeLifecycleActions } from '../node-renderer-effects.js';
import type { ActionSchema, NodeInstance, RendererHelpers } from '@nop-chaos/flux-core';

// FM-028 F5: StrictMode's mount/cleanup/mount simulation used to dispatch
// onUnmount for real during the simulated unmount (and the remount re-fired
// onMount). Lifecycle actions must observe exactly one onMount and zero
// onUnmount while the node is still live.

const onMountAction = { action: 'lifecycle:mount' } as ActionSchema;
const onUnmountAction = { action: 'lifecycle:unmount' } as ActionSchema;

const dispatched: string[] = [];
const helpers = {
  dispatch: vi.fn(async (action: ActionSchema) => {
    dispatched.push(action.action);
    return { ok: true };
  }),
} as unknown as RendererHelpers;

const nodeInstance = { id: 'lifecycle-probe' } as unknown as NodeInstance;

function LifecycleProbe(): null {
  useNodeLifecycleActions({
    lifecycleActions: { onMount: onMountAction, onUnmount: onUnmountAction },
    helpers,
    nodeInstance,
  });
  return null;
}

describe('node lifecycle actions under StrictMode (FM-028 F5 regression)', () => {
  it('fires onMount once and never fires onUnmount while the node is live', async () => {
    render(
      <StrictMode>
        <LifecycleProbe />
      </StrictMode>,
    );

    // Settle: the deferred onUnmount decision resolves in a microtask after
    // the simulation's cleanup pass.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dispatched).toEqual(['lifecycle:mount']);

    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
