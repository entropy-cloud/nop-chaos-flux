import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConversationInfo, ChatMessage } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, wait } from './use-conversation-test-helpers.js';

/**
 * Domain: clearAll() storage correctness + FP-2 ghost-rehydration regression.
 *
 * open-audit P1-1: clearAll previously aborted/detached/cleared in-memory but
 * made NO storage call, so a re-mount would rehydrate the "cleared"
 * conversations from storage (ghost rehydration). After the fix clearAll must
 * route every cleared id through `storage.deleteConversation` (mirroring
 * deleteConversation), surface per-id failures via reportStorageError, and
 * leave storage consistent so a remount does not resurrect cleared items.
 *
 * Uses a STATEFUL in-memory storage so the "ghost rehydration" failure path
 * is observable end-to-end (deletions actually mutate the seeded store).
 */
describe('useConversation — clearAll storage correctness', () => {
  /**
   * Build a stateful storage whose deleteConversation actually removes the
   * entry from the seeded store (the shared `mockStorage` helper only counts
   * calls — it does not persist deletions, which would hide the ghost-
   * rehydration regression).
   */
  function statefulStorage(options?: {
    failFirstDeletion?: boolean;
  }): {
    strategy: ConversationStorageStrategy;
    store: AiConversationInfo[];
    calls: { deleteConversation: number; clearAll: number };
  } {
    const store: AiConversationInfo[] = [];
    const messages: Record<string, ChatMessage[]> = {};
    const calls = { deleteConversation: 0, clearAll: 0 };
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [...store];
      },
      async loadMessages(id) {
        return messages[id] ?? [];
      },
      async saveConversation(info) {
        store.unshift(info);
      },
      async saveMessages(id, msgs) {
        messages[id] = msgs;
      },
      async deleteConversation(id) {
        calls.deleteConversation++;
        if (options?.failFirstDeletion && id === store[store.length - 1]?.id) {
          throw new Error('boom-clear-' + id);
        }
        const idx = store.findIndex((c) => c.id === id);
        if (idx >= 0) store.splice(idx, 1);
      },
    };
    return { strategy, store, calls };
  }

  it('clearAll deletes every conversation from storage (FP-2 no ghost rehydration on remount)', async () => {
    const { strategy, store, calls } = statefulStorage();
    const connector = slowConnector(okChunks);
    const { result, unmount } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );

    await act(async () => {
      await wait();
    });

    // Create two conversations; both are saved to the stateful store.
    let idA = '';
    let idB = '';
    act(() => {
      idA = result.current.createConversation({ title: 'A' }).id;
    });
    act(() => {
      idB = result.current.createConversation({ title: 'B' }).id;
    });
    await act(async () => {
      await wait();
    });
    expect(store.map((c) => c.id)).toEqual([idB, idA]);

    // Clear all. The previous implementation made ZERO storage calls — only
    // memory was cleared, so storage stayed stale.
    act(() => {
      result.current.clearAll();
    });
    await act(async () => {
      await wait();
    });

    // Per-id deleteConversation calls (one per cleared conversation).
    expect(calls.deleteConversation).toBe(2);
    // Storage is consistent: nothing left.
    expect(store).toEqual([]);
    // In-memory state is cleared.
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();

    // FP-2 ghost-rehydration gate: a fresh mount bootstrapping from the same
    // storage must NOT resurrect cleared items.
    unmount();
    const { result: remounted } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );
    await act(async () => {
      await wait();
    });
    expect(remounted.current.conversations).toEqual([]);
    expect(remounted.current.activeConversationId).toBeNull();
  });

  it('FP-3 single storage deleteConversation reject is observable via onStorageError (others continue)', async () => {
    const onStorageError = vi.fn();
    const { strategy, store } = statefulStorage({ failFirstDeletion: true });
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy, onStorageError }),
    );

    await act(async () => {
      await wait();
    });

    let idA = '';
    act(() => {
      idA = result.current.createConversation({ title: 'A' }).id;
    });
    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    await act(async () => {
      await wait();
    });
    onStorageError.mockClear();

    act(() => {
      result.current.clearAll();
    });
    await act(async () => {
      await wait();
    });

    // The failed deleteConversation surfaces through reportStorageError with
    // the failing conversationId.
    const deleteCalls = onStorageError.mock.calls.filter(
      (c) => c[0].phase === 'deleteConversation',
    );
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][0].conversationId).toBe(idA);
    expect(deleteCalls[0][0].error).toBeInstanceOf(Error);

    // The other deletion (B) still proceeded: B is gone from storage. Only
    // A remains (its storage deletion threw).
    expect(store.map((c) => c.id)).toEqual([idA]);

    // In-memory state is still fully cleared (storage failure is non-fatal).
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();
  });
});
