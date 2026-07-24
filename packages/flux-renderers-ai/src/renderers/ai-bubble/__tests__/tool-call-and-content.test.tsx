import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { AiBubbleView } from '../index.js';
import { AiToolCallView, highlightJson } from '../../ai-tool-call.js';
import { resolveToolRenderer } from '../types.js';
import type { BubbleToolRendererMatch } from '../types.js';
import { defaultBubbleContentRenderers } from '../renderers/default-renderers.js';
import { ToolsContentRenderer } from '../renderers/tools.js';
import { reasoningMatcher } from '../renderers/reasoning.js';
import { imageMatcher } from '../renderers/image.js';
import type { ChatMessage, ChatToolCall, ChatToolCallUIState } from '../../../engine/types.js';

afterEach(() => {
  cleanup();
});

function makeCall(overrides: Partial<ChatToolCall> = {}): ChatToolCall {
  return {
    index: 0,
    id: 'call_1',
    type: 'function',
    function: { name: 'get_weather', arguments: '{"city":"sf"}' },
    ...overrides,
  };
}

describe('AiToolCallView — status rendering + A-12 colors + aria-label', () => {
  it('renders correct data-tool-status for all four states', () => {
    const states: ChatToolCallUIState['status'][] = ['running', 'success', 'failed', 'cancelled'];
    for (const status of states) {
      const { container, unmount } = render(
        <AiToolCallView toolCall={makeCall()} state={{ status }} />,
      );
      const root = container.querySelector('[data-slot="ai-tool-call"]');
      expect(root?.getAttribute('data-tool-status')).toBe(status);
      unmount();
    }
  });

  it('renders root aria-label referencing the tool name', () => {
    const { container } = render(<AiToolCallView toolCall={makeCall()} state={{ status: 'running' }} />);
    const root = container.querySelector('[data-slot="ai-tool-call"]');
    expect(root?.getAttribute('aria-label')).toContain('get_weather');
  });

  it('toggle button flips data-open and fires onToggle', () => {
    let toggled: boolean | null = null;
    const { container } = render(
      <AiToolCallView
        toolCall={makeCall()}
        state={{ status: 'success' }}
        onToggle={(open) => { toggled = open; }}
      />,
    );
    const root = container.querySelector('[data-slot="ai-tool-call"]');
    expect(root?.hasAttribute('data-open')).toBe(false);
    const toggle = container.querySelector('[data-slot="ai-tool-call-toggle"]') as HTMLButtonElement;
    fireEvent.click(toggle);
    expect(root?.hasAttribute('data-open')).toBe(true);
    expect(toggled).toBe(true);
  });

  it('renders the args JSON inside the expand panel when open', () => {
    const { container } = render(
      <AiToolCallView toolCall={makeCall()} state={{ status: 'success', open: true }} />,
    );
    const args = container.querySelector('[data-slot="ai-tool-call-args"]');
    expect(args).not.toBeNull();
    expect(args?.textContent).toContain('city');
  });
});

describe('highlightJson — jsonrepair truncated args (tool-args-truncated)', () => {
  it('repairs truncated JSON and produces highlighted HTML', () => {
    // Truncated arguments (missing closing brace + quote).
    const html = highlightJson('{"city":"sf');
    // Repaired successfully: contains the key.
    expect(html).toContain('city');
    // Highlight spans injected.
    expect(html).toContain('<span');
  });

  it('falls back to escaped raw text when jsonrepair cannot parse', () => {
    const html = highlightJson('');
    expect(html).toBe('');
  });

  it('escapes HTML-dangerous characters', () => {
    const html = highlightJson('{"a":"<script>"}');
    expect(html).not.toContain('<script>');
  });

  // P2 (FP `highlight-special-chars`): string literals containing `&`, `<`,
  // `>`, `"` must be captured as a single token and wrapped in a single
  // `tok-str` span. The previous escape-then-regex approach broke on the
  // first `&` of an entity (e.g. `&quot;`), fragmenting the highlight.
  it('wraps a string value containing & < > " in a single tok-str span', () => {
    // String value `a&b<c>"d` (escaped quote in source JSON).
    const html = highlightJson('{"u":"a&b<c>\\"d"}');
    // The string token is wrapped exactly once as a string literal.
    const strSpans = html.match(/<span class="tok-str">/g) ?? [];
    // At least one tok-str exists; the value span is the one containing the
    // special characters (now HTML-escaped inside the span).
    expect(strSpans.length).toBeGreaterThanOrEqual(1);
    // The escaped characters land INSIDE a tok-str span (not as inter-token
    // text where they would be split by the old regex's `[^&]` boundary).
    expect(html).toContain('<span class="tok-str">&quot;a&amp;b&lt;c&gt;');
  });

  it('wraps a key containing special characters in a single tok-key span', () => {
    const html = highlightJson('{"a&b":"v"}');
    // The key token is a single span with the escaped entity inside.
    expect(html).toContain('<span class="tok-key">&quot;a&amp;b&quot;</span>');
  });

  it('still escapes dangerous characters (XSS gate, regression-protected)', () => {
    const html = highlightJson('{"a":"<img src=x onerror=alert(1)>"}');
    // P2 regression guard: no live `<img>` element / inline event handler can
    // reach the DOM. The dangerous substring lands as escaped text inside a
    // `tok-str` span — it is visible text only, never parsed as HTML markup.
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    // Parse the produced HTML and assert no element carries an inline event
    // handler attribute (the real XSS gate — escaped text is harmless).
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const withOnerror = doc.querySelectorAll('[onerror]');
    expect(withOnerror.length).toBe(0);
    expect(doc.querySelectorAll('img').length).toBe(0);
    // The dangerous string is captured entirely inside one tok-str span.
    expect(html).toContain('<span class="tok-str">&quot;&lt;img src=x onerror=alert(1)&gt;&quot;</span>');
  });

  it('renders tok-key / tok-str / tok-bool spans together (integration)', () => {
    const html = highlightJson('{"k":"v","n":true}');
    expect(html).toContain('<span class="tok-key">');
    expect(html).toContain('<span class="tok-str">');
    expect(html).toContain('<span class="tok-bool">');
  });
});

