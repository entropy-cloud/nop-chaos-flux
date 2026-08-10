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

/**
 * Cycle 2 / I4 — Invariant ⑩ failed-turn residue cleanup (K-⑩-1/2/4/5).
 *
 * Split out of `engine-invariants.test.ts` (check:oversized-code-files limit)
 * following the `conversation-invariants-cycle2.test.ts` precedent: the
 * original file stays within the limit while the Cycle 2 / I4 additions keep
 * the same invariants-suite family.
 */

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

describe('Invariant ⑩ — failed-turn residue cleanup (N5)', () => {
  function recordingStream(failFirst: boolean) {
    const requests: AiConnectorRequest[] = [];
    let shouldFail = failFirst;
    const stream = vi.fn(async (req: AiConnectorRequest) => {
      requests.push(req);
      if (shouldFail) {
        shouldFail = false;
        throw new Error('connector-boom');
      }
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        yield { delta: { content: 'Hi' } };
        yield { finishReason: 'stop' };
      }
      return gen();
    });
    return { requests, stream };
  }

  function throwingStream(): AiConnector {
    const stream = vi.fn(async () => {
      throw new Error('connector-boom');
    });
    return { stream } as unknown as AiConnector;
  }

  it('failed-turn residue: the empty placeholder must not enter the next request history', async () => {
    const { requests, stream } = recordingStream(true);
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    // Failed turn #1 commits the empty placeholder (loading=false).
    await engine.sendMessage('first');
    expect(adapter.peek().requestState).toBe('error');

    // Normal turn #2 — its request history must exclude the residue.
    await engine.sendMessage('second');
    const secondHistory = requests[1].messages;
    expect(
      secondHistory.some((m) => m.role === 'assistant' && m.content === ''),
    ).toBe(false);
  });

  it('normal turn history is preserved (only the empty residue is excluded)', async () => {
    // Positive control (passes on live): a completed assistant message IS part
    // of history — the exclusion predicate targets only empty placeholders.
    const { requests, stream } = recordingStream(false);
    const { engine } = makeEngine({ stream } as AiConnector);

    await engine.sendMessage('first');
    await engine.sendMessage('second');
    const secondHistory = requests[1].messages;

    expect(secondHistory.some((m) => m.role === 'assistant' && m.content === 'Hi')).toBe(true);
    expect(secondHistory.some((m) => m.role === 'assistant' && m.content === '')).toBe(false);
  });

  it('abort-before-first-chunk: the empty placeholder must not enter the list or the next history', async () => {
    // K-⑩-1 (Cycle 2 / I4): abort() before the first chunk arrives → the
    // round settles 'aborted' but must not leave an empty assistant residue
    // behind — nor carry it into the next request's history.
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const requests: AiConnectorRequest[] = [];
    const stream = vi.fn(async (req: AiConnectorRequest) => {
      requests.push(req);
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        await gate;
        yield { delta: { content: 'late' } };
        yield { finishReason: 'stop' };
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    const turn = engine.sendMessage('first');
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveGate();
    await turn;

    expect(adapter.peek().requestState).toBe('aborted');
    expect(
      adapter.peek().messages.some((m) => m.role === 'assistant' && m.content === ''),
    ).toBe(false);

    // The next request history must not carry the aborted round's residue.
    await engine.sendMessage('second');
    const secondHistory = requests[1].messages;
    expect(
      secondHistory.some((m) => m.role === 'assistant' && m.content === ''),
    ).toBe(false);
  });

  it('onBeforeRequest rejection: no loading:true ghost placeholder remains', async () => {
    // K-⑩-2 (Cycle 2 / I4): `await plugin.onBeforeRequest` sits outside the
    // stream try — a rejection used to leave the pushed placeholder forever
    // `loading:true` (host can only clear() it). The turn must settle to
    // error with the placeholder removed.
    const { engine, adapter } = makeEngine(slowConnector(okChunks, 1));
    engine.registerPlugin({
      name: 'before-throws',
      onBeforeRequest: async () => {
        throw new Error('before-boom');
      },
    });

    await expect(engine.sendMessage('hi')).resolves.toBeUndefined();
    expect(adapter.peek().requestState).toBe('error');
    expect(adapter.peek().lastError).toBeInstanceOf(Error);
    expect(adapter.peek().messages.some((m) => m.loading === true)).toBe(false);
    expect(adapter.peek().messages.filter((m) => m.role === 'assistant')).toHaveLength(0);
  });

  it('regenerate × connector-throw: no empty residue, host-visible error state', async () => {
    // K-⑩-4 (Cycle 2 / I4): regenerate truncates the old turn, then the
    // connector throws — the original answer is gone, so the failed round
    // must not ALSO leave an empty assistant residue. The turn must be
    // host-visible as error.
    const { engine, adapter } = makeEngine(throwingStream());
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old answer' },
    ] as ChatMessage[]);

    await engine.regenerate();

    expect(adapter.peek().requestState).toBe('error');
    expect(adapter.peek().lastError).toBeInstanceOf(Error);
    const assistantMessages = adapter.peek().messages.filter((m) => m.role === 'assistant');
    expect(assistantMessages.some((m) => m.content === '')).toBe(false);
  });

  it('zero-chunk completed round: the empty assistant must not enter the list or the next history', async () => {
    // K-⑩-5 (Cycle 2 / I4): a connector that settles normally with zero
    // chunks is a "degraded success" round — it completes but must not leave
    // an empty assistant product (nor carry it into the next history).
    const requests: AiConnectorRequest[] = [];
    const stream = vi.fn(async (req: AiConnectorRequest) => {
      requests.push(req);
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        // Empty response: settles immediately with zero chunks.
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    await engine.sendMessage('first');
    expect(adapter.peek().requestState).toBe('completed');
    expect(adapter.peek().messages.filter((m) => m.role === 'assistant')).toHaveLength(0);

    await engine.sendMessage('second');
    const secondHistory = requests[1].messages;
    expect(
      secondHistory.some((m) => m.role === 'assistant' && m.content === ''),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑩ (P1-2 extension, 2026-08-10 multi-audit) — dangling tool_calls
// cleanup. An assistant message carrying `tool_calls` with NO paired
// `role:'tool'` response (abort-in-window / tool-no-executor / abort-
// mid-executor) is a protocol violation: strict OpenAI-compatible backends
// return 400 and the retry loop fails repeatedly. The residue must be dropped
// (empty content) or have `tool_calls` stripped (non-empty content keeps the
// text) — content-agnostic, so the interleaved text+tool_calls shape is
// covered too. The predicate sits OUTSIDE `isVacuousAssistantResidue` (which
// requires `!metadata.finishReason` — dangling rounds DO carry
// `finishReason:'tool_calls'`), so this is a new member, not a merge.
// ---------------------------------------------------------------------------

describe('Invariant ⑩ — dangling tool_calls cleanup (P1-2, 2026-08-10)', () => {
  const danglingChunks = (id: string): AiConnectorChunk[] => [
    {
      delta: {
        tool_calls: [
          { index: 0, id, type: 'function', function: { name: 'f', arguments: '{}' } },
        ],
      },
    },
    { finishReason: 'tool_calls' as const },
  ];
  const stopChunks = (text: string): AiConnectorChunk[] => [
    { delta: { content: text } },
    { finishReason: 'stop' as const },
  ];

  it('abort-in-window: the dangling tool_calls assistant must not remain in the list', async () => {
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const stream = vi.fn(async () => {
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        yield danglingChunks('c_win')[0];
        yield { finishReason: 'tool_calls' as const };
        await gate;
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    const turn = engine.sendMessage('go');
    // Let the chunk loop consume both yields (suspended at the gate).
    await wait(10);
    await engine.abort();
    resolveGate();
    await turn;

    expect(adapter.peek().requestState).toBe('aborted');
    expect(
      adapter.peek().messages.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);
  });

  it('tool-no-executor: the dangling assistant must not remain in the list', async () => {
    const stream = vi.fn(async () => {
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of danglingChunks('c_ne2')) yield c;
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    await engine.sendMessage('go');
    expect(adapter.peek().requestState).toBe('error');
    expect(
      adapter.peek().messages.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);
  });

  it('payload arm: the next request history must exclude the dangling shape', async () => {
    let round = 0;
    const requests: AiConnectorRequest[] = [];
    const stream = vi.fn(async (req: AiConnectorRequest) => {
      requests.push(req);
      const r = round;
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of (r === 0 ? danglingChunks('c_p') : stopChunks('Hi'))) yield c;
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    await engine.sendMessage('first');
    expect(adapter.peek().requestState).toBe('error');

    await engine.sendMessage('second');
    expect(requests.length).toBe(2);
    const secondHistory = requests[1].messages;
    expect(
      secondHistory.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);
  });

  it('interleaved shape: non-empty content survives, tool_calls is stripped', async () => {
    let round = 0;
    const stream = vi.fn(async () => {
      const r = round;
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        if (r === 0) {
          yield { delta: { content: 'Let me check that...' } };
          yield danglingChunks('c_it')[0];
          yield { finishReason: 'tool_calls' as const };
        } else {
          for (const c of stopChunks('Hi')) yield c;
        }
      }
      return gen();
    });
    const { engine, adapter } = makeEngine({ stream } as AiConnector);

    await engine.sendMessage('first');
    expect(adapter.peek().requestState).toBe('error');

    // The interleaved text is a real user-visible answer — it survives; only
    // the unpaired tool_calls is stripped (never the whole array for a
    // partially-paired / text-carrying message).
    const assistant = adapter.peek().messages.find((m) => m.role === 'assistant');
    expect(assistant).toBeDefined();
    expect(assistant?.content).toBe('Let me check that...');
    expect(assistant?.tool_calls).toBeUndefined();
  });

  it('abort-mid-executor: the residue must not enter the list nor the next request', async () => {
    // Phase 1 fix path: runTurn's `!shouldContinue` return — the assistant is
    // already committed (finishReason='tool_calls' → not vacuous) when the
    // executor is still suspended at the abort.
    let round = 0;
    const requests: AiConnectorRequest[] = [];
    const stream = vi.fn(async (req: AiConnectorRequest) => {
      requests.push(req);
      const r = round;
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of (r === 0 ? danglingChunks('c_mid') : stopChunks('Hi'))) yield c;
      }
      return gen();
    });
    let resolveExecutor!: () => void;
    let markCalled!: () => void;
    const executorGate = new Promise<void>((r) => {
      resolveExecutor = r;
    });
    const calledGate = new Promise<void>((r) => {
      markCalled = r;
    });
    const adapter = new InspectableAdapter();
    adapter.initialize({
      messages: [],
      requestState: 'idle',
      isProcessing: false,
      abortController: null,
      connector: null,
    });
    const engine = createMessageEngine({
      connector: { stream },
      adapter,
      toolExecutor: async ({ toolCall }) => {
        if (toolCall.id === 'c_mid') {
          markCalled();
          await executorGate;
        }
        return 'ok';
      },
    });

    const turn = engine.sendMessage('go');
    await calledGate;
    await engine.abort();
    resolveExecutor();
    await turn;

    expect(adapter.peek().requestState).toBe('aborted');
    expect(
      adapter.peek().messages.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);

    // The next request history must not carry the residue either.
    await engine.sendMessage('second');
    expect(requests.length).toBe(2);
    expect(
      requests[1].messages.some((m) => m.role === 'assistant' && m.tool_calls?.length),
    ).toBe(false);
  });
});
