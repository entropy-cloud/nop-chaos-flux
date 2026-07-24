import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEngineView } from '../use-engine-view.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../react-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  MessageEngine,
} from '../../engine/types.js';

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

function buildEngine(connector: AiConnector | null): MessageEngine {
  return createMessageEngine({ connector, adapter: createReactMessageAdapter() });
}

const helloChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hel' } },
  { delta: { content: 'lo' } },
  { finishReason: 'stop' },
];

describe('useEngineView — bind an existing engine to React', () => {
  it('reflects the external engine state and updates on send', async () => {
    const engine = buildEngine(mockConnector(helloChunks));
    const { result } = renderHook(() => useEngineView(engine));

    expect(result.current.engine).toBe(engine);
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.requestState).toBe('idle');

    await act(async () => {
      await result.current.sendMessage('hi');
    });

    // useSyncExternalStore received the engine update.
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe('Hello');
    expect(result.current.requestState).toBe('completed');
    expect(result.current.isProcessing).toBe(false);
  });

  it('exposes send / abortRequest bound to the engine', async () => {
    const engine = buildEngine(mockConnector([{ delta: { content: 'A' } }, { finishReason: 'stop' }]));
    const { result } = renderHook(() => useEngineView(engine));

    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.abortRequest).toBe('function');

    await act(async () => {
      await result.current.send({ id: 'u1', role: 'user', content: 'multi' });
    });
    expect(result.current.messages[1].content).toBe('A');
  });

  it('re-subscribes when a different engine instance is bound', async () => {
    const first = buildEngine(mockConnector(helloChunks));
    const { result, rerender } = renderHook(({ e }) => useEngineView(e), {
      initialProps: { e: first as MessageEngine },
    });

    await act(async () => {
      await result.current.sendMessage('one');
    });
    expect(result.current.messages).toHaveLength(2);

    // Swap to a fresh engine; the view must reflect the new engine's state.
    const second = buildEngine(mockConnector([{ delta: { content: 'B' } }, { finishReason: 'stop' }]));
    rerender({ e: second });
    expect(result.current.engine).toBe(second);
    expect(result.current.messages).toHaveLength(0);

    await act(async () => {
      await result.current.sendMessage('two');
    });
    expect(result.current.messages[1].content).toBe('B');
  });
});
