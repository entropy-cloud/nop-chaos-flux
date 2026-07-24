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

/**
 * White-box adapter: exposes the internal state (incl. `abortController` /
 * `connector`) so concurrency tests can assert that the in-flight controller
 * is NOT overwritten by a rejected second send (AI-01).
 */
class InspectableAdapter extends BaseMessageStateAdapter {
  peek(): InternalMessageState {
    return this.state;
  }
}

function makeAdapter(): InspectableAdapter {
  const adapter = new InspectableAdapter();
  adapter.initialize({
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: null,
  });
  return adapter;
}

/**
 * Connector that emits one chunk then blocks on `gate` until the test resolves
 * it. Lets us keep a turn in-flight while we fire a second send.
 */
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

describe('createMessageEngine — AI-01 turn serialisation', () => {
  it('rejects a second sendMessage while a turn is in-flight (no second stream, no controller overwrite)', async () => {
    let resolveGate: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const connector = gatedConnector(gate);
    const adapter = makeAdapter();
    const engine = createMessageEngine({ connector, adapter });

    const first = engine.sendMessage('first');
    // Let the first turn settle into the streaming loop.
    await Promise.resolve();
    await Promise.resolve();

    expect(engine.getState().isProcessing).toBe(true);
    const messagesAfterFirst = engine.getState().messages.length;
    const ctrlAfterFirst = adapter.peek().abortController;
    expect(ctrlAfterFirst).not.toBeNull();
    expect(connector.stream).toHaveBeenCalledTimes(1);

    // Fire a second send while the first is still processing.
    await engine.sendMessage('second');

    // Guard rejected the second send: no new user message, no new stream,
    // and the in-flight abortController reference is unchanged.
    expect(engine.getState().messages.length).toBe(messagesAfterFirst);
    expect(connector.stream).toHaveBeenCalledTimes(1);
    expect(adapter.peek().abortController).toBe(ctrlAfterFirst);

    // The first stream is still alive and can be aborted.
    await engine.abort();
    resolveGate!();
    await first;
    expect(engine.getState().requestState).toBe('aborted');
  });

  it('rejects send(...) while a turn is in-flight', async () => {
    let resolveGate: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const connector = gatedConnector(gate);
    const adapter = makeAdapter();
    const engine = createMessageEngine({ connector, adapter });

    const first = engine.sendMessage('first');
    await Promise.resolve();
    await Promise.resolve();

    const messagesAfterFirst = engine.getState().messages.length;
    const ctrlAfterFirst = adapter.peek().abortController;

    const secondMsg: ChatMessage = { id: 'u2', role: 'user', content: 'second' };
    await engine.send(secondMsg);

    expect(engine.getState().messages.length).toBe(messagesAfterFirst);
    expect(connector.stream).toHaveBeenCalledTimes(1);
    expect(adapter.peek().abortController).toBe(ctrlAfterFirst);

    resolveGate!();
    await first;
  });

  it('accepts a second send after the first turn completes (guard is not sticky)', async () => {
    const connector = gatedConnector(Promise.resolve());
    const engine = createMessageEngine({ connector });

    await engine.sendMessage('first');
    expect(engine.getState().requestState).toBe('completed');
    expect(connector.stream).toHaveBeenCalledTimes(1);

    await engine.sendMessage('second');
    expect(connector.stream).toHaveBeenCalledTimes(2);
  });
});

describe('createMessageEngine — AI-03 abort reaches the in-flight controller', () => {
  it('abort() terminates the current in-flight controller and state → aborted', async () => {
    let resolveGate: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const connector = gatedConnector(gate);
    const adapter = makeAdapter();
    const engine = createMessageEngine({ connector, adapter });

    const turn = engine.sendMessage('hi');
    await Promise.resolve();
    await Promise.resolve();

    const ctrl = adapter.peek().abortController;
    expect(ctrl).not.toBeNull();
    expect(ctrl!.signal.aborted).toBe(false);

    await engine.abort();

    // The in-flight controller was aborted.
    expect(ctrl!.signal.aborted).toBe(true);
    // requestState transitioned synchronously to 'aborted'.
    expect(engine.getState().requestState).toBe('aborted');
    expect(engine.getState().isProcessing).toBe(false);

    resolveGate!();
    await turn;

    // After the turn settles, the controller slot is cleared.
    expect(adapter.peek().abortController).toBeNull();
    expect(engine.getState().requestState).toBe('aborted');
  });

  it('abort() with no in-flight turn is a no-op', async () => {
    const engine = createMessageEngine({ connector: gatedConnector(Promise.resolve()) });
    await engine.abort();
    expect(engine.getState().requestState).toBe('idle');
  });
});

