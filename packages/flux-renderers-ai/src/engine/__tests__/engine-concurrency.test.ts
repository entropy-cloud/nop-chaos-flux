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
