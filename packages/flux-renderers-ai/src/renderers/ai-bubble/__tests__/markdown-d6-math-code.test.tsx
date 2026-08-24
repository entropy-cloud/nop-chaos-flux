import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MarkdownContentRenderer } from '../renderers/markdown.js';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

// ============================================================================
// D6 (G5 + G6): LaTeX math rendering (remark-math + rehype-katex) and fenced
// code syntax highlighting (lowlight, `.tok-*` tokens) — public contract of
// the ai-bubble markdown pipeline (roadmap D6 / plan
// 2026-08-24-2237-3-d6-latex-code-highlight.md).
//
// Proof-first: these assertions were landed BEFORE the plugins were wired and
// were red at that point (no `.katex`, no `.tok-*`); Phase 2 wiring turns
// them green.
// ============================================================================

afterEach(() => {
  cleanup();
});

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-md-d6',
    role: 'assistant',
    content: '',
    createdAt: 0,
    metadata: {},
    ...overrides,
  } as ChatMessage;
}

function makeProps(overrides: Partial<BubbleContentRendererProps> = {}): BubbleContentRendererProps {
  return {
    message: makeMessage(),
    content: '',
    contentIndex: 0,
    ...overrides,
  };
}

function renderMarkdown(content: string): HTMLElement {
  const { container } = render(
    <MarkdownContentRenderer {...makeProps({ message: makeMessage({ content }), content })} />,
  );
  return container;
}

describe('MarkdownContentRenderer — D6 LaTeX math rendering (G5)', () => {
  it('renders inline $...$ math into a .katex element', () => {
    const container = renderMarkdown('Inline $E = mc^2$ formula');
    expect(container.querySelector('.katex')).toBeTruthy();
    // KaTeX must own the formula text (source delimiters are consumed).
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(md.textContent).not.toContain('$E = mc^2$');
  });

  it('renders block $$...$$ math into a .katex-display element', () => {
    const container = renderMarkdown('Intro\n\n$$\nE = mc^2\n$$\n\nOutro');
    const display = container.querySelector('.katex-display');
    expect(display).toBeTruthy();
    // The display container wraps a .katex instance.
    expect(display!.querySelector('.katex')).toBeTruthy();
  });

  it('renders an in-band error for syntactically invalid math instead of crashing', () => {
    // math-parse-error failure path: closed but illegal LaTeX renders KaTeX's
    // in-band error (throwOnError:false semantics), the rest of the message
    // still renders.
    const container = renderMarkdown('before $\\frac{$ after');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(md.textContent).toContain('before');
    expect(md.textContent).toContain('after');
  });
});

describe('MarkdownContentRenderer — D6 fenced code highlight (G6)', () => {
  it('renders a registered-language fence into .tok-* token spans', () => {
    const container = renderMarkdown('```ts\nconst answer: number = 42;\n```');
    const code = container.querySelector('[data-slot="ai-bubble-code"]');
    expect(code).toBeTruthy();
    const tokens = code!.querySelectorAll('[class*="tok-"]');
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    // `const` is a keyword scope and `42` a number scope in the common set.
    expect(code!.querySelector('.tok-key, .tok-keyword')).toBeTruthy();
    expect(code!.querySelector('.tok-num, .tok-number')).toBeTruthy();
  });

  it('renders the tsx fence grammar used by the fixture (typescript alias)', () => {
    const container = renderMarkdown('```tsx\nfunction Counter() {\n  const [count] = useState(0);\n}\n```');
    const code = container.querySelector('[data-slot="ai-bubble-code"]');
    expect(code).toBeTruthy();
    expect(code!.querySelectorAll('[class*="tok-"]').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to plain text for an unknown language (no tokens, code intact)', () => {
    const container = renderMarkdown('```notalang\nsome code line\n```');
    const code = container.querySelector('[data-slot="ai-bubble-code"]');
    expect(code).toBeTruthy();
    expect(code!.textContent).toContain('some code line');
    expect(code!.querySelectorAll('[class*="tok-"]').length).toBe(0);
    // The code block itself keeps functioning (A-3 copy button still there).
    expect(container.querySelector('[data-slot="ai-bubble-copy-code"]')).toBeTruthy();
  });
});
