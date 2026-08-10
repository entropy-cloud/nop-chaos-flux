import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type {
  AiConversationInfo,
  ChatMessage,
} from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import {
  mockStorage,
  okChunks,
  slowConnector,
  wait,
} from './use-conversation-test-helpers.js';

/**
 * Domain: P3 storage sync + AI-28 storage error observability. Split out of
 * the original `use-conversation.test.ts` so each file focuses on one domain.
 */

describe('useConversation — P3 storage sync', () => {
  it('mount bootstraps the conversation list from storage and selects the first as active', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
      { id: 'c2', title: 'Two', createdAt: 2, updatedAt: 2 },
    ];
    const { strategy, calls } = mockStorage({ conversations: convs });
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );

    await act(async () => {
      await wait();
    });

    expect(calls.loadConversations).toBe(1);
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.activeConversationId).toBe('c1');
  });

  it('switchConversation re-hydrates stored messages via engine.setMessages', async () => {
    const stored: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hi' },
      { id: 'm2', role: 'assistant', content: 'hello' },
    ];
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const { strategy, calls } = mockStorage({
      conversations: convs,
      messages: { c1: stored },
    });
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    expect(calls.loadMessages).toBe(1);
    const engine = result.current.activeEngine!;
    expect(engine).not.toBeNull();
    expect(engine.getMessages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('autoSaveMessages persists a snapshot when a turn completes', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const { strategy, calls, savedMessages } = mockStorage({
      conversations: convs,
    });
    const connector = slowConnector(okChunks, 5);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    expect(calls.saveMessages).toBeGreaterThanOrEqual(1);
    expect(savedMessages.c1.some((m) => m.role === 'user' && m.content === 'hello')).toBe(true);
  });

  it('Failure Path storage-load-error: loadConversations reject → empty list, no throw', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      loadConversations: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing }),
    );

    await act(async () => {
      await wait();
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('Failure Path storage-load-error: loadMessages reject → empty messages, no throw', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      loadMessages: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    expect(result.current.activeEngine!.getMessages()).toEqual([]);
  });

  it('Failure Path storage-save-error: saveMessages reject → does not block the engine', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      saveMessages: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, autoSaveMessages: true }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    // The turn completed despite the persistence failure.
    expect(engine.getState().requestState).toBe('completed');
  });
});

describe('useConversation — AI-28 storage error observability', () => {
  it('invokes onStorageError when loadConversations fails', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      loadConversations: async () => {
        throw new Error('boom-load');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    await act(async () => {
      await wait();
    });

    expect(onStorageError).toHaveBeenCalledTimes(1);
    const arg = onStorageError.mock.calls[0][0];
    expect(arg.phase).toBe('loadConversations');
    expect(arg.error).toBeInstanceOf(Error);
  });

  it('invokes onStorageError when loadMessages fails', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      loadMessages: async () => {
        throw new Error('boom-msgs');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    const phases = onStorageError.mock.calls.map((c) => c[0].phase);
    expect(phases).toContain('loadMessages');
  });

  it('invokes onStorageError when saveMessages fails (auto-save path)', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      saveMessages: async () => {
        throw new Error('boom-save');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks, 5);
    const { result } = renderHook(() =>
      useConversation({
        connector,
        storage: failing,
        autoSaveMessages: true,
        onStorageError,
      }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    const phases = onStorageError.mock.calls.map((c) => c[0].phase);
    expect(phases).toContain('saveMessages');
    // The turn still completes (storage failure is non-fatal).
    expect(engine.getState().requestState).toBe('completed');
  });

  it('P1-2 / FP-4: createConversation surfaces a saveConversation rejection via onStorageError', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      saveConversation: async () => {
        throw new Error('boom-create');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    let createdId: string | undefined;
    act(() => {
      const info = result.current.createConversation({ title: 'New' });
      createdId = info.id;
    });
    await act(async () => {
      await wait();
    });

    // The previously-bare `void storage?.saveConversation?.(...)` would have
    // silently swallowed this — now it routes through reportStorageError.
    const saveCalls = onStorageError.mock.calls.filter((c) => c[0].phase === 'saveConversation');
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0][0].conversationId).toBe(createdId);
    expect(saveCalls[0][0].error).toBeInstanceOf(Error);
    // The in-memory list is unaffected (storage failure is non-fatal).
    expect(result.current.conversations.length).toBe(1);
  });

  it('P1-2 / FP-4: renameConversation surfaces a saveConversation rejection via onStorageError', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      saveConversation: async () => {
        throw new Error('boom-rename');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    let id: string | undefined;
    act(() => {
      id = result.current.createConversation({ title: 'Old' }).id;
    });
    await act(async () => {
      await wait();
    });
    onStorageError.mockClear();
    act(() => {
      result.current.renameConversation(id!, 'New');
    });
    await act(async () => {
      await wait();
    });

    const saveCalls = onStorageError.mock.calls.filter((c) => c[0].phase === 'saveConversation');
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0][0].conversationId).toBe(id);
    expect(saveCalls[0][0].error).toBeInstanceOf(Error);
    // The in-memory title still updated (storage failure is non-fatal).
    expect(result.current.conversations[0].title).toBe('New');
  });
});

