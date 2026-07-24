import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import type {
  AiConversationInfo,
  ChatMessage,
} from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';
import {
  mockStorage,
  okChunks,
  slowConnector,
  wait,
} from './use-conversation-test-helpers.js';

/**
 * Domain: P3 storage sync + AI-28 storage error observability. Split out of
 * the original `use-conversation.test.ts` so each file focuses on one domain.
 */

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
