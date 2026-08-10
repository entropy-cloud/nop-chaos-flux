import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
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
  ChatMessage,
  ChatToolCall,
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

function buildExternalEngine(connector: AiConnector, initialMessages?: ChatMessage[]): MessageEngine {
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

const toolCall: ChatToolCall = {
  index: 0,
  id: 'call_hitl',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"SF"}' },
};

const pendingHitlMessage: ChatMessage = {
  id: 'assistant-hitl',
  role: 'assistant',
  content: '',
  tool_calls: [toolCall],
  state: { toolCall: { call_hitl: { status: 'running', approval: 'pending' } } },
};

/**
 * Spy wrapper that intercepts `onApproval` payloads (same capture pattern as
 * ai-chat-conversation-change.test.tsx — records exactly what `ai-chat` hands
 * to the event channel).
 */
let captured: Array<Record<string, unknown>> = [];
function resetCaptured(): void {
  captured = [];
}

function SpyAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  const wrappedEvents = {
    ...props.events,
    onApproval: ((event: unknown) => {
      captured.push(event as Record<string, unknown>);
    }) as never,
  };
  return <Chat {...props} events={wrappedEvents} />;
}

const spyChat: RendererDefinition = { type: 'spy-ai-chat', component: SpyAiChat };
const SpySchemaRenderer = createAiSchemaRenderer([spyChat]);

// ============================================================================
// multi-audit P2-4 (plan 2026-08-10-1606-2): HITL approval is structurally
// unreachable on the default bubble path. `FallbackToolCallCard` dropped
// `onApproval` and `BubbleToolRendererProps` had no such field, so a pending
// tool call rendered in a bubble hit the `hitl-no-handler` guard (buttons
// disabled). The fix threads `onApproval` through the full chain:
// ai-chat events → AiChatContextValue → AiMessageList → AiBubbleView →
// message-level tools renderer → BubbleToolRendererProps → FallbackToolCallCard.
// ============================================================================

describe('ai-chat bubble path — HITL approval reachability (multi-audit P2-4)', () => {
  it('pending tool-call card in a bubble: approve/reject buttons are ENABLED and dispatch onApproval', async () => {
    resetCaptured();
    const external = buildExternalEngine(mockConnector(replyChunks), [pendingHitlMessage]);

    render(
      <SpySchemaRenderer
        schemaUrl="test://ai/bubble-hitl"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-hitl',
              engine: external as never,
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // The pending tool card renders inside the bubble with visible actions.
    const approve = document.querySelector(
      '[data-slot="ai-tool-call-approve"]',
    ) as HTMLButtonElement | null;
    const reject = document.querySelector(
      '[data-slot="ai-tool-call-reject"]',
    ) as HTMLButtonElement | null;
    await waitFor(() => {
      expect(approve).not.toBeNull();
      expect(reject).not.toBeNull();
    });

    // P2-4: on the bubble path the handler IS wired — buttons must be enabled
    // (pre-fix they were disabled by the hitl-no-handler guard).
    expect(approve!.disabled).toBe(false);
    expect(reject!.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(approve!);
    });
    expect(captured.length).toBe(1);
    expect(captured[0]).toMatchObject({ type: 'ai:tool-call-approval', action: 'approve' });

    await act(async () => {
      fireEvent.click(reject!);
    });
    expect(captured.length).toBe(2);
    expect(captured[1]).toMatchObject({ type: 'ai:tool-call-approval', action: 'reject' });
  });
});
