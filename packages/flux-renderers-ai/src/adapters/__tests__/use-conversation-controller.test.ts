import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { ToolExecutor } from '../../engine/types.js';
import { okChunks, scriptedConnector, slowConnector } from './use-conversation-test-helpers.js';

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
