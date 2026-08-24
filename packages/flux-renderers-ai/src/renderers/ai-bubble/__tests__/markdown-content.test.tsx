import { readFileSync } from 'node:fs';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { t } from '@nop-chaos/flux-i18n';
import { MarkdownContentRenderer } from '../renderers/markdown.js';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

afterEach(() => {
  cleanup();
});

// ============================================================================
// 2-20: code-block copy reset timer must be cleared on unmount (no setState
// after unmount). Same class of leak as ai-feedback's copied-reset timer.
// ============================================================================
describe('MarkdownContentRenderer — code copy reset timer cleanup (2-20)', () => {
  it('clears the copied-reset timer on unmount', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      const message = makeMessage({ content: '```js\nconst x = 1;\n```' });
      const { container, unmount } = render(
        <MarkdownContentRenderer {...makeProps({ message, content: message.content })} />,
      );
      const copyBtn = container.querySelector('[data-slot="ai-bubble-copy-code"]') as HTMLElement;
      expect(copyBtn).toBeTruthy();

      fireEvent.click(copyBtn);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(copyBtn.textContent).toBe(t('flux.ai.copied'));

      // Unmount must clear the pending 1500ms reset timer.
      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advancing past the reset window after unmount must not throw.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    } finally {
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-md',
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

// ============================================================================
// 2151 P2 test hardening — safeMarkdownSlice wiring (design.md §10.4 path C).
//
// `markdown.tsx` runs the raw content through `safeMarkdownSlice` before
// handing it to react-markdown. If that call is removed, an unclosed code
// fence in a streaming chunk would be rendered as an open `<pre><code>` block
// leaking the held-back body. `safeMarkdownSlice` itself is unit-tested in
// `markdown-buffer.test.ts`; these tests prove the renderer is actually wired
// to it (cross-layer proof).
// ============================================================================
describe('MarkdownContentRenderer — safeMarkdownSlice wiring', () => {
  it('holds back an unclosed ``` code fence (held-back body absent from DOM)', () => {
    // Raw content with an unclosed fence. safeMarkdownSlice cuts at the fence
    // start, so only `intro` reaches react-markdown. If the wiring is removed,
    // the entire string is parsed and `would-leak-as-code` lands inside a
    // `<pre><code>` block (turning this test red).
    const message = makeMessage({ content: 'intro\n```\nwould-leak-as-code\nstill-open' });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: message.content })} />,
    );
    const markdown = container.querySelector('[data-slot="ai-bubble-markdown"]');
    expect(markdown).toBeTruthy();
    expect(markdown!.textContent).toContain('intro');
    expect(markdown!.textContent).not.toContain('would-leak-as-code');
    expect(markdown!.textContent).not.toContain('still-open');
    // No code block rendered (the fence was held back rather than closed).
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('code')).toBeNull();
    // End-to-end: safeMarkdownSlice output is valid inline content rendered as <p>.
    expect(markdown!.innerHTML).toContain('<p>');
  });

  it('holds back an unclosed ~~~ fence', () => {
    const message = makeMessage({ content: 'lead-in\n~~~\nwould-leak-tilde' });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: message.content })} />,
    );
    const markdown = container.querySelector('[data-slot="ai-bubble-markdown"]');
    expect(markdown).toBeTruthy();
    expect(markdown!.innerHTML).toContain('<p>');
    expect(markdown!.textContent).toContain('lead-in');
    expect(markdown!.textContent).not.toContain('would-leak-tilde');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders a balanced fence end-to-end (control: wiring does not over-trim)', () => {
    const message = makeMessage({ content: 'before\n```js\nconst x = 1;\n```\nafter' });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: message.content })} />,
    );
    const markdown = container.querySelector('[data-slot="ai-bubble-markdown"]');
    expect(markdown).toBeTruthy();
    expect(markdown!.innerHTML).toContain('<p>');
    expect(markdown!.textContent).toContain('before');
    expect(markdown!.textContent).toContain('const x = 1;');
    expect(markdown!.textContent).toContain('after');
    // A balanced fence renders a code block (copy button present).
    expect(container.querySelector('[data-slot="ai-bubble-copy-code"]')).toBeTruthy();
  });
});

