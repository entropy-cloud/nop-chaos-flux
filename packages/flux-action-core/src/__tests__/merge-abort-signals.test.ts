import { describe, expect, it, vi } from 'vitest';
import type { ActionContext, ActionResult } from '@nop-chaos/flux-core';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
} from './action-dispatcher-test-support.js';
import { actionNode } from './control-flow-test-fixtures.js';

function abortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function captureSignalAdapter(
  run?: (signal: AbortSignal) => Promise<ActionResult>,
): { adapter: ReturnType<typeof createMockAdapter>; captured: () => AbortSignal | undefined } {
  let captured: AbortSignal | undefined;
  const adapter = createMockAdapter({
    invokeBuiltInAction: vi.fn(async (_invocation, ctx: ActionContext) => {
      captured = ctx.signal;
      if (run) {
        return await run(ctx.signal!);
      }
      return { ok: true };
    }),
  });
  return { adapter, captured: () => captured };
}

function pendingOnSignal(signal: AbortSignal): Promise<never> {
  return new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

describe('mergeAbortSignals via dispatch (characterization)', () => {
  it('no action signal: the action observes the dispatcher root signal itself', async () => {
    const { adapter, captured } = captureSignalAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(captured()).toBe(dispatcher.getAbortSignal());
  });

  it('action signal identical to root: passthrough keeps the root signal identity', async () => {
    const { adapter, captured } = captureSignalAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime, signal: dispatcher.getAbortSignal() }),
    );

    expect(result.ok).toBe(true);
    expect(captured()).toBe(dispatcher.getAbortSignal());
  });

  it('root already aborted: cancelled immediately without running any action', async () => {
    const { adapter, captured } = captureSignalAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    dispatcher.dispose();
    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(captured()).toBeUndefined();
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('action already aborted: merged signal is the action signal itself, so its custom reason surfaces unchanged', async () => {
    const { adapter, captured } = captureSignalAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const sentinel = abortError('action-pre-cancelled');
    const actionController = new AbortController();
    actionController.abort(sentinel);

    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime, signal: actionController.signal }),
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe(sentinel);
    expect(captured()).toBeUndefined();
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('dual-live: the action observes a fresh composite signal and reasons propagate', async () => {
    const { adapter, captured } = captureSignalAdapter((signal) => pendingOnSignal(signal));
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const actionController = new AbortController();
    const promise = dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime, signal: actionController.signal }),
    );
    await vi.waitFor(() => expect(captured()).toBeDefined());

    expect(captured()).not.toBe(actionController.signal);
    expect(captured()).not.toBe(dispatcher.getAbortSignal());
    expect(captured()!.aborted).toBe(false);

    const sentinel = abortError('mid-flight-cancel');
    actionController.abort(sentinel);

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe(sentinel);
    expect(captured()!.reason).toBe(sentinel);
  });

  it('cleanup after a completed dispatch freezes the composite: late root abort does not propagate', async () => {
    const { adapter, captured } = captureSignalAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const actionController = new AbortController();
    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime, signal: actionController.signal }),
    );

    expect(result.ok).toBe(true);
    expect(captured()).toBeDefined();
    expect(captured()!.aborted).toBe(false);

    dispatcher.dispose();
    expect(captured()!.aborted).toBe(false);
  });

  it('mid-flight root abort propagates through the composite and settles cancelled via auto-cleanup', async () => {
    const { adapter, captured } = captureSignalAdapter((signal) => pendingOnSignal(signal));
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const actionController = new AbortController();
    const promise = dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime, signal: actionController.signal }),
    );
    await vi.waitFor(() => expect(captured()).toBeDefined());

    dispatcher.dispose();

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(captured()!.aborted).toBe(true);
    expect(captured()!.reason.name).toBe('AbortError');
  });
});
