import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

function failingNode(action: string, extra: Record<string, unknown> = {}) {
  return {
    action,
    when: undefined,
    payload: { args: staticCompiled({ path: 'x', value: 1 }) },
    targeting: {},
    control: {},
    source: { action, args: { path: 'x', value: 1 } },
    ...extra,
  };
}

describe('nested onError failure chains', () => {
  it('reports a single error for a nested onError failure chain (caught-failure suppression preserved on re-wrap)', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const { dispatcher, runtime, env } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        failingNode('setValue', {
          onError: [
            failingNode('showToast', {
              onError: [failingNode('alert')],
            }),
          ],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.onErrorError).toBeInstanceOf(Error);
    expect((result.onErrorError as Error).message).toBe('boom');
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledTimes(3);
    expect(env.notify).not.toHaveBeenCalled();
  });

  it('keeps the caught-failure suppression when the branch failure mixes marked and unmarked results', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        if (invocation.action === 'showToast') {
          return { ok: false, error: new Error('adapter-fail') };
        }
        throw new Error('thrown boom');
      }),
    });
    const { dispatcher, runtime, env } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        failingNode('setValue', {
          onError: [
            failingNode('showToast', {
              onError: [failingNode('alert')],
            }),
          ],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.onErrorError).toBeInstanceOf(Error);
    expect(env.notify).not.toHaveBeenCalled();
  });

  it('keeps the caught-failure suppression when the onError branch failure is adapter-returned', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => ({
        ok: false,
        error: new Error('adapter-fail'),
      })),
    });
    const { dispatcher, runtime, env } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        failingNode('setValue', {
          onError: [failingNode('showToast')],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.onErrorError).toBeInstanceOf(Error);
    expect(env.notify).not.toHaveBeenCalled();
  });
});
