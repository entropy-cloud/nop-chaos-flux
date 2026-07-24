import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { createNativeMessageAdapter } from '../native-adapter.js';
import { combineDeltaData } from '../utils.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
} from '../types.js';

function makeMockConnector(chunks: AiConnectorChunk[], opts: { throw?: Error } = {}): AiConnector {
  return {
    async stream(_request: AiConnectorRequest) {
      if (opts.throw) throw opts.throw;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      return gen();
    },
  };
}

const wordChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hel' } },
  { delta: { content: 'lo' } },
  { finishReason: 'stop', metadata: { model: 'mock' } },
];

describe('createMessageEngine — state machine', () => {
  it('idle → processing → completed on a normal streaming turn', async () => {
    const connector = makeMockConnector(wordChunks);
    const engine = createMessageEngine({ connector });
    const states: string[] = [];
    engine.subscribe('requestState', (s) => states.push(s.requestState));

    expect(engine.getState().requestState).toBe('idle');
    await engine.sendMessage('hi');

    const final = engine.getState();
    expect(final.requestState).toBe('completed');
    expect(final.isProcessing).toBe(false);
    // user + assistant
    expect(final.messages).toHaveLength(2);
    const assistant = final.messages[1];
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toBe('Hello');
    expect(assistant.metadata?.finishReason).toBe('stop');
    expect(assistant.metadata?.model).toBe('mock');
    expect(states[0]).toBe('processing');
    expect(states[states.length - 1]).toBe('completed');
  });

  it('clears loading after the first chunk arrives', async () => {
    const connector = makeMockConnector(wordChunks);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');
    const assistant = engine.getState().messages[1];
    expect(assistant.loading).toBeFalsy();
  });

  it('connector-throw → requestState error', async () => {
    const connector = makeMockConnector([], { throw: new Error('boom') });
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');
    const final = engine.getState();
    expect(final.requestState).toBe('error');
    expect(final.isProcessing).toBe(false);
  });

  it('abort → requestState aborted and content retained', async () => {
    let resolveFirst: () => void;
    const pending = new Promise<void>((r) => {
      resolveFirst = r;
    });
    const connector: AiConnector = {
      async stream(req) {
        async function* gen() {
          yield { delta: { content: 'partial' } };
          await pending; // block until abort resolves
          yield { delta: { content: '-tail' } };
        }
        void req;
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    const turn = engine.sendMessage('hi');
    // Let the generator emit the first chunk.
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveFirst!();
    await turn;
    const final = engine.getState();
    expect(final.requestState).toBe('aborted');
    const assistant = final.messages[1];
    expect(typeof assistant.content).toBe('string');
    expect((assistant.content as string).startsWith('partial')).toBe(true);
  });

  it('empty send is a no-op (no request, no message added)', async () => {
    const connector = makeMockConnector(wordChunks);
    const stream = vi.spyOn(connector, 'stream');
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('   ');
    expect(stream).not.toHaveBeenCalled();
    expect(engine.getState().messages).toHaveLength(0);
    expect(engine.getState().requestState).toBe('idle');
  });

  it('accumulates streamed tool_calls by index', async () => {
    const chunks: AiConnectorChunk[] = [
      { delta: { tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'f', arguments: '{"a":1' } }] } },
      { delta: { tool_calls: [{ index: 0, function: { arguments: '}' } }] } },
      { finishReason: 'tool_calls' },
    ];
    const engine = createMessageEngine({ connector: makeMockConnector(chunks) });
    await engine.sendMessage('do it');
    const assistant = engine.getState().messages[1];
    expect(assistant.tool_calls).toHaveLength(1);
    expect(assistant.tool_calls![0].function.arguments).toBe('{"a":1}');
  });

  it('plugin hooks fire across a turn', async () => {
    const calls: string[] = [];
    const engine = createMessageEngine({
      connector: makeMockConnector(wordChunks),
      plugins: [
        {
          name: 'spy',
          onTurnStart: () => { calls.push('turnStart'); },
          onBeforeRequest: () => { calls.push('beforeRequest'); },
          onCompletionChunk: () => { calls.push('chunk'); },
          onAfterRequest: () => { calls.push('afterRequest'); },
          onTurnEnd: () => { calls.push('turnEnd'); },
        },
      ],
    });
    await engine.sendMessage('hi');
    expect(calls).toEqual([
      'turnStart',
      'beforeRequest',
      'chunk',
      'chunk',
      'chunk',
      'afterRequest',
      'turnEnd',
    ]);
  });

  it('setConnector hot-swaps without rebuilding the engine instance', async () => {
    const first = makeMockConnector([{ delta: { content: 'A' } }, { finishReason: 'stop' }]);
    const engine = createMessageEngine({ connector: first });
    // Engine instance is stable across connector swaps.
    const engineRef = engine;
    const second = makeMockConnector([{ delta: { content: 'B' } }, { finishReason: 'stop' }]);
    engine.setConnector(second);
    expect(engine).toBe(engineRef);
    // Existing state is preserved (no rebuild), and the new connector drives the next turn.
    await engine.sendMessage('x');
    const final = engine.getState();
    expect(final.messages).toHaveLength(2);
    expect((final.messages[1].content as string)).toBe('B');
  });
});

