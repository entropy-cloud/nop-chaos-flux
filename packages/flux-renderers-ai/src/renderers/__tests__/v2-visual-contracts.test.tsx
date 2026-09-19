import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useAutoScroll } from '../../adapters/use-auto-scroll.js';
import { MarkdownContentRenderer } from '../ai-bubble/renderers/markdown.js';
import type { ChatMessage } from '../../engine/types.js';

afterEach(() => {
  cleanup();
});

// ============================================================================
// Plan 472 V2 Phase 3 focused contracts: reactive pinned state for the
// scroll-to-bottom affordance + the tok-comment highlight mapping.
// ============================================================================

function ScrollHarness(): React.ReactElement {
  const { containerRef, onScroll, scrollToBottom, pinned } = useAutoScroll(null);
  return (
    <div>
      <div ref={containerRef} onScroll={onScroll} data-testid="scroller" />
      <span data-testid="pinned-state">{String(pinned)}</span>
      <button type="button" data-testid="jump" onClick={scrollToBottom} />
    </div>
  );
}

function forceGeometry(el: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: scrollTop, writable: true });
}

describe('useAutoScroll reactive pinned (plan 472 V2 scroll-to-bottom)', () => {
  it('flips the reactive pinned state when the user scrolls away from the bottom', () => {
    render(<ScrollHarness />);
    expect(screen.getByTestId('pinned-state').textContent).toBe('true');

    const scroller = screen.getByTestId('scroller');
    forceGeometry(scroller, 1000, 100, 0);
    fireEvent.scroll(scroller);
    expect(screen.getByTestId('pinned-state').textContent).toBe('false');

    // scrollToBottom restores the pinned state (both channels).
    fireEvent.click(screen.getByTestId('jump'));
    expect(screen.getByTestId('pinned-state').textContent).toBe('true');
  });

  it('keeps the imperative isAtBottom channel in sync with the reactive state', () => {
    function Probe(): React.ReactElement {
      const { containerRef, onScroll, isAtBottom, pinned } = useAutoScroll(null);
      // both channels must agree on every render
      expect(isAtBottom()).toBe(pinned);
      return (
        <div>
          <div ref={containerRef} onScroll={onScroll} data-testid="scroller2" />
          <span data-testid="imperative-pinned">{String(isAtBottom())}</span>
        </div>
      );
    }
    render(<Probe />);
    expect(screen.getByTestId('imperative-pinned').textContent).toBe('true');
    const scroller = screen.getByTestId('scroller2');
    forceGeometry(scroller, 2000, 100, 0);
    fireEvent.scroll(scroller);
    expect(screen.getByTestId('imperative-pinned').textContent).toBe('false');
  });
});

describe('tok-comment highlight mapping (plan 472 V2 A5)', () => {
  it('maps hljs comment scopes onto the tok-comment class in markdown code blocks', () => {
    const message = {
      id: 'm1',
      role: 'assistant',
      content: '```ts\n// a telling comment\nconst answer = 42;\n```',
      loading: false,
    } as ChatMessage;
    const { container } = render(<MarkdownContentRenderer message={message} content={message.content} contentIndex={0} />);
    const comment = container.querySelector('code .tok-comment');
    expect(comment).not.toBeNull();
    expect(comment!.textContent).toContain('a telling comment');
    // the keyword/number neighbours keep their existing tokens
    expect(container.querySelector('code .tok-num')).not.toBeNull();
  });
});
