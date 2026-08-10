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

  it('FIND-02 clearAll-then-create: a conversation created in the atomic-clear window survives (reverse race)', async () => {
    // Atomic-clear storage whose saveMessages is GATED (slow): the clearAll
    // drain (A's in-flight message save) is still pending when the
    // post-clearAll create's metadata save lands FIRST, so the deferred
    // atomic `storage.clearAll()` fires LAST and wipes B's record
    // ("ghost-free-creation in reverse": the list survived, the record was
    // erased). Per-id fan-out over the clearAll-time snapshot must leave B
    // untouched.
    const store: AiConversationInfo[] = [];
    const savedMessages: Record<string, ChatMessage[]> = {};
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((r) => {
      releaseSave = r;
    });
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [...store];
      },
      async loadMessages(id) {
        return savedMessages[id] ?? [];
      },
      async saveConversation(info) {
        store.unshift(info);
      },
      async saveMessages(id, msgs) {
        await saveGate;
        savedMessages[id] = msgs;
      },
      async deleteConversation(id) {
        const idx = store.findIndex((c) => c.id === id);
        if (idx >= 0) store.splice(idx, 1);
      },
      async clearAll() {
        store.length = 0;
      },
    };
    const connector = slowConnector(okChunks);
    const { result, unmount } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );

    await act(async () => {
      await wait();
    });

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    // Complete a turn → A's message auto-save starts and suspends at the gate
    // (the clearAll drain will stay pending on it).
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi');
    });
    expect(result.current.activeEngine!.getState().requestState).toBe('completed');

    // Same-tick clearAll + create while A's message save is still in-flight:
    // B's fast metadata save lands BEFORE the drain settles, so the atomic
    // clear would fire AFTER B's write and wipe it.
    let idB = '';
    act(() => {
      result.current.clearAll();
      idB = result.current.createConversation({ title: 'B' }).id;
    });
    // Let B's metadata save land (microtask queue) while the drain is still
    // suspended on A's gated message save.
    await act(async () => {
      await wait(10);
    });

    // Release the gated save: the drain settles, then the (atomic) clear
    // would run — with the FIND-02 fix only the clearAll-time snapshot (A)
    // is deleted.
    releaseSave();
    await act(async () => {
      await wait(20);
    });

    // B's record survived the clear.
    expect(store.map((c) => c.id)).toEqual([idB]);

    // Remount rehydrates B — no "ghost-free-creation in reverse" data loss.
    unmount();
    const { result: remounted } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );
    await act(async () => {
      await wait();
    });
    expect(remounted.current.conversations.map((c) => c.id)).toEqual([idB]);
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
