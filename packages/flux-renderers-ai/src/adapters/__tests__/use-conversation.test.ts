import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiConversationInfo,
  ChatMessage,
  ToolExecutor,
} from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';

function slowConnector(chunks: AiConnectorChunk[], delayMs = 5): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) {
          await new Promise((r) => setTimeout(r, delayMs));
          yield c;
        }
      }
      void _req;
      return gen();
    },
  };
}

/**
 * Scripted connector for multi-round tool-loop tests: each `stream` call
 * consumes the next scripted round.
 */
function scriptedConnector(rounds: AiConnectorChunk[][]): AiConnector & {
  calls: AiConnectorRequest[];
} {
  const calls: AiConnectorRequest[] = [];
  let round = 0;
  return {
    calls,
    async stream(request: AiConnectorRequest) {
      calls.push(request);
      const chunks = rounds[Math.min(round, rounds.length - 1)];
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      return gen();
    },
  };
}

const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

describe('useConversation — double-layer model', () => {
  it('createConversation seeds the list and sets active', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));

    let info;
    act(() => {
      info = result.current.createConversation({ title: 'First' });
    });
    expect(info).toMatchObject({ title: 'First' });
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.activeConversationId).toBe(info!.id);
    expect(result.current.activeEngine).not.toBeNull();
  });

  it('switchConversation activates the target and lazily builds its engine', async () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    act(() => {
      result.current.createConversation({ title: 'B' });
    });
    const bId = result.current.activeConversationId!;

    expect(result.current.activeConversationId).toBe(bId);
    const bEngine = result.current.activeEngine;

    await act(async () => {
      await result.current.switchConversation(aId);
    });
    expect(result.current.activeConversationId).toBe(aId);
    // Switching to A built a new engine distinct from B's.
    expect(result.current.activeEngine).not.toBe(bEngine);

    // Switching back to B: the engine should be the same instance if not
    // processing (re-created on demand after eviction).
    await act(async () => {
      await result.current.switchConversation(bId);
    });
    expect(result.current.activeConversationId).toBe(bId);
  });

  it('renameConversation updates the title in the list', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'Old' });
    });
    const id = result.current.activeConversationId!;
    act(() => {
      result.current.renameConversation(id, 'New');
    });
    expect(result.current.conversations[0].title).toBe('New');
  });

  it('deleteConversation removes the conversation and clears active if needed', async () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'Only' });
    });
    const id = result.current.activeConversationId!;
    await act(async () => {
      await result.current.deleteConversation(id);
    });
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.activeEngine).toBeNull();
  });

  it('exposes a controller bound to the manager methods', () => {
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() => useConversation({ connector }));
    act(() => {
      result.current.createConversation({ title: 'X' });
    });
    const id = result.current.activeConversationId!;
    act(() => {
      result.current.controller.renameConversation(id, 'Via controller');
    });
    expect(result.current.conversations[0].title).toBe('Via controller');
  });

  it('switching away from a processing conversation keeps it running in the background', async () => {
    // Long-running stream so isProcessing is true at switch time.
    const longChunks: AiConnectorChunk[] = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { delta: { content: 'c' } },
      { finishReason: 'stop' },
    ];
    const connector = slowConnector(longChunks, 20);
    const { result } = renderHook(() => useConversation({ connector }));

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const aId = result.current.activeConversationId!;
    const aEngine = result.current.activeEngine!;

    // Kick off a stream on A, then immediately switch to a new conversation.
    act(() => {
      void aEngine.sendMessage('go');
    });

    act(() => {
      result.current.createConversation({ title: 'B' });
    });

    // A is no longer active, but its engine should still be running
    // (processing === true). The active engine is B's, not A's.
    expect(result.current.activeConversationId).not.toBe(aId);
    expect(result.current.activeEngine).not.toBe(aEngine);
    // Wait for A's stream to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(aEngine.getState().requestState).toBe('completed');
  });
});

// ============ P3 storage sync (mount bootstrap / re-hydrate / auto-save) ============

interface MockStorageCalls {
  loadConversations: number;
  loadMessages: number;
  saveConversation: number;
  saveMessages: number;
  deleteConversation: number;
}

function mockStorage(initial?: {
  conversations?: AiConversationInfo[];
  messages?: Record<string, ChatMessage[]>;
}) {
  const calls: MockStorageCalls = {
    loadConversations: 0,
    loadMessages: 0,
    saveConversation: 0,
    saveMessages: 0,
    deleteConversation: 0,
  };
  const savedMessages: Record<string, ChatMessage[]> = {};
  const strategy: ConversationStorageStrategy = {
    async loadConversations() {
      calls.loadConversations++;
      return initial?.conversations ?? [];
    },
    async loadMessages(id: string) {
      calls.loadMessages++;
      return initial?.messages?.[id] ?? [];
    },
    async saveConversation() {
      calls.saveConversation++;
    },
    async saveMessages(id: string, messages: ChatMessage[]) {
      calls.saveMessages++;
      savedMessages[id] = messages;
    },
    async deleteConversation() {
      calls.deleteConversation++;
    },
  };
  return { strategy, calls, savedMessages };
}

