import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
} from '../../ai-test-support.js';
import { AiChatRenderer } from '../ai-chat.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type { AiChatSchema } from '../../schemas.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  MessageEngine,
} from '../../engine/types.js';

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

function buildExternalEngine(connector: AiConnector): MessageEngine {
  return createMessageEngine({ connector, adapter: createReactMessageAdapter() });
}

/**
 * Spy wrapper that intercepts `onConversationChange` payloads (same capture
 * pattern as ai-chat-subscribe.test.tsx — records exactly what `ai-chat`
 * hands to the event channel).
 */
let captured: { conversationId?: string | null }[] = [];
function resetCaptured(): void {
  captured = [];
}

function SpyAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  const wrappedEvents = {
    ...props.events,
    onConversationChange: ((event: unknown) => {
      captured.push({ conversationId: (event as { conversationId?: string | null }).conversationId });
    }) as never,
  };
  return <Chat {...props} events={wrappedEvents} />;
}

const spyChat: RendererDefinition = { type: 'spy-ai-chat', component: SpyAiChat };
const SchemaRenderer = createAiSchemaRenderer([spyChat]);

interface HarnessProps {
  engine: MessageEngine;
  conversationId: string | null;
}

/**
 * Host harness: drives the schema's `activeConversationId` expression via the
 * page `data` channel (the canonical host path — sidebar onItemClick →
 * setValue → page data → prop re-resolve).
 */
function ChatHarness({ engine, conversationId }: HarnessProps): React.ReactElement {
  return (
    <SchemaRenderer
      schemaUrl="test://ai/conversation-change"
      schema={{
        type: 'page',
        body: [
          {
            type: 'spy-ai-chat',
            testid: 'chat-cc',
            engine: engine as never,
            activeConversationId: '${activeConversationId}',
          },
        ],
      }}
      data={{ activeConversationId: conversationId }}
      env={aiMockEnv()}
      formulaCompiler={aiFormulaCompiler}
    />
  );
}

describe('ai-chat — onConversationChange (C8.1 P1-1)', () => {
  it('does NOT fire on initial mount (silent baseline)', async () => {
    resetCaptured();
    const engine = buildExternalEngine(mockConnector(replyChunks));
    render(<ChatHarness engine={engine} conversationId={null} />);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="ai-chat-root"]')).not.toBeNull();
    });
    expect(captured).toHaveLength(0);
  });

  it('fires { conversationId } when the resolved activeConversationId changes', async () => {
    resetCaptured();
    const engine = buildExternalEngine(mockConnector(replyChunks));

    function Host() {
      const [conversationId, setConversationId] = useState<string | null>(null);
      useEffect(() => {
        const t = setTimeout(() => setConversationId('c-1'), 20);
        return () => clearTimeout(t);
      }, []);
      return <ChatHarness engine={engine} conversationId={conversationId} />;
    }

    render(<Host />);
    await waitFor(() => {
      expect(captured).toEqual([{ conversationId: 'c-1' }]);
    });
  });

  it('fires on each subsequent change and stays silent on unchanged values', async () => {
    resetCaptured();
    const engine = buildExternalEngine(mockConnector(replyChunks));

    function Host() {
      const [conversationId, setConversationId] = useState<string | null>('c-1');
      useEffect(() => {
        const t1 = setTimeout(() => setConversationId('c-2'), 20);
        const t2 = setTimeout(() => setConversationId('c-2'), 40);
        const t3 = setTimeout(() => setConversationId(null), 60);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }, []);
      return <ChatHarness engine={engine} conversationId={conversationId} />;
    }

    render(<Host />);
    // c-1 → c-2 (fire), c-2 → c-2 (no fire), c-2 → null (fire).
    await waitFor(() => {
      expect(captured).toEqual([
        { conversationId: 'c-2' },
        { conversationId: null },
      ]);
    });
  });
});
