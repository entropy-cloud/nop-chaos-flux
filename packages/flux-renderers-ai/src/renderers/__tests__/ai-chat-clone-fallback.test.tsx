import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { aiFormulaCompiler, aiMockEnv, createAiSchemaRenderer } from '../../ai-test-support.js';
import { AiChatRenderer } from '../ai-chat.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type { AiChatSchema } from '../../schemas.js';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest, ChatMessage, MessageEngine } from '../../engine/types.js';

/**
 * open-audit P2-5 (plan 2026-08-10-1606-3): `cloneMessages`/`cloneMessage`
 * only fell back to a shallow copy when `structuredClone` was MISSING. A host
 * writing a non-cloneable value (function / symbol / DOM node) into
 * `metadata` / `data-*` parts made `structuredClone` THROW `DataCloneError`
 * with no degradation — every boundary render crashed the whole tree.
 */

let capturedOnComplete: { message: ChatMessage }[] = [];
function resetCapturedOnComplete(): void {
  capturedOnComplete = [];
}

function SpyAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  const wrappedEvents = {
    ...props.events,
    onResponseComplete: ((event: unknown) => {
      capturedOnComplete.push({ message: (event as { message: ChatMessage }).message });
    }) as never,
  };
  return <Chat {...props} events={wrappedEvents} />;
}

const spyChat: RendererDefinition = { type: 'spy-ai-chat', component: SpyAiChat };
const SchemaRenderer = createAiSchemaRenderer([spyChat]);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

describe('P2-5 — clone fallback: uncloneable host values must not crash (DataCloneError)', () => {
  it('rendering a chat whose engine messages carry a function in metadata does not throw (projection clone degrades to shallow copy)', async () => {
    const uncloneable = (): undefined => undefined;
    const seedMessages: ChatMessage[] = [
      { id: 'seed-user', role: 'user', content: 'hi', metadata: { fn: uncloneable } },
    ];
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);

    // Pre-fix: the projection's structuredClone throws DataCloneError during
    // render → the whole tree crashes. Post-fix: shallow-copy fallback.
    let renderError: unknown = null;
    try {
      render(
        <SchemaRenderer
          schemaUrl="test://ai/clone-fallback-render"
          schema={{
            type: 'page',
            body: [{ type: 'ai-chat', testid: 'chat-clone-render', engine: external as never }],
          }}
          env={aiMockEnv()}
          formulaCompiler={aiFormulaCompiler}
        />,
      );
    } catch (error) {
      renderError = error;
    }
    expect(renderError).toBeNull();

    await waitFor(() => {
      expect(document.querySelector('[data-slot="ai-chat-root"]')).not.toBeNull();
    });
    // The conversation still renders (no crash, no vacuous empty tree).
    expect(external.getState().messages.length).toBe(1);
  });

  it('a turn whose assistant metadata carries a function completes without an uncloneable crash in the onResponseComplete handoff', async () => {
    const uncloneable = (): undefined => undefined;
    const fnMetadataChunks: AiConnectorChunk[] = [
      { delta: { content: 'Reply' } },
      { finishReason: 'stop', metadata: { fn: uncloneable } },
    ];
    const external = buildExternalEngine(mockConnector(fnMetadataChunks));

    render(
      <SchemaRenderer
        schemaUrl="test://ai/clone-fallback-complete"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-clone-complete',
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

    const textarea = document.querySelector('[data-slot="ai-sender-input"] textarea') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-1' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });

    // Pre-fix: cloneMessage(last) throws inside the requestState subscribe
    // callback → unhandled rejection / broken notify chain → onResponseComplete
    // never arrives. Post-fix: the snapshot handoff degrades to a shallow copy
    // and the event fires.
    await waitFor(() => {
      expect(capturedOnComplete).toHaveLength(1);
    });
    const delivered = capturedOnComplete[0].message;
    expect(delivered.content).toBe('Reply');
    expect((delivered.metadata as { fn?: unknown }).fn).toBe(uncloneable);
  });
});