// ============================================================================
// 2151 P2 test hardening — rehype-raw XSS regression (design.md §5.2 / §10.4).
//
// `markdown.tsx` runs `sanitizeHtml` (DOMPurify) on the source BEFORE
// react-markdown + rehype-raw parse it. The high-risk path is `rehype-raw`
// (it renders raw HTML embedded in markdown). These tests construct XSS
// payloads covering (a) raw-HTML vectors and (b) markdown-syntax vectors
// whose dangerous hrefs are NOT seen by DOMPurify (they are plain text
// pre-parse) and rely on react-markdown's `urlTransform` instead.
//
// **If any payload escapes sanitize + urlTransform**: the corresponding
// assertion fails, proving a real XSS hole. Per plan
// `2026-07-25-0117-2` Failure Path `xss-regression`, a confirmed escape is
// upgraded to a new P1 finding in `docs/bugs/` — the source is NOT patched
// in this plan; this test exists to catch regressions.
// ============================================================================
describe('MarkdownContentRenderer — rehype-raw XSS regression', () => {
  function collectDangerousAttrs(container: HTMLElement): {
    onAttrs: string[];
    jsHrefs: string[];
    scripts: number;
  } {
    const onAttrs: string[] = [];
    const jsHrefs: string[] = [];
    // React itself blocks `javascript:` URLs at render time, replacing the
    // value with `javascript:throw new Error('React has blocked a javascript:
    // URL as a security precaution.')`. That placeholder is SAFE (it throws
    // on navigation rather than executing the attacker's payload) and is a
    // defense-in-depth success, not a hole — so we exclude it. A real escape
    // leaves the attacker's payload (e.g. `alert(`) intact in the attribute.
    const REACT_PLACEHOLDER = /React has blocked a javascript: URL/i;
    container.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) onAttrs.push(`${el.tagName}.${attr.name}="${attr.value}"`);
        if ((attr.name === 'href' || attr.name === 'src' || attr.name === 'xlink:href') &&
            /javascript:/i.test(attr.value) &&
            !REACT_PLACEHOLDER.test(attr.value)) {
          jsHrefs.push(`${el.tagName}[${attr.name}]="${attr.value}"`);
        }
      }
    });
    return { onAttrs, jsHrefs, scripts: container.querySelectorAll('script').length };
  }

  it('strips inline event handlers from raw <img onerror=…>', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const message = makeMessage({ content: payload });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: payload })} />,
    );
    const { onAttrs, jsHrefs, scripts } = collectDangerousAttrs(container);
    expect(onAttrs).toEqual([]);
    expect(jsHrefs).toEqual([]);
    expect(scripts).toBe(0);
  });

  it('strips <script>…</script> blocks entirely', () => {
    const payload = '<script>alert("xss")</script><p>after</p>';
    const message = makeMessage({ content: payload });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: payload })} />,
    );
    const { onAttrs, jsHrefs, scripts } = collectDangerousAttrs(container);
    expect(scripts).toBe(0);
    expect(onAttrs).toEqual([]);
    expect(jsHrefs).toEqual([]);
    // The script body never reaches the DOM as text either.
    expect(container.textContent).not.toContain('alert("xss")');
  });

  it('neutralizes a raw <a href="javascript:…"> link', () => {
    const payload = '<a href="javascript:alert(1)">click me</a>';
    const message = makeMessage({ content: payload });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: payload })} />,
    );
    const { onAttrs, jsHrefs, scripts } = collectDangerousAttrs(container);
    expect(jsHrefs).toEqual([]);
    expect(onAttrs).toEqual([]);
    expect(scripts).toBe(0);
    // The link text is preserved, but no executable href remains.
    expect(container.textContent).toContain('click me');
    const anchor = container.querySelector('a');
    if (anchor) {
      const href = anchor.getAttribute('href') ?? '';
      expect(/javascript:/i.test(href)).toBe(false);
    }
  });

  it('neutralizes a markdown-syntax [click](javascript:…) link (urlTransform gate)', () => {
    // This vector is NOT covered by sanitizeHtml: the bracket form is plain
    // text pre-parse, so DOMPurify sees no HTML to strip. The gate is
    // react-markdown's default `urlTransform` (allowlist:
    // https?|ircs?|mailto|xmpp). If that gate is ever removed/overridden,
    // this test goes red and proves a real hole.
    const payload = '[click me](javascript:alert(1))';
    const message = makeMessage({ content: payload });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: payload })} />,
    );
    const { onAttrs, jsHrefs, scripts } = collectDangerousAttrs(container);
    expect(jsHrefs).toEqual([]);
    expect(onAttrs).toEqual([]);
    expect(scripts).toBe(0);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    const href = anchor!.getAttribute('href') ?? '';
    expect(/javascript:/i.test(href)).toBe(false);
    // urlTransform returns '' for unsafe protocols → href attribute absent
    // or empty.
    expect(href === '' || anchor!.hasAttribute('href') === false ? true : href === '').toBe(true);
  });

  it('neutralizes attribute-split / nested payloads (defense-in-depth)', () => {
    // A grab-bag of obfuscation attempts; none should leave an executable
    // attribute or script tag in the rendered DOM.
    const payloads = [
      '<img src="x" onerror="alert(2)">',
      '<a href="jAvAsCrIpT:alert(3)">mixed-case</a>',
      '<svg><a xlink:href="javascript:alert(4)"><text>x</text></a></svg>',
      '<div onmouseover="alert(5)">hover</div>',
      '<iframe src="javascript:alert(6)"></iframe>',
    ];
    for (const payload of payloads) {
      cleanup();
      const message = makeMessage({ content: payload });
      const { container } = render(
        <MarkdownContentRenderer {...makeProps({ message, content: payload })} />,
      );
      const { onAttrs, jsHrefs, scripts } = collectDangerousAttrs(container);
      expect(onAttrs).toEqual([]);
      expect(jsHrefs).toEqual([]);
      expect(scripts).toBe(0);
    }
  });
});

