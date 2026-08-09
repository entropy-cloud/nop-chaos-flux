import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConversationInfo, ChatMessage } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, wait } from './use-conversation-test-helpers.js';

/**
 * Cycle 2 / I1 — Parameterized exhaustive invariant tests for the adapter
 * (second-batch gates ⑥⑦, `docs/audits/ai-invariants/invariant-catalog.md` §9).
 *
 * Split out of `conversation-invariants.test.ts` so the Cycle 1 file stays
 * within the oversized-code-file limit while the Cycle 2 additions remain in
 * the same invariants suite family.
 */

// ---------------------------------------------------------------------------
// Invariant ⑥ — active 位移完整性（N1，Cycle 2 / I1）
// ---------------------------------------------------------------------------
//
// post-await promotion/rehydration writes (`setActiveEngine` /
// `engine.setMessages`) must be arbitrated by `activeIdRef`/`switchVersionRef`
// and the target must still exist; displacement methods (delete/clearAll/create)
// must bump `switchVersionRef` so an in-flight switch is invalidated; deleting
// the active conversation must build the next engine on demand (no
// `setActiveEngine(null)` hang); a same-id fast re-switch must not have its
// hydration dropped wholesale by the version guard.
//
// All five member scenarios are RED on live code (findings §3.2 N1
// probe-1/1b/1c/B/C) — tests are committed in `it.fails` expected-failure form
// (suite stays green). Cycle 2 / I4 flips them to `it`.

function gatedLoadStorage(initial: {
  conversations: AiConversationInfo[];
  messages?: Record<string, ChatMessage[]>;
}) {
  const gates: (() => void)[] = [];
  const strategy: ConversationStorageStrategy = {
    async loadConversations() {
      return initial.conversations;
    },
    async loadMessages(id: string) {
      await new Promise<void>((r) => gates.push(r));
      return initial.messages?.[id] ?? [];
    },
    async saveConversation() {},
    async saveMessages() {},
    async deleteConversation() {},
  };
  return { strategy, gates };
}

function convInfo(id: string): AiConversationInfo {
  return { id, title: id, createdAt: 0, updatedAt: 0 } as AiConversationInfo;
}

function assistantMsg(content: string): ChatMessage {
  return { id: `m-${content}`, role: 'assistant', content } as ChatMessage;
}

describe('Invariant ⑥ — active displacement integrity (N1)', () => {
  it.fails('switch A→B in-flight × delete B: late promotion must not resurrect the deleted engine', async () => {
    const { strategy, gates } = gatedLoadStorage({
      conversations: [convInfo('A'), convInfo('B')],
      messages: { B: [assistantMsg('stored-B')] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    // Switch to B — the hydration await (loadMessages) is gated.
    const switchP = result.current.switchConversation('B');
    await act(async () => {
      await Promise.resolve();
    });
    // Delete the switch target while the switch is in-flight.
    await act(async () => {
      await result.current.deleteConversation('B');
    });
    // Release the gate: the late switch must NOT re-promote B's engine.
    await act(async () => {
      gates[0]();
      await switchP;
    });

    expect(result.current.activeConversationId).toBe('A');
    expect(result.current.activeEngine).toBeNull();
  });

  it.fails('switch in-flight × clearAll: no promotion after the list was cleared', async () => {
    const { strategy, gates } = gatedLoadStorage({
      conversations: [convInfo('A'), convInfo('B')],
      messages: { B: [assistantMsg('stored-B')] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    const switchP = result.current.switchConversation('B');
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.clearAll();
    });
    await act(async () => {
      gates[0]();
      await switchP;
      await wait(5);
    });

    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();
  });

  it.fails('switch in-flight × create X: activeEngine must stay the new conversation\'s engine', async () => {
    const { strategy, gates } = gatedLoadStorage({
      conversations: [convInfo('A'), convInfo('B')],
      messages: { B: [assistantMsg('stored-B')] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    const switchP = result.current.switchConversation('B');
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    await act(async () => {
      await Promise.resolve();
    });
    const xEngine = result.current.activeEngine;
    await act(async () => {
      gates[0]();
      await switchP;
    });

    expect(result.current.activeConversationId).not.toBe('B');
    expect(result.current.activeEngine).toBe(xEngine);
  });

  it.fails('same-id fast double switch: stored hydration must not be dropped by the version guard', async () => {
    const { strategy, gates } = gatedLoadStorage({
      conversations: [convInfo('A')],
      messages: { A: [assistantMsg('stored-A')] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    // First switch builds the engine and suspends in loadMessages (gated);
    // the same-id second switch must not cause the first hydration to be
    // dropped wholesale.
    const first = result.current.switchConversation('A');
    await act(async () => {
      await Promise.resolve();
    });
    const second = result.current.switchConversation('A');
    await act(async () => {
      gates[0]();
      await first;
      await second;
    });

    expect(result.current.activeEngine?.getState().messages.map((m) => m.content)).toContain('stored-A');
  });

  it.fails('delete active in storage mode: next engine must be built on demand (no null hang)', async () => {
    const { strategy } = gatedLoadStorage({
      conversations: [convInfo('A'), convInfo('B')],
      messages: { B: [assistantMsg('stored-B')] },
    });
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await wait(5);
    });

    // B was never switched to — its engine is not in the cache. Deleting the
    // active conversation must build B's engine on demand, not null-hang.
    await act(async () => {
      await result.current.deleteConversation('A');
    });

    expect(result.current.activeConversationId).toBe('B');
    expect(result.current.activeEngine).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑦ — storage bootstrap list merge (N2，Cycle 2 / I1)
// ---------------------------------------------------------------------------
//
// The storage bootstrap's post-await `setConversations` must merge the current
// state (functional updater), not wholesale-overwrite conversations created
// while `loadConversations` was pending (probe-2: create X → bootstrap
// resolve → list rolled back to [A], activeId=X dangling off-list).

describe('Invariant ⑦ — storage bootstrap list merge (N2)', () => {
  function gatedBootstrapStorage(loaded: AiConversationInfo[]) {
    let releaseLoad!: () => void;
    const loadGate = new Promise<void>((r) => {
      releaseLoad = r;
    });
    const strategy: ConversationStorageStrategy = {
      async loadConversations() {
        await loadGate;
        return loaded;
      },
      async loadMessages() {
        return [];
      },
      async saveConversation() {},
      async saveMessages() {},
      async deleteConversation() {},
    };
    return { strategy, releaseLoad };
  }

  it.fails('bootstrap resolve after create: the created conversation must not be overwritten off the list', async () => {
    const { strategy, releaseLoad } = gatedBootstrapStorage([convInfo('A')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );

    // Create X while `loadConversations` is still pending.
    let xId = '';
    act(() => {
      xId = result.current.createConversation({ title: 'X' }).id;
    });
    // Release the bootstrap: it must merge, not replace, the list.
    await act(async () => {
      releaseLoad();
      await wait(10);
    });

    expect(result.current.conversations.some((c) => c.id === xId)).toBe(true);
    expect(result.current.activeConversationId).toBe(xId);
  });

  it.fails('bootstrap merge semantics: loaded conversations join the list without dropping created ones', async () => {
    const { strategy, releaseLoad } = gatedBootstrapStorage([convInfo('B'), convInfo('C')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );

    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    await act(async () => {
      releaseLoad();
      await wait(10);
    });

    const ids = result.current.conversations.map((c) => c.id);
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids.some((id) => id !== 'B' && id !== 'C')).toBe(true);
  });
});
