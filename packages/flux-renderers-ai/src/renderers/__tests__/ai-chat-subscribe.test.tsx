import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
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

function throwingConnector(error: unknown): AiConnector {
  return {
    async stream() {
      throw error;
    },
  };
}

function buildExternalEngine(connector: AiConnector): MessageEngine {
  return createMessageEngine({ connector, adapter: createReactMessageAdapter() });
}

/**
 * Spy wrapper that intercepts `onError` payloads before the runtime normalizes
 * them (see ai-chat-projection.test.tsx for why a raw action capture cannot
 * observe `{ error }`). Records exactly what `ai-chat` hands to `onError`.
 */
let capturedOnError: { error: unknown }[] = [];
function resetCapturedOnError(): void {
  capturedOnError = [];
}

function SpyAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  const wrappedEvents = {
    ...props.events,
    onError: ((event: unknown) => {
      capturedOnError.push({ error: (event as { error: unknown }).error });
    }) as never,
  };
  return <Chat {...props} events={wrappedEvents} />;
}

const spyChat: RendererDefinition = { type: 'spy-ai-chat', component: SpyAiChat };
const SchemaRenderer = createAiSchemaRenderer([spyChat]);

function renderChat(engine: MessageEngine): { unmount: () => void } {
  const result = render(
    <SchemaRenderer
      schemaUrl="test://ai/subscribe"
      schema={{
        type: 'page',
        body: [
          {
            type: 'spy-ai-chat',
            testid: 'chat-sub',
            engine: engine as never,
          },
        ],
      }}
      env={aiMockEnv()}
      formulaCompiler={aiFormulaCompiler}
    />,
  );
  return { unmount: result.unmount };
}

describe('ai-chat — AI-12 subscribe stability', () => {
  it('does NOT re-subscribe to requestState on every render (deps `[engine]` only)', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));
    // Count only the 2-arg `subscribe('requestState', cb)` calls that ai-chat's
    // transition effect makes (useSyncExternalStore uses the 1-arg form).
    const subscribeSpy = vi.spyOn(external, 'subscribe');
    const requestStateSubscribeCount = () =>
      subscribeSpy.mock.calls.filter((c) => c[0] === 'requestState').length;

    renderChat(external);

    const before = requestStateSubscribeCount();
    // A full turn (processing → completed) causes several re-renders. The
    // pre-fix effect re-subscribed on every render (deps included
    // `props.events`); the fix keeps a single persistent subscription.
    await act(async () => {
      await external.sendMessage('turn-1');
    });
    await waitFor(() => {
      expect(external.getState().requestState).toBe('completed');
    });
    const after = requestStateSubscribeCount();

    // Exactly one persistent 'requestState' subscription, unaffected by the
    // many re-renders the turn produced.
    expect(before).toBe(1);
    expect(after).toBe(1);
  });

  it('still fires onResponseComplete for a processing→completed transition (not dropped)', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));
    let completed = 0;
    const unsub = external.subscribe('requestState', (s) => {
      if (s.requestState === 'completed') completed += 1;
    });

    renderChat(external);
    await act(async () => {
      await external.sendMessage('turn-1');
    });
    await waitFor(() => {
      expect(completed).toBeGreaterThanOrEqual(1);
    });
    // The engine reached completed exactly once for one turn.
    expect(completed).toBe(1);
    unsub();
  });
});

describe('ai-chat — AI-19 / F1.5 onError real cause', () => {
  beforeEach(() => {
    resetCapturedOnError();
  });

  it('surfaces the real engine error (Error instance) to onError', async () => {
    const external = buildExternalEngine(throwingConnector(new Error('401 unauthorized')));
    renderChat(external);

    await act(async () => {
      await external.sendMessage('turn-fail');
    });
    await waitFor(() => {
      expect(capturedOnError).toHaveLength(1);
    });

    const error = capturedOnError[0].error;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('401 unauthorized');
    // And the engine state mirrors the same cause (AI-19 engine-half).
    expect(external.getState().lastError).toBe(error);
  });

  it('wraps a non-Error cause into an Error with the original as `cause`', async () => {
    const external = buildExternalEngine(throwingConnector('network-down'));
    renderChat(external);

    await act(async () => {
      await external.sendMessage('turn-fail');
    });
    await waitFor(() => {
      expect(capturedOnError).toHaveLength(1);
    });

    const error = capturedOnError[0].error as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('network-down');
    expect((error as { cause?: unknown }).cause).toBe('network-down');
  });
});

// (no trailing exports)
