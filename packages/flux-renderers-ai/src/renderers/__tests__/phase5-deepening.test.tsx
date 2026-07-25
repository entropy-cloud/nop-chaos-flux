import { afterEach, describe, it, expect } from 'vitest';
import { useState, useEffect } from 'react';
import { cleanup, render, fireEvent, act, waitFor } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { useAutoScroll } from '../../adapters/use-auto-scroll.js';
import { AiBubbleView } from '../ai-bubble/index.js';
import { MarkdownContentRenderer } from '../ai-bubble/renderers/markdown.js';
import { ReasoningContentRenderer } from '../ai-bubble/renderers/reasoning.js';
import { AiMessageListView } from '../ai-message-list.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  ChatMessageContentPart,
  MessageEngine,
} from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
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

/**
 * Subscribes to the engine and renders AiBubbleView with the fresh snapshot of
 * `messageId`. Mirrors how `ai-message-list` feeds engine snapshots to each
 * bubble — required now that editing state is engine-held (ai-bubble reads
 * `message.state.editing` from its prop).
 */
function LiveBubble({ engine, messageId }: { engine: MessageEngine; messageId: string }) {
  const [msg, setMsg] = useState<ChatMessage | undefined>(() =>
    engine.getState().messages.find((m) => m.id === messageId),
  );
  useEffect(() => {
    const sync = (): void => {
      setMsg(engine.getState().messages.find((m) => m.id === messageId));
    };
    sync();
    return engine.subscribe(sync);
  }, [engine, messageId]);
  if (!msg) return null;
  return <AiBubbleView message={msg} />;
}

function setDims(el: HTMLElement, dims: { scrollHeight: number; clientHeight: number; scrollTop?: number }) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: dims.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: dims.clientHeight });
  if (dims.scrollTop !== undefined) el.scrollTop = dims.scrollTop;
}

// ============ A-9: useAutoScroll host-utility contract ============

describe('A-9 useAutoScroll contract', () => {
  function Probe({ trigger }: { trigger: unknown }) {
    const { containerRef, onScroll, isAtBottom } = useAutoScroll(trigger);
    // `onScroll` only mutates a ref, so force a re-render to read the new state.
    const [, force] = useState(0);
    return (
      <div
        ref={containerRef}
        data-testid="scroll"
        onScroll={() => {
          onScroll();
          force((x) => x + 1);
        }}
        data-at-bottom={isAtBottom() ? 'true' : 'false'}
      />
    );
  }

  it('reports isAtBottom=true initially and after scrolling back to bottom', () => {
    const { container } = render(<Probe trigger={1} />);
    const el = container.querySelector('[data-testid="scroll"]') as HTMLDivElement;
    setDims(el, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 }); // distance 0
    fireEvent.scroll(el);
    expect(el.getAttribute('data-at-bottom')).toBe('true');
  });

  it('pauses (isAtBottom=false) when the user scrolls up beyond threshold', () => {
    const { container } = render(<Probe trigger={1} />);
    const el = container.querySelector('[data-testid="scroll"]') as HTMLDivElement;
    setDims(el, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 }); // distance 600 > 80
    fireEvent.scroll(el);
    expect(el.getAttribute('data-at-bottom')).toBe('false');
  });

  it('resumes when scrolling returns near the bottom', () => {
    const { container } = render(<Probe trigger={1} />);
    const el = container.querySelector('[data-testid="scroll"]') as HTMLDivElement;
    setDims(el, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });
    fireEvent.scroll(el);
    expect(el.getAttribute('data-at-bottom')).toBe('false');
    el.scrollTop = 590; // distance 10010-590 ... 1000-590-400 = 10 < 80
    fireEvent.scroll(el);
    expect(el.getAttribute('data-at-bottom')).toBe('true');
  });
});

// ============ A-10: reasoning duration ============

describe('A-10 reasoning duration', () => {
  it('shows "Thought for Xs" using thinking-plugin timing when not streaming', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: '',
      reasoning_content: 'Because of X',
      loading: false,
      state: { thinking: { open: false, startedAt: 1000, endedAt: 3500 } },
    };
    const { container } = render(<ReasoningContentRenderer message={message} content="" contentIndex={0} />);
    // 2500ms -> round(2.5) = 3s (en-US: "Thought for 3s")
    expect(container.textContent).toContain('Thought for 3s');
  });

  it('shows the streaming label while loading', () => {
    const message: ChatMessage = {
      id: 'm2',
      role: 'assistant',
      content: '',
      reasoning_content: 'thinking...',
      loading: true,
      state: { thinking: { open: false, startedAt: 1000, endedAt: 1100 } },
    };
    const { container } = render(<ReasoningContentRenderer message={message} content="" contentIndex={0} />);
    expect(container.textContent?.toLowerCase()).toContain('thinking');
  });
});

// ============ A-11: streaming cursor ============

