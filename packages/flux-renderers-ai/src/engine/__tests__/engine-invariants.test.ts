import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { BaseMessageStateAdapter } from '../state-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  InternalMessageState,
} from '../types.js';
import { okChunks, slowConnector, wait } from '../../adapters/__tests__/use-conversation-test-helpers.js';

class InspectableAdapter extends BaseMessageStateAdapter {
  peek(): InternalMessageState {
    return this.state;
  }
}

function makeEngine(connector?: AiConnector) {
  const adapter = new InspectableAdapter();
  adapter.initialize({
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: connector ?? null,
  });
  return {
    engine: createMessageEngine({ connector: connector ?? undefined, adapter }),
    adapter,
  };
}

function gatedConnector(gate: Promise<void>): AiConnector & { stream: ReturnType<typeof vi.fn> } {
  const stream = vi.fn(async (_req: AiConnectorRequest) => {
    async function* gen(): AsyncGenerator<AiConnectorChunk> {
      yield { delta: { content: 'partial' } };
      await gate;
      yield { finishReason: 'stop' };
    }
    void _req;
    return gen();
  });
  return { stream };
}

// ---------------------------------------------------------------------------
// §4 Target set — method table (engine side)
// ---------------------------------------------------------------------------

const ENGINE_MUTATING_METHODS = [
  'sendMessage',
  'send',
  'abort',
  'regenerate',
  'clear',
  'setMessages',
  'setMessageEditing',
] as const;

const ENGINE_WHITELIST = new Set([
  'getState',
  'subscribe',
  'setConnector',
  'registerPlugin',
  'getMessages',
]);

// ---------------------------------------------------------------------------
// Invariant ① — isProcessing entry guard for async mutating methods
// ---------------------------------------------------------------------------

describe('Invariant ① — isProcessing entry guard (async mutating methods)', () => {
  const asyncEntryGuarded: ReadonlyArray<{
    method: string;
    invoke: (engine: ReturnType<typeof createMessageEngine>) => Promise<unknown>;
  }> = [
    { method: 'sendMessage', invoke: (e) => e.sendMessage('hello') },
    {
      method: 'send',
      invoke: (e) => e.send({ id: 'm1', role: 'user', content: 'hi' } as ChatMessage),
    },
    { method: 'regenerate', invoke: (e) => e.regenerate() },
  ];

  for (const { method, invoke } of asyncEntryGuarded) {
    it(`${method}: returns immediately when isProcessing=true — no second stream, no controller overwrite`, async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => {
        resolveGate = r;
      });
      const connector = gatedConnector(gate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('first');
      await Promise.resolve();
      await Promise.resolve();

      expect(adapter.peek().isProcessing).toBe(true);
      expect(connector.stream).toHaveBeenCalledTimes(1);
      const controllerBefore = adapter.peek().abortController;
      const messagesBefore = adapter.peek().messages.length;

      await invoke(engine);

      expect(connector.stream).toHaveBeenCalledTimes(1);
      expect(adapter.peek().abortController).toBe(controllerBefore);
      expect(adapter.peek().messages.length).toBe(messagesBefore);

      resolveGate();
      await first;
    });
  }

  it('clear: no-op when isProcessing=true', async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => { resolveGate = r; });
      const connector = gatedConnector(gate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('first');
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter.peek().isProcessing).toBe(true);
      const messagesBefore = adapter.peek().messages.length;

      engine.clear();
      expect(adapter.peek().messages.length).toBe(messagesBefore);

      resolveGate();
      await first;
  });

  it('setMessages: no-op when isProcessing=true', async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => { resolveGate = r; });
      const connector = gatedConnector(gate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('first');
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter.peek().isProcessing).toBe(true);
      const messagesBefore = adapter.peek().messages.length;

      engine.setMessages([{ id: 'x', role: 'user', content: 'replacement' } as ChatMessage]);
      expect(adapter.peek().messages.length).toBe(messagesBefore);

      resolveGate();
      await first;
  });
});