/**
 * Phase 3 — abort→send race controller-identity guards (P1#1).
 *
 * Scenario: turn A is mid-stream; host calls `abort()` (synchronously sets
 * `requestState='aborted'`, `isProcessing=false`, but turn A's `runOnce` is
 * still suspended inside its async stream generator), then immediately calls
 * `sendMessage('next')` which starts turn B (new `abortController`,
 * `requestState='processing'`). When turn A's stream eventually settles, its
 * `runOnce` catch / post-stream-abort-check / `runTurn` catch / `runTurn`
 * finally must NOT clobber turn B's controller or request state.
 *
 * Two abort timings are covered:
 *  - `reject`: turn A's stream rejects after the abort → hits `runOnce` catch.
 *  - `complete`: turn A's stream completes after the abort → hits the
 *    post-stream abort check.
 */
function gatedRoundConnector(
  modes: Array<'reject' | 'complete'>,
): { connector: AiConnector; resolveRound: (i: number) => void } {
  const resolvers: Array<() => void> = [];
  const promises = modes.map(
    (_, i) =>
      new Promise<void>((res) => {
        resolvers[i] = res;
      }),
  );
  let call = 0;
  const connector: AiConnector = {
    async stream(req: AiConnectorRequest) {
      const idx = call;
      call += 1;
      const mode = modes[Math.min(idx, modes.length - 1)];
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        yield { delta: { content: `partial-${idx}` } };
        await promises[idx];
        if (mode === 'reject' && req.signal.aborted) throw new Error('stream aborted');
        yield { finishReason: 'stop' };
      }
      return gen();
    },
  };
  return { connector, resolveRound: (i: number) => resolvers[i]!() };
}

// Macrotask flush: drains all pending microtasks (generator / await hops).
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('createMessageEngine — P1#1 abort→send race (controller-identity guards)', () => {
  it('streaming-reject timing: turn B controller & requestState survive turn A runOnce catch + runTurn finally', async () => {
    const { connector, resolveRound } = gatedRoundConnector(['reject', 'complete']);
    const adapter = makeAdapter();
    const engine = createMessageEngine({ connector, adapter });

    const turnA = engine.sendMessage('first');
    await flush();

    expect(adapter.peek().abortController).not.toBeNull();
    const controllerA = adapter.peek().abortController;

    await engine.abort(); // abort turn A synchronously; isProcessing → false.
    const turnB = engine.sendMessage('second'); // turn B starts a new controller.
    await flush();

    const controllerB = adapter.peek().abortController;
    expect(controllerB).not.toBeNull();
    expect(controllerB).not.toBe(controllerA);
    expect(engine.getState().requestState).toBe('processing');
    expect(engine.getState().isProcessing).toBe(true);

    // Turn A's stream now rejects (abort reached it) → runOnce A catch fires.
    resolveRound(0);
    await flush();

    // INVARIANT: turn A cleanup did NOT clobber turn B. Before the guards,
    // runOnce catch overwrote requestState→'aborted' and runTurn finally
    // nulled abortController.
    expect(adapter.peek().abortController).toBe(controllerB);
    expect(engine.getState().requestState).toBe('processing');
    expect(engine.getState().isProcessing).toBe(true);

    // Turn B can still be aborted via its own controller (Stop button works).
    await engine.abort();
    expect(engine.getState().requestState).toBe('aborted');
    resolveRound(1);
    await turnB;
    await turnA;
    expect(adapter.peek().abortController).toBeNull();
  });

  it('post-stream timing: turn B controller & requestState survive turn A post-stream abort check', async () => {
    const { connector, resolveRound } = gatedRoundConnector(['complete', 'complete']);
    const adapter = makeAdapter();
    const engine = createMessageEngine({ connector, adapter });

    const turnA = engine.sendMessage('first');
    await flush();

    const controllerA = adapter.peek().abortController;
    expect(controllerA).not.toBeNull();

    await engine.abort();
    const turnB = engine.sendMessage('second');
    await flush();

    const controllerB = adapter.peek().abortController;
    expect(controllerB).not.toBe(controllerA);
    expect(engine.getState().requestState).toBe('processing');

    // Turn A's stream completes (does NOT reject) → runOnce A reaches the
    // post-stream abort check and sees controllerA.signal.aborted === true.
    resolveRound(0);
    await flush();

    // INVARIANT: the post-stream check did not overwrite turn B's state.
    expect(adapter.peek().abortController).toBe(controllerB);
    expect(engine.getState().requestState).toBe('processing');
    expect(engine.getState().isProcessing).toBe(true);

    await engine.abort();
    resolveRound(1);
    await turnB;
    await turnA;
    expect(adapter.peek().abortController).toBeNull();
  });
});
