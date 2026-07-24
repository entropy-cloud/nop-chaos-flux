import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import type { RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
} from '../../ai-test-support.js';
import { AiChatRenderer } from '../ai-chat.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type {
  AiChatSchema,
} from '../../schemas.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  MessageEngine,
} from '../../engine/types.js';

/**
 * Probe that captures the projected `ai` host-scope messages array so a test
 * can mutate the captured reference and assert the engine internal array is
 * unaffected (Decision-A, AI-02).
 */
let capturedProjectedMessages: ChatMessage[] | null = null;
function resetCapturedProjectedMessages(): void {
  capturedProjectedMessages = null;
}

function MessagesProbe(): React.ReactElement {
  const msgs = useScopeSelector<ChatMessage[]>(
    (data) => (data as { messages?: ChatMessage[] }).messages ?? [],
  );
  useEffect(() => {
    capturedProjectedMessages = msgs;
  });
  return <span data-testid="messages-probe" />;
}

const messagesProbe: RendererDefinition = {
  type: 'messages-probe',
  component: MessagesProbe,
};

/**
 * AI-09 / AI-19 capture harness. The flux-react runtime normalizes a raw
 * `{ message }` event payload to an undefined `ctx.event` (it lacks a `.type`
 * string), so the payload would be dropped before reaching any registered
 * action. To observe EXACTLY what `ai-chat` hands to `onResponseComplete`, we
 * wrap the real renderer in a spy that intercepts its `props.events` object and
 * records each call's raw payload (before normalization).
 */
let capturedOnComplete: { message: ChatMessage }[] = [];
function resetCapturedOnComplete(): void {
  capturedOnComplete = [];
}

function SpyAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  // Inject a capture handler for onResponseComplete. ai-chat reads events
  // through a latest-ref, so a fresh wrapper each render is fine.
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  const wrappedEvents = {
    ...props.events,
    onResponseComplete: ((event: unknown) => {
      capturedOnComplete.push({ message: (event as { message: ChatMessage }).message });
    }) as never,
  };
  return <Chat {...props} events={wrappedEvents} />;
}

const spyChat: RendererDefinition = {
  type: 'spy-ai-chat',
  component: SpyAiChat,
};

const SchemaRenderer = createAiSchemaRenderer([messagesProbe, spyChat]);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetCapturedProjectedMessages();
  resetCapturedOnComplete();
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

const seedMessages: ChatMessage[] = [
  { id: 'seed-user', role: 'user', content: 'seed-hello' },
  { id: 'seed-assistant', role: 'assistant', content: 'seed-reply' },
];

describe('ai-chat — Decision-A projection (AI-02): hostScopeData.messages is a snapshot', () => {
  it('does NOT leak the engine internal messages array reference to descendants', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-ref"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-proj',
              engine: external as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(capturedProjectedMessages).not.toBeNull();
    });

    const engineMessages = external.getState().messages;
    // After the fix the projection must be a distinct array reference
    // (snapshot), not the engine's internal array.
    expect(capturedProjectedMessages).not.toBe(engineMessages);
  });

  it('mutating the projected messages array does NOT pollute the engine internal state', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-mutation"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-proj-mut',
              engine: external as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(capturedProjectedMessages).not.toBeNull();
    });

    const engineBefore = external.getState().messages;
    const engineBeforeLen = engineBefore.length;
    const engineBeforeContent = engineBefore[0].content;

    // Descendant/host mutates the captured projection in-place: push a fake
    // message + mutate an existing message's content. This is exactly the
    // Decision-A hazard ("host 持有 engine 引用会污染域内部").
    capturedProjectedMessages!.push({ id: 'tampered', role: 'user', content: 'INJECTED' });
    (capturedProjectedMessages![0] as { content: string }).content = 'TAMPERED';

    const engineAfter = external.getState().messages;
    expect(engineAfter.length).toBe(engineBeforeLen);
    expect(engineAfter[0].content).toBe(engineBeforeContent);
    expect(engineAfter.some((m) => m.id === 'tampered')).toBe(false);
  });
});

