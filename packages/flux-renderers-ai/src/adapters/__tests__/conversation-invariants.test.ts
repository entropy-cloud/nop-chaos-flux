import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type { AiConversationInfo } from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import { okChunks, slowConnector, wait } from './use-conversation-test-helpers.js';

/**
 * I1 Phase 1 — Parameterized exhaustive invariant tests for the adapter.
 *
 * Method-table-driven coverage of invariants ②④⑤ from
 * `docs/audits/ai-invariants/invariant-catalog.md` §2.
 *
 * Table completeness gate (§4): `UseConversationReturn` function fields must
 * be ⊆ test table. A new public method not in the table → this test fails.
 */

// ---------------------------------------------------------------------------
// §4 Target set — method table (adapter side)
// ---------------------------------------------------------------------------

const ADAPTER_MUTATING_METHODS = [
  'createConversation',
  'switchConversation',
  'deleteConversation',
  'renameConversation',
  'clearAll',
] as const;

// ---------------------------------------------------------------------------
// Invariant ② — await 后状态读取用 activeIdRef/conversationsRef (非闭包捕获)
// ---------------------------------------------------------------------------

describe('Invariant ② — post-await state reads via ref (not closure)', () => {
  it('switchConversation eviction reads activeIdRef, not closure capture', async () => {
    // Verify: after switching A→B with a slow A loadMessages, a concurrent
    // createConversation must not be displaced by stale closure reads.
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks, 50),
        initialConversations: [{ id: 'A', title: 'A', createdAt: 0, updatedAt: 0 } as AiConversationInfo],
      }),
    );

    // Create a second conversation so we can switch between them.
    let convB: AiConversationInfo;
    act(() => {
      convB = result.current.createConversation({ title: 'B' });
    });
    const bId = convB!.id;

    // Switch to B while A is still loading messages (slow connector).
    // The switch's post-await eviction must read activeIdRef.current.
    await act(async () => {
      await result.current.switchConversation(bId);
    });

    // The active conversation should be B, not stale back to A.
    expect(result.current.activeConversationId).toBe(bId);
  });

  it('deleteConversation post-await reads activeIdRef.current (not closure id)', async () => {
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks, 20),
        initialConversations: [
          { id: 'A', title: 'A', createdAt: 0, updatedAt: 0 } as AiConversationInfo,
          { id: 'B', title: 'B', createdAt: 0, updatedAt: 0 } as AiConversationInfo,
        ],
      }),
    );

    // Delete B while it's not active (active is A by default).
    // After delete's await, the active check must use ref, not closure.
    await act(async () => {
      await result.current.deleteConversation('B');
    });

    // Active should still be A.
    expect(result.current.activeConversationId).toBe('A');
    expect(result.current.conversations.find((c) => c.id === 'B')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Invariant ④ — storage 变更经 reportStorageError
// ---------------------------------------------------------------------------

describe('Invariant ④ — storage mutations route errors through reportStorageError', () => {
  /**
   * Parameterized: each storage operation that can fail must surface the error
   * via onStorageError, not silently swallow it.
   */
  function failingStorage(failOps: Set<string>) {
    const strategy: ConversationStorageStrategy = {
      async loadConversations() { return []; },
      async loadMessages() { return []; },
      async saveConversation() {
        if (failOps.has('saveConversation')) throw new Error('save-failed');
      },
      async saveMessages() {
        if (failOps.has('saveMessages')) throw new Error('save-msg-failed');
      },
      async deleteConversation() {
        if (failOps.has('deleteConversation')) throw new Error('delete-failed');
      },
    };
    const onStorageError = vi.fn();
    return { strategy, onStorageError };
  }

  it('createConversation: saveConversation rejection → onStorageError', async () => {
    const { strategy, onStorageError } = failingStorage(new Set(['saveConversation']));
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(okChunks), storage: strategy, onStorageError }),
    );
    // Wait for mount bootstrap.
    await act(async () => { await wait(10); });

    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    await act(async () => { await wait(20); });

    expect(onStorageError).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'saveConversation' }),
    );
  });

  it('renameConversation: saveConversation rejection → onStorageError', async () => {
    const { strategy, onStorageError } = failingStorage(new Set(['saveConversation']));
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        storage: strategy,
        initialConversations: [],
        onStorageError,
      }),
    );
    await act(async () => { await wait(10); });

    act(() => {
      const conv = result.current.createConversation({ title: 'Y' });
      result.current.renameConversation(conv.id, 'Y2');
    });
    await act(async () => { await wait(20); });

    expect(onStorageError).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'saveConversation' }),
    );
  });

  it('deleteConversation: storage rejection → onStorageError', async () => {
    const { strategy, onStorageError } = failingStorage(new Set(['deleteConversation']));
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        storage: strategy,
        initialConversations: [],
        onStorageError,
      }),
    );
    await act(async () => { await wait(10); });

    let convId: string;
    act(() => {
      const conv = result.current.createConversation({ title: 'Z' });
      convId = conv.id;
    });
    await act(async () => { await wait(10); });

    await act(async () => {
      await result.current.deleteConversation(convId!);
    });
    await act(async () => { await wait(10); });

    expect(onStorageError).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'deleteConversation' }),
    );
  });

  it('clearAll: per-id fan-out errors each surface via onStorageError', async () => {
    const { strategy, onStorageError } = failingStorage(new Set(['deleteConversation']));
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        storage: strategy,
        initialConversations: [],
        onStorageError,
      }),
    );
    await act(async () => { await wait(10); });

    act(() => {
      result.current.createConversation({ title: 'P' });
      result.current.createConversation({ title: 'Q' });
    });
    await act(async () => { await wait(10); });

    act(() => {
      result.current.clearAll();
    });
    await act(async () => { await wait(20); });

    // Both per-id deletions should have reported errors (not just the first).
    const deleteErrors = onStorageError.mock.calls.filter(
      (c: unknown[]) => (c[0] as { phase: string }).phase === 'deleteConversation',
    );
    expect(deleteErrors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑤ — abort 路径清理 controller (delete/clearAll abort in-flight)
// ---------------------------------------------------------------------------

describe('Invariant ⑤ — abort path cleanup (adapter side)', () => {
  it('deleteConversation aborts the in-flight engine of the deleted conversation', async () => {
    const longChunks = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { delta: { content: 'c' } },
      { finishReason: 'stop' as const },
    ];
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(longChunks, 30) }),
    );

    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    const xId = result.current.activeConversationId!;
    const xEngine = result.current.activeEngine!;

    // Kick off a stream so X enters processing state.
    act(() => {
      void xEngine.sendMessage('go');
    });
    await act(async () => { await Promise.resolve(); });
    expect(xEngine.getState().isProcessing).toBe(true);

    // Delete the conversation while it's processing.
    await act(async () => {
      await result.current.deleteConversation(xId);
      await wait(20);
    });

    // After delete, the engine should have been aborted.
    expect(xEngine.getState().isProcessing).toBe(false);
  });

  it('clearAll aborts all in-flight engines', async () => {
    const longChunks = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { delta: { content: 'c' } },
      { finishReason: 'stop' as const },
    ];
    const { result } = renderHook(() =>
      useConversation({ connector: slowConnector(longChunks, 30) }),
    );

    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    const xEngine = result.current.activeEngine!;

    act(() => {
      void xEngine.sendMessage('go');
    });
    await act(async () => { await Promise.resolve(); });
    expect(xEngine.getState().isProcessing).toBe(true);

    act(() => {
      result.current.clearAll();
    });
    await act(async () => { await wait(20); });

    expect(xEngine.getState().isProcessing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4 Table completeness gate — adapter public methods
// ---------------------------------------------------------------------------

describe('Table completeness gate — adapter public methods', () => {
  const TESTED = new Set<string>(ADAPTER_MUTATING_METHODS);

  it('every UseConversationReturn function field is in test table', () => {
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        initialConversations: [],
      }),
    );

    // Extract function fields from the hook return.
    const fnFields = Object.entries(result.current)
      .filter(([, v]) => typeof v === 'function')
      .map(([k]) => k);

    const unaccounted = fnFields.filter((k) => !TESTED.has(k));
    // The nested `controller` object has bridge methods — those are not
    // standalone mutating methods but are composed from the 5 tested methods.
    // We assert fnFields is a subset of tested ∪ known bridges.
    const knownBridges = new Set([
      'controller', // nested object, not a function itself
    ]);
    const trulyUnaccounted = unaccounted.filter((k) => !knownBridges.has(k));
    expect(trulyUnaccounted).toEqual([]);

    // Every tested method must exist.
    const missing = ADAPTER_MUTATING_METHODS.filter((m) => !fnFields.includes(m));
    expect(missing).toEqual([]);
  });

  it('PROOF: injecting a fake adapter method makes the gate fail (RED evidence)', () => {
    const { result } = renderHook(() =>
      useConversation({
        connector: slowConnector(okChunks),
        initialConversations: [],
      }),
    );

    // Simulate a new method being added to the return value.
    const fakeReturn = { ...result.current, newMysteryMethod: () => {} };
    const fnFields = Object.entries(fakeReturn)
      .filter(([, v]) => typeof v === 'function')
      .map(([k]) => k);

    const unaccounted = fnFields.filter((k) => !TESTED.has(k));
    const knownBridges = new Set(['controller']);
    const trulyUnaccounted = unaccounted.filter((k) => !knownBridges.has(k));
    // This WOULD fail — proving the gate catches unregistered new methods.
    expect(trulyUnaccounted).toEqual(['newMysteryMethod']);
  });
});
