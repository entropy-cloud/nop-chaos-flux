import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
  mockStreamConnector,
} from '../../ai-test-support.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  MessageEngine,
} from '../../engine/types.js';

const SchemaRenderer = createAiSchemaRenderer();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

const replyChunks: AiConnectorChunk[] = [
  { delta: { content: 'Reply' } },
  { finishReason: 'stop' },
];

/**
 * External engines MUST use the React adapter (snapshot-caching) so
 * `useSyncExternalStore` sees a stable snapshot reference between notifications
 * — mirroring how `useConversation` builds its engines (use-conversation.ts).
 */
function buildExternalEngine(
  connector: AiConnector,
  initialMessages?: ChatMessage[],
): MessageEngine {
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

describe('ai-chat — external engine injection', () => {
  it('binds an injected MessageEngine and renders its messages', () => {
    const external = buildExternalEngine(mockConnector(replyChunks), [
      { id: 'seed-user', role: 'user', content: 'seed-hello' },
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/external-engine"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-ext',
              engine: external as never,
              submitType: 'enter',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // The seeded user message (from the external engine) renders.
    const userBubble = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
    expect(userBubble?.textContent).toContain('seed-hello');
  });

  it('routes send through the external engine (not a self-built one)', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));
    const before = external.getState().messages.length;

    render(
      <SchemaRenderer
        schemaUrl="test://ai/external-send"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-ext-send',
              engine: external as never,
              submitType: 'enter',
              placeholder: 'Type…',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const textarea = document.querySelector(
      '[data-slot="ai-sender-input"] textarea',
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    await act(async () => {
      fireEvent.change(textarea!, { target: { value: 'via-external' } });
      fireEvent.keyDown(textarea!, { key: 'Enter' });
    });

    await waitFor(() => {
      // The external engine gained the user + assistant turn.
      expect(external.getState().messages.length).toBe(before + 2);
      expect(
        external.getState().messages.some(
          (m) => m.role === 'user' && m.content === 'via-external',
        ),
      ).toBe(true);
    });
  });

  it('falls back to a self-built engine when no `engine` prop is given (regression)', async () => {
    const connector = mockStreamConnector(replyChunks);
    render(
      <SchemaRenderer
        schemaUrl="test://ai/self-built"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-self',
              connector: connector as never,
              submitType: 'enter',
              placeholder: 'Type…',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const textarea = document.querySelector(
      '[data-slot="ai-sender-input"] textarea',
    ) as HTMLTextAreaElement | null;
    await act(async () => {
      fireEvent.change(textarea!, { target: { value: 'self-built-msg' } });
      fireEvent.keyDown(textarea!, { key: 'Enter' });
    });

    await waitFor(() => {
      const userBubble = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
      expect(userBubble?.textContent).toContain('self-built-msg');
    });
  });

  it('degrades to self-built + warns when `engine` is a non-MessageEngine value (engine-prop-not-engine)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const connector = mockStreamConnector(replyChunks);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/not-engine"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-not-engine',
              engine: { notAnEngine: true } as never,
              connector: connector as never,
              submitType: 'enter',
              placeholder: 'Type…',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // Warned about the bad engine value, but did NOT crash.
    expect(warnSpy).toHaveBeenCalled();
    expect(document.querySelector('.nop-ai-chat')).not.toBeNull();

    // Self-built path still works (sends go through the connector).
    const textarea = document.querySelector(
      '[data-slot="ai-sender-input"] textarea',
    ) as HTMLTextAreaElement | null;
    await act(async () => {
      fireEvent.change(textarea!, { target: { value: 'fallback-ok' } });
      fireEvent.keyDown(textarea!, { key: 'Enter' });
    });
    await waitFor(() => {
      const userBubble = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
      expect(userBubble?.textContent).toContain('fallback-ok');
    });
  });

  it('renders emptyState when `engine` is null (engine-null-switch)', () => {
    render(
      <SchemaRenderer
        schemaUrl="test://ai/null-engine"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-null',
              engine: null as never,
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-ai-chat');
    expect(root?.getAttribute('data-state')).toBe('empty');
    // No message list / sender rendered while switching.
    expect(root?.querySelector('[data-slot="ai-sender-input"]')).toBeNull();
    // Default "select conversation" prompt is visible.
    expect(root?.querySelector('[data-slot="ai-chat-empty"]')).not.toBeNull();
  });
});
