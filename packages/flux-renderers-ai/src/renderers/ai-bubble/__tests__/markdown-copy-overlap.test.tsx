import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MarkdownContentRenderer } from '../renderers/markdown.js';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

afterEach(() => {
  cleanup();
});

function makeProps(content: string): BubbleContentRendererProps {
  const message: ChatMessage = {
    id: 'm-md-copy',
    role: 'assistant',
    content,
    metadata: { createdAt: 0 },
  };
  return {
    message,
    content,
    contentIndex: 0,
  } as BubbleContentRendererProps;
}

/**
 * [G5-R5-视角8-01] the copy button floats over the code block's first line —
 * the block must reserve the button row (top padding) and the button must
 * carry an opaque chip so code scrolling underneath stays legible.
 */
describe('[G5-R5-视角8-01] markdown code copy button does not sit on the first line', () => {
  it('reserves the button row on the code block and chips the button', () => {
    const { container } = render(
      <MarkdownContentRenderer {...makeProps('```js\nconst x = 1;\n```')} />,
    );

    const code = container.querySelector('[data-slot="ai-bubble-code"]') as HTMLElement;
    expect(code).toBeTruthy();
    // pt-8 (32px) = button top-1 (4px) + button h-7 (28px)
    expect(code.className).toContain('pt-8');

    const copyBtn = container.querySelector('[data-slot="ai-bubble-copy-code"]') as HTMLElement;
    expect(copyBtn).toBeTruthy();
    // opaque background chip (bg-background/90) instead of the transparent ghost
    expect(copyBtn.className).toContain('bg-background/90');
  });
});
