import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AiBubbleView } from '../ai-bubble/index.js';
import { AiMessageListView } from '../ai-message-list.js';
import { AiSenderView } from '../ai-sender.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import { useMessage } from '../../adapters/use-message.js';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest, ChatMessage } from '../../engine/types.js';

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

describe('AiBubbleView', () => {
  it('renders the nop-ai-bubble marker with data-role', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'Hello world' };
    const { container } = render(<AiBubbleView message={message} />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble).not.toBeNull();
    expect(bubble?.getAttribute('data-slot')).toBe('ai-bubble');
    expect(bubble?.getAttribute('data-role')).toBe('assistant');
    expect(bubble?.getAttribute('data-placement')).toBe('start');
  });

  it('omits data-streaming when not loading (presence-only)', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'done' };
    const { container } = render(<AiBubbleView message={message} />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble?.hasAttribute('data-streaming')).toBe(false);
  });

  it('emits data-streaming when loading (presence-only, empty value)', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: '', loading: true };
    const { container } = render(<AiBubbleView message={message} />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble?.hasAttribute('data-streaming')).toBe(true);
    expect(bubble?.getAttribute('data-streaming')).toBe('');
  });

  it('renders markdown content as HTML (sanitize reuse)', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: '**bold** _italic_' };
    const { container } = render(<AiBubbleView message={message} />);
    const markdown = container.querySelector('[data-slot="ai-bubble-markdown"]');
    expect(markdown).not.toBeNull();
    // react-markdown renders <strong> for **bold**.
    expect(markdown?.querySelector('strong')?.textContent).toBe('bold');
    expect(markdown?.querySelector('em')?.textContent).toBe('italic');
  });

  it('strips dangerous markup — no <script> element and no onerror handler survive (XSS gate)', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: '<script>alert(1)</script><img src=x onerror=alert(2)>',
    };
    const { container } = render(<AiBubbleView message={message} />);
    // Security guarantee: no executable script element and no inline handler.
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
  });
});

describe('AiMessageListView + AiSenderView inside an ai-chat context', () => {
  function ChatHarness({ connector }: { connector: AiConnector }) {
    const ctx = useMessage({ connector });
    return (
      <AiChatProvider value={ctx}>
        <AiMessageListView />
        <AiSenderView placeholder="Type…" submitType="enter" />
      </AiChatProvider>
    );
  }

  it('renders the nop-ai-message-list marker and shows streamed messages', async () => {
    const connector = mockConnector([
      { delta: { content: 'Hi' } },
      { finishReason: 'stop' },
    ]);
    const { container } = render(<ChatHarness connector={connector} />);
    const list = container.querySelector('.nop-ai-message-list');
    expect(list).not.toBeNull();
    expect(list?.getAttribute('data-slot')).toBe('ai-message-list');

    const input = screen.getByPlaceholderText('Type…') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="ai-sender-submit"]')!);
    });

    // user + assistant bubbles now rendered.
    const bubbles = container.querySelectorAll('.nop-ai-bubble');
    expect(bubbles.length).toBe(2);
    expect(bubbles[0].getAttribute('data-role')).toBe('user');
    expect(bubbles[1].getAttribute('data-role')).toBe('assistant');
    expect(bubbles[1].textContent).toContain('Hi');
  });

  it('sender submit calls engine.sendMessage and clears the input', async () => {
    const connector = mockConnector([{ delta: { content: 'ok' } }, { finishReason: 'stop' }]);
    const sendSpy = vi.fn();
    const wrapper: AiConnector = {
      async stream(req) {
        sendSpy(req.messages);
        return connector.stream(req);
      },
    };
    render(<ChatHarness connector={wrapper} />);
    const input = screen.getByPlaceholderText('Type…') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'ping' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    });
    expect(sendSpy).toHaveBeenCalled();
    // The last message sent to the connector should include the user text.
    const sent = sendSpy.mock.calls[0][0] as ChatMessage[];
    expect(sent.some((m) => m.role === 'user' && m.content === 'ping')).toBe(true);
  });

  it('empty state: list shows data-empty when there are no messages', () => {
    const connector = mockConnector([]);
    const { container } = render(<ChatHarness connector={connector} />);
    const list = container.querySelector('.nop-ai-message-list');
    expect(list?.getAttribute('data-empty')).toBe('');
    expect(container.querySelectorAll('.nop-ai-bubble').length).toBe(0);
  });
});
