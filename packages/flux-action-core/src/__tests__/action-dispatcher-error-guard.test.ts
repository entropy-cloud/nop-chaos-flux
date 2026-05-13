import { describe, expect, it, vi } from 'vitest';
import { staticCompiled } from './action-dispatcher-test-support.js';
import { createActionDispatcher } from '../action-dispatcher.js';
import { createActionCtx, createMockAdapter, createTestDispatcher, makeCompiledProgram } from './action-dispatcher-test-support.js';

describe('action-dispatcher diagnostic error guards', () => {
  it('preserves the primary action failure when error diagnostics throw', async () => {
    const primaryError = new Error('primary failure');
    const diagnosticError = new Error('diagnostic failure');
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw primaryError;
      }),
    });
    const onActionError = vi.fn(() => {
      throw diagnosticError;
    });
    const plugin = {
      onError: vi.fn(() => {
        throw diagnosticError;
      }),
    };
    const base = createTestDispatcher({ adapter });

    const configured = createActionDispatcher({
      getEnv: () => base.env,
      evaluator: base.evaluator,
      adapter,
      runtime: base.runtime,
      onActionError,
      plugins: [plugin as any],
    });

    const result = await configured.dispatch(
      makeCompiledProgram([
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'hi' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'hi' } },
        },
      ]),
      createActionCtx({ runtime: base.runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(primaryError);
    expect(onActionError).toHaveBeenCalledWith(primaryError, expect.any(Object));
    expect(plugin.onError).toHaveBeenCalledWith(
      primaryError,
      expect.objectContaining({ phase: 'action', error: primaryError }),
    );
    expect(base.env.notify).not.toHaveBeenCalled();
  });

  it('keeps later plugin diagnostics running when an earlier plugin throws', async () => {
    const primaryError = new Error('primary failure');
    const diagnosticError = new Error('diagnostic failure');
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw primaryError;
      }),
    });
    const firstPlugin = {
      onError: vi.fn(() => {
        throw diagnosticError;
      }),
    };
    const secondPlugin = {
      onError: vi.fn(),
    };
    const base = createTestDispatcher({ adapter });
    const dispatcher = createActionDispatcher({
      getEnv: () => base.env,
      evaluator: base.evaluator,
      adapter,
      runtime: base.runtime,
      plugins: [firstPlugin as any, secondPlugin as any],
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'hi' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'hi' } },
        },
      ]),
      createActionCtx({ runtime: base.runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(primaryError);
    expect(firstPlugin.onError).toHaveBeenCalledWith(
      primaryError,
      expect.objectContaining({ phase: 'action', error: primaryError }),
    );
    expect(secondPlugin.onError).toHaveBeenCalledWith(
      primaryError,
      expect.objectContaining({ phase: 'action', error: primaryError }),
    );
    expect(base.env.notify).not.toHaveBeenCalled();
  });
});
