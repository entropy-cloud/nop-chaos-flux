import * as React from 'react';

/**
 * Tracks the soft-keyboard height (in CSS pixels) so a `position: fixed` page
 * footer can stay above the keyboard. Returns `0` when no keyboard is visible
 * or when `window.visualViewport` is unavailable (early return — see M3 plan
 * Failure Paths).
 *
 * Baseline: `docs/architecture/mobile-responsive-baseline.md` §6.
 * The offset equals the keyboard height in layout-viewport coordinates:
 *   `window.innerHeight - visualViewport.height - visualViewport.offsetTop`.
 * The caller applies it as `style.bottom` on a `position: fixed` footer.
 */
export function useFixedFooterVisualViewport(enabled: boolean): number {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }
    const update = () => {
      const keyboard = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(keyboard > 0 ? keyboard : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return offset;
}
