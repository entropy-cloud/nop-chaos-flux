import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnectorChunk } from '../../engine/types.js';
import { okChunks, slowConnector } from './use-conversation-test-helpers.js';

/**
 * Domain: conversation switching + background processing. Split out of the
 * original `use-conversation.test.ts` so each file focuses on one domain.
 */
describe('useConversation — switch / background processing', () => {
  it('switchConversation activates the target and lazily builds its engine', async () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    const bId = result.current.activeConversationId!;

    expect(result.current.activeConversationId).toBe(bId);
    const bEngine = result.current.activeEngine;

    await act(async () => {
      await result.current.switchConversation(aId);
    });
    expect(result.current.activeConversationId).toBe(aId);
    // Switching to A built a new engine distinct from B's.
    expect(result.current.activeEngine).not.toBe(bEngine);

    // Switching back to B: the engine should be the same instance if not
    // processing (re-created on demand after eviction).
    await act(async () => {
      await result.current.switchConversation(bId);
    });
    expect(result.current.activeConversationId).toBe(bId);
  });

  it('switching away from a processing conversation keeps it running in the background', async () => {
    // Long-running stream so isProcessing is true at switch time.
    const longChunks: AiConnectorChunk[] = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { delta: { content: 'c' } },
      { finishReason: 'stop' },
    ];
    const connector = slowConnector(longChunks, 20);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    const aEngine = result.current.activeEngine!;

    // Kick off a stream on A, then immediately switch to a new conversation.
    act(() => {
      void aEngine.sendMessage('go');
    });

    act(() => {
      result.current.createConversation({ title: 'B' });
    });

    // A is no longer active, but its engine should still be running
    // (processing === true). The active engine is B's, not A's.
    expect(result.current.activeConversationId).not.toBe(aId);
    expect(result.current.activeEngine).not.toBe(aEngine);
    // Wait for A's stream to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(aEngine.getState().requestState).toBe('completed');
  });
});
