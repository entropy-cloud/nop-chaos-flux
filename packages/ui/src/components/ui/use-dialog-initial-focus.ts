import * as React from 'react';

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isElementVisible(el: HTMLElement): boolean {
  // checkVisibility is the real-browser path; happy-dom and other layout-less
  // environments only resolve computed display, so walk the ancestor chain.
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility();
  }
  let node: HTMLElement | null = el;
  while (node) {
    if (node.hasAttribute('hidden')) {
      return false;
    }
    if (node.ownerDocument.defaultView?.getComputedStyle(node).display === 'none') {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}

function findFirstTabbable(popup: HTMLElement): HTMLElement | null {
  const candidates = popup.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR);
  for (const candidate of candidates) {
    if (isElementVisible(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Base UI's FloatingFocusManager moves initial focus via a module-level rAF
// (`enqueueFocus`); that scheduled focus can be lost (canceled by a competing
// manager, dropped across HMR boundary invalidation) and the dialog then opens
// with focus left on the trigger / body. This fallback waits one frame past
// that window and re-establishes focus once, only when nothing inside the
// popup ended up focused — a no-op on the healthy path.
export function useDialogInitialFocusFallback(popupRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    let frame = 0;
    let rafId = 0;
    const step = () => {
      const popup = popupRef.current;
      if (!popup || !popup.isConnected) {
        return;
      }
      const active = popup.ownerDocument.activeElement;
      if (active && popup.contains(active)) {
        return;
      }
      if (frame === 0) {
        frame += 1;
        rafId = requestAnimationFrame(step);
        return;
      }
      const first = findFirstTabbable(popup);
      (first ?? popup).focus({ preventScroll: first == null });
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [popupRef]);
}
