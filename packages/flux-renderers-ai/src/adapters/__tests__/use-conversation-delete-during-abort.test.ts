import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnectorChunk } from '../../engine/types.js';
import { slowConnector } from './use-conversation-test-helpers.js';

/**
 * Domain: deleteConversation stale-closure regression (multi-audit P1-1).
 *
 * The post-await branch in deleteConversation reads the closure-captured
 * `activeId` / `conversations`. When a new conversation is created during the
 * `await removed.abort()` window, the stale closure sees the OLD active id (the
 * deleted one) and calls `setActiveId(null)`, clobbering the just-created
 * conversation's activation (Failure Path FP-1).
 *
 * After the fix, deleteConversation reads `activeIdRef.current` (the freshest
 * active id) so a concurrent create wins.
 */
describe('useConversation — delete-during-abort + concurrent create', () => {
  it('FP-1 deleting an active streaming conversation during abort does not clobber a concurrent new conversation', async () => {
    // Slow stream so X is still processing when deleteConversation awaits
    // its abort.
    const longChunks: AiConnectorChunk[] = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { delta: { content: 'c' } },
      { finishReason: 'stop' },
    ];
    const connector = slowConnector(longChunks, 30);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    const xId = result.current.activeConversationId!;
    const xEngine = result.current.activeEngine!;

    // Kick off a stream so X enters processing state.
    act(() => {
      void xEngine.sendMessage('go');
    });
    // Yield once so the engine flips to `processing` before we delete.
    await act(async () => {
      await Promise.resolve();
    });
    expect(xEngine.getState().isProcessing).toBe(true);

    // Fire deleteConversation(X) — it reaches `await removed.abort()` and
    // suspends. We do NOT await it yet: the post-await stale-closure branch
    // must not run before we interleave a create.
    let deletePromise!: Promise<void>;
    await act(async () => {
      deletePromise = result.current.deleteConversation(xId);
      // Within the same batched act, create Y. The current (buggy) closure
      // captured activeId === xId at deleteConversation call time, so the
      // post-await branch (flushed when act drains microtasks) will run
      // `if (activeId === id)` → TRUE and setActiveId(null), clobbering Y.
      result.current.createConversation({ title: 'Y' });
    });

    // Let the abort + any trailing stream settle.
    await act(async () => {
      await deletePromise;
      await new Promise((r) => setTimeout(r, 20));
    });

    // FP-1: Y must remain the active conversation. The stale-closure bug
    // would have reset activeConversationId to null.
    expect(result.current.conversations.some((c) => c.title === 'Y')).toBe(true);
    expect(result.current.activeConversationId).not.toBeNull();
    expect(result.current.activeConversationId).not.toBe(xId);
    expect(result.current.activeEngine).not.toBeNull();
    // X is gone from the list.
    expect(result.current.conversations.some((c) => c.id === xId)).toBe(false);
  });
});
