import { describe, it, expect } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { findPriorAssistantBranchId } from '../branching.js';
import { createAiComponentHandle } from '../../adapters/ai-component-handle.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
} from '../types.js';

function mockConnector(chunks: AiConnectorChunk[]): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) yield c;
      }
      void _req;
      return gen();
    },
  };
}

describe('A-16 message branches — engine.regenerate', () => {
  it('drops the trailing assistant turn and stamps a new branchId on the regenerated message', async () => {
    const firstChunks: AiConnectorChunk[] = [
      { delta: { content: 'first answer' } },
      { finishReason: 'stop' },
    ];
    const secondChunks: AiConnectorChunk[] = [
      { delta: { content: 'second answer' } },
      { finishReason: 'stop' },
    ];
    const replies = [firstChunks, secondChunks];
    let call = 0;
    const connector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        const chunks = replies[call++] ?? secondChunks;
        async function* gen() {
          for (const c of chunks) yield c;
        }
        void _req;
        return gen();
      },
    };

    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');

    let state = engine.getState();
    expect(state.messages).toHaveLength(2);
    const originalAssistant = state.messages[1];
    expect(originalAssistant.metadata?.branchId).toBeUndefined();

    await engine.regenerate();

    state = engine.getState();
    // user + new assistant (the old assistant turn was dropped).
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].content).toBe('second answer');
    // The regenerated message carries a new branchId.
    expect(state.messages[1].metadata?.branchId).toBe('branch-1');
    expect(state.requestState).toBe('completed');
  });

  it('advances the branchId on successive regenerations', async () => {
    const replies: AiConnectorChunk[][] = [
      [{ delta: { content: 'a' } }, { finishReason: 'stop' }],
      [{ delta: { content: 'b' } }, { finishReason: 'stop' }],
      [{ delta: { content: 'c' } }, { finishReason: 'stop' }],
    ];
    let call = 0;
    const connector: AiConnector = {
      async stream() {
        const chunks = replies[call++] ?? replies[0];
        async function* gen() {
          for (const c of chunks) yield c;
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('q');
    await engine.regenerate();
    await engine.regenerate();

    const msgs = engine.getState().messages;
    expect(msgs[1].content).toBe('c');
    expect(msgs[1].metadata?.branchId).toBe('branch-2');
  });

  it('accepts an explicit branchId override', async () => {
    const connector = mockConnector([{ delta: { content: 'x' } }, { finishReason: 'stop' }]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('q');
    await engine.regenerate('custom-branch');
    expect(engine.getState().messages[1].metadata?.branchId).toBe('custom-branch');
  });

  it('does nothing when there is no preceding user message', async () => {
    const connector = mockConnector([{ delta: { content: 'x' } }, { finishReason: 'stop' }]);
    const engine = createMessageEngine({ connector });
    await engine.regenerate();
    expect(engine.getState().messages).toHaveLength(0);
  });

  it('does not regenerate while a turn is in-flight', async () => {
    let resolveStream: () => void = () => {};
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: '' } };
          // Never resolves until the test releases it.
          await new Promise<void>((resolve) => {
            resolveStream = resolve;
          });
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    void engine.sendMessage('hi'); // in-flight
    await engine.regenerate(); // should be a no-op
    const msgs = engine.getState().messages;
    // Still just the user message + the in-flight placeholder; nothing dropped.
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    resolveStream();
  });

  it('FIND-22: regenerate after a custom non-numeric branchId falls back to minting a fresh branch-<n>', async () => {
    // FIND-22 (`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`):
    // the `branching.ts` fallback branch (`seq += 1; return branch-${seq}`) has
    // zero coverage — it fires when `regenerate()` follows a host-provided
    // branch id with NO trailing number (`branch-abc`): `branchSeq.next` finds
    // no `\d+` suffix, so a fresh sequence branch is minted.
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'regen' } };
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'q' },
      { id: 'a1', role: 'assistant', content: 'orig', metadata: { branchId: 'branch-abc' } },
    ] as ChatMessage[]);

    await engine.regenerate();

    const msgs = engine.getState().messages;
    expect(msgs[1].content).toBe('regen');
    // The fallback minted a fresh numeric sequence branch id.
    expect(msgs[1].metadata?.branchId).toBe('branch-1');
  });

  it('R2-F3: a leading-zero branch id is normalized via parseInt on advance (branch-01 → branch-2)', async () => {
    // R2-F3 (`docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`):
    // `branchSeq.next` parses the trailing digits with `parseInt(m[2], 10)`,
    // so a host-provided leading-zero id advances with numeric semantics while
    // the display format normalizes: `branch-01` → `branch-2`.
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'regen' } };
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'q' },
      { id: 'a1', role: 'assistant', content: 'orig', metadata: { branchId: 'branch-01' } },
    ] as ChatMessage[]);

    await engine.regenerate();

    const msgs = engine.getState().messages;
    expect(msgs[1].content).toBe('regen');
    expect(msgs[1].metadata?.branchId).toBe('branch-2');
  });

  it('R2-F3: findPriorAssistantBranchId returns the raw custom branchId without format validation', async () => {
    // R2-F3: `findPriorAssistantBranchId` does NOT validate the format of the
    // prior branch id — a host-provided non-numeric id is passed through
    // verbatim (the format handling happens downstream in `branchSeq.next`).
    const msgs = [
      { id: 'u1', role: 'user', content: 'q' },
      { id: 'a1', role: 'assistant', content: 'x', metadata: { branchId: 'branch-abc' } },
    ] as ChatMessage[];
    expect(findPriorAssistantBranchId(msgs, 1)).toBe('branch-abc');
  });
});

describe('A-16 — ComponentHandle regenerate exposure', () => {
  it('component:regenerate drives engine.regenerate and stamps branchId', async () => {
    const replies: AiConnectorChunk[][] = [
      [{ delta: { content: 'orig' } }, { finishReason: 'stop' }],
      [{ delta: { content: 'regen' } }, { finishReason: 'stop' }],
    ];
    let call = 0;
    const connector: AiConnector = {
      async stream() {
        const chunks = replies[call++] ?? replies[0];
        async function* gen() {
          for (const c of chunks) yield c;
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    const handle = createAiComponentHandle({ engine, id: 'c' });
    await engine.sendMessage('hi');
    const res = await handle.capabilities.invoke('regenerate', { branchId: 'b9' }, {} as never);
    expect(res.ok).toBe(true);
    expect(engine.getState().messages[1].metadata?.branchId).toBe('b9');
  });
});

describe('A-16 — host loads a branch via setMessages', () => {
  it('host switching branch loads that branch messages through engine.setMessages', async () => {
    const connector = mockConnector([{ delta: { content: 'r1' } }, { finishReason: 'stop' }]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hi');
    // Host has stored an alternate branch; loading it replaces the messages.
    const branchMessages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: 'hi' },
      { id: 'a-alt', role: 'assistant', content: 'alternate answer', metadata: { branchId: 'b2' } },
    ];
    engine.setMessages(branchMessages);
    expect(engine.getState().messages[1].content).toBe('alternate answer');
    expect(engine.getState().messages[1].metadata?.branchId).toBe('b2');
  });
});
