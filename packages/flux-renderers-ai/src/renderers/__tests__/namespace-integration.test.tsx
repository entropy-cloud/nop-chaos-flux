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
import type { AiConnectorChunk } from '../../engine/types.js';

const SchemaRenderer = createAiSchemaRenderer();

afterEach(() => {
  cleanup();
});

const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

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

    await waitFor(() => {
      expect(document.querySelector('[data-testid="ai-probe-active-id"]')?.textContent).toContain('c-reactive');
    });

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

  // ==========================================================================
  // R1-F5 (2026-08-11 open-audit, plan 2026-08-11-0335-2): the `ai` ActionScope
  // namespace is NOT instance-isolated — `registerNamespace` replaces an
  // existing provider (`cleanupProvider(existing)`), so with two ai-chat on one
  // page the LATER-mounted instance silently takes over `ai:*` routing and the
  // FIRST-unmounted instance unregisters the whole namespace. The P2 guard:
  // ai-chat warns once before registering when another provider already owns
  // `ai`, so the takeover is never silent. (Full per-instance isolation is a
  // structural flux-runtime change — adjudicated out of scope, see the plan.)
  // ==========================================================================
  it('R1-F5: a later-mounted ai-chat warns once when another instance already owns the `ai` namespace', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const connector = mockStreamConnector(okChunks);
      let observed: ActionScope | null = null;

      render(
        <SchemaRenderer
          schemaUrl="test://ai/r1f5-two-chats"
          schema={{
            type: 'page',
            body: [
              {
                type: 'ai-chat',
                testid: 'chat-a',
                connector: connector as never,
                activeConversationId: 'c-a',
              },
              {
                type: 'ai-chat',
                testid: 'chat-b',
                connector: connector as never,
                activeConversationId: 'c-b',
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
      expect(document.querySelector('[data-testid="chat-a"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="chat-b"]')).not.toBeNull();

      // The later-mounted instance must surface the takeover as a warn, never
      // silently — at least one `[ai-chat]` warn must have fired.
      const chatWarns = warnSpy.mock.calls.filter((call) => String(call[0]).includes('[ai-chat]'));
      expect(chatWarns.length).toBeGreaterThanOrEqual(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('R1-F5: a single ai-chat registers the `ai` namespace WITHOUT any conflict warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const connector = mockStreamConnector(okChunks);
      let observed: ActionScope | null = null;

      render(
        <SchemaRenderer
          schemaUrl="test://ai/r1f5-single-chat"
          schema={{
            type: 'page',
            body: [
              {
                type: 'ai-chat',
                connector: connector as never,
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
      const chatWarns = warnSpy.mock.calls.filter((call) => String(call[0]).includes('[ai-chat]'));
      expect(chatWarns.length).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
