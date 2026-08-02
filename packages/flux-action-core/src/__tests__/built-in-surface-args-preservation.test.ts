import { describe, expect, it, vi } from 'vitest';
import type { BuiltInActionInvocation, CompiledRuntimeValue, ScopeRef } from '@nop-chaos/flux-core';
import type { ActionEvaluator } from '../action-core.js';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
} from './action-dispatcher-test-support.js';

const RAW_TITLE = '${dynamicTitle}';
const RAW_BODY = { type: 'form', id: 'edit-form', body: [{ type: 'input-text', name: 'nickName' }] };
const RAW_ON_CLOSE = { action: 'closeSurface' };
const RAW_ON_SUBMIT_SUCCESS = [{ action: 'closeSurface' }];

/**
 * Fulfillment-boundary contract (design option ①): action-class args keys
 * (onClose/onSubmitSuccess/onSubmitError) declared in the built-in action
 * definition must be preserved RAW when surface args are evaluated — they must
 * NOT be baked with dispatch-scope values, so lifecycle hooks dispatch in the
 * owner context with fresh scope at invocation time.
 */
describe('evaluateSurfaceArgs action-class key preservation (option ①)', () => {
  it('preserves onClose/onSubmitSuccess raw while ordinary args are scope-evaluated', async () => {
    const adapter = createMockAdapter();

    // Evaluator that emulates per-entry compiled-value evaluation: static
    // entries stay raw, dynamic entries become 'EVALUATED:<source>' — so
    // preserved-vs-evaluated is observable.
    function emulateEvaluateCompiled(compiled: {
      isStatic?: boolean;
      node: {
        kind: string;
        value?: unknown;
        source?: string;
        keys?: string[];
        entries?: Record<string, { kind: string; value?: unknown; source?: string }>;
      };
    }): unknown {
      if (compiled.isStatic) {
        return compiled.node.value;
      }
      if (compiled.node.kind === 'object-node') {
        const entries: Record<string, unknown> = {};
        for (const key of compiled.node.keys ?? []) {
          const entry = compiled.node.entries?.[key];
          entries[key] = entry && entry.kind === 'static-node' ? entry.value : `EVALUATED:${entry?.source ?? ''}`;
        }
        return entries;
      }
      return `EVALUATED:${compiled.node.source ?? ''}`;
    }

    const evaluatingEvaluator: ActionEvaluator = {
      evaluate: <T = unknown>(_target: unknown): T => _target as T,
      compileValue: <T = unknown>(_target: T) =>
        ({
          kind: 'dynamic',
          isStatic: false,
          node: { kind: 'object-node', keys: [], entries: {} },
        }) as never,
      evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>, _scope: ScopeRef): T =>
        emulateEvaluateCompiled(compiled as never) as T,
    };

    const { dispatcher, runtime } = createTestDispatcher({
      adapter,
      evaluator: evaluatingEvaluator,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'openDialog',
          payload: {
            args: {
              kind: 'dynamic',
              isStatic: false,
              node: {
                kind: 'object-node',
                keys: ['title', 'body', 'onClose', 'onSubmitSuccess'],
                entries: {
                  title: { kind: 'template-node', source: RAW_TITLE, compiled: {} },
                  body: { kind: 'static-node', value: RAW_BODY },
                  onClose: { kind: 'template-node', source: '${onCloseExpr}', compiled: {} },
                  onSubmitSuccess: { kind: 'template-node', source: '${ossExpr}', compiled: {} },
                },
              },
            } as never,
          },
          targeting: {},
          control: {},
          source: {
            action: 'openDialog',
            args: {
              title: RAW_TITLE,
              body: RAW_BODY,
              onClose: RAW_ON_CLOSE,
              onSubmitSuccess: RAW_ON_SUBMIT_SUCCESS,
            },
          },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;

    // Ordinary value args ARE dispatch-scope evaluated.
    expect(invocation.args?.title).toBe(`EVALUATED:${RAW_TITLE}`);

    // Schema args stay raw (existing isSchema override).
    expect(invocation.args?.body).toEqual(RAW_BODY);

    // Action-class args stay raw (definition-marked preservation).
    expect(invocation.args?.onClose).toEqual(RAW_ON_CLOSE);
    expect(invocation.args?.onSubmitSuccess).toEqual(RAW_ON_SUBMIT_SUCCESS);
  });
});
