import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import { okChunks, mockStorage } from './use-conversation-test-helpers.js';
import type { AiConnectorChunk, AiConnectorRequest } from '../../engine/types.js';

/**
 * [G5-R4-视角5-01] conversation switch hydration loading state: during the
 * storage hydration window the hook must (a) drop the previous engine so the
 * chat surface cannot render the OLD conversation's messages under the new
 * active id, and (b) expose `switchingId` so hosts can show a loading afford.
 * After the switch settles the engine is promoted and switchingId is null.
 */
function makeConnector() {
  return {
    async *stream(request: AiConnectorRequest): AsyncGenerator<AiConnectorChunk> {
      for (const chunk of okChunks) {
        yield chunk;
        void request;
      }
    },
  };
}

describe('useConversation — switch hydration loading state ([G5-R4-视角5-01])', () => {
  it('nulls the engine and sets switchingId during hydration, then settles', async () => {
    const { strategy: storage } = mockStorage({
      messages: { a: [{ id: 'm1', role: 'user', content: 'hi', metadata: { createdAt: 1 } }] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: makeConnector(), storage }),
    );

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    const bId = result.current.activeConversationId!;
    expect(result.current.activeEngine).not.toBeNull();

    // Switch A→B is a cached-engine sync path: no loading window.
    await act(async () => {
      await result.current.switchConversation(bId);
    });
    expect(result.current.switchingId).toBeNull();

    // Switch to an UNCACHED conversation (A's engine was evicted as idle):
    // hydration is async → engine drops to null and switchingId names the
    // target while in flight.
    let switchPromise: Promise<void> | null = null;
    act(() => {
      switchPromise = result.current.switchConversation(aId);
    });
    expect(result.current.activeEngine).toBeNull();
    expect(result.current.switchingId).toBe(aId);
    expect(result.current.activeConversationId).toBe(aId);

    await act(async () => {
      await switchPromise;
    });
    expect(result.current.activeEngine).not.toBeNull();
    expect(result.current.switchingId).toBeNull();
  });

  it('cached-engine re-switch never flashes the loading state', async () => {
    const { strategy: storage } = mockStorage({});
    const { result } = renderHook(() =>
      useConversation({ connector: makeConnector(), storage }),
    );

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    const bId = result.current.activeConversationId!;

    await act(async () => {
      await result.current.switchConversation(aId);
    });
    // A is now cached; B is also cached from creation. Back to B: sync path.
    const bEngineBefore = result.current.activeEngine;
    await act(async () => {
      await result.current.switchConversation(bId);
    });
    expect(result.current.switchingId).toBeNull();
    expect(result.current.activeEngine).not.toBeNull();
    expect(result.current.activeEngine).not.toBe(bEngineBefore);
  });
});
