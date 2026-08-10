import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnector, AiConversationInfo, ChatMessage } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, wait } from './use-conversation-test-helpers.js';

/**
 * 2026-08-11 engine/adapter P2 — adapter invariant family: FIND-12 autoSave
 * connector-missing arm + R1-F3 no-storage first-session build-on-demand +
 * R1-F4 delete-during-load ghost (bootstrap merge filter).
 *
 * Split out following the `engine-invariants-p2.test.ts` precedent (2026-08-10
 * multi P2-1 additions keep the same invariants-suite family).
 *
 * FIND-12 (source `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`):
 * the autoSave trigger predicate (`use-conversation-autosave.ts`)
 * `wasProcessing && isDone` never fires for the connector-missing branch
 * (`create-engine.ts` runTurn: `idle` → `'error'` directly, `isProcessing`
 * never true) — but the user message WAS pushed into the engine history before
 * the early return. The round's messages stay memory-only → silently lost on
 * reload. The two members below are the persistence + reload arms.
 */

function noConnectorStrategy(initial?: {
  conversations?: AiConversationInfo[];
  messages?: Record<string, ChatMessage[]>;
}) {
  const saved: Record<string, ChatMessage[]> = {};
  const store: AiConversationInfo[] = [...(initial?.conversations ?? [])];
  const strategy: ConversationStorageStrategy = {
    async loadConversations() {
      return [...store];
    },
    async loadMessages(id: string) {
      return saved[id] ?? [];
    },
    async saveConversation(info: AiConversationInfo) {
      store.push(info);
    },
    async saveMessages(id: string, messages: ChatMessage[]) {
      saved[id] = messages;
    },
    async deleteConversation() {},
  };
  return { strategy, saved, store };
}

function convInfo(id: string): AiConversationInfo {
  return { id, title: id, createdAt: 0, updatedAt: 0 } as AiConversationInfo;
}

describe('R1-F3 — no-storage first session build-on-demand (2026-08-11)', () => {
  it('no storage + initialConversations: the first conversation gets an activeEngine on mount', async () => {
    // R1-F3 (source `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`):
    // without storage, `activeId` seeds from `initialConversations[0]` but
    // `activeEngine` stayed null — a host binding `engine={activeEngine}` saw
    // an "active conversation but empty state". K-⑥-3's build-on-demand only
    // covered the storage bootstrap path.
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        initialConversations: [convInfo('A'), convInfo('B')],
      }),
    );
    await act(async () => {
      await wait(5);
    });

    expect(result.current.activeConversationId).toBe('A');
    expect(result.current.activeEngine).not.toBeNull();
    expect(result.current.activeEngine?.getState().messages).toEqual([]);
  });

  it('no storage + initialConversations: the bound engine can send and read messages', async () => {
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks, 5),
        initialConversations: [convInfo('A')],
      }),
    );
    await act(async () => {
      await wait(5);
    });
    const engine = result.current.activeEngine;
    expect(engine).not.toBeNull();
    await act(async () => {
      await engine!.sendMessage('hello-no-storage');
    });

    const contents = engine!.getState().messages.map((m) => m.content);
    expect(contents).toContain('hello-no-storage');
    expect(engine!.getState().messages.some((m) => m.role === 'assistant')).toBe(true);
  });
});

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

describe('R1-F4 — delete-during-load ghost filter (2026-08-11)', () => {
  it('delete during bootstrap load: the deleted conversation must not resurrect as a ghost list item', async () => {
    // R1-F4 (source `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`):
    // K-⑦'s merge base is the RAW loaded `convs` — a conversation deleted
    // while `loadConversations` was pending (mirror filtered synchronously by
    // deleteConversation) comes back in the merge → ghost list item.
    const { strategy, releaseLoad } = gatedBootstrapStorage([convInfo('A'), convInfo('B')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteConversation('A');
    });
    await act(async () => {
      releaseLoad();
      await wait(10);
    });

    const ids = result.current.conversations.map((c) => c.id);
    expect(ids).not.toContain('A');
    expect(ids).toContain('B');
  });

  it('delete during bootstrap load (sole conversation): the deleted conversation must not resurrect as active', async () => {
    const { strategy, releaseLoad } = gatedBootstrapStorage([convInfo('A')]);
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteConversation('A');
    });
    await act(async () => {
      releaseLoad();
      await wait(10);
    });

    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();
  });
});

describe('FIND-12 — autoSave covers connector-missing rounds (2026-08-11)', () => {
  it('connector-missing round: the pushed user message must reach storage via autoSave', async () => {
    // connector: null → every send hits the connector-missing branch
    // (idle → 'error', user message pushed, no assistant placeholder).
    const { strategy, saved } = noConnectorStrategy();
    const { result } = renderHook(() =>
      useConversation({
        connector: null as unknown as AiConnector,
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
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi-connector-missing');
    });
    await act(async () => {
      await wait(10);
    });

    const persisted = saved[convId] ?? [];
    expect(persisted.some((m) => m.role === 'user' && m.content === 'hi-connector-missing')).toBe(
      true,
    );
  });

  it('connector-missing round: a remount restores the user message from storage', async () => {
    const { strategy, saved } = noConnectorStrategy();
    const { result, unmount } = renderHook(() =>
      useConversation({
        connector: null as unknown as AiConnector,
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
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi-connector-missing');
    });
    await act(async () => {
      await wait(10);
    });
    // The connector-missing round was persisted (pre-fix: never saved).
    expect(saved[convId]).toBeDefined();

    // Remount from the same storage: the conversation + its messages return.
    unmount();
    const { result: remounted } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        storage: strategy,
        autoSaveMessages: true,
      }),
    );
    await act(async () => {
      await wait(5);
    });
    expect(remounted.current.activeConversationId).toBe(convId);
    await act(async () => {
      await wait(10);
    });
    const contents = remounted.current.activeEngine!.getMessages().map((m) => m.content);
    expect(contents).toContain('hi-connector-missing');
  });
});
