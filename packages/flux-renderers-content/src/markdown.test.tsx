// jsdom: the allowHtml:true path runs DOMPurify, and react-markdown needs a DOM.
// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './markdown.js';
import { createMockRendererProps } from './test-support.js';
import type { MarkdownSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="markdown"]') as HTMLElement;
}

describe('MarkdownRenderer — allowHtml gate + GFM', () => {
  it('renders headings and lists from markdown', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '## Title\n\n- one\n- two' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    const root = rootOf(container);
    expect(root.querySelector('h2')?.textContent).toBe('Title');
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  it('renders GFM tables via remark-gfm', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '| a | b |\n| --- | --- |\n| 1 | 2 |' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    expect(rootOf(container).querySelector('table')).toBeTruthy();
    expect(rootOf(container).querySelectorAll('td').length).toBe(2);
  });

  it('does not render embedded HTML as elements when allowHtml is false (default)', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '<b>raw</b>' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    const root = rootOf(container);
    // no <b> element is produced
    expect(root.querySelector('b')).toBeNull();
    // the literal text survives
    expect(root.textContent).toContain('raw');
  });

  it('renders safe embedded HTML but strips <script> when allowHtml is true', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: {
        content: '## H\n\n<b>bold</b><script>alert(1)</script>',
        allowHtml: true,
      },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-allow-html')).toBe('true');
    expect(root.querySelector('h2')).toBeTruthy();
    expect(root.querySelector('b')?.textContent).toBe('bold');
    expect(root.querySelector('script')).toBeNull();
    expect(root.innerHTML.toLowerCase()).not.toContain('alert');
  });

  it('renders the empty state when content is empty', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '', empty: 'No content' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-state')).toBe('empty');
    expect(root.textContent).toBe('No content');
  });
});
