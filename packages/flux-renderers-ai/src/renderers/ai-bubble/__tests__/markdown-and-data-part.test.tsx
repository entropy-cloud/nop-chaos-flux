import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { AiBubbleView } from '../index.js';
import { clipboardAdapter } from '../renderers/markdown.js';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage, ChatMessageContentPart } from '../../../engine/types.js';

afterEach(() => {
  cleanup();
});

describe('A-3 code block copy button', () => {
  it('renders a copy button on fenced code blocks', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: '```js\nconst x = 1;\n```',
    };
    const { container } = render(<AiBubbleView message={message} />);
    const copyBtn = container.querySelector('[data-slot="ai-bubble-copy-code"]');
    expect(copyBtn).not.toBeNull();
  });

  it('writes the code text to the clipboard when clicked', () => {
    const writeText = vi.fn(() => undefined);
    const original = clipboardAdapter.writeText;
    clipboardAdapter.writeText = writeText;

    try {
      const message: ChatMessage = {
        id: 'm2',
        role: 'assistant',
        content: '```ts\nconst greet = "hi";\n```',
      };
      const { container } = render(<AiBubbleView message={message} />);
      const btn = container.querySelector('[data-slot="ai-bubble-copy-code"]') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      btn.click();
      expect(writeText).toHaveBeenCalled();
      const firstCall = writeText.mock.calls[0] as unknown[] | undefined;
      const copied = (firstCall?.[0] as string | undefined) ?? '';
      expect(copied).toContain('const greet = "hi";');
    } finally {
      clipboardAdapter.writeText = original;
    }
  });

  it('does not render a copy button on inline code', () => {
    const message: ChatMessage = {
      id: 'm3',
      role: 'assistant',
      content: 'use the `foo` function',
    };
    const { container } = render(<AiBubbleView message={message} />);
    const copyBtn = container.querySelector('[data-slot="ai-bubble-copy-code"]');
    expect(copyBtn).toBeNull();
  });

  it('clipboard-write-failed: a rejected write does not flip the button to "Copied"', async () => {
    // Pre-fix the copy path called `setCopied(true)` immediately, so a rejected
    // clipboard write still showed a false "Copied" success.
    const original = clipboardAdapter.writeText;
    clipboardAdapter.writeText = () => Promise.reject(new Error('not allowed'));

    try {
      const message: ChatMessage = {
        id: 'm-clip-fail',
        role: 'assistant',
        content: '```js\nconst z = 2;\n```',
      };
      const { container } = render(<AiBubbleView message={message} />);
      const btn = container.querySelector('[data-slot="ai-bubble-copy-code"]') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      btn.click();

      // Let the rejected promise settle before re-reading.
      await waitFor(() => {
        expect(btn.textContent).toBe(t('flux.ai.copy'));
      });
      // Still showing the copy label, never "Copied".
      expect(btn.textContent).not.toBe(t('flux.ai.copied'));
    } finally {
      clipboardAdapter.writeText = original;
    }
  });
});

describe('A-1 data-${string} content part renderer', () => {
  it('renders a data-sources part with the default renderer', () => {
    const part: ChatMessageContentPart = {
      type: 'data-sources',
      id: 'src-1',
      data: { items: [{ title: 'Docs', url: 'https://example.com' }] },
    };
    const message: ChatMessage = {
      id: 'm4',
      role: 'assistant',
      content: [part],
    };
    const { container } = render(<AiBubbleView message={message} />);
    const dataPart = container.querySelector('[data-slot="ai-bubble-data-part"]');
    expect(dataPart).not.toBeNull();
    expect(dataPart?.getAttribute('data-part-kind')).toBe('sources');
    expect(container.querySelector('[data-slot="ai-bubble-data-part-id"]')?.textContent).toBe('src-1');
    expect(container.querySelector('[data-slot="ai-bubble-data-part-payload"]')?.textContent).toContain(
      'Docs',
    );
  });

  it('host can override the data part renderer via contentRenderers', () => {
    const part: ChatMessageContentPart = {
      type: 'data-events',
      data: { count: 3 },
    };
    const message: ChatMessage = {
      id: 'm5',
      role: 'assistant',
      content: [part],
    };

    const { container } = render(
      <AiBubbleView
        message={message}
        contentRenderers={[
          {
            priority: -2,
            find: (_m, content) =>
              typeof content === 'object' &&
              content !== null &&
              'type' in content &&
              (content as { type: string }).type === 'data-events',
            renderer: function HostRenderer() {
              return <div data-slot="host-data-events">host-rendered</div>;
            },
          },
        ]}
      />,
    );
    // Host renderer wins (lower priority).
    expect(container.querySelector('[data-slot="host-data-events"]')?.textContent).toBe('host-rendered');
    // Default renderer did not run.
    expect(container.querySelector('[data-slot="ai-bubble-data-part"]')).toBeNull();
  });

  it('renders multiple data parts alongside text', () => {
    const message: ChatMessage = {
      id: 'm6',
      role: 'assistant',
      content: [
        { type: 'text', text: 'See sources:' },
        { type: 'data-sources', data: { items: [] } },
      ],
    };
    const { container } = render(<AiBubbleView message={message} />);
    expect(container.querySelector('[data-slot="ai-bubble-markdown"]')?.textContent).toContain(
      'See sources:',
    );
    expect(container.querySelector('[data-slot="ai-bubble-data-part"]')).not.toBeNull();
  });
});
