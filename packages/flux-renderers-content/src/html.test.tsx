// DOMPurify needs a spec-compliant DOM; html always runs it, so use jsdom here.
// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HtmlRenderer } from './html.js';
import { createMockRendererProps } from './test-support.js';
import type { HtmlSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="html"]') as HTMLElement;
}

describe('HtmlRenderer — controlled HTML with sanitize gate', () => {
  it('strips <script> tags by default (sanitize on)', () => {
    const props = createMockRendererProps<HtmlSchema>({
      schema: { type: 'html' },
      props: { content: '<script>alert(1)</script><b>safe</b>' },
    });
    const { container } = render(<HtmlRenderer {...props} />);
    const root = rootOf(container);
    expect(root.innerHTML.toLowerCase()).not.toContain('<script');
    expect(root.innerHTML.toLowerCase()).not.toContain('alert');
    expect(root.querySelector('b')?.textContent).toBe('safe');
    expect(root.querySelector('script')).toBeNull();
  });

  it('strips inline event handlers like onerror', () => {
    const props = createMockRendererProps<HtmlSchema>({
      schema: { type: 'html' },
      props: { content: '<img src="x.png" onerror="alert(1)">' },
    });
    const { container } = render(<HtmlRenderer {...props} />);
    const img = rootOf(container).querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('onerror')).toBeNull();
    expect(img.getAttribute('src')).toBe('x.png');
    expect(rootOf(container).innerHTML.toLowerCase()).not.toContain('alert');
  });

  it('cleans javascript: URIs', () => {
    const props = createMockRendererProps<HtmlSchema>({
      schema: { type: 'html' },
      props: { content: '<a href="javascript:alert(1)">click</a>' },
    });
    const { container } = render(<HtmlRenderer {...props} />);
    const a = rootOf(container).querySelector('a') as HTMLAnchorElement;
    expect(a).toBeTruthy();
    expect((a.getAttribute('href') || '').toLowerCase()).not.toContain('javascript:');
    expect(a.textContent).toBe('click');
  });

  it('passes content through unchanged when sanitize is explicitly false (trusted)', () => {
    const props = createMockRendererProps<HtmlSchema>({
      schema: { type: 'html' },
      props: { content: '<script>alert(1)</script><b>raw</b>', sanitize: false },
    });
    const { container } = render(<HtmlRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-trusted')).toBe('true');
    expect(root.innerHTML).toBe('<script>alert(1)</script><b>raw</b>');
    expect(root.querySelector('script')).toBeTruthy();
  });

  it('renders the empty state when content is empty', () => {
    const props = createMockRendererProps<HtmlSchema>({
      schema: { type: 'html' },
      props: { content: '', empty: 'Nothing here' },
    });
    const { container } = render(<HtmlRenderer {...props} />);
    const root = rootOf(container);
    expect(root.getAttribute('data-state')).toBe('empty');
    expect(root.textContent).toBe('Nothing here');
  });
});
