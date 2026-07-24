import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMessage } from '../use-message.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiToolSchema,
  ToolExecutor,
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

  // F2.2: a self-built engine must abort its in-flight stream on unmount so a
  // route switch does not leave an orphaned background connection.
  it('aborts the self-built engine in-flight stream on unmount (F2.2)', async () => {
    let release: () => void;
    const pending = new Promise<void>((r) => {
      release = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'partial' } };
          await pending;
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const { result, unmount } = renderHook(() => useMessage({ connector }));
    const engine = result.current.engine;

    act(() => {
      void engine.sendMessage('hi');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(engine.getState().isProcessing).toBe(true);

    unmount();

    // The unmount cleanup aborted the self-built engine's in-flight stream.
    expect(engine.getState().requestState).toBe('aborted');
    expect(engine.getState().isProcessing).toBe(false);
    release!();
  });

  // F2.2: an externally-injected engine is NOT aborted on unmount — its owner
  // manages its lifecycle (e.g. `useConversation`).
  it('does not abort an externally-injected engine on unmount (F2.2)', async () => {
    let release: () => void;
    const pending = new Promise<void>((r) => {
      release = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'partial' } };
          await pending;
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    // Build an external engine with a React adapter (stable snapshot identity
    // for useSyncExternalStore — required by useEngineView).
    const { createMessageEngine } = await import('../../engine/create-engine.js');
    const { createReactMessageAdapter } = await import('../react-adapter.js');
    const externalEngine = createMessageEngine({ connector, adapter: createReactMessageAdapter() });
    const { unmount } = renderHook(() => useMessage({ connector, engine: externalEngine }));

    act(() => {
      void externalEngine.sendMessage('hi');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(externalEngine.getState().isProcessing).toBe(true);

    unmount();

    // External engine lifecycle is owned by the caller — unmount did NOT abort.
    expect(externalEngine.getState().isProcessing).toBe(true);
    await externalEngine.abort();
    release!();
  });

  // 2151 P2 test hardening: verify the adapter forwards `toolExecutor` (and
  // `tools`) into the self-built engine so the agentic tool loop actually
  // fires. The engine-level loop is covered by `engine-tool-loop.test.ts`;
  // this test guarantees the adapter wiring (`useMessage` → `createMessageEngine`
  // → internal toolPlugin) is intact — removing the `toolExecutor` field from
  // the `createMessageEngine({ ... })` call in `use-message.ts` turns this red.
  it('forwards toolExecutor to the engine so a tool_calls turn invokes it', async () => {
    const calls: AiConnectorRequest[] = [];
    let round = 0;
    const rounds: AiConnectorChunk[][] = [
      [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_adapter_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"city":"sf"}' },
              },
            ],
          },
        },
        { finishReason: 'tool_calls' },
      ],
      [{ delta: { content: 'Sunny.' } }, { finishReason: 'stop' }],
    ];
    const connector: AiConnector = {
      async stream(req: AiConnectorRequest) {
        calls.push(req);
        const chunks = rounds[Math.min(round, rounds.length - 1)];
        round += 1;
        async function* gen() {
          for (const c of chunks) yield c;
        }
        return gen();
      },
    };
    const tools: AiToolSchema[] = [
      { type: 'function', function: { name: 'get_weather' } },
    ];
    const toolExecutor: ToolExecutor = vi.fn(async ({ toolCall }) => {
      expect(toolCall.function.name).toBe('get_weather');
      return { ok: true, result: 'sunny, 18C' };
    });

    const { result } = renderHook(() =>
      useMessage({ connector, tools, toolExecutor }),
    );

    await act(async () => {
      await result.current.sendMessage('weather?');
    });

    expect(toolExecutor).toHaveBeenCalledTimes(1);
    expect(result.current.requestState).toBe('completed');
    // Final message is the stop round's assistant text — proves the loop ran
    // to completion (tool result fed back, second request issued).
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.content).toBe('Sunny.');
    // Connector was called twice (initial tool_calls turn + follow-up).
    expect(calls).toHaveLength(2);
  });
});
