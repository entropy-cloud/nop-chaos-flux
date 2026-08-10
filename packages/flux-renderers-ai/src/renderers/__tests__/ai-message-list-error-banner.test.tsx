import { afterEach, describe, it, expect } from 'vitest';
import { useState, useEffect } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import { AiMessageListView } from '../ai-message-list.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessageContentPart,
  MessageEngine,
  MessageEngineState,
} from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

/**
 * Connector that fails (401) on the first stream call, then serves a normal
 * reply on the second — lets the test assert that clicking the banner's retry
 * entry starts a NEW turn that can succeed.
 */
function failOnceThenSucceedConnector(): AiConnector {
  let calls = 0;
  return {
    async stream(request: AiConnectorRequest) {
      void request;
      calls += 1;
      if (calls === 1) {
        throw new Error('401 Unauthorized');
      }
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        yield { delta: { content: 'recovered' } };
        yield { finishReason: 'stop' };
      }
      return gen();
    },
  };
}

/**
 * Live list harness: subscribes to the engine and re-renders `AiMessageListView`
 * with a fresh context snapshot on every engine notify — the production path
 * (`useMessage` → `useEngineView`) feeds the same shape to the list.
 */
function LiveList({ engine }: { engine: MessageEngine }) {
  const [state, setState] = useState<MessageEngineState>(() => engine.getState());
  useEffect(() => engine.subscribe(() => setState(engine.getState())), [engine]);
  const ctx = {
    engine,
    messages: state.messages,
    requestState: state.requestState,
    processingState: state.processingState,
    isProcessing: state.isProcessing,
    sendMessage: (content: string | ChatMessageContentPart[]) => engine.sendMessage(content),
    abortRequest: () => engine.abort(),
  };
  return (
    <AiChatProvider value={ctx}>
      <AiMessageListView autoScroll={false} />
    </AiChatProvider>
  );
}

describe('ai-message-list — A-5 error carrier for dropped-residue failed turns (FIND-03)', () => {
  it('zero-chunk failed turn (connector 401): renders the list-level error banner with a retry entry', async () => {
    const engine = createMessageEngine({ connector: failOnceThenSucceedConnector() });
    const { container } = render(<LiveList engine={engine} />);

    await act(async () => {
      await engine.sendMessage('hello');
    });

    const state = engine.getState();
    expect(state.requestState).toBe('error');
    // Invariant ⑩: the zero-chunk failed turn dropped the empty assistant —
    // only the user message remains, so the bubble-level error binding
    // (last message assistant) can never fire.
    expect(state.messages.map((m) => m.role)).toEqual(['user']);
    expect(container.querySelector('[data-slot="ai-bubble-error"]')).toBeNull();

    // FIND-03: the list-level banner is the A-5 carrier for this surface.
    const banner = container.querySelector('[data-slot="ai-message-list-error"]');
    expect(banner).not.toBeNull();
    const retry = container.querySelector('[data-slot="ai-message-list-error-retry"]') as HTMLButtonElement;
    expect(retry).not.toBeNull();

    // Clicking retry re-sends the last user text and a NEW turn succeeds.
    await act(async () => {
      retry.click();
    });
    await waitFor(() => {
      expect(engine.getState().requestState).toBe('completed');
    });
    expect(engine.getState().messages.some((m) => m.role === 'assistant' && m.content === 'recovered')).toBe(true);
    // The banner disappears once the turn recovered.
    expect(container.querySelector('[data-slot="ai-message-list-error"]')).toBeNull();
  });

  it('onBeforeRequest rejection (plugin): same dropped-residue surface renders the list-level banner', async () => {
    const engine = createMessageEngine({
      connector: {
        async stream() {
          async function* gen(): AsyncGenerator<AiConnectorChunk> {
            yield { delta: { content: 'never' } };
          }
          return gen();
        },
      },
    });
    engine.registerPlugin({
      name: 'before-throws',
      onBeforeRequest: async () => {
        throw new Error('before-boom');
      },
    });
    const { container } = render(<LiveList engine={engine} />);

    await act(async () => {
      await engine.sendMessage('hi');
    });

    expect(engine.getState().requestState).toBe('error');
    expect(container.querySelector('[data-slot="ai-message-list-error"]')).not.toBeNull();
  });

  it('partial-content failure (last message IS assistant): bubble error wins, no list-level banner', async () => {
    // Connector streams one chunk then throws — the partial assistant stays
    // committed, so the bubble-level error binding fires and the list banner
    // must NOT double-render.
    const engine = createMessageEngine({
      connector: {
        async stream() {
          async function* gen(): AsyncGenerator<AiConnectorChunk> {
            yield { delta: { content: 'partial' } };
            throw new Error('mid-stream-boom');
          }
          return gen();
        },
      },
    });
    const { container } = render(<LiveList engine={engine} />);

    await act(async () => {
      await engine.sendMessage('hi');
    });

    const state = engine.getState();
    expect(state.requestState).toBe('error');
    expect(state.messages.at(-1)?.role).toBe('assistant');
    expect(container.querySelector('[data-slot="ai-message-list-error"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble-error"]')).not.toBeNull();
  });

  it('aborted turn: no error banner (abort is not an error state)', async () => {
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const engine = createMessageEngine({
      connector: {
        async stream() {
          async function* gen(): AsyncGenerator<AiConnectorChunk> {
            await gate;
            yield { delta: { content: 'late' } };
          }
          return gen();
        },
      },
    });
    const { container } = render(<LiveList engine={engine} />);

    const turn = engine.sendMessage('hi');
    await Promise.resolve();
    await act(async () => {
      await engine.abort();
    });
    resolveGate();
    await turn;

    expect(engine.getState().requestState).toBe('aborted');
    expect(container.querySelector('[data-slot="ai-message-list-error"]')).toBeNull();
  });
});