// ---------------------------------------------------------------------------
// Invariant ③ — catch/finally controller identity guard
// ---------------------------------------------------------------------------

describe('Invariant ③ — catch/finally controller identity guard', () => {
  it('stale turn finally does not null a newer turn\'s abortController (abort→send race)', async () => {
      // Connector that gates EVERY stream call so both turns stay in-flight.
      let resolveA!: () => void;
      let resolveB!: () => void;
      const gateA = new Promise<void>((r) => { resolveA = r; });
      const gateB = new Promise<void>((r) => { resolveB = r; });
      const gates = [gateA, gateB];
      let callCount = 0;
      const stream = vi.fn(async (_req: AiConnectorRequest) => {
        const myGate = gates[Math.min(callCount, gates.length - 1)];
        callCount++;
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'partial' } };
          await myGate;
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      });
      const connector: AiConnector = { stream };
      const { engine, adapter } = makeEngine(connector);

      // Turn A in-flight (gated by gateA).
      const turnA = engine.sendMessage('turn-A');
      await Promise.resolve();
      await Promise.resolve();
      const ctrlA = adapter.peek().abortController;
      expect(ctrlA).not.toBeNull();
      expect(adapter.peek().isProcessing).toBe(true);

      // Abort A → isProcessing=false synchronously.
      await engine.abort();
      expect(adapter.peek().isProcessing).toBe(false);

      // Start turn B — guard passes (isProcessing=false), B gets its own controller.
      const turnB = engine.sendMessage('turn-B');
      await Promise.resolve();
      await Promise.resolve();
      const ctrlB = adapter.peek().abortController;
      expect(ctrlB).not.toBeNull();
      expect(ctrlB).not.toBe(ctrlA);
      expect(adapter.peek().isProcessing).toBe(true);

      // Now resolve gate A → turn A's catch/finally runs.
      resolveA();
      await turnA;
      await Promise.resolve();

      // CRITICAL: turn A's finally did NOT null turn B's controller.
      expect(adapter.peek().abortController).toBe(ctrlB);
      expect(adapter.peek().isProcessing).toBe(true);

      // Cleanup turn B.
      resolveB();
      await engine.abort();
      await turnB;
  });

  it('completion-path identity guard: stale turn completion does not clobber a new turn (abort during onTurnStart)', async () => {
      // probe-A scenario (K1): abort() is called while turn A is suspended in
      // `plugin.onTurnStart` (try-outer) → sync reset → sendMessage starts
      // turn B (new controller) → A resumes and its completion mutate must
      // NOT write 'completed' over B's in-flight state.
      let resolveTurnStart!: () => void;
      const turnStartGate = new Promise<void>((r) => { resolveTurnStart = r; });
      let resolveStreamB!: () => void;
      const streamBGate = new Promise<void>((r) => { resolveStreamB = r; });
      let streamCallCount = 0;
      const stream = vi.fn(async (_req: AiConnectorRequest) => {
        streamCallCount += 1;
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'partial' } };
          if (streamCallCount === 2) await streamBGate;
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      });
      const connector: AiConnector = { stream };
      const onTurnStart = vi.fn(async () => { await turnStartGate; });
      const { engine, adapter } = makeEngine(connector);
      engine.registerPlugin({ name: 'test-on-turn-start', onTurnStart });

      // Turn A: enters processing, then hangs in plugin.onTurnStart (before the try).
      const turnA = engine.sendMessage('turn-A');
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter.peek().isProcessing).toBe(true);

      // Abort while A is suspended in onTurnStart → synchronous reset.
      await engine.abort();
      expect(adapter.peek().requestState).toBe('aborted');
      expect(adapter.peek().isProcessing).toBe(false);

      // Turn B starts a new turn with its own controller (also hangs in onTurnStart).
      const turnB = engine.sendMessage('turn-B');
      await Promise.resolve();
      await Promise.resolve();
      const ctrlB = adapter.peek().abortController;
      expect(ctrlB).not.toBeNull();
      expect(adapter.peek().isProcessing).toBe(true);

      // Release onTurnStart for both turns.
      resolveTurnStart();
      await turnA;
      await Promise.resolve();
      await Promise.resolve();

      // CRITICAL: A's completion mutate must NOT have clobbered B's state —
      // B is still mid-stream (suspended at streamBGate).
      expect(adapter.peek().requestState).toBe('processing');
      expect(adapter.peek().isProcessing).toBe(true);
      expect(adapter.peek().abortController).toBe(ctrlB);

      // Cleanup turn B.
      resolveStreamB();
      await turnB;
  });

  it('completion-path guard preserves aborted terminal state when no new send follows', async () => {
      // Guard-preservation assertion (K1): abort during onTurnStart with NO
      // subsequent send must leave the terminal state 'aborted' — the
      // completion mutate's existing `requestState === 'aborted'` early return
      // must be preserved by the additive identity guard.
      let resolveTurnStart!: () => void;
      const turnStartGate = new Promise<void>((r) => { resolveTurnStart = r; });
      const { engine, adapter } = makeEngine(gatedConnector(new Promise<void>(() => {})));
      engine.registerPlugin({ name: 'test-turn-start-gate', onTurnStart: async () => { await turnStartGate; } });

      const turn = engine.sendMessage('turn');
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter.peek().isProcessing).toBe(true);

      await engine.abort();
      expect(adapter.peek().requestState).toBe('aborted');

      resolveTurnStart();
      await turn;
      await Promise.resolve();

      // The stale completion must not flip 'aborted' back to 'completed'.
      expect(adapter.peek().requestState).toBe('aborted');
      expect(adapter.peek().isProcessing).toBe(false);
      expect(adapter.peek().abortController).toBeNull();
  });

  it('runOnce catch identity guard: aborted stream does not clobber a subsequent turn', async () => {
      let resolveFirst!: () => void;
      const firstGate = new Promise<void>((r) => { resolveFirst = r; });
      const connector = gatedConnector(firstGate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('turn-A');
      await Promise.resolve();
      await Promise.resolve();

      await engine.abort();
      resolveFirst();
      await first;
      await Promise.resolve();

      expect(adapter.peek().requestState).toBe('aborted');
      expect(adapter.peek().lastError).toBeUndefined();

      // Turn B with a clean connector.
      const engine2 = createMessageEngine({ connector: slowConnector(okChunks, 1), adapter });
      await engine2.sendMessage('turn-B');

      expect(adapter.peek().requestState).not.toBe('error');
      expect(adapter.peek().lastError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑤ — abort path cleanup
// ---------------------------------------------------------------------------

describe('Invariant ⑤ — abort path cleanup', () => {
  it('abort() synchronously sets requestState=aborted + isProcessing=false', async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => { resolveGate = r; });
      const connector = gatedConnector(gate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('turn');
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter.peek().isProcessing).toBe(true);

      await engine.abort();

      expect(adapter.peek().requestState).toBe('aborted');
      expect(adapter.peek().isProcessing).toBe(false);

      resolveGate();
      await first;
  });

  it('abort() aborts the AbortController signal', async () => {
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => { resolveGate = r; });
      const connector = gatedConnector(gate);
      const { engine, adapter } = makeEngine(connector);

      const first = engine.sendMessage('turn');
      await Promise.resolve();
      await Promise.resolve();

      const controller = adapter.peek().abortController;
      expect(controller).not.toBeNull();
      expect(controller!.signal.aborted).toBe(false);

      await engine.abort();
      expect(controller!.signal.aborted).toBe(true);

      resolveGate();
      await first;
  });

  it('abort forces in-flight generator termination: late chunks after abort are not applied', async () => {
      // probe for K2: a signal-IGNORING connector that keeps yielding after
      // abort but settles after a finite number of yields (so the test fails
      // fast on vitest timeout instead of hanging forever).
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => { resolveGate = r; });
      const stream = vi.fn(async (_req: AiConnectorRequest) => {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'a' } };
          await gate;
          yield { delta: { content: 'b' } };
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      });
      const connector: AiConnector = { stream };
      const { engine, adapter } = makeEngine(connector);

      const turn = engine.sendMessage('turn');
      await Promise.resolve();
      await Promise.resolve();
      await wait(5);
      expect(adapter.peek().isProcessing).toBe(true);
      // 'a' applied; the generator is now suspended at the gate.
      expect(adapter.peek().messages.at(-1)?.content).toBe('a');

      await engine.abort();
      // Release the gate — the generator resumes and (signal-ignoring) keeps
      // yielding. The abort must force termination + suppress late chunks.
      resolveGate();
      await turn;
      await Promise.resolve();

      // (a) the in-flight round settles within finite iterations.
      expect(adapter.peek().requestState).toBe('aborted');
      expect(adapter.peek().isProcessing).toBe(false);
      expect(adapter.peek().abortController).toBeNull();

      // (b) chunks produced AFTER abort are not applied/committed to the message.
      const lastMessage = adapter.peek().messages.at(-1);
      expect(lastMessage?.content).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑧ — pendingBranchId consumption/clear (N3，Cycle 2 / I1)
// ---------------------------------------------------------------------------
//
// `pendingBranchId` must be consumed or cleared before use; no runTurn early
// return path may leave a pending branch stamp behind (leaking it into an
// unrelated turn). Leak path (RED on live, probe-3): regenerate stamps
// `pendingBranchId`, then runTurn hits the connector-missing early return
// (before runOnce consumes the stamp) — the next normal turn's assistant is
// wrongly stamped `branchId:'branch-1'`.

describe('Invariant ⑧ — pendingBranchId consumption/clear (N3)', () => {
  it('regenerate + connector-missing: next normal turn must not carry the leaked branch stamp', async () => {
    // No connector — runTurn's connector-missing early return fires before
    // runOnce can consume the stamp.
    const { engine, adapter } = makeEngine();
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old' },
    ] as ChatMessage[]);
    // regenerate stamps pendingBranchId, then hits connector-missing (stamp
    // is never consumed → leaked).
    await engine.regenerate('branch-1');
    expect(adapter.peek().requestState).toBe('error');

    // Now a working connector: the next normal turn must be stamp-free.
    engine.setConnector(slowConnector(okChunks, 1));
    await engine.sendMessage('normal');
    const assistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.metadata?.branchId).toBeUndefined();
  });

  it('regenerate with a working connector consumes the stamp; the next unrelated turn is clean', async () => {
    // Positive control (consumption contract, passes on live): the stamp is
    // consumed once by the regenerated turn and does not carry into the next.
    const { engine, adapter } = makeEngine(slowConnector(okChunks, 1));
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old' },
    ] as ChatMessage[]);
    await engine.regenerate();
    const regenAssistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(regenAssistant?.metadata?.branchId).toBe('branch-1');

    await engine.sendMessage('second');
    const secondAssistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(secondAssistant?.metadata?.branchId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑨ — plugin error isolation (N4，Cycle 2 / I1)
// ---------------------------------------------------------------------------
//
// A plugin hook rejection must not stick the turn in `processing` nor bypass
// the error state write (probe-4 / probe-E / onTurnEnd static evidence):
// onTurnStart must be inside the try/finally cleanup surface; onError must not
// precede the state write (a throwing onError must not skip it); an onTurnEnd
// rejection must not shadow the original error — every error lands in
// `requestState`/`lastError`. All three members are RED on live code.

describe('Invariant ⑨ — plugin error isolation (N4)', () => {
  function throwingStream(): AiConnector {
    const stream = vi.fn(async () => {
      throw new Error('connector-boom');
    });
    return { stream } as unknown as AiConnector;
  }

  it('onTurnStart rejection settles the turn (must not stick processing)', async () => {
    const { engine, adapter } = makeEngine(slowConnector(okChunks, 1));
    engine.registerPlugin({
      name: 'start-throws',
      onTurnStart: async () => {
        throw new Error('start-boom');
      },
    });

    // Correct behavior: the turn settles (requestState error, not processing).
    await expect(engine.sendMessage('hi')).resolves.toBeUndefined();
    expect(adapter.peek().isProcessing).toBe(false);
    expect(adapter.peek().requestState).not.toBe('processing');
  });

  it('plugin.onError throwing must not skip the error state write', async () => {
    const { engine, adapter } = makeEngine(throwingStream());
    engine.registerPlugin({
      name: 'error-throws',
      onError: () => {
        throw new Error('onError-boom');
      },
    });

    // Correct behavior: the error state is still written even though the
    // plugin's onError hook throws.
    await expect(engine.sendMessage('hi')).resolves.toBeUndefined();
    expect(adapter.peek().requestState).toBe('error');
    expect(adapter.peek().lastError).toBeInstanceOf(Error);
  });

  it('onTurnEnd rejection must not shadow the original error (all errors land in state)', async () => {
    const { engine, adapter } = makeEngine(throwingStream());
    engine.registerPlugin({
      name: 'end-throws',
      onTurnEnd: async () => {
        throw new Error('onTurnEnd-boom');
      },
    });

    // Correct behavior: the connector error is surfaced via requestState /
    // lastError and the turn settles (the plugin error is contained).
    await expect(engine.sendMessage('hi')).resolves.toBeUndefined();
    expect(adapter.peek().requestState).toBe('error');
    expect(adapter.peek().lastError).toBeInstanceOf(Error);
  });

  it('aborted turn: onTurnEnd rejection must not reject the host-facing promise (K-⑨-1)', async () => {
    // K-⑨-1 (Cycle 2 / I4): abort → the finally's `await plugin.onTurnEnd`
    // used to reject the host-facing sendMessage promise (`void
    // engine.sendMessage()` = unhandled rejection) even though the state had
    // already landed 'aborted'. The teardown rejection must be isolated.
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          await gate;
          yield { delta: { content: 'late' } };
        }
        return gen();
      },
    };
    const { engine, adapter } = makeEngine(connector);
    engine.registerPlugin({
      name: 'end-throws',
      onTurnEnd: async () => {
        throw new Error('onTurnEnd-boom');
      },
    });

    const turn = engine.sendMessage('hi');
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveGate();
    // Must RESOLVE — the onTurnEnd rejection is isolated, not propagated.
    await expect(turn).resolves.toBeUndefined();
    expect(adapter.peek().requestState).toBe('aborted');
    expect(adapter.peek().isProcessing).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// §4 Table completeness gate — runtime enumeration
// ---------------------------------------------------------------------------

describe('Table completeness gate — engine public methods', () => {
  const TESTED = new Set<string>(ENGINE_MUTATING_METHODS);
  const WHITELIST = ENGINE_WHITELIST;
  const ACCOUNTED = new Set([...TESTED, ...WHITELIST]);

  it('every Object.keys(createMessageEngine()) key is in test table or I0 whitelist', () => {
    const { engine } = makeEngine(slowConnector(okChunks));
    const liveKeys = Object.keys(engine);

    const unaccounted = liveKeys.filter((k) => !ACCOUNTED.has(k));
    expect(unaccounted).toEqual([]);

    const missing = ENGINE_MUTATING_METHODS.filter((m) => !liveKeys.includes(m));
    expect(missing).toEqual([]);
  });

  it('runTurn is NOT a public key (internal pipeline per I0 §4.2)', () => {
    const { engine } = makeEngine(slowConnector(okChunks));
    expect(Object.keys(engine)).not.toContain('runTurn');
  });

  it('PROOF: injecting a fake method key makes the gate fail (RED evidence)', () => {
    const { engine } = makeEngine(slowConnector(okChunks));
    const fakeEngine = { ...engine, newMysteryMethod: () => {} };

    const liveKeys = Object.keys(fakeEngine);
    const unaccounted = liveKeys.filter((k) => !ACCOUNTED.has(k));
    expect(unaccounted).toEqual(['newMysteryMethod']);
  });
});