function wait(ms = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('useConversation — P3 storage sync', () => {
  it('mount bootstraps the conversation list from storage and selects the first as active', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
      { id: 'c2', title: 'Two', createdAt: 2, updatedAt: 2 },
    ];
    const { strategy, calls } = mockStorage({ conversations: convs });
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );

    await act(async () => {
      await wait();
    });

    expect(calls.loadConversations).toBe(1);
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.activeConversationId).toBe('c1');
  });

  it('switchConversation re-hydrates stored messages via engine.setMessages', async () => {
    const stored: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hi' },
      { id: 'm2', role: 'assistant', content: 'hello' },
    ];
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const { strategy, calls } = mockStorage({
      conversations: convs,
      messages: { c1: stored },
    });
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    expect(calls.loadMessages).toBe(1);
    const engine = result.current.activeEngine!;
    expect(engine).not.toBeNull();
    expect(engine.getMessages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('autoSaveMessages persists a snapshot when a turn completes', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const { strategy, calls, savedMessages } = mockStorage({
      conversations: convs,
    });
    const connector = slowConnector(okChunks, 5);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: strategy, autoSaveMessages: true }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    expect(calls.saveMessages).toBeGreaterThanOrEqual(1);
    expect(savedMessages.c1.some((m) => m.role === 'user' && m.content === 'hello')).toBe(true);
  });

  it('Failure Path storage-load-error: loadConversations reject → empty list, no throw', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      loadConversations: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing }),
    );

    await act(async () => {
      await wait();
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('Failure Path storage-load-error: loadMessages reject → empty messages, no throw', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      loadMessages: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    expect(result.current.activeEngine!.getMessages()).toEqual([]);
  });

  it('Failure Path storage-save-error: saveMessages reject → does not block the engine', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      saveMessages: async () => {
        throw new Error('boom');
      },
    };
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, autoSaveMessages: true }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    // The turn completed despite the persistence failure.
    expect(engine.getState().requestState).toBe('completed');
  });
});

// ============ F1.2: useConversation tool-loop forwarding ============

describe('useConversation — F1.2 buildEngine forwards tool triad', () => {
  it('finish_reason:tool_calls executes the loop (not tool-no-executor error)', async () => {
    const connector = scriptedConnector([
      [
        {
          delta: {
            tool_calls: [
              { index: 0, id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{}' } },
            ],
          },
        },
        { finishReason: 'tool_calls' },
      ],
      [{ delta: { content: 'sunny' } }, { finishReason: 'stop' }],
    ]);
    const executor: ToolExecutor = vi.fn(async () => 'sunny, 18C');

    const { result } = renderHook(() =>
      useConversation({
        connector,
        createEngineOptions: {
          tools: [{ type: 'function', function: { name: 'get_weather' } }],
          toolExecutor: executor,
          maxToolRounds: 4,
        },
      }),
    );

    act(() => {
      result.current.createConversation({ title: 'A' });
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('weather?');
    });

    // The executor ran (tool-loop active), and a follow-up request was issued.
    expect(executor).toHaveBeenCalledTimes(1);
    expect(connector.calls).toHaveLength(2);
    expect(engine.getState().requestState).toBe('completed');
  });
});

// ============ AI-28: storage failures are observable to the host ============

describe('useConversation — AI-28 storage error observability', () => {
  it('invokes onStorageError when loadConversations fails', async () => {
    const failing: ConversationStorageStrategy = {
      ...mockStorage().strategy,
      loadConversations: async () => {
        throw new Error('boom-load');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    await act(async () => {
      await wait();
    });

    expect(onStorageError).toHaveBeenCalledTimes(1);
    const arg = onStorageError.mock.calls[0][0];
    expect(arg.phase).toBe('loadConversations');
    expect(arg.error).toBeInstanceOf(Error);
  });

  it('invokes onStorageError when loadMessages fails', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      loadMessages: async () => {
        throw new Error('boom-msgs');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks);
    const { result } = renderHook(() =>
      useConversation({ connector, storage: failing, onStorageError }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });

    const phases = onStorageError.mock.calls.map((c) => c[0].phase);
    expect(phases).toContain('loadMessages');
  });

  it('invokes onStorageError when saveMessages fails (auto-save path)', async () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 1 },
    ];
    const failing: ConversationStorageStrategy = {
      ...mockStorage({ conversations: convs }).strategy,
      saveMessages: async () => {
        throw new Error('boom-save');
      },
    };
    const onStorageError = vi.fn();
    const connector = slowConnector(okChunks, 5);
    const { result } = renderHook(() =>
      useConversation({
        connector,
        storage: failing,
        autoSaveMessages: true,
        onStorageError,
      }),
    );

    await act(async () => {
      await wait();
    });
    await act(async () => {
      await result.current.switchConversation('c1');
    });
    const engine = result.current.activeEngine!;
    await act(async () => {
      await engine.sendMessage('hello');
    });

    const phases = onStorageError.mock.calls.map((c) => c[0].phase);
    expect(phases).toContain('saveMessages');
    // The turn still completes (storage failure is non-fatal).
    expect(engine.getState().requestState).toBe('completed');
  });
});