describe('A-11 streaming cursor', () => {
  it('appends the cursor when the message is streaming', () => {
    const message: ChatMessage = { id: 'm', role: 'assistant', content: 'hello', loading: true };
    const { container } = render(<MarkdownContentRenderer message={message} content="hello" contentIndex={0} />);
    expect(container.querySelector('[data-slot="ai-bubble-cursor"]')).not.toBeNull();
  });

  it('omits the cursor once loading completes', () => {
    const message: ChatMessage = { id: 'm', role: 'assistant', content: 'hello', loading: false };
    const { container } = render(<MarkdownContentRenderer message={message} content="hello" contentIndex={0} />);
    expect(container.querySelector('[data-slot="ai-bubble-cursor"]')).toBeNull();
  });
});

// ============ §4.7 message editing: edit -> resubmit truncates + resends ============

describe('§4.7 message editing', () => {
  it('renders the edit toggle only for user messages inside an ai-chat', () => {
    const user: ChatMessage = { id: 'u1', role: 'user', content: 'hi' };
    const asst: ChatMessage = { id: 'a1', role: 'assistant', content: 'hello back' };
    const engine = createMessageEngine({
      connector: mockConnector([{ finishReason: 'stop' }]),
      initialMessages: [user, asst],
    });
    const state = engine.getState();
    const ctx = {
      engine,
      messages: state.messages,
      requestState: state.requestState,
      isProcessing: state.isProcessing,
      sendMessage: (content: string | ChatMessageContentPart[]) => engine.sendMessage(content),
      abortRequest: () => engine.abort(),
    };
    const userView = render(
      <AiChatProvider value={ctx}>
        <AiBubbleView message={user} />
      </AiChatProvider>,
    );
    expect(userView.container.querySelector('[data-slot="ai-bubble-edit-toggle"]')).not.toBeNull();

    const asstView = render(
      <AiChatProvider value={ctx}>
        <AiBubbleView message={asst} />
      </AiChatProvider>,
    );
    expect(asstView.container.querySelector('[data-slot="ai-bubble-edit-toggle"]')).toBeNull();
  });

  it('resubmit truncates the conversation at the edited message and re-sends', async () => {
    const chunks: AiConnectorChunk[] = [{ delta: { content: 'new reply' } }, { finishReason: 'stop' }];
    const user: ChatMessage = { id: 'u1', role: 'user', content: 'original' };
    const asst: ChatMessage = { id: 'a1', role: 'assistant', content: 'old reply' };
    const engine = createMessageEngine({
      connector: mockConnector(chunks),
      initialMessages: [user, asst],
    });
    const state = engine.getState();
    const ctx = {
      engine,
      messages: state.messages,
      requestState: state.requestState,
      isProcessing: state.isProcessing,
      sendMessage: (content: string | ChatMessageContentPart[]) => engine.sendMessage(content),
      abortRequest: () => engine.abort(),
    };

    const { container } = render(
      <AiChatProvider value={ctx}>
        <LiveBubble engine={engine} messageId="u1" />
      </AiChatProvider>,
    );

    // open edit
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-toggle"]')!);
    });
    const input = container.querySelector('[data-slot="ai-bubble-edit-input"]') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'edited prompt' } });

    // resubmit
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="ai-bubble-edit-submit"]')!);
    });

    // The turn completes: a new user message + regenerated assistant reply.
    await waitFor(() => {
      const msgs = engine.getMessages();
      expect(msgs.some((m) => m.role === 'user' && m.content === 'edited prompt')).toBe(true);
      expect(msgs.some((m) => m.content === 'original')).toBe(false);
      expect(msgs.some((m) => m.content === 'old reply')).toBe(false);
    });
  });
});

// ============ A-8: virtual scroll threshold switching ============

describe('A-8 virtual scroll threshold', () => {
  function makeMessages(n: number): ChatMessage[] {
    return Array.from({ length: n }, (_, i) => ({ id: `m-${i}`, role: 'user', content: `msg ${i}` }));
  }

  function renderList(n: number) {
    const engine = createMessageEngine({
      connector: mockConnector([{ finishReason: 'stop' }]),
      initialMessages: makeMessages(n),
    });
    const state = engine.getState();
    return render(
      <AiChatProvider
        value={{
          engine,
          messages: state.messages,
          requestState: state.requestState,
          isProcessing: state.isProcessing,
          sendMessage: () => Promise.resolve(),
          abortRequest: () => Promise.resolve(),
        }}
      >
        <AiMessageListView />
      </AiChatProvider>,
    );
  }

  it('renders flat (no data-virtual) below the threshold', () => {
    const { container } = renderList(10);
    const list = container.querySelector('[data-slot="ai-message-list"]') as HTMLDivElement;
    expect(list.hasAttribute('data-virtual')).toBe(false);
    expect(container.querySelectorAll('[data-slot="ai-bubble"]').length).toBe(10);
  });

  it('enables virtual rendering (data-virtual) above the threshold', () => {
    const { container } = renderList(250);
    const list = container.querySelector('[data-slot="ai-message-list"]') as HTMLDivElement;
    expect(list.hasAttribute('data-virtual')).toBe(true);
    // The virtualizer mounts a positioned spacer container.
    expect(container.querySelector('[data-slot="ai-message-list"] > div')).not.toBeNull();
  });
});
