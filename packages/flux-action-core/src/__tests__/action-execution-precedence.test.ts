import type { SchemaValue } from '@nop-chaos/flux-core';
import { describe, expect, it, vi } from 'vitest';
import { staticCompiled } from './action-dispatcher-test-support.js';
import { createActionDispatcher } from '../action-dispatcher.js';
import { createActionCtx, createMockAdapter, createTestDispatcher, makeCompiledProgram } from './action-dispatcher-test-support.js';

// R1.4 / plan 723 T4+T5 — P1-MA4.1-004 / P1-MA4.1-008.
//
// T4 pins the resolution precedence contract (action-scope-and-imports.md
// "built-in actions can never be shadowed by xui:actions definitions"): the
// pipeline order is builtIn -> component -> named -> namespaced, so a same-
// name xui:actions named provider must never fire when the built-in exists.
// Red proof: swapping runBuiltInAction/runNamedAction makes the named provider
// win and the adapter spy fire.
//
// T5 pins the caught-failure notify guard (action-execution.ts:204-207):
//   A  caught failure + diagnostic channel present -> no duplicate notify
//      (transitive pin existed via error-guard.test.ts:74; explicit here)
//   B  caught failure + NO diagnostic channel -> fallback notify fires exactly
//      once (the bug-69 regression body — previously unpinned)
//   C  returned (ok:false, non-caught) failure + channel present -> notify
//      still fires (pins the caughtFailureResults.has() conjunct; removing it
//      makes C red while A/B stay green)

function compileSingleAction(action: { action: string; args?: Record<string, SchemaValue> }) {
  return makeCompiledProgram([
    {
      action: action.action,
      when: undefined,
      payload: { args: staticCompiled(action.args ?? {}) },
      targeting: {},
      control: {},
      source: action,
    },
  ]);
}

function makeConfigured(base: ReturnType<typeof createTestDispatcher>, adapter: ReturnType<typeof createMockAdapter>, channels: { onActionError?: () => void; pluginOnError?: () => void }) {
  return createActionDispatcher({
    getEnv: () => base.env,
    evaluator: base.evaluator,
    adapter,
    expressionCompiler: base.runtime.expressionCompiler,
    actionProgramCompiler: {
      compile: vi.fn((action) =>
        compileSingleAction(action as { action: string; args?: Record<string, SchemaValue> }),
      ),
    },
    onActionError: channels.onActionError,
    plugins: channels.pluginOnError ? [{ onError: channels.pluginOnError } as never] : [],
  });
}

describe('T4 built-in precedence over xui:actions named providers (P1-MA4.1-004)', () => {
  it('same-name built-in and named provider: built-in wins, named provider never invoked', async () => {
    const invokeNamespacedAction = vi.fn(async (): Promise<{ ok: true }> => ({ ok: true }));
    const adapter = createMockAdapter({
      // 'showToast' is a built-in; the adapter spy must never reach the
      // namespaced channel for the same name.
      invokeNamespacedAction,
    });
    const base = createTestDispatcher({ adapter });
    const actionScope = {
      resolve: vi.fn(() => ({
        namespace: '__xui_actions__',
        method: 'showToast',
        sourceScopeId: 'import:demo',
        provider: { kind: 'import' },
      })),
    } as unknown as NonNullable<ReturnType<typeof createActionCtx>['actionScope']>;

    const configured = makeConfigured(base, adapter, {});
    const result = await configured.dispatch(
      compileSingleAction({ action: 'showToast', args: { message: 'hi' } }),
      createActionCtx({ runtime: base.runtime, actionScope }),
    );

    expect(result?.ok).toBe(true);
    expect(invokeNamespacedAction).not.toHaveBeenCalled();
    expect(actionScope.resolve).not.toHaveBeenCalled();
  });
});

describe('T5 caught-failure notify guard (P1-MA4.1-008)', () => {
  function makeThrowingAdapter() {
    return createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('boom: caught by runSingleAction');
      }),
    });
  }

  it('A: caught failure with onActionError + plugin.onError present -> no notify (guard suppresses)', async () => {
    const adapter = makeThrowingAdapter();
    const base = createTestDispatcher({ adapter });
    const envNotify = vi.fn();
    base.env.notify = envNotify;
    const configured = makeConfigured(base, adapter, {
      onActionError: vi.fn(),
      pluginOnError: vi.fn(),
    });

    await configured.dispatch(compileSingleAction({ action: 'showToast' }), createActionCtx({ runtime: base.runtime }));

    expect(envNotify).not.toHaveBeenCalled();
  });

  it('B: caught failure with NO diagnostic channel -> fallback notify fires exactly once (bug-69 body)', async () => {
    const adapter = makeThrowingAdapter();
    const base = createTestDispatcher({ adapter });
    const envNotify = vi.fn();
    base.env.notify = envNotify;
    const configured = makeConfigured(base, adapter, {});

    await configured.dispatch(compileSingleAction({ action: 'showToast' }), createActionCtx({ runtime: base.runtime }));

    expect(envNotify).toHaveBeenCalledTimes(1);
    expect(envNotify.mock.calls[0][0]).toBe('error');
  });

  it('C: returned (ok:false, non-caught) failure with channel present -> notify still fires', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (): Promise<{ ok: false; error: string }> => ({
        ok: false,
        error: 'returned failure (not thrown)',
      })),
    });
    const base = createTestDispatcher({ adapter });
    const envNotify = vi.fn();
    base.env.notify = envNotify;
    const configured = makeConfigured(base, adapter, {
      onActionError: vi.fn(),
      pluginOnError: vi.fn(),
    });

    await configured.dispatch(compileSingleAction({ action: 'showToast' }), createActionCtx({ runtime: base.runtime }));

    expect(envNotify).toHaveBeenCalledTimes(1);
    expect(envNotify.mock.calls[0][0]).toBe('error');
  });
});
