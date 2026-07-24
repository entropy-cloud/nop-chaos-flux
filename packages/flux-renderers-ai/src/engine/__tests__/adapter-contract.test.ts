import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  InternalMessageState,
  MessageStateAdapter,
  MessageStateListener,
  MessageStateSubscribe,
  MessageUpdateKind,
} from '../types.js';

/**
 * AI-08 contract proof: a plain-object adapter that implements
 * `MessageStateAdapter` directly (holding state in a closure, with NO `.state`
 * field) must be usable by the engine without the engine casting to read
 * private fields. Before the fix, `setConnector` / `runTurn` / `abort` reached
 * into `(adapter as ...).state.*` and crashed on `undefined`.
 *
 * NOTE: this adapter also exposes `getConnector` / `getAbortController` so it
 * stays functional once the interface is widened (AI-08 fix). Before the fix,
 * the engine ignores those and casts `.state` — which is `undefined` here — so
 * the operations throw.
 */
function makePlainAdapter(initial?: Partial<InternalMessageState>): MessageStateAdapter {
  let state: InternalMessageState = {
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: null,
    ...initial,
  };
  const kindListeners = new Map<MessageUpdateKind, Set<MessageStateListener>>();
  const fullListeners = new Set<MessageStateListener>();

  const adapter: MessageStateAdapter = {
    initialize(next: InternalMessageState) {
      state = next;
    },
    getState() {
      const { messages, requestState, processingState, isProcessing, lastError } = state;
      return { messages, requestState, processingState, isProcessing, lastError };
    },
    getConnector() {
      return state.connector;
    },
    getAbortController() {
      return state.abortController;
    },
    createMessage<T extends ChatMessage>(m: T): T {
      return m;
    },
    mutate(kind: MessageUpdateKind, recipe: (draft: InternalMessageState) => void) {
      recipe(state);
      const snap = adapter.getState();
      const set = kindListeners.get(kind);
      if (set) for (const l of set) l(snap);
      for (const l of fullListeners) l(snap);
    },
    subscribe: ((...args: unknown[]) => {
      if (args.length >= 2) {
        const kind = args[0] as MessageUpdateKind;
        const listener = args[1] as MessageStateListener;
        let set = kindListeners.get(kind);
        if (!set) {
          set = new Set();
          kindListeners.set(kind, set);
        }
        set.add(listener);
        return () => {
          set!.delete(listener);
        };
      }
      const listener = args[0] as MessageStateListener;
      fullListeners.add(listener);
      return () => {
        fullListeners.delete(listener);
      };
    }) as MessageStateSubscribe,
  };
  return adapter;
}

function mockConnector(): AiConnector & { stream: ReturnType<typeof vi.fn> } {
  const stream = vi.fn(async (_req: AiConnectorRequest) => {
    async function* gen(): AsyncGenerator<AiConnectorChunk> {
      yield { delta: { content: 'hi' } };
      yield { finishReason: 'stop' };
    }
    void _req;
    return gen();
  });
  return { stream };
}

describe('AI-08: plain-object adapter contract (no `.state` field)', () => {
  it('setConnector is idempotent on the same reference (no throw)', () => {
    const connector = mockConnector();
    const adapter = makePlainAdapter();
    const engine = createMessageEngine({ connector, adapter });
    expect(() => engine.setConnector(connector)).not.toThrow();
  });

  it('setConnector hot-swaps to a new connector (no throw)', () => {
    const a = mockConnector();
    const b = mockConnector();
    const adapter = makePlainAdapter();
    const engine = createMessageEngine({ connector: a, adapter });
    expect(() => engine.setConnector(b)).not.toThrow();
  });

  it('abort() with no in-flight turn is a no-op (no throw)', async () => {
    const connector = mockConnector();
    const adapter = makePlainAdapter();
    const engine = createMessageEngine({ connector, adapter });
    await expect(engine.abort()).resolves.toBeUndefined();
  });

  it('runTurn reads connector via the interface (no throw) and a turn completes', async () => {
    const connector = mockConnector();
    const adapter = makePlainAdapter();
    const engine = createMessageEngine({ connector, adapter });
    await engine.sendMessage('hello');
    expect(engine.getState().requestState).toBe('completed');
    expect(connector.stream).toHaveBeenCalledTimes(1);
    const roles = engine.getState().messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant']);
  });

  it('clear / setMessages / regenerate guards do not throw on a plain adapter', async () => {
    const connector = mockConnector();
    const adapter = makePlainAdapter();
    const engine = createMessageEngine({ connector, adapter });
    expect(() =>
      engine.setMessages([{ id: 'x', role: 'user', content: 'r' }]),
    ).not.toThrow();
    expect(() => engine.clear()).not.toThrow();
    await expect(engine.regenerate()).resolves.toBeUndefined();
  });
});
