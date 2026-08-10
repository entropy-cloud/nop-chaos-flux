import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest, AiConversationInfo } from '../../engine/types.js';
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

  // open-audit P1-2: without storage there is no rehydration path, so an idle
  // engine must NOT be evicted on switch — otherwise a round-trip A→B→A would
  // rebuild A empty and silently lose its prior message history.
  it('FP-4 no-storage round-trip A→B→A preserves A\'s messages (no silent eviction)', async () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    const aEngine = result.current.activeEngine!;

    // Give A real history: a user + assistant turn.
    await act(async () => {
      await aEngine.sendMessage('hello');
    });
    expect(aEngine.getMessages().length).toBeGreaterThan(0);

    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    const bId = result.current.activeConversationId!;

    // Switch to B — under the buggy eviction this drops A's engine.
    await act(async () => {
      await result.current.switchConversation(bId);
    });
    expect(result.current.activeConversationId).toBe(bId);

    // Switch back to A — must reuse the cached engine (messages preserved),
    // not rebuild an empty one.
    await act(async () => {
      await result.current.switchConversation(aId);
    });
    expect(result.current.activeConversationId).toBe(aId);
    const aEngineAfter = result.current.activeEngine!;
    expect(aEngineAfter).toBe(aEngine);
    expect(aEngineAfter.getMessages().length).toBeGreaterThan(0);
    // The user message survives the round-trip.
    expect(
      aEngineAfter.getMessages().some((m) => m.role === 'user'),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// open P2-1 (2026-08-10) — connector hot-swap must fan out to EVERY cached
// self-built engine. `buildEngine` captured `connectorRef.current` at build
// time and the hook had zero `setConnector` call sites, so a host swapping
// the connector left old sessions on stale credentials/model (2151 hot-swap
// family). useConversation's cache is self-built by definition (m4: external
// engines are never cached here).
// ---------------------------------------------------------------------------

describe('open P2-1 — connector change fans out to cached engines', () => {
  function countingConnector(count: { n: number }): AiConnector {
    return {
      async stream(_req: AiConnectorRequest) {
        count.n += 1;
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'ok' } };
          yield { finishReason: 'stop' as const };
        }
        void _req;
        return gen();
      },
    };
  }

  it('swapping the connector updates the active AND the cached idle engines', async () => {
    const callsA = { n: 0 };
    const callsB = { n: 0 };
    const connectorA = countingConnector(callsA);
    const connectorB = countingConnector(callsB);
    const convs = [
      { id: 'A', title: 'A', createdAt: 0, updatedAt: 0 } as AiConversationInfo,
      { id: 'B', title: 'B', createdAt: 0, updatedAt: 0 } as AiConversationInfo,
    ];
    const { result, rerender } = renderHook(
      ({ connector }: { connector: AiConnector }) =>
        useConversation({ connector, initialConversations: convs }),
      { initialProps: { connector: connectorA } },
    );
    await act(async () => {
      await wait(5);
    });
    // Engine A active; build engine B via switch (no storage → no eviction,
    // so both engines stay cached).
    await act(async () => {
      await result.current.switchConversation('B');
    });

    // Host swaps the connector.
    rerender({ connector: connectorB });
    await act(async () => {
      await wait(5);
    });

    // The active (B) engine's next send must flow through connectorB.
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi');
    });
    expect(callsB.n).toBe(1);
    expect(callsA.n).toBe(0);
    // Switch back to A — its cached engine must ALSO carry connectorB.
    await act(async () => {
      await result.current.switchConversation('A');
    });
    await act(async () => {
      await result.current.activeEngine!.sendMessage('hi');
    });
    expect(callsB.n).toBe(2);
  });
});
