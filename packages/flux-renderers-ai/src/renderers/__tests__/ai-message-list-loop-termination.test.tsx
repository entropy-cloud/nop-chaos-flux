import { afterEach, describe, it, expect } from 'vitest';
import { useState, useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import { AiMessageListView } from '../ai-message-list.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  ChatMessageContentPart,
  MessageEngine,
  MessageEngineState,
} from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

function scriptedConnector(rounds: AiConnectorChunk[][]): AiConnector {
  let round = 0;
  return {
    async stream(request: AiConnectorRequest) {
      void request;
      const chunks = rounds[Math.min(round, rounds.length - 1)];
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      return gen();
    },
  };
}

const toolCallChunks = (id: string): AiConnectorChunk[] => [
  {
    delta: {
      tool_calls: [
        { index: 0, id, type: 'function', function: { name: 'loop', arguments: '{}' } },
      ],
    },
  },
  { finishReason: 'tool_calls' },
];

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

describe('ai-message-list — tool-loop-max termination note (R1-F1)', () => {
  it('renders the loop-limit termination note when the last assistant carries toolLoopMaxReached; tool cards stay in terminal state', async () => {
    const connector = scriptedConnector([toolCallChunks('r0'), toolCallChunks('r1')]);
    const engine = createMessageEngine({
      connector,
      toolExecutor: async () => 'ok',
      maxToolRounds: 1,
    });

    const { container } = render(<LiveList engine={engine} />);
    await act(async () => {
      await engine.sendMessage('loop');
    });

    const state = engine.getState();
    expect(state.requestState).toBe('completed');
    // The terminating assistant (last assistant, not the tool tail) carries the marker.
    const lastAssistant = [...state.messages].reverse().find((m) => m.role === 'assistant') as ChatMessage;
    expect(lastAssistant.metadata?.toolLoopMaxReached).toBe(true);

    // R1-F1 render consumption: the termination note is visible.
    const note = container.querySelector('[data-slot="ai-message-list-loop-limit"]');
    expect(note).not.toBeNull();

    // No running-state illusion: the committed tool card renders its terminal
    // status (executeToolCalls committed success), not an infinite spinner.
    const toolCards = container.querySelectorAll('[data-slot="ai-tool-call"]');
    expect(toolCards.length).toBe(1);
    expect(toolCards[0].getAttribute('data-tool-status')).toBe('success');
    expect(container.querySelector('[data-tool-status="running"]')).toBeNull();

    // Not an error state: no error affordance on a completed loop-max turn.
    expect(container.querySelector('[data-slot="ai-bubble-error"]')).toBeNull();
  });

  it('omits the termination note when the last assistant has no marker', async () => {
    const connector = scriptedConnector([toolCallChunks('r0'), [{ delta: { content: 'done' } }, { finishReason: 'stop' }]]);
    const engine = createMessageEngine({
      connector,
      toolExecutor: async () => 'ok',
      maxToolRounds: 8,
    });

    const { container } = render(<LiveList engine={engine} />);
    await act(async () => {
      await engine.sendMessage('loop');
    });

    expect(engine.getState().requestState).toBe('completed');
    expect(container.querySelector('[data-slot="ai-message-list-loop-limit"]')).toBeNull();
  });
});