describe('createMessageEngine — send() injects pre-built messages', () => {
  it('appends provided messages and produces an assistant reply', async () => {
    const engine = createMessageEngine({
      connector: makeMockConnector([{ delta: { content: 'ok' } }, { finishReason: 'stop' }]),
    });
    const userMsg: ChatMessage = { id: 'u1', role: 'user', content: 'hello' };
    await engine.send(userMsg);
    const final = engine.getState();
    expect(final.messages[0]).toMatchObject({ id: 'u1', role: 'user' });
    expect(final.messages[1].role).toBe('assistant');
  });
});

describe('createNativeMessageAdapter', () => {
  it('subscribe receives full + kind-filtered notifications', () => {
    const adapter = createNativeMessageAdapter();
    const full: number[] = [];
    const msgKind: number[] = [];
    const reqKind: number[] = [];
    adapter.subscribe((s) => full.push(s.messages.length));
    adapter.subscribe('messages', (s) => msgKind.push(s.messages.length));
    adapter.subscribe('requestState', (s) => reqKind.push(s.messages.length));

    adapter.mutate('messages', (draft) => {
      draft.messages.push({ id: 'm1', role: 'user', content: 'hi' });
    });
    adapter.mutate('requestState', (draft) => {
      draft.requestState = 'completed';
    });

    // full fires on both; messages-kind only on the first; requestState-kind only on the second.
    expect(full).toEqual([1, 1]);
    expect(msgKind).toEqual([1]);
    expect(reqKind).toEqual([1]);
    expect(adapter.getState().messages).toHaveLength(1);
  });

  it('createMessage passes the message through', () => {
    const adapter = createNativeMessageAdapter();
    const m: ChatMessage = { id: 'x', role: 'assistant', content: '' };
    expect(adapter.createMessage(m)).toBe(m);
  });
});

describe('combineDeltaData re-export sanity', () => {
  it('is the same function from utils', () => {
    expect(typeof combineDeltaData).toBe('function');
  });
});

