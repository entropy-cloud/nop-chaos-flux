import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type {
  ActionContext,
  ActionScope,
  RendererEnv,
} from '@nop-chaos/flux-core';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
  mockStreamConnector,
} from '../../ai-test-support.js';
import type { AiConversationController } from '../../adapters/ai-conversation-controller.js';
import { AI_NAMESPACE_ACTIONS, createAiActionProvider } from '../../adapters/ai-action-provider.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
} from '../../engine/types.js';

const SchemaRenderer = createAiSchemaRenderer();

afterEach(() => {
  cleanup();
});

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

describe('ai namespace integration via ai-chat (Layer B + $ai projection channel)', () => {
  it('registers the `ai` namespace when ai-chat mounts (capability check)', async () => {
    const connector = mockStreamConnector(okChunks);
    let observed: ActionScope | null = null;

    const env: RendererEnv = aiMockEnv();
    render(
      <SchemaRenderer
        schemaUrl="test://ai/namespace-register"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              connector: connector as never,
              activeConversationId: 'c-init',
              beforeMessages: { type: 'ai-scope-probe' },
            },
          ],
        }}
        env={env}
        formulaCompiler={aiFormulaCompiler}
        onActionScopeChange={(scope) => {
          observed = scope;
        }}
      />,
    );

    await waitFor(() => {
      expect(observed?.listNamespaces()).toContain('ai');
    });
  });

  it('host without ActionScope does not crash (Failure Path ai-action-no-scope)', () => {
    const connector = mockStreamConnector(okChunks);
    expect(() => {
      render(
        <SchemaRenderer
          schemaUrl="test://ai/no-scope"
          schema={{
            type: 'page',
            body: [{ type: 'ai-chat', connector: connector as never }],
          }}
          env={aiMockEnv()}
          formulaCompiler={aiFormulaCompiler}
        />,
      );
    }).not.toThrow();
  });

  it('dispatches ai:send through the registered namespace and the message reaches the connector', async () => {
    const connector = mockStreamConnector(okChunks);
    let observed: ActionScope | null = null;

    render(
      <SchemaRenderer
        schemaUrl="test://ai/send-dispatch"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-send',
              connector: connector as never,
              activeConversationId: 'c-1',
              beforeMessages: {
                type: 'test-button',
                testid: 'external-send',
                label: 'Send via ai:send',
                onClick: { action: 'ai:send', args: { text: 'via-namespace' } },
              },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        onActionScopeChange={(scope) => {
          observed = scope;
        }}
      />,
    );

    await waitFor(() => {
      expect(observed?.listNamespaces()).toContain('ai');
    });

    const button = document.querySelector('[data-testid="external-send"]') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    await act(async () => {
      button!.click();
    });

    // The user bubble appears with the dispatched text.
    await waitFor(() => {
      const userBubble = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
      expect(userBubble?.textContent).toContain('via-namespace');
    });
  });

  it('projects isProcessing + activeConversationId into host scope reactively (the $ai.* channel)', async () => {
    const slowChunks: AiConnectorChunk[] = [
      { delta: { content: 'a' } },
      { delta: { content: 'b' } },
      { finishReason: 'stop' },
    ];
    const connector = mockStreamConnector(slowChunks, 10);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/reactive-projection"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-reactive',
              connector: connector as never,
              activeConversationId: 'c-reactive',
              beforeMessages: { type: 'ai-scope-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // activeConversationId is projected synchronously.
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ai-probe-active-id"]')?.textContent).toContain('c-reactive');
    });

    // Trigger a send and observe isProcessing flip true then false.
    const input = document.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'hi' } });

    await act(async () => {
      fireEvent.click(document.querySelector('[data-slot="ai-sender-submit"]')!);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="ai-probe-processing"]')?.textContent).toContain('true');
    });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ai-probe-processing"]')?.textContent).toContain('false');
    });
  });

  it('conversation actions route to the bound conversationController prop', async () => {
    const connector = mockStreamConnector(okChunks);
    const createSpy = vi.fn(async () => ({ id: 'c-new', createdAt: 1, updatedAt: 1 }));

    // The host controller is injected via a custom probe that wraps ai-chat
    // with a controller. Since schema-resolved expressions are not trivial to
    // wire here, we instead invoke the namespace directly after mount.
    const controller: AiConversationController = {
      createConversation: createSpy,
      switchConversation: vi.fn(async () => undefined),
      deleteConversation: vi.fn(async () => undefined),
      renameConversation: vi.fn(async () => undefined),
    };

    let observed: ActionScope | null = null;

    render(
      <SchemaRenderer
        schemaUrl="test://ai/controller-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              connector: connector as never,
              conversationController: controller as never,
              activeConversationId: 'c-1',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        onActionScopeChange={(scope) => {
          observed = scope;
        }}
      />,
    );

    await waitFor(() => {
      expect(observed?.listNamespaces()).toContain('ai');
    });

    const resolved = observed!.resolve('ai:createConversation');
    expect(resolved).toBeDefined();
    const result = await resolved!.provider.invoke(
      'createConversation',
      { title: 'Host-managed' },
      {} as ActionContext,
    );
    expect(result.ok).toBe(true);
    expect(createSpy).toHaveBeenCalledWith({ title: 'Host-managed', metadata: undefined });
  });
});
