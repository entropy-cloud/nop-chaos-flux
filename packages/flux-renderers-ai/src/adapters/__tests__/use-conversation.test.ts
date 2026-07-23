import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest } from '../../engine/types.js';

function slowConnector(chunks: AiConnectorChunk[], delayMs = 5): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) {
          await new Promise((r) => setTimeout(r, delayMs));
          yield c;
        }
      }
      void _req;
      return gen();
    },
  };
}

const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

describe('useConversation — double-layer model', () => {
  it('createConversation seeds the list and sets active', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));

    let info;
    act(() => {
      info = result.current.createConversation({ title: 'First' });
    });
    expect(info).toMatchObject({ title: 'First' });
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.activeConversationId).toBe(info!.id);
    expect(result.current.activeEngine).not.toBeNull();
  });

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

  it('renameConversation updates the title in the list', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'Old' });
    });
    const id = result.current.activeConversationId!;
    act(() => {
      result.current.renameConversation(id, 'New');
    });
    expect(result.current.conversations[0].title).toBe('New');
  });

  it('deleteConversation removes the conversation and clears active if needed', async () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'Only' });
    });
    const id = result.current.activeConversationId!;
    await act(async () => {
      await result.current.deleteConversation(id);
    });
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();
  });

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
