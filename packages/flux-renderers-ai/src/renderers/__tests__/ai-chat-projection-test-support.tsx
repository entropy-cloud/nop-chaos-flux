import { useEffect } from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { createAiSchemaRenderer } from '../../ai-test-support.js';
import { AiChatRenderer } from '../ai-chat.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type { AiChatSchema } from '../../schemas.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  MessageEngine,
} from '../../engine/types.js';

/**
 * Shared harness for the ai-chat Decision-A projection suites. Extracted from
 * `ai-chat-projection.test.tsx` (check:oversized-code-files split, 2026-08-11)
 * following the `use-conversation-test-helpers.js` precedent. Each test file
 * imports its own module instance (vitest per-file module isolation), so the
 * module-level holders never leak across files; every file MUST reset them in
 * afterEach.
 */

/**
 * Probe that captures the projected `ai` host-scope messages array so a test
 * can mutate the captured reference and assert the engine internal array is
 * unaffected (Decision-A, AI-02).
 */
let capturedProjectedMessages: ChatMessage[] | null = null;
export function resetCapturedProjectedMessages(): void {
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

export const messagesProbe: RendererDefinition = {
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
export function resetCapturedOnComplete(): void {
  capturedOnComplete = [];
}
export function readCapturedOnComplete(): { message: ChatMessage }[] {
  return capturedOnComplete;
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

export const spyChat: RendererDefinition = {
  type: 'spy-ai-chat',
  component: SpyAiChat,
};

export const SchemaRenderer = createAiSchemaRenderer([messagesProbe, spyChat]);

export function mockConnector(chunks: AiConnectorChunk[]): AiConnector {
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

export const replyChunks: AiConnectorChunk[] = [
  { delta: { content: 'Reply' } },
  { finishReason: 'stop' },
];

export function buildExternalEngine(connector: AiConnector, initialMessages?: ChatMessage[]): MessageEngine {
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

export const seedMessages: ChatMessage[] = [
  { id: 'seed-user', role: 'user', content: 'seed-hello' },
  { id: 'seed-assistant', role: 'assistant', content: 'seed-reply' },
];

export function readCapturedProjectedMessages(): ChatMessage[] | null {
  return capturedProjectedMessages;
}
