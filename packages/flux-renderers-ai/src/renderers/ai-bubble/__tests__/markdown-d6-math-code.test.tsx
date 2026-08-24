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

// ============================================================================
// P1-2 + P1-3 remediation (plan 2026-08-25-0410-1, Phase 2 Decision (b)):
// render-time math delimiter preprocessing between `safeMarkdownSlice` and
// the markdown pipeline. ① Currency disambiguation: an ORIGINAL-text single
// `$` followed by a digit (outside code, not `$$`-run, not `\$`) is escaped
// to a literal dollar — prose with two dollar amounts renders as plain `<p>`
// with no `.katex`. ② Paired delimiter mapping: `\(`/`\)` → `$` and
// `\[`/`\]` → `$$` (left-to-right pairing; orphan closers stay literal), so
// mainstream LLM delimiter forms render as math. Digit-leading formulas
// survive via `$$`-run immunity (pass ①) and via mapping (pass ② never feeds
// generated `$` back into pass ①).
// ============================================================================
describe('MarkdownContentRenderer — P1-2 currency prose is not math', () => {
  it('renders a completed two-amount sentence as a plain paragraph with literal dollars (audit live-probe case)', () => {
    const container = renderMarkdown('The plan costs $5 today and $10 tomorrow.');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(md.querySelector('p')).toBeTruthy();
    expect(container.querySelector('.katex')).toBeNull();
    // Every dollar amount stays visible as literal text.
    expect(md.textContent).toContain('$5');
    expect(md.textContent).toContain('$10');
    expect(md.textContent).toContain('today and');
    expect(md.textContent).toContain('tomorrow.');
  });
});

describe('MarkdownContentRenderer — P1-3 \\( \\) and \\[ \\] render as math', () => {
  it('renders inline \\(...\\) into a .katex element', () => {
    const container = renderMarkdown('Inline \\(E = mc^2\\) formula');
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('renders block \\[...\\] into a .katex-display element', () => {
    const container = renderMarkdown('Intro\n\n\\[\nE = mc^2\n\\]\n\nOutro');
    const display = container.querySelector('.katex-display');
    expect(display).toBeTruthy();
    expect(display!.querySelector('.katex')).toBeTruthy();
  });

  it('digit-leading \\(3 \\times 10^8\\) survives (mapped $ never re-enters the currency pass)', () => {
    const container = renderMarkdown('Speed \\(3 \\times 10^8\\) m/s');
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('digit-leading $$5x + 1$$ survives via $$-run immunity', () => {
    const container = renderMarkdown('Intro\n\n$$5x + 1$$\n\nOutro');
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('keeps \\( and $5 literal inside inline code', () => {
    const container = renderMarkdown('Use `\\(x\\)` and `$5` in code');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(container.querySelector('.katex')).toBeNull();
    expect(md.textContent).toContain('\\(x\\)');
    expect(md.textContent).toContain('$5');
  });

  it('keeps \\( and $5 literal inside a fenced code block', () => {
    const container = renderMarkdown('```bash\necho \\( $5\n```');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(container.querySelector('.katex')).toBeNull();
    expect(md.textContent).toContain('\\( $5');
  });

  it('does not double-escape an already-escaped \\$5', () => {
    const container = renderMarkdown('It costs \\$5 total');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(container.querySelector('.katex')).toBeNull();
    expect(md.textContent).toContain('$5');
    expect(md.textContent).not.toContain('\\$5');
  });

  it('leaves an orphan close delimiter literal (no math, ] visible)', () => {
    const container = renderMarkdown('a \\] b');
    const md = container.querySelector('[data-slot="ai-bubble-markdown"]')!;
    expect(container.querySelector('.katex')).toBeNull();
    // CommonMark consumes the backslash escape, so assert the visible bracket.
    expect(md.textContent).toContain(']');
  });
});
