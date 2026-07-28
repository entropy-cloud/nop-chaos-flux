import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MarkdownContentRenderer } from '../renderers/markdown.js';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

afterEach(() => {
  cleanup();
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
