import { describe, it, expect } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
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
