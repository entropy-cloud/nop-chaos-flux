import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnectorChunk } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, mockStorage, wait } from './use-conversation-test-helpers.js';

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

  it('FP-5 fast switch: a slow loadMessages from a stale switch does not clobber the active engine', async () => {
    const c1 = { id: 'c1', title: 'A', createdAt: 1, updatedAt: 1 };
    const c2 = { id: 'c2', title: 'B', createdAt: 2, updatedAt: 2 };
    let resolveC1Messages: () => void;
    const gateC1 = new Promise<void>((r) => {
      resolveC1Messages = r;
    });
    const loadOrder: string[] = [];
    const strategy: ConversationStorageStrategy = {
      ...mockStorage({ conversations: [c1, c2] }).strategy,
      async loadMessages(id: string) {
        loadOrder.push(id);
        // c1's hydration is deliberately slow so a second switch can interleave.
        if (id === 'c1') await gateC1;
        return [];
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector, storage: strategy }));

    // Mount bootstrap loads [c1, c2] and selects c1 as active (no engine yet).
    await act(async () => {
      await wait();
    });

    // Fire switch to c1 — its loadMessages blocks on gateC1. Do NOT await it.
    let switchC1: Promise<void> = Promise.resolve();
    await act(async () => {
      switchC1 = result.current.switchConversation('c1');
      // Yield microtasks so switchConversation(c1) reaches its pending await.
      await Promise.resolve();
      await Promise.resolve();
    });

    // While c1's hydration is pending, switch to c2 (resolves immediately).
    await act(async () => {
      await result.current.switchConversation('c2');
    });

    // c2 is now active and its engine is built.
    expect(result.current.activeConversationId).toBe('c2');
    const engineB = result.current.activeEngine;
    expect(engineB).not.toBeNull();

    // Now release c1's slow hydration → switchConversation(c1) resumes.
    await act(async () => {
      resolveC1Messages!();
      await switchC1;
    });

    // FP-5: the stale switch's late resolve must NOT clobber the active slot
    // (activeEngine stays engineB, activeId stays c2) and engineB is NOT
    // wrongly evicted by the stale eviction loop.
    expect(result.current.activeConversationId).toBe('c2');
    expect(result.current.activeEngine).toBe(engineB);
  });
});
