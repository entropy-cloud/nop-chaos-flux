import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation, type UseConversationOptions, type AiConversationControllerBridge } from '../use-conversation.js';
import type { AiConversationController } from '../ai-conversation-controller.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type { ToolExecutor } from '../../engine/types.js';
import { okChunks, scriptedConnector, slowConnector } from './use-conversation-test-helpers.js';

// FIND-19 (2026-08-11, plan 2026-08-11-0335-3): compile-time proof that the
// hook's product shape (Bridge) is structurally assignable to the consumption
// surface (Controller) — members are isomorphic except `renameConversation`'s
// return width (`void` ⊆ `MaybePromise<void>`). Dual naming is retained for
// hook product type stability; keep members in lockstep.
type _BridgeAssignableToController = AiConversationControllerBridge extends AiConversationController ? true : false;
const _bridgeAssignable: _BridgeAssignableToController = true;
void _bridgeAssignable;

/**
 * Domain: controller binding + F1.2 tool-loop forwarding. Split out of the
 * original `use-conversation.test.ts` so each file focuses on one domain.
 */
describe('useConversation — controller binding', () => {
  it('exposes a controller bound to the manager methods', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    const id = result.current.activeConversationId!;
    act(() => {
      result.current.controller.renameConversation(id, 'Via controller');
    });
    expect(result.current.conversations[0].title).toBe('Via controller');
  });
});

// ---------------------------------------------------------------------------
// open P2-2 (2026-08-10) — `createEngineOptions` type narrowing. The type
// previously allowed `engine` (inherited from `UseMessageOptions`) while
// `buildEngine` silently dropped it — a type-contract silent no-op. The
// Omit now excludes `'engine'`, so a host passing it fails at typecheck time
// instead of getting a silently-ignored option. Negative assertion via
// `@ts-expect-error`: pre-fix the line does not error (RED), post-fix it
// must (GREEN).
// ---------------------------------------------------------------------------

describe('open P2-2 — createEngineOptions excludes engine', () => {
  it('passing `engine` to createEngineOptions is a compile-time error (type contract)', () => {
    const connector = slowConnector(okChunks);
    const engine = createMessageEngine({ connector });
    const opts: UseConversationOptions = {
      connector,
      // @ts-expect-error — `engine` is Omitted from createEngineOptions (open P2-2): buildEngine self-builds and would silently drop it
      createEngineOptions: { engine },
    };
    expect(opts.connector).toBe(connector);
  });
});

describe('useConversation — F1.2 buildEngine forwards tool triad', () => {
  it('finish_reason:tool_calls executes the loop (not tool-no-executor error)', async () => {
    const connector = scriptedConnector([
      [
        {
          delta: {
            tool_calls: [
              { index: 0, id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{}' } },
            ],
          },
        },
        { finishReason: 'tool_calls' },
      ],
      [{ delta: { content: 'sunny' } }, { finishReason: 'stop' }],
    ]);
    const executor: ToolExecutor = vi.fn(async () => 'sunny, 18C');

    const { result } = renderHook(() =>
      useConversation({
        connector,
        createEngineOptions: {
          tools: [{ type: 'function', function: { name: 'get_weather' } }],
          toolExecutor: executor,
          maxToolRounds: 4,
        },
      }),
    );

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('weather?');
    });

    // The executor ran (tool-loop active), and a follow-up request was issued.
    expect(executor).toHaveBeenCalledTimes(1);
    expect(connector.calls).toHaveLength(2);
    expect(engine.getState().requestState).toBe('completed');
  });
});
