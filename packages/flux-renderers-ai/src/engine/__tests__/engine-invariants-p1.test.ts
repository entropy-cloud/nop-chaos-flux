import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { BaseMessageStateAdapter } from '../state-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  InternalMessageState,
  MessageEngineContext,
  MessageEnginePlugin,
} from '../types.js';

/**
 * Invariant ⑪ (2026-08-10 multi-audit, open P1-1 + P1-5) — plugin ctx write
 * isolation + request payload hygiene.
 *
 * Split out of `engine-invariants.test.ts` (check:oversized-code-files limit)
 * following the `engine-invariants-i4.test.ts` precedent: the original file
 * stays within the limit while the 2026-08-10 additions keep the same
 * invariants-suite family.
 *
 * open P1-1: `buildContext` used to hand the LIVE engine message array to the
 * plugin hooks — `onTurnStart` (fires before the placeholder is pushed) and
 * `onTurnEnd` (fires after the turn) exposed `ctx.request.messages ===
 * engine.getState().messages`, so the engine.md §8.3 documented pattern (host
 * pushes a system prompt into `ctx.request.messages`) wrote straight into
 * engine history — bypassing `mutate`/notify, then flowing into the next
 * request payload and the autoSave snapshot.
 *
 * P1-5: the request payload carried renderer-private `state` (editing drafts /
 * toolCall UI / thinking) and internal tool-execution `metadata`
 * (`toolError` — an Error with stack — / `toolStatus`) to the model provider.
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

function stopConnector(requests: AiConnectorRequest[] = []): AiConnector {
  const stream = vi.fn(async (req: AiConnectorRequest) => {
    requests.push(req);
    async function* gen(): AsyncGenerator<AiConnectorChunk> {
      yield { delta: { content: 'Hi' } };
      yield { finishReason: 'stop' };
    }
    return gen();
  });
  return { stream } as unknown as AiConnector;
}

// ---------------------------------------------------------------------------
// Invariant ⑪ — plugin ctx write isolation (open P1-1, 2026-08-10)
// ---------------------------------------------------------------------------
//
// `ctx.request.messages` must NEVER be the engine's live message array, for
// every plugin hook. A host following the engine.md §8.3 injection pattern
// (`ctx.request.messages.push(...)`) may only shape the outgoing request —
// never the engine history. Array + element isolation (a fresh array whose
// elements are fresh objects) covers both push and in-place element mutation.

describe('Invariant ⑪ — plugin ctx write isolation (open P1-1)', () => {
  const HOOKS = [
    'onTurnStart',
    'onTurnEnd',
    'onBeforeRequest',
    'onAfterRequest',
    'onCompletionChunk',
  ] as const;

  for (const hook of HOOKS) {
    it(`${hook}: ctx.request.messages is not the live engine array — push does not write through into history`, async () => {
      let capturedCtx: MessageEngineContext | undefined;
      let sameRef: boolean | undefined;
      const plugin = {
        name: `ctx-isolation-${hook}`,
        [hook]: (ctx: MessageEngineContext) => {
          capturedCtx = ctx;
          sameRef = ctx.request.messages === ctx.engine.getState().messages;
          // engine.md §8.3 documented onTurnStart pattern (injection): the
          // host pushes a system prompt into the request payload copy.
          ctx.request.messages.push({
            id: 'injected-system-prompt',
            role: 'system',
            content: 'injected-prompt',
          });
        },
      } as unknown as MessageEnginePlugin;
      const { engine } = makeEngine(stopConnector());
      engine.registerPlugin(plugin);

      await engine.sendMessage('hello');

      // The hook saw an isolated array, not the live one.
      expect(sameRef).toBe(false);
      // The injected prompt is visible on the request payload the connector
      // receives (host-side payload shaping still works)…
      expect(capturedCtx?.request.messages.some((m) => m.id === 'injected-system-prompt')).toBe(
        true,
      );
      // …but the engine history is untouched (no mutate/notify bypass).
      expect(engine.getState().messages.some((m) => m.id === 'injected-system-prompt')).toBe(
        false,
      );
    });
  }

  it('payload element mutation does not write through into engine history (element isolation)', async () => {
    const requests: AiConnectorRequest[] = [];
    const { engine } = makeEngine(stopConnector(requests));

    await engine.sendMessage('hello');
    expect(requests).toHaveLength(1);

    // A host mutating a payload message in place (e.g. appending content)
    // must not alias the engine's internal message objects.
    const payloadUser = requests[0].messages.find((m) => m.role === 'user');
    expect(payloadUser).toBeDefined();
    payloadUser!.content = 'mutated by host';

    const stateUser = engine.getState().messages.find((m) => m.role === 'user');
    expect(stateUser?.content).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// Invariant ⑪ — request payload hygiene (P1-5, 2026-08-10)
// ---------------------------------------------------------------------------
//
// `AiConnectorRequest.messages` is a wire whitelist projection: renderer-
// private `state` (editing drafts / toolCall UI / thinking — domain-internal,
// design.md §11.5 "不投影") and internal tool-execution metadata (`toolError`
// Error with stack / `toolStatus`) never reach the model provider. Benign
// metadata (createdAt / model / finishReason) stays.

describe('Invariant ⑪ — request payload hygiene (P1-5)', () => {
  it('wire projection: renderer-private state and internal metadata never reach the connector request', async () => {
    const requests: AiConnectorRequest[] = [];
    const { engine } = makeEngine(stopConnector(requests));

    engine.setMessages([
      {
        id: 'u1',
        role: 'user',
        content: 'hello',
        state: { editing: { active: true, draft: 'unsubmitted draft' } },
      },
      {
        id: 'a1',
        role: 'assistant',
        content: 'answer',
        state: {
          toolCall: { c1: { status: 'running' } },
          thinking: { open: false },
        },
        metadata: {
          createdAt: 1,
          model: 'mock-model',
          toolError: new Error('boom'),
          toolStatus: 'failed',
        },
      },
    ] as ChatMessage[]);

    await engine.sendMessage('next');
    expect(requests).toHaveLength(1);

    // Whitelist: no message carries state or internal tool metadata.
    for (const m of requests[0].messages) {
      expect(m.state).toBeUndefined();
      expect(m.metadata?.toolError).toBeUndefined();
      expect(m.metadata?.toolStatus).toBeUndefined();
    }

    // Whitelisted fields survive.
    const u1 = requests[0].messages.find((m) => m.id === 'u1');
    expect(u1?.role).toBe('user');
    expect(u1?.content).toBe('hello');
    const a1 = requests[0].messages.find((m) => m.id === 'a1');
    expect(a1?.content).toBe('answer');
    expect(a1?.metadata?.model).toBe('mock-model');
  });

  it('wire projection: user message content survives while the request messages stay detached objects', async () => {
    const requests: AiConnectorRequest[] = [];
    const { engine } = makeEngine(stopConnector(requests));

    await engine.sendMessage('hello');
    expect(requests).toHaveLength(1);

    const user = requests[0].messages.find((m) => m.role === 'user');
    expect(user?.content).toBe('hello');
    // The payload message object is a fresh projection, not an alias of the
    // engine's internal message object.
    expect(user).not.toBe(engine.getState().messages.find((m) => m.role === 'user'));
  });
});
