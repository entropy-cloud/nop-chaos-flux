import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
} from './action-dispatcher-test-support.js';
import { actionNode, parallelNode } from './control-flow-test-fixtures.js';
import { isAbortError } from '@nop-chaos/flux-core';

// FM-011: an intentionally aborted component action (AbortError thrown through
// the adapter) must keep its abort identity after attachThrownMetadata wraps it
// — it is classified cancelled, not a plain failure.
describe('contract: abort identity survives metadata wrapping (FM-011)', () => {
  it('component action throwing AbortError yields a cancelled result with an abort-identifiable error', async () => {
    const adapter = createMockAdapter({
      invokeComponentAction: vi.fn(async () => {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'component:doStuff',
          payload: {},
          targeting: { componentId: 'my-comp' },
          control: {},
          source: { action: 'component:doStuff', componentId: 'my-comp' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.cancelled).toBe(true);
    expect(isAbortError(result.error)).toBe(true);
  });

  it('wrapped AbortError keeps name/code on the wrapper for diagnostics', async () => {
    const adapter = createMockAdapter({
      invokeComponentAction: vi.fn(async () => {
        // Node-style abort: plain Error with abort identity own-properties
        // (DOMException.code is a readonly accessor, not assignable).
        const abort = new Error('This operation was aborted');
        abort.name = 'AbortError';
        (abort as Error & { code?: string }).code = 'ABORT_ERR';
        throw abort;
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'component:doStuff',
          payload: {},
          targeting: { componentId: 'my-comp' },
          control: {},
          source: { action: 'component:doStuff', componentId: 'my-comp' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    const error = result.error as { name?: string; code?: string };
    expect(error.name).toBe('AbortError');
    expect(error.code).toBe('ABORT_ERR');
  });
});

// FM-012: the parallel aggregate must preserve cancellation/timeout identity
// when the batch terminated without a real failure — an all-cancelled batch is
// classified cancelled, not a plain failure.
describe('contract: parallel aggregate preserves cancellation identity (FM-012)', () => {
  it('all-cancelled batch keeps cancelled=true on the aggregate', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: false, cancelled: true }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('setValue', { path: 'b', value: 2 }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBeUndefined();
  });

  it('all-timed-out batch keeps timedOut=true on the aggregate', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: false, cancelled: true, timedOut: true }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('setValue', { path: 'b', value: 2 }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBe(true);
  });

  it('mixed batch with a real failure stays failure-class (no cancelled flag)', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) =>
        inv.action === 'showToast'
          ? { ok: false, error: new Error('real failure') }
          : { ok: false, cancelled: true },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('showToast', { message: 'fail' }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBeUndefined();
  });
});
