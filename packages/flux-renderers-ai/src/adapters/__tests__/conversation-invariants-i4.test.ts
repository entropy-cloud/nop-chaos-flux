import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnector, AiConnectorChunk, AiConversationInfo, ChatMessage } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, wait } from './use-conversation-test-helpers.js';

/**
 * Cycle 2 / I4 — Invariant ⑩ autoSave persistence arm (K-⑩-3) + Invariant
 * ②/④ metadata ghost writes (K-K4/②-1/2, K-K3/④-1) + mirror write surface.
 *
 * Split out of `conversation-invariants.test.ts` (check:oversized-code-files
 * limit) following the `conversation-invariants-cycle2.test.ts` precedent:
 * the Cycle 1 file stays within the limit while the Cycle 2 / I4 additions
 * keep the same invariants-suite family.
 */

function convInfo(id: string): AiConversationInfo {
  return { id, title: id, createdAt: 0, updatedAt: 0 } as AiConversationInfo;
}

// ---------------------------------------------------------------------------
// Invariant ⑩ (K-⑩-3 extension) — failed-turn residue must not be persisted
// ---------------------------------------------------------------------------

describe('Invariant ⑩ — autoSave persistence arm (K-⑩-3, Cycle 2 / I4)', () => {
  it('failed-turn empty residue must not be persisted by autoSave', async () => {
    const saved: Record<string, ChatMessage[]> = {};
    let shouldFail = true;
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation() {},
      async saveMessages(id: string, messages: ChatMessage[]) {
        saved[id] = messages;
      },
      async deleteConversation() {},
    };
    const connector: AiConnector = {
      async stream() {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('connector-boom');
        }
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'Hi' } };
          yield { finishReason: 'stop' as const };
        }
        return gen();
      },
    };
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );
    await act(async () => {
      await wait(5);
    });

    let convId = '';
    act(() => {
      convId = result.current.createConversation({ title: 'X' }).id;
    });
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi');
    });
    await act(async () => {
      await wait(10);
    });

    // The failed turn's snapshot must not contain the empty assistant residue.
    expect(saved[convId] ?? []).not.toContainEqual(
      expect.objectContaining({ role: 'assistant', content: '' }),
    );
  });

  it('dangling tool_calls residue must not be persisted by autoSave (P1-2)', async () => {
    // P1-2 (2026-08-10 multi-audit) autoSave arm: a tool-no-executor round
    // leaves an assistant carrying `tool_calls` with no paired role:'tool'
    // response. The snapshot saved on the error transition must exclude it
    // (empty content → dropped; the persisted history stays protocol-clean).
    const saved: Record<string, ChatMessage[]> = {};
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation() {},
      async saveMessages(id: string, messages: ChatMessage[]) {
        saved[id] = messages;
      },
      async deleteConversation() {},
    };
    const connector: AiConnector = {
      async stream() {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield {
            delta: {
              tool_calls: [
                { index: 0, id: 'c_save', type: 'function', function: { name: 'f', arguments: '{}' } },
              ],
            },
          };
          yield { finishReason: 'tool_calls' as const };
        }
        return gen();
      },
    };
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );
    await act(async () => {
      await wait(5);
    });

    let convId = '';
    act(() => {
      convId = result.current.createConversation({ title: 'X' }).id;
    });
    await act(async () => {
      // No toolExecutor → the round settles 'error' with the dangling shape.
      await result.current.activeEngine!.sendMessage('go');
    });
    await act(async () => {
      await wait(10);
    });

    const persisted = saved[convId] ?? [];
    expect(
      persisted.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invariant ④ (P1-3/P1-4 extension, 2026-08-10 multi-audit) — clearAll
// fan-out source. The audit's cross-cutting pattern #2: enumerating
// "sessions I have an engine for" (`engineCache.keys()`) instead of
// "sessions that exist" loses (a) sessions whose engine was evicted by a
// switch while their autoSave is still in flight (P1-3) and (b) sessions
// that were loaded by bootstrap but never opened (P1-4) — both leave storage
// records behind → ghost rehydration on remount.
// ---------------------------------------------------------------------------

describe('Invariant ④ — clearAll fan-out source (P1-3/P1-4, 2026-08-10)', () => {
  it('P1-3: evicted session in-flight autoSave must not land after clearAll (no ghost)', async () => {
    // A is active; its autoSave is suspended in the storage write. A switch
    // to B evicts A's engine (idle). clearAll then runs — pre-fix its drain
    // only covered `engineCache.keys()` = [B], so A's late save landed after
    // the storage clear → remount would rehydrate the ghost.
    const saved: Record<string, ChatMessage[]> = {};
    const store: AiConversationInfo[] = [convInfo('A'), convInfo('B')];
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((r) => {
      releaseSave = r;
    });
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [...store];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation(info) {
        store.unshift(info);
      },
      async saveMessages(id: string, messages: ChatMessage[]) {
        if (id === 'A') await saveGate;
        saved[id] = messages;
      },
      async deleteConversation(id) {
        const idx = store.findIndex((c) => c.id === id);
        if (idx >= 0) store.splice(idx, 1);
        delete saved[id];
      },
    };
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy, autoSaveMessages: true }),
    );
    await act(async () => {
      await wait(5);
    });

    // A turn on A starts the gated autoSave.
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi');
    });
    // Switch to B — A's engine is evicted (idle, non-active) but A's pending
    // save stays in pendingSavesRef.
    await act(async () => {
      await result.current.switchConversation('B');
    });
    act(() => {
      result.current.clearAll();
    });
    // Release A's gated save AFTER the clear ran: on pre-fix code it lands
    // late (storage clear only covered the cached engines' ids).
    await act(async () => {
      releaseSave();
      await wait(10);
    });

    expect(store).toEqual([]);
    expect(saved['A']).toBeUndefined();
  });

  it('P1-4: unopened sessions (bootstrap-loaded, never switched) are cleared from storage by per-id fan-out', async () => {
    // Bootstrap only builds an engine for the ACTIVE conversation; B and C
    // never enter engineCache. clearAll's per-id fallback (no storage
    // clearAll) must still delete their records — otherwise a remount
    // rehydrates them (FP-2 ghost).
    const store: AiConversationInfo[] = [convInfo('A'), convInfo('B'), convInfo('C')];
    const deleted: string[] = [];
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return [...store];
      },
      async loadMessages() {
        return [];
      },
      async saveConversation(info) {
        store.unshift(info);
      },
      async saveMessages() {},
      async deleteConversation(id) {
        deleted.push(id);
        const idx = store.findIndex((c) => c.id === id);
        if (idx >= 0) store.splice(idx, 1);
      },
      // No clearAll implementation — the documented default per-id fallback.
    };
    const { result, unmount } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });
    expect(result.current.conversations).toHaveLength(3);

    // No switch — only A (active) has an engine in the cache.
    act(() => {
      result.current.clearAll();
    });
    await act(async () => {
      await wait(10);
    });

    expect(deleted.sort()).toEqual(['A', 'B', 'C']);
    expect(store).toEqual([]);

    // Remount from the same storage: nothing resurrects.
    unmount();
    const { result: remounted } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });
    expect(remounted.current.conversations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Invariant ②/④ (K-K4/② + K-K3/④ extension) — metadata write timing &
// mirror write surface (Cycle 2 / I4)
// ---------------------------------------------------------------------------

describe('Invariant ②/④ — metadata ghost writes (K-K4/②, K-K3/④)', () => {
  /**
   * Storage whose `saveConversation` LANDS only after a gate resolves
   * (simulated async I/O) and whose deletes/clear actually remove records —
   * so a metadata write that started before a delete/clearAll but lands after
   * it would re-create a ghost record.
   */
  function gatedMetadataStorage(initial: AiConversationInfo[]) {
    const saved: Record<string, AiConversationInfo> = {};
    for (const c of initial) saved[c.id] = c;
    const deleted: string[] = [];
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((r) => {
      releaseSave = r;
    });
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        return initial;
      },
      async loadMessages() {
        return [];
      },
      async saveConversation(info) {
        await saveGate;
        saved[info.id] = info;
      },
      async saveMessages() {},
      async deleteConversation(id) {
        deleted.push(id);
        delete saved[id];
      },
      async clearAll() {
        for (const k of Object.keys(saved)) delete saved[k];
      },
    };
    return { strategy, saved, deleted, releaseSave };
  }

  it('same-tick delete+rename, delete-first: the deleted conversation must not be re-saved', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([convInfo('X')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    act(() => {
      void result.current.deleteConversation('X');
      result.current.renameConversation('X', 'T2');
    });
    await act(async () => {
      // Release the gate: on pre-fix code the rename reads the stale mirror
      // (delete did not filter it) and re-saves X as a ghost.
      releaseSave();
      await wait(10);
    });

    expect(saved['X']).toBeUndefined();
  });

  it('same-tick delete+rename, rename-first (gated save): the late save must not re-save the deleted conversation', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([convInfo('X')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    let deleteP!: Promise<void>;
    act(() => {
      result.current.renameConversation('X', 'T2');
      deleteP = result.current.deleteConversation('X');
    });
    // Release the rename's gated save: the delete's drain waits for it, and
    // the settlement re-check (mirror already filtered by delete) skips it.
    await act(async () => {
      releaseSave();
      await deleteP;
      await wait(5);
    });

    expect(saved['X']).toBeUndefined();
  });

  it('same-tick rename+clearAll, rename-first (gated save): no metadata ghost', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([convInfo('A')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    act(() => {
      result.current.renameConversation('A', 'T2');
      result.current.clearAll();
    });
    await act(async () => {
      releaseSave();
      await wait(10);
    });

    // No `{A: title:'T2'}` metadata ghost may land after the storage clear.
    expect(saved['A']).toBeUndefined();
  });

  it('same-tick rename+clearAll, clearAll-first: rename must not resurrect metadata', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([convInfo('A')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    act(() => {
      result.current.clearAll();
      result.current.renameConversation('A', 'T2');
    });
    await act(async () => {
      releaseSave();
      await wait(10);
    });

    expect(saved['A']).toBeUndefined();
  });

  it('same-tick create+clearAll (gated save): the new conversation must not ghost into storage', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    let xId = '';
    act(() => {
      xId = result.current.createConversation({ title: 'X' }).id;
      result.current.clearAll();
    });
    await act(async () => {
      // Let the clear settle FIRST, then release the create's gated save — on
      // pre-fix code the bare save lands after the storage clear (ghost).
      await wait(20);
      releaseSave();
      await wait(10);
    });

    // The create's metadata write is in the drain → the storage clear runs
    // after it; the settlement re-check skips the write (mirror cleared).
    expect(saved[xId]).toBeUndefined();
  });

  it('delete/clearAll synchronously maintain the conversationsRef mirror (② write surface)', async () => {
    const { strategy, saved, releaseSave } = gatedMetadataStorage([convInfo('A'), convInfo('B')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    act(() => {
      void result.current.deleteConversation('A');
      // Same tick — the mirror effect has NOT flushed: the rename of A must
      // already be a no-op (mirror filtered synchronously by delete) and the
      // rename of B after clearAll must already be a no-op (mirror cleared
      // synchronously) — neither may re-save into storage.
      result.current.renameConversation('A', 'A2');
      result.current.clearAll();
      result.current.renameConversation('B', 'B2');
    });
    await act(async () => {
      releaseSave();
      await wait(10);
    });

    expect(result.current.conversations).toHaveLength(0);
    expect(saved['A']).toBeUndefined();
    expect(saved['B']).toBeUndefined();
  });
});
