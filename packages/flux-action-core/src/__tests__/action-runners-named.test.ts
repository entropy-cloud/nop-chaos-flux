import { describe, expect, it, vi } from 'vitest';
import { staticCompiled } from './action-dispatcher-test-support.js';
import { runNamedAction } from '../action-dispatcher/action-runners.js';
import { createActionCtx, createMockAdapter, createMockEvaluator } from './action-dispatcher-test-support.js';
import type { ActionContext, CompiledActionNode } from '@nop-chaos/flux-core';

// R1.4 / plan 723 T3 — P1-MA4.1-003 (+F-06): runNamedAction is the xui:actions
// dispatcher resolution step inside the dispatch pipeline. All prior tests
// bypassed it (hand-registered namespaces invoked providers directly), so
// deleting the step kept every suite green. These pin the three branches:
// plain-name + resolved -> namespaced invocation with metadata (namespace
// constant = __xui_actions__); colon-name -> undefined (namespaced runner
// territory); unresolved -> undefined.
function makeAction(action: string): CompiledActionNode {
  return {
    action,
    payload: { args: staticCompiled({}) },
    targeting: {},
    control: {},
    source: { action },
  } as unknown as CompiledActionNode;
}

function makeCtxWithScope(resolveImpl: (name: string) => unknown): ActionContext {
  const actionScope = { resolve: vi.fn(resolveImpl) } as unknown as ActionContext['actionScope'];
  return createActionCtx({ actionScope });
}

function makeInternals() {
  const invokeNamespacedAction = vi.fn(
    async (_invocation: { actionName: string; namespace: string; method: string; payload: unknown }): Promise<{ ok: true }> => ({ ok: true }),
  );
  return {
    internals: {
      evaluator: createMockEvaluator(),
      adapter: createMockAdapter({ invokeNamespacedAction }),
    } as never as Parameters<typeof runNamedAction>[2],
    invokeNamespacedAction,
  };
}

describe('runNamedAction dispatcher resolution step (R1.4 plan 723)', () => {
  it('resolves a plain-name action through the scope and invokes the namespaced provider with metadata', async () => {
    const { internals, invokeNamespacedAction } = makeInternals();
    const ctx = makeCtxWithScope((name) => ({
      namespace: 'xui-actions',
      method: name.split(':')[1],
      sourceScopeId: 'import:demo',
      provider: { kind: 'import' },
    }));
    const result = await runNamedAction(makeAction('refresh'), ctx, internals);

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      namespace: '__xui_actions__',
      sourceScopeId: 'import:demo',
      providerKind: 'import',
    });
    expect(invokeNamespacedAction).toHaveBeenCalledTimes(1);
    const invocation = invokeNamespacedAction.mock.calls[0]![0];
    expect(invocation.actionName).toBe('__xui_actions__:refresh');
    expect(invocation.namespace).toBe('__xui_actions__');
    expect(invocation.method).toBe('refresh');
  });

  it('returns undefined for namespaced action names (colon names are not __xui_actions__ candidates)', async () => {
    const { internals, invokeNamespacedAction } = makeInternals();
    const ctx = makeCtxWithScope(() => ({ provider: {} }));

    const result = await runNamedAction(makeAction('demo:save'), ctx, internals);

    expect(result).toBeUndefined();
    expect(invokeNamespacedAction).not.toHaveBeenCalled();
  });

  it('returns undefined when the scope cannot resolve the namespaced name', async () => {
    const { internals, invokeNamespacedAction } = makeInternals();
    const ctx = makeCtxWithScope(() => undefined);

    const result = await runNamedAction(makeAction('refresh'), ctx, internals);

    expect(result).toBeUndefined();
    expect(invokeNamespacedAction).not.toHaveBeenCalled();
  });
});
