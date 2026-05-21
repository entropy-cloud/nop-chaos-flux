import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createMockEvaluator,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';
import { actionNode } from './control-flow-test-fixtures.js';

describe('contract: result chaining in then branches', () => {
  it('then branch failure becomes the final chain result', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') return { ok: false, error: new Error('then-fail') };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'a', value: 1 }, {
          then: [actionNode('showToast', { message: 'x' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('then-fail');
  });

  it('then branch success replaces previous for next sibling', async () => {
    let idx = 0;
    const dataValues = ['first', 'second', 'third'];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: true, data: dataValues[idx++] }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          then: [actionNode('setValue', { path: 'y', value: 2 })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBe('second');
  });
});

describe('contract: onError branch result handling', () => {
  it('returns original failure when onError runs and continueOnError is false', async () => {
    const originalError = new Error('original-fail');
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'setValue') return { ok: false, error: originalError };
        return { ok: true, data: 'recovered' };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          onError: [actionNode('showToast', { message: 'handle' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(originalError);
  });

  it('continueOnError with onError: next action sees onError result as prevResult', async () => {
    const actionsSeen: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        actionsSeen.push(inv.action);
        if (inv.action === 'showToast') return { ok: false, error: new Error('fail') };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('showToast', { message: 'x' }, {
          control: { continueOnError: true },
          source: { continueOnError: true },
          onError: [actionNode('setValue', { path: 'recovery', value: true })],
        }),
        actionNode('setValue', { path: 'after', value: 1 }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(actionsSeen).toEqual(['showToast', 'setValue', 'setValue']);
    expect(result.ok).toBe(true);
    expect(result.data).toBe('setValue');
  });

  it('onError failure does not recursively retrigger parent onError', async () => {
    const actionsSeen: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        actionsSeen.push(inv.action);
        if (inv.action === 'setValue') return { ok: false, error: new Error('fail') };
        return { ok: true };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          onError: [
            actionNode('setValue', { path: 'y', value: 2 }, {
              onError: [actionNode('showToast', { message: 'nested' })],
            }),
          ],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(actionsSeen).toEqual(['setValue', 'setValue', 'showToast']);
    expect(result.ok).toBe(false);
  });

  it('attaches secondary onError dispatch throws to the returned failure result', async () => {
    const originalError = new Error('primary-fail');
    const secondaryError = new Error('onError-fail');
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'setValue') {
          return { ok: false, error: originalError };
        }

        throw secondaryError;
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          onError: [actionNode('showToast', { message: 'recover' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(originalError);
    expect((result as { onErrorError?: unknown }).onErrorError).toBe(secondaryError);
    expect((runtime.env.notify as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('preserves onError failure results even when the branch failure has no error field', async () => {
    const originalError = new Error('primary-fail');
    const branchFailure = { ok: false, data: { reason: 'structured-branch-failure' } };
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'setValue') {
          return { ok: false, error: originalError };
        }

        return branchFailure as any;
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          onError: [actionNode('showToast', { message: 'recover' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(originalError);
    expect((result as { onErrorError?: unknown }).onErrorError).toEqual(branchFailure);
  });
});

describe('contract: skipped action (when=false) branch behavior', () => {
  const makeEvaluator = () => createMockEvaluator();

  it('does not run then branch for skipped action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          when: staticCompiled(false),
          then: [actionNode('showToast', { message: 'should-not-run' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('does not run onError branch for skipped action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          when: staticCompiled(false),
          onError: [actionNode('showToast', { message: 'should-not-run' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('does not run onSettled for skipped (neutral-class) action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          when: staticCompiled(false),
          onSettled: [actionNode('showToast', { message: 'should-not-run' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});

describe('contract: empty action program', () => {
  it('returns ok:true for empty nodes array', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(makeCompiledProgram([]), createActionCtx({ runtime }));

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});

describe('contract: onSettled sees original triggering result', () => {
  it('onSettled receives original result through evaluation bindings, not then replacement', async () => {
    const builtinMock = vi.fn(async (inv: any) => {
      if (inv.action === 'showToast') return { ok: true, data: 'then-result' };
      if (inv.action === 'navigate') return { ok: true, data: 'settled-result' };
      return { ok: true, data: 'primary' };
    });
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        actionNode('setValue', { path: 'x', value: 1 }, {
          then: [actionNode('showToast', { message: 'then' })],
          onSettled: [actionNode('navigate', { url: '/done' })],
        }),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(builtinMock).toHaveBeenCalledTimes(3);
    expect(result.data).toBe('then-result');
  });
});
