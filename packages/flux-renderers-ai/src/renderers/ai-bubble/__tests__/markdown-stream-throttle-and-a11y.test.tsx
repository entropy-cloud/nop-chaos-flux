import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';

// Parse-pipeline probe: sanitize runs once per accepted parse of the markdown
// source — the throttle gates how often NEW content reaches it while streaming.
const sanitizeProbe = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock('@nop-chaos/flux-renderers-content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-renderers-content')>();
  return {
    ...actual,
    sanitizeHtml: (input: string) => {
      sanitizeProbe.calls.push(input);
      return actual.sanitizeHtml(input);
    },
  };
});

import { MarkdownContentRenderer } from '../renderers/markdown.js';
import { AssistantActions } from '../assistant-actions.js';
import { AiToolCallView } from '../../ai-tool-call.js';
import { AiTokenUsageView } from '../../ai-token-usage.js';
import { AiSenderView } from '../../ai-sender.js';
import type { ChatMessage, ChatToolCall } from '../../../engine/types.js';

afterEach(() => {
  cleanup();
  sanitizeProbe.calls.length = 0;
  vi.useRealTimers();
});

function msg(content: unknown): ChatMessage {
  return { id: 'm1', role: 'assistant', content } as unknown as ChatMessage;
}

describe('streaming markdown parse throttle (plan 2026-09-29-2 Phase 1)', () => {
  it('parses growing content at most once per time slice, not once per chunk', () => {
    vi.useFakeTimers();
    const props = { message: msg(''), content: '' as unknown, contentIndex: 0, streaming: true };
    const { rerender, container } = render(<MarkdownContentRenderer {...props} />);

    let text = 'paragraph one ';
    rerender(<MarkdownContentRenderer {...props} content={text as unknown} />);
    const distinctAfterBurst = () => new Set(sanitizeProbe.calls).size;

    // 30 chunks landing inside one throttle window
    for (let i = 0; i < 30; i++) {
      text += `chunk ${i} `;
      rerender(<MarkdownContentRenderer {...props} content={text as unknown} />);
    }
    const burst = distinctAfterBurst();
    expect(burst).toBeLessThanOrEqual(2);

    // one flush per slice: advancing the timer processes the accumulated tail
    act(() => {
      vi.advanceTimersByTime(90);
    });
    const afterFlush = distinctAfterBurst();
    expect(afterFlush).toBeGreaterThan(burst);
    expect(container.textContent).toContain('chunk 29');

    // idle window: no timers, no extra parses
    const beforeIdle = distinctAfterBurst();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender(<MarkdownContentRenderer {...props} content={text as unknown} />);
    expect(distinctAfterBurst()).toBe(beforeIdle);
  });

  it('streaming end renders the final content without waiting for a timer', () => {
    vi.useFakeTimers();
    const props = { message: msg(''), content: 'start ' as unknown, contentIndex: 0, streaming: true };
    const { rerender, container } = render(<MarkdownContentRenderer {...props} />);
    rerender(<MarkdownContentRenderer {...props} content={'start middle tail' as unknown} />);
    act(() => {
      vi.advanceTimersByTime(90);
    });
    expect(container.textContent).toContain('tail');

    // stream ends: the non-streaming path consumes raw directly — the newest
    // content is visible without any further timer advance
    rerender(<MarkdownContentRenderer {...props} content={'start middle tail END' as unknown} streaming={false} />);
    expect(container.textContent).toContain('END');
  });

  it('message switch (non-prefix source) snaps immediately instead of streaming stale content', () => {
    vi.useFakeTimers();
    const props = { message: msg(''), content: 'first answer body' as unknown, contentIndex: 0, streaming: true };
    const { rerender, container } = render(<MarkdownContentRenderer {...props} />);
    rerender(<MarkdownContentRenderer {...props} content={'second answer completely different' as unknown} />);
    expect(container.textContent).toContain('second answer');
  });
});

describe('AI a11y round-2 fixes (plan 2026-09-29-2 Phase 2)', () => {
  it('copy success flips aria-label and announces via polite live region', async () => {
    const message = msg('body');
    const { container } = render(<AssistantActions message={message} />);
    const button = container.querySelector('[data-slot="ai-action-copy"]') as HTMLElement;
    const labelBefore = button.getAttribute('aria-label');
    expect(labelBefore).toBeTruthy();
    const live = button.querySelector('span[aria-live="polite"]') as HTMLElement;
    expect(live.className).toContain('sr-only');

    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.getAttribute('aria-label')).not.toBe(labelBefore);
    expect(live.textContent).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('tool-call toggle associates with the disclosed args region via aria-controls', () => {
    const toolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'lookup', arguments: '{"q":"x"}' },
    } as unknown as ChatToolCall;
    const { container } = render(<AiToolCallView toolCall={toolCall} defaultOpen />);
    const toggle = container.querySelector('[data-slot="ai-tool-call-toggle"]') as HTMLElement;
    const args = container.querySelector('[data-slot="ai-tool-call-args"]') as HTMLElement;
    expect(args).toBeTruthy();
    expect(args.id).toBeTruthy();
    expect(toggle.getAttribute('aria-controls')).toBe(args.id);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('sender over-limit state reaches assistive tech (aria-invalid + described counter)', () => {
    const { container } = render(<AiSenderView maxLength={5} showWordLimit />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'toolong' } });
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    const counter = container.querySelector('[data-slot="ai-sender-count"]') as HTMLElement;
    expect(counter.getAttribute('aria-live')).toBe('polite');
    expect(textarea.getAttribute('aria-describedby')).toBe(counter.id);
    expect(counter.textContent).toBe('7/5');
  });

  it('token-usage detail lines drop alpha-muted tiny text', () => {
    const usage = { total_tokens: 100, prompt_tokens: 60, completion_tokens: 40 };
    const { container } = render(<AiTokenUsageView usage={usage as never} contextLimit={500} />);
    const detail = container.querySelector('[data-slot="ai-token-usage-prompt"]')!.parentElement as HTMLElement;
    expect(detail.className).toContain('text-xs');
    expect(detail.className).not.toContain('text-[10px]');
    expect(detail.className).not.toContain('/80');
    const limitSpan = Array.from(container.querySelectorAll('[data-slot="ai-token-usage-text"] span'))
      .filter((el) => el.className)
      .find((el) => el.textContent?.includes('/ 500')) as HTMLElement | undefined;
    expect(limitSpan).toBeTruthy();
    expect(limitSpan!.className).toContain('text-muted-foreground');
    expect(limitSpan!.className).not.toContain('/70');
  });
});
