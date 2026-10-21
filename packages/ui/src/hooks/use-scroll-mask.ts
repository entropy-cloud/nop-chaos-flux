import * as React from 'react';

export type ScrollMaskAxis = 'x' | 'y';

export interface ScrollMaskState {
  /** Content overflows toward the start edge and is not at start → show mask. */
  startMask: boolean;
  /** Content overflows toward the end edge and is not at end → show mask. */
  endMask: boolean;
}

/**
 * Scroll-position watcher for edge fade masks (plan 668 Phase 2, M10b):
 * reports whether a scrollable container currently has scrollable content
 * toward its start/end edges. Re-evaluates on scroll and resize.
 */
export function useScrollMask(
  ref: React.RefObject<HTMLElement | null>,
  axis: ScrollMaskAxis = 'x',
): ScrollMaskState {
  const [state, setState] = React.useState<ScrollMaskState>({ startMask: false, endMask: false });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function reevaluate() {
      const el = ref.current;
      if (!el) return;
      const scrollPos = axis === 'x' ? el.scrollLeft : el.scrollTop;
      const maxScroll =
        axis === 'x'
          ? el.scrollWidth - el.clientWidth
          : el.scrollHeight - el.clientHeight;
      setState({
        startMask: scrollPos > 0,
        endMask: scrollPos < maxScroll,
      });
    }

    reevaluate();
    element.addEventListener('scroll', reevaluate, { passive: true });
    window.addEventListener('resize', reevaluate, { passive: true });
    return () => {
      element.removeEventListener('scroll', reevaluate);
      window.removeEventListener('resize', reevaluate);
    };
  }, [ref, axis]);

  return state;
}
