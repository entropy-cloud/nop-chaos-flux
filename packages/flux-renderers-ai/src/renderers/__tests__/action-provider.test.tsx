import { describe, it, expect, vi } from 'vitest';
import type { ActionContext } from '@nop-chaos/flux-core';
import type { AiConversationController } from '../../adapters/ai-conversation-controller.js';
import { AI_NAMESPACE_ACTIONS, createAiActionProvider } from '../../adapters/ai-action-provider.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
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

const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

describe('createAiActionProvider — namespace `ai` action surface (unit)', () => {
  it('advertises exactly the 7 design.md §14.2 actions', () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    expect([...(provider.listMethods?.() ?? [])]).toEqual([...AI_NAMESPACE_ACTIONS]);
  });

  it('ai:send delegates to engine.sendMessage and returns ok', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    const result = await provider.invoke('send', { text: 'hello' }, {} as ActionContext);
    expect(result.ok).toBe(true);
    expect(engine.getState().messages.some((m) => m.role === 'user' && m.content === 'hello')).toBe(true);
  });

  it('ai:send rejects empty/non-string text', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    const empty = await provider.invoke('send', { text: '' }, {} as ActionContext);
    expect(empty.ok).toBe(false);
    const wrongType = await provider.invoke('send', { text: 42 }, {} as ActionContext);
    expect(wrongType.ok).toBe(false);
  });

  it('ai:clear empties messages and resets requestState to idle', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    await engine.sendMessage('first');
    expect(engine.getState().messages.length).toBeGreaterThan(0);
    const result = await provider.invoke('clear', undefined, {} as ActionContext);
    expect(result.ok).toBe(true);
    expect(engine.getState().messages).toEqual([]);
    expect(engine.getState().requestState).toBe('idle');
  });

  it('ai:abort on an idle engine is a no-op returning ok', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    const result = await provider.invoke('abort', undefined, {} as ActionContext);
    expect(result.ok).toBe(true);
  });

  it('ai:createConversation delegates to the conversation controller and returns the created item', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const controller: AiConversationController = {
      createConversation: vi.fn(async (params) => ({
        id: 'c-1',
        title: params?.title,
        createdAt: 1,
        updatedAt: 1,
      })),
      switchConversation: vi.fn(async () => undefined),
      deleteConversation: vi.fn(async () => undefined),
      renameConversation: vi.fn(async () => undefined),
    };
    const provider = createAiActionProvider({ engine, conversationController: controller });
    const result = await provider.invoke(
      'createConversation',
      { title: 'New chat' },
      {} as ActionContext,
    );
    expect(result.ok).toBe(true);
    expect(controller.createConversation).toHaveBeenCalledWith({ title: 'New chat', metadata: undefined });
    expect(result.data).toMatchObject({ id: 'c-1', title: 'New chat' });
  });

  it('conversation actions return ok:false with a clear error when no controller is bound', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    for (const action of ['createConversation', 'switchConversation', 'deleteConversation', 'renameConversation']) {
      const result = await provider.invoke(action, { id: 'x', title: 't' }, {} as ActionContext);
      expect(result.ok).toBe(false);
    }
  });

  it('unknown action returns ok:false', async () => {
    const engine = createMessageEngine({ connector: mockConnector(okChunks) });
    const provider = createAiActionProvider({ engine });
    const result = await provider.invoke('frobnicate', {}, {} as ActionContext);
    expect(result.ok).toBe(false);
  });
});
