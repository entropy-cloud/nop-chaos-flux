import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversation } from '../use-conversation.js';
import { okChunks, slowConnector } from './use-conversation-test-helpers.js';

/**
 * Domain: conversation lifecycle (create / rename / delete). Split out of the
 * original `use-conversation.test.ts` so each file focuses on one domain.
 */
describe('useConversation — create / rename / delete', () => {
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
});
