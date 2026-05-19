import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
} from './action-dispatcher-test-support.js';
import { actionNode } from './control-flow-test-fixtures.js';

describe('contract: timeout integration with dispatcher', () => {
  it('timeout returns timedOut result with cancelled flag', async () => {
    vi.useFakeTimers();
    try {
      const adapter = createMockAdapter({
        invokeBuiltInAction: async () => {
          await new Promise(() => {});
          return { ok: true };
        },
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          actionNode('setValue', { path: 'x', value: 1 }, {
            control: { timeout: 50 },
            source: { timeout: 50 },
          }),
        ]),
        createActionCtx({ runtime }),
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.timedOut).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
    } finally {
      vi.useRealTimers();
    }
  });

  it('timeout does not fire when action completes in time', async () => {
    vi.useFakeTimers();
    try {
      const adapter = createMockAdapter({
        invokeBuiltInAction: async () => ({ ok: true, data: 'fast' }),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          actionNode('setValue', { path: 'x', value: 1 }, {
            control: { timeout: 1000 },
            source: { timeout: 1000 },
          }),
        ]),
        createActionCtx({ runtime }),
      );

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(result.data).toBe('fast');
      expect(result.timedOut).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('contract: abort/cancel via signal propagation', () => {
  it('abort during retry delay returns cancelled result', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const adapter = createMockAdapter({
        invokeBuiltInAction: vi.fn(async () => ({ ok: false, error: new Error('retry-me') })),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          actionNode('setValue', { path: 'x', value: 1 }, {
            control: { retry: { times: 3, delay: 100 } },
            source: { retry: { times: 3, delay: 100 } },
          }),
        ]),
        createActionCtx({ runtime, signal: controller.signal }),
      );

      await Promise.resolve();
      controller.abort(new Error('user-cancelled'));
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pre-aborted signal returns cancelled result on first retry check', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      controller.abort(new Error('pre-aborted'));
      const adapter = createMockAdapter({
        invokeBuiltInAction: vi.fn(async () => ({ ok: true })),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          actionNode('setValue', { path: 'x', value: 1 }, {
            control: { retry: { times: 2, delay: 100 } },
            source: { retry: { times: 2, delay: 100 } },
          }),
        ]),
        createActionCtx({ runtime, signal: controller.signal }),
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
