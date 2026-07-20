// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from './markdown.js';
import { createMockRendererProps } from './test-support.js';
import type { MarkdownSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

describe('MarkdownRenderer — DD9 remote src fetch', () => {
  it('renders fetched content when src is provided and content is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Hello from remote'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { src: 'https://example.com/doc.md' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);

    await waitFor(() => {
      const root = container.querySelector('[data-slot="markdown"]');
      expect(root?.querySelector('h1')?.textContent).toBe('Hello from remote');
    });

    vi.unstubAllGlobals();
  });

  it('shows error state when fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Not found'));
    vi.stubGlobal('fetch', mockFetch);

    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { src: 'https://example.com/missing.md' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);

    await waitFor(() => {
      const root = container.querySelector('[data-slot="markdown"][data-state="error"]');
      expect(root).toBeTruthy();
    });

    vi.unstubAllGlobals();
  });

  it('prefers inline content over src when both are present', () => {
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '# Inline', src: 'https://example.com/doc.md' },
    });
    const { container } = render(<MarkdownRenderer {...props} />);
    const root = container.querySelector('[data-slot="markdown"]');
    expect(root?.querySelector('h1')?.textContent).toBe('Inline');
  });
});