describe('A-6 BubbleToolRendererMatch registry', () => {
  const weatherCard = () => null;
  const searchCard = () => null;

  it('exact name match wins over wildcard', () => {
    const registrations: BubbleToolRendererMatch[] = [
      { toolName: '*', renderer: searchCard },
      { toolName: 'get_weather', renderer: weatherCard },
    ];
    const match = resolveToolRenderer(registrations, makeCall());
    expect(match?.renderer).toBe(weatherCard);
  });

  it('RegExp match wins over wildcard', () => {
    const registrations: BubbleToolRendererMatch[] = [
      { toolName: /^get_/, renderer: weatherCard },
      { toolName: '*', renderer: searchCard },
    ];
    const match = resolveToolRenderer(registrations, makeCall());
    expect(match?.renderer).toBe(weatherCard);
  });

  it('priority ordering: lower priority wins regardless of declaration order', () => {
    const low = () => null;
    const registrations: BubbleToolRendererMatch[] = [
      { toolName: 'get_weather', renderer: weatherCard, priority: 10 },
      { toolName: 'get_weather', renderer: low, priority: 1 },
    ];
    const match = resolveToolRenderer(registrations, makeCall());
    expect(match?.renderer).toBe(low);
  });

  it('falls back to undefined when nothing matches (caller uses generic)', () => {
    const registrations: BubbleToolRendererMatch[] = [
      { toolName: 'other', renderer: searchCard },
    ];
    const match = resolveToolRenderer(registrations, makeCall());
    expect(match).toBeUndefined();
  });

  it('wildcard * acts as fallback when no exact/regex matches', () => {
    const registrations: BubbleToolRendererMatch[] = [
      { toolName: 'other', renderer: searchCard },
      { toolName: '*', renderer: weatherCard },
    ];
    const match = resolveToolRenderer(registrations, makeCall());
    expect(match?.renderer).toBe(weatherCard);
  });
});

describe('bubble content renderer matchers — tools/reasoning/image priority', () => {
  it('tools renderer selected for assistant message with tool_calls (not shadowed by markdown)', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: '',
      tool_calls: [makeCall()],
    };
    const toolsEntry = defaultBubbleContentRenderers.find((r) => r.renderer === ToolsContentRenderer);
    expect(toolsEntry).toBeTruthy();
    expect(toolsEntry!.find(message, '', 0)).toBe(true);
  });

  it('reasoning matcher fires for reasoning_content', () => {
    const message: ChatMessage = {
      id: 'm2',
      role: 'assistant',
      content: '',
      reasoning_content: 'thinking...',
    };
    expect(reasoningMatcher(message)).toBe(true);
  });

  it('image matcher fires for image_url content parts', () => {
    const message: ChatMessage = {
      id: 'm3',
      role: 'assistant',
      content: [{ type: 'image_url', image_url: { url: 'http://x/a.png' } }],
    };
    expect(imageMatcher(message)).toBe(true);
  });
});

describe('A-5 error wiring', () => {
  it('AiBubbleView renders data-error when isError prop is true', () => {
    const message: ChatMessage = { id: 'e1', role: 'assistant', content: '' };
    const { container } = render(<AiBubbleView message={message} isError />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble?.hasAttribute('data-error')).toBe(true);
  });

  it('AiBubbleView omits data-error when isError is false', () => {
    const message: ChatMessage = { id: 'e2', role: 'assistant', content: 'ok' };
    const { container } = render(<AiBubbleView message={message} />);
    const bubble = container.querySelector('.nop-ai-bubble');
    expect(bubble?.hasAttribute('data-error')).toBe(false);
  });
});
