import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoticeBarSchema } from './schemas.js';
import { NoticeBarRenderer } from './notice-bar.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  reducedMotionMatches = false;
  reducedMotionChangeListeners.clear();
});

let reducedMotionMatches = false;
const reducedMotionChangeListeners = new Set<(event: { matches: boolean }) => void>();

function stubMatchMedia() {
  const mql = {
    get matches() {
      return reducedMotionMatches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(type: string, listener: (event: { matches: boolean }) => void) {
      if (type === 'change') {
        reducedMotionChangeListeners.add(listener);
      }
    },
    removeEventListener(type: string, listener: (event: { matches: boolean }) => void) {
      if (type === 'change') {
        reducedMotionChangeListeners.delete(listener);
      }
    },
    addListener() {
      /* no-op */
    },
    removeListener() {
      /* no-op */
    },
    dispatchEvent() {
      return false;
    },
  };
  vi.stubGlobal('matchMedia', () => mql);
}

function renderNoticeBar(text: string | string[]) {
  const props = createMockRendererProps<NoticeBarSchema>({
    schema: { type: 'notice-bar' },
    props: { text, scrollable: true },
    events: {},
  });
  const view = render(<NoticeBarRenderer {...props} />);
  return {
    view,
    root: view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement,
    textContent: () =>
      view.container.querySelector('[data-slot="notice-bar-text"]')?.textContent ?? '',
  };
}

describe('20-03 notice-bar pause + reduced-motion (WCAG 2.2.2)', () => {
  it('pauses the carousel tick on hover and resumes on mouse leave', () => {
    vi.useFakeTimers();
    try {
      const { root, textContent } = renderNoticeBar(['first', 'second', 'third']);
      expect(textContent()).toContain('first');

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(textContent()).toContain('second');

      // Hover pauses the tick: no advance while hovering.
      act(() => {
        fireEvent.mouseEnter(root);
      });
      act(() => {
        vi.advanceTimersByTime(9000);
      });
      expect(textContent()).toContain('second');

      // Leaving hover resumes the tick.
      act(() => {
        fireEvent.mouseLeave(root);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(textContent()).toContain('third');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses the carousel tick while focused and resumes on focus out', () => {
    vi.useFakeTimers();
    try {
      const { root, textContent } = renderNoticeBar(['first', 'second']);
      act(() => {
        fireEvent.focusIn(root);
      });
      act(() => {
        vi.advanceTimersByTime(9000);
      });
      expect(textContent()).toContain('first');

      act(() => {
        fireEvent.focusOut(root);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(textContent()).toContain('second');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start the JS carousel tick under prefers-reduced-motion and restarts when the preference clears', () => {
    stubMatchMedia();
    reducedMotionMatches = true;
    vi.useFakeTimers();
    try {
      const { textContent } = renderNoticeBar(['first', 'second', 'third']);
      act(() => {
        vi.advanceTimersByTime(9000);
      });
      expect(textContent()).toContain('first');

      reducedMotionMatches = false;
      act(() => {
        for (const listener of reducedMotionChangeListeners) {
          listener({ matches: false });
        }
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(textContent()).toContain('second');
    } finally {
      vi.useRealTimers();
    }
  });
});