// ---------------------------------------------------------------------------
// multi P2-2 (2026-08-10) — unmount cleanup order. The unmount effect used to
// abort in-flight engines BEFORE unsubscribing the auto-save listeners, so the
// abort's requestState transition ('processing' → 'aborted') fired the
// listener and enqueued an aborted-snapshot save into `pendingSavesRef` — with
// the hook gone there was no drain surface left (cross-mount ghost on rapid
// remount). clearAll's K3 detach-before-abort ordering is the reference.
// ---------------------------------------------------------------------------

describe('multi P2-2 — unmount cleanup order (detach-before-abort)', () => {
  /**
   * Storage whose `saveMessages` write LANDS only after a gate resolves, so a
   * save enqueued by the unmount-time abort is observable as a ghost landing.
   */
  function gatedUnmountStorage() {
    const calls = { saveMessages: 0, deleteConversation: 0 };
    const savedMessages: Record<string, ChatMessage[]> = {};
    const deleted: string[] = [];
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((r) => {
      releaseSave = r;
    });
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation() {},
      async saveMessages(id: string, messages: ChatMessage[]) {
        calls.saveMessages++;
        await saveGate;
        savedMessages[id] = messages;
      },
      async deleteConversation(id: string) {
        calls.deleteConversation++;
        deleted.push(id);
      },
    };
    return { strategy, calls, savedMessages, deleted, releaseSave };
  }

  const longChunks = [
    { delta: { content: 'a' } },
    { delta: { content: 'b' } },
    { delta: { content: 'c' } },
    { finishReason: 'stop' as const },
  ];

  it('unmount during an in-flight turn must not enqueue an aborted-snapshot save', async () => {
    const { strategy, calls, savedMessages, releaseSave } = gatedUnmountStorage();
    const { result, unmount } = renderHook(() =>
      useConversation({
        connector: slowConnector(longChunks, 30),
        storage: strategy,
        autoSaveMessages: true,
      }),
    );
    await act(async () => {
      await wait(5);
    });

    let convId = '';
    act(() => {
      convId = result.current.createConversation({ title: 'X' }).id;
    });
    act(() => {
      void result.current.activeEngine!.sendMessage('go');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.activeEngine!.getState().isProcessing).toBe(true);

    // Unmount: the cleanup aborts the in-flight engine. Pre-fix the auto-save
    // listener is still attached, so the abort enqueues an aborted-snapshot
    // save with no drain surface left (the hook is gone).
    act(() => {
      unmount();
    });
    // Release the save I/O: pre-fix the aborted snapshot lands as a ghost.
    releaseSave();
    await act(async () => {
      await wait(20);
    });

    expect(calls.saveMessages).toBe(0);
    expect(savedMessages[convId]).toBeUndefined();
  });

  it('rapid remount + new turn must not rehydrate the previous session aborted snapshot', async () => {
    const { strategy, savedMessages, releaseSave } = gatedUnmountStorage();
    const connector = slowConnector(longChunks, 30);
    const { result, unmount } = renderHook(() =>
      useConversation({
        connector,
        storage: strategy,
        autoSaveMessages: true,
      }),
    );
    await act(async () => {
      await wait(5);
    });

    let convId = '';
    act(() => {
      convId = result.current.createConversation({ title: 'X' }).id;
    });
    act(() => {
      void result.current.activeEngine!.sendMessage('go');
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      unmount();
    });
    // Release the ghost save (pre-fix it was enqueued at unmount-abort).
    releaseSave();
    await act(async () => {
      await wait(20);
    });

    // Remount from the same storage + a new turn.
    const { result: remounted } = renderHook(() =>
      useConversation({
        connector,
        storage: strategy,
        autoSaveMessages: true,
      }),
    );
    await act(async () => {
      await wait(5);
    });
    // Bootstrap loaded the stored conversation; the ghost snapshot (pre-fix)
    // is rehydrated into the new session's engine via loadMessages.
    const messages = remounted.current.activeEngine?.getState().messages ?? [];
    const assistants = messages.filter((m) => m.role === 'assistant');
    expect(assistants).toHaveLength(0);
    expect(savedMessages[convId]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// multi P2-7 (2026-08-10) — mount bootstrap effect deps. `storage` went into
// the effect deps directly, so a host constructing the strategy inline
// re-ran `loadConversations()` on every render (each run aborting the
// previous controller). The `connector` option already uses a ref mirror —
// storage must follow the same pattern.
// ---------------------------------------------------------------------------

describe('multi P2-7 — bootstrap effect stable storage deps', () => {
  it('a fresh storage object each render must not re-run loadConversations', async () => {
    const calls = { loadConversations: 0 };
    const makeStrategy = (): ConversationStorageStrategy => ({
      async loadConversations() {
        calls.loadConversations++;
        return [];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation() {},
      async saveMessages() {},
      async deleteConversation() {},
    });
    const { rerender } = renderHook(
      ({ storage }: { storage: ConversationStorageStrategy }) =>
        useConversation({
          connector: slowConnector(okChunks),
          storage,
          autoSaveMessages: true,
        }),
      { initialProps: { storage: makeStrategy() } },
    );
    await act(async () => {
      await wait(10);
    });

    // Equivalent of inline construction: a NEW storage object on every render.
    rerender({ storage: makeStrategy() });
    rerender({ storage: makeStrategy() });
    await act(async () => {
      await wait(10);
    });

    expect(calls.loadConversations).toBe(1);
  });
});