// ============================================================================
// D2 (G2): typography contract — dead `prose` classes removed, scoped custom
// CSS in charge. jsdom does not load the package stylesheet, so the CSS side
// is asserted as source text (repo precedent: packages/ui/src/mobile-styles.test.ts,
// packages/theme-tokens/src/styles.test.ts); computed-style verification is
// owned by the DV e2e layer (product-spec.md §7).
// ============================================================================
const stylesCss = readFileSync('src/styles.css', 'utf8');

describe('MarkdownContentRenderer — D2 typography contract (G2)', () => {
  it('(a) container drops the dead prose family and keeps overflow utilities', () => {
    const message = makeMessage({ content: '# Title\n\nparagraph with `code`' });
    const { container } = render(
      <MarkdownContentRenderer {...makeProps({ message, content: message.content })} />,
    );
    const markdown = container.querySelector('[data-slot="ai-bubble-markdown"]') as HTMLElement;
    expect(markdown).toBeTruthy();
    // @tailwindcss/typography is not a repo dependency — any prose-* class is a
    // dead class pretending to style the bubble (G2).
    expect(markdown.className).not.toMatch(/\bprose\b/);
    expect(markdown.className).not.toMatch(/\bprose-[a-z-]+\b/);
    // Horizontal overflow guard utilities stay (D2 Decision: unrelated to the
    // dead plugin classes).
    expect(markdown.className).toContain('max-w-none');
    expect(markdown.className).toContain('break-words');
  });

  it('(b) styles.css covers the element matrix under the ai-bubble-markdown scope', () => {
    const SCOPE = "\\[data-slot='ai-bubble-markdown'\\]";
    const coverage: Array<[string, RegExp]> = [
      ['headings', new RegExp(`${SCOPE} h[1-6][,\\s]`)],
      ['paragraph', new RegExp(`${SCOPE} p[\\s,{]`)],
      ['unordered list', new RegExp(`${SCOPE} ul[\\s,{]`)],
      ['ordered list', new RegExp(`${SCOPE} ol[\\s,{]`)],
      ['list marker', new RegExp(`${SCOPE} li::marker`)],
      ['task-list checkbox', new RegExp(`${SCOPE} input\\[type='checkbox'\\]`)],
      ['blockquote', new RegExp(`${SCOPE} blockquote[\\s,{]`)],
      ['fenced code block', new RegExp(`${SCOPE} pre[\\s,{]`)],
      ['inline code', new RegExp(`${SCOPE} :not\\(pre\\) > code[\\s,{]`)],
      ['link', new RegExp(`${SCOPE} a[\\s,{:]`)],
      ['table', new RegExp(`${SCOPE} table[\\s,{]`)],
      ['table cell', new RegExp(`${SCOPE} (th|td)[\\s,{]`)],
      ['hr', new RegExp(`${SCOPE} hr[\\s,{]`)],
      ['img', new RegExp(`${SCOPE} img[\\s,{]`)],
      ['strong', new RegExp(`${SCOPE} strong[\\s,{]`)],
      ['em', new RegExp(`${SCOPE} em[\\s,{]`)],
    ];
    for (const [name, re] of coverage) {
      expect(stylesCss, `missing scoped rule for ${name}`).toMatch(re);
    }
    // The scoped rules must consume theme variables via the package-level
    // custom properties (colors must not be hardcoded-only).
    expect(stylesCss).toContain(`[data-slot='ai-bubble-markdown'] {
  --ai-md-fg: hsl(var(--foreground, 222 84% 5%));`);
  });

  it('(c1) dark path — prefers-color-scheme media query with literal dark fallbacks', () => {
    expect(stylesCss).toMatch(
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\[data-slot='ai-bubble-markdown'\]\s*\{/,
    );
    // Dual-track Decision: var() first (theme hosts), literal classic-dark
    // fallback second (standalone hosts without theme attributes).
    expect(stylesCss).toContain('hsl(var(--foreground, 210 40% 98%))');
    expect(stylesCss).toContain('hsl(var(--muted-foreground, 215 25% 75%))');
    expect(stylesCss).toContain('hsl(var(--primary, 217 89% 63%))');
  });

  it('(c2) dark path — [data-mode] attribute trigger', () => {
    expect(stylesCss).toMatch(
      /\[data-mode='dark'\]\s+\[data-slot='ai-bubble-markdown'\]\s*\{/,
    );
  });
});

