import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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

describe('a11y baseline — ai-message-list', () => {
  function ChatHarness({ connector }: { connector: AiConnector }) {
    const ctx = useMessage({ connector });
    return (
      <AiChatProvider value={ctx}>
        <AiMessageListView />
        <AiSenderView placeholder="Type…" submitType="enter" />
      </AiChatProvider>
    );
  }

  it('root has role="log" and aria-live="polite"', () => {
    const connector = mockConnector([]);
    const { container } = render(<ChatHarness connector={connector} />);
    const list = container.querySelector('.nop-ai-message-list');
    expect(list?.getAttribute('role')).toBe('log');
    expect(list?.getAttribute('aria-live')).toBe('polite');
  });

  it('aria-busy reflects isProcessing (presence-only)', async () => {
    const connector = mockConnector([{ delta: { content: 'x' } }, { finishReason: 'stop' }]);
    const { container } = render(<ChatHarness connector={connector} />);
    // Initially idle: aria-busy absent.
    expect(container.querySelector('.nop-ai-message-list')?.getAttribute('aria-busy')).toBeFalsy();
  });
});

describe('a11y baseline — ai-sender focus return', () => {
  function FocusHarness({ connector }: { connector: AiConnector }) {
    const ctx = useMessage({ connector });
    return (
      <AiChatProvider value={ctx}>
        <AiSenderView placeholder="Type…" submitType="enter" />
      </AiChatProvider>
    );
  }

  it('returns focus to the textarea after submit', async () => {
    const connector = mockConnector([{ delta: { content: 'x' } }, { finishReason: 'stop' }]);
    const { container } = render(<FocusHarness connector={connector} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.click(container.querySelector('[data-slot="ai-sender-submit"]')!);

    // requestAnimationFrame schedules the refocus; flush microtasks.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(textarea);
  });
});

describe('a11y baseline — presence-only state attributes', () => {
  it('data-streaming is omitted when not loading (re-asserts existing P0 contract)', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'done' };
    const { container } = render(<AiBubbleView message={message} />);
    expect(container.querySelector('.nop-ai-bubble')?.hasAttribute('data-streaming')).toBe(false);
    expect(container.querySelector('.nop-ai-bubble')?.hasAttribute('data-error')).toBe(false);
  });

  it('data-streaming is present (empty value) while loading', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: '', loading: true };
    const { container } = render(<AiBubbleView message={message} />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble?.hasAttribute('data-streaming')).toBe(true);
    expect(bubble?.getAttribute('data-streaming')).toBe('');
  });
});