describe('createMessageEngine — AI-19 lastError state', () => {
  it('connector throw writes the real error onto state.lastError', async () => {
    const connector = makeMockConnector([], { throw: new Error('boom') });
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');
    const final = engine.getState();
    expect(final.requestState).toBe('error');
    expect(final.lastError).toBeInstanceOf(Error);
    expect((final.lastError as Error).message).toBe('boom');
  });

  it('abort does NOT write lastError (abort is not an error)', async () => {
    let resolveGate: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'partial' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    const turn = engine.sendMessage('hi');
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveGate!();
    await turn;
    expect(engine.getState().requestState).toBe('aborted');
    expect(engine.getState().lastError).toBeUndefined();
  });

  it('lastError is cleared at the start of the next turn', async () => {
    const errConnector = makeMockConnector([], { throw: new Error('first-boom') });
    const engine = createMessageEngine({ connector: errConnector });
    await engine.sendMessage('hi');
    expect(engine.getState().lastError).toBeInstanceOf(Error);

    // Hot-swap to a working connector and run a successful turn.
    engine.setConnector(makeMockConnector(wordChunks));
    await engine.sendMessage('again');
    expect(engine.getState().requestState).toBe('completed');
    expect(engine.getState().lastError).toBeUndefined();
  });

  it('P1-5 / FP-6: connector=null writes a structured connector-missing lastError and fires plugin.onError', async () => {
    const onError = vi.fn();
    // Build the engine with NO connector — the connector-missing branch in
    // runTurn is the path under test (was previously a silent error transition
    // that left state.lastError undefined).
    const engine = createMessageEngine({
      connector: null,
      plugins: [{ name: 'test-error-sink', onError }],
    });
    await engine.sendMessage('hi');
    const final = engine.getState();
    expect(final.requestState).toBe('error');
    expect(final.isProcessing).toBe(false);
    // The user message is still appended (so the host can see what failed).
    expect(final.messages).toHaveLength(1);
    expect(final.messages[0].role).toBe('user');
    // lastError is a structured Error the host can distinguish from a thrown
    // request (mirrors the tool-no-executor shape).
    expect(final.lastError).toBeInstanceOf(Error);
    expect((final.lastError as Error).message).toBe('connector-missing');
    // plugin.onError received the same cause.
    expect(onError).toHaveBeenCalledTimes(1);
    const [, cause] = onError.mock.calls[0];
    expect(cause).toBe(final.lastError);
  });

  it('P1-5: connector-missing error is distinguishable from a connector-throw (different cause)', async () => {
    const throwEngine = createMessageEngine({
      connector: makeMockConnector([], { throw: new Error('network-down') }),
    });
    await throwEngine.sendMessage('hi');
    expect((throwEngine.getState().lastError as Error).message).toBe('network-down');

    const missingEngine = createMessageEngine({ connector: null });
    await missingEngine.sendMessage('hi');
    expect((missingEngine.getState().lastError as Error).message).toBe('connector-missing');
  });
});

// ============================================================================
// clear() guards: a hard reset must not race the streaming accumulator.
// Callers should `abort()` first; clear() while in-flight is a guarded no-op
// (mirrors the setMessages-while-in-flight guard — Failure Path symmetry).
// ============================================================================

describe('createMessageEngine — clear() while-in-flight guard', () => {
  it('clear() when idle drops every message and resets requestState to idle', async () => {
    const connector = makeMockConnector(wordChunks);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');
    expect(engine.getMessages()).toHaveLength(2);
    expect(engine.getState().requestState).toBe('completed');

    engine.clear();

    expect(engine.getMessages()).toEqual([]);
    expect(engine.getState().requestState).toBe('idle');
    expect(engine.getState().isProcessing).toBe(false);
  });

  it('clear() is a no-op while a turn is in-flight (symmetric with setMessages guard)', async () => {
    let resolveStream: () => void;
    const gate = new Promise<void>((r) => {
      resolveStream = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'x' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    const turn = engine.sendMessage('go');
    // Let the stream emit its first chunk so isProcessing is true.
    await Promise.resolve();
    await Promise.resolve();

    expect(engine.getState().isProcessing).toBe(true);
    const before = engine.getMessages().length;
    const stateBefore = engine.getState().requestState;

    engine.clear();

    // Guarded no-op: nothing cleared, still processing.
    expect(engine.getMessages().length).toBe(before);
    expect(engine.getState().isProcessing).toBe(true);
    expect(engine.getState().requestState).toBe(stateBefore);
    expect(engine.getState().requestState).not.toBe('idle');

    resolveStream!();
    await turn;
  });
});
