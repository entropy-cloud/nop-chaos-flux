import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMessage } from '../use-message.js';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest } from '../../engine/types.js';

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

const helloChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hel' } },
  { delta: { content: 'lo' } },
  { finishReason: 'stop' },
];

describe('useMessage', () => {
  it('subscribes to the engine and reflects streamed messages', async () => {
    const connector = mockConnector(helloChunks);
    const { result } = renderHook(() => useMessage({ connector }));

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.requestState).toBe('idle');

    await act(async () => {
      await result.current.sendMessage('hi');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hello');
    expect(result.current.requestState).toBe('completed');
    expect(result.current.isProcessing).toBe(false);
  });

  it('keeps the same engine instance across connector hot-swaps', async () => {
    const first = mockConnector([{ delta: { content: 'A' } }, { finishReason: 'stop' }]);
    const { result, rerender } = renderHook(({ c }) => useMessage({ connector: c }), {
      initialProps: { c: first as AiConnector | null },
    });

    const engineBefore = result.current.engine;
    const second = mockConnector([{ delta: { content: 'B' } }, { finishReason: 'stop' }]);
    rerender({ c: second });

    // Same engine instance (no rebuild).
    expect(result.current.engine).toBe(engineBefore);

    await act(async () => {
      await result.current.sendMessage('x');
    });
    expect(result.current.messages[1].content).toBe('B');
  });

  it('abortRequest sets requestState to aborted', async () => {
    let release: () => void;
    const pending = new Promise<void>((r) => {
      release = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'partial' } };
          await pending;
          yield { delta: { content: '-tail' } };
        }
        return gen();
      },
    };
    const { result } = renderHook(() => useMessage({ connector }));

    let turn: Promise<void> | undefined;
    act(() => {
      turn = result.current.sendMessage('hi');
    });
    // Let the generator emit the first chunk.
    await Promise.resolve();
    await Promise.resolve();
    await act(async () => {
      await result.current.abortRequest();
    });
    release!();
    await act(async () => {
      await turn;
    });
    expect(result.current.requestState).toBe('aborted');
    expect((result.current.messages[1].content as string).startsWith('partial')).toBe(true);
  });
});