describe('ai-chat — Decision-A event handoff (AI-09): onResponseComplete message is a snapshot', () => {
  it('delivers a message snapshot that is not the live engine reference', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));

    render(
      <SchemaRenderer
        schemaUrl="test://ai/oncomplete-snapshot"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-complete',
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
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-1' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(capturedOnComplete).toHaveLength(1);
    });

    const delivered = capturedOnComplete[0].message;
    const engineLast = external.getState().messages[external.getState().messages.length - 1];
    // Decision-A: the delivered message must be a distinct object (snapshot),
    // not the live engine reference, while carrying equal content.
    expect(delivered).not.toBe(engineLast);
    expect(delivered.content).toBe(engineLast.content);
  });

  it('a captured onComplete message is not mutated by a subsequent turn', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));

    render(
      <SchemaRenderer
        schemaUrl="test://ai/oncomplete-stable"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-stable',
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
    ) as HTMLTextAreaElement;

    // Turn 1
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-1' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await waitFor(() => {
      expect(capturedOnComplete).toHaveLength(1);
    });

    // Host tampers with the captured snapshot.
    const capturedFirst = capturedOnComplete[0].message;
    (capturedFirst as { content: string }).content = 'HOST-TAMPERED';

    // Turn 2 (new assistant reply)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-2' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await waitFor(() => {
      expect(capturedOnComplete).toHaveLength(2);
    });

    // The engine internal messages must not contain the tampered content.
    const engineMessages = external.getState().messages;
    expect(engineMessages.some((m) => m.content === 'HOST-TAMPERED')).toBe(false);
  });
});

// Silence the unused-env warning when aiMockEnv is not used in a sub-suite.
void aiMockEnv as unknown as RendererEnv;

/**
 * Phase 4 — hostScopeData clone frequency gated to turn boundaries (P1#2).
 *
 * Observes the descendant-visible `messages` array ref identity (via the
 * existing MessagesProbe, which captures the latest ref it rendered with).
 * The clone must NOT rebuild per streaming chunk — only at the turn boundary
 * (requestState terminal / isProcessing flip). We do not spy the private
 * `cloneMessages`; instead we observe the downstream ref identity, which is
 * the user-visible signal.
 */
describe('ai-chat — P1#2 hostScopeData clone gated to turn boundaries', () => {
  it('projected messages ref stays stable across streaming chunks and updates only at the turn boundary', async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const gatedMultiChunkConnector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'chunk-1' } };
          yield { delta: { content: ' chunk-2' } };
          yield { delta: { content: ' chunk-3' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const external = buildExternalEngine(gatedMultiChunkConnector, seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-gating"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-gating',
              engine: external as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(capturedProjectedMessages).not.toBeNull();
    });
    const refAtIdle = capturedProjectedMessages!;
    // Decision-A: the idle projection is already a snapshot, not the live array.
    expect(refAtIdle).not.toBe(external.getState().messages);

    // Kick off a streaming turn; let several chunks flow while the stream is
    // still gated (mid-stream).
    let turnP: Promise<void>;
    await act(async () => {
      turnP = external.sendMessage('stream-me');
      // Drain microtasks so the chunks emit + AiChat re-renders per chunk.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    // INVARIANT: the projected messages ref did NOT change during streaming —
    // the clone is gated to the turn boundary, so the probe did not re-render
    // per chunk. Before the fix `cloneMessages(messages)` ran every render,
    // producing a fresh ref per chunk; the probe would then see a new ref here.
    expect(capturedProjectedMessages).toBe(refAtIdle);

    // The engine is genuinely mid-stream (still processing, gated).
    expect(external.getState().isProcessing).toBe(true);

    // Complete the turn → turn boundary → the projection rebuilds with a new ref.
    resolveGate();
    await act(async () => {
      await turnP!;
    });
    await waitFor(() => {
      expect(capturedProjectedMessages).not.toBe(refAtIdle);
    });

    // The rebuilt projection reflects the completed turn's message set.
    expect(capturedProjectedMessages!.length).toBe(external.getState().messages.length);
    expect(capturedProjectedMessages).not.toBe(external.getState().messages);
  });
});
