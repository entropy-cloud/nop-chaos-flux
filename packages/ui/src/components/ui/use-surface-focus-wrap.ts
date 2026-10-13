import * as React from 'react';

const SURFACE_TABBABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * UPSTREAM EXIT (plan 587 WA-ui-001): this module is the compensation layer
 * for @base-ui/react 1.3.0 focus-management gaps (guard cycle can let Tab
 * escape to the document body — C1.1 a11y-focus-trap failure path — and the
 * manager's scheduled initial focus can be lost). **Once the upstream fix has
 * landed and been verified in a real browser, delete this module wholesale**
 * and revert the four modal faces (dialog/drawer/sheet/alert-dialog) to plain
 * Popup handlers; see docs/components/dialog/design.md "Upstream compensation"
 * for the mirror record.
 *
 * Declared increment (plan 587 draft review M1/M2): the tabbable enumeration
 * is unified to the B-form visibility predicate below. Unlike the retired
 * offsetParent filter (A-form), checkVisibility does not exclude
 * `position: fixed` descendants — fixed-positioned controls now participate
 * in the Tab roundtrip and initial-focus walk. This is intentional; the
 * real-browser anchor for that increment is
 * tests/e2e/component-lab/c1-1-host-surfaces.spec.ts (happy-dom cannot
 * observe the fixed-element difference).
 */
function isElementVisible(element: HTMLElement): boolean {
  // checkVisibility is the real-browser path (the only one that answers CSS
  // visibility/content-visibility); happy-dom and other layout-less
  // environments do not implement it, so walk the ancestor chain instead.
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility();
  }
  let node: HTMLElement | null = element;
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

function listSurfaceTabbables(popup: HTMLElement): HTMLElement[] {
  return Array.from(popup.querySelectorAll<HTMLElement>(SURFACE_TABBABLE_SELECTOR)).filter(
    isElementVisible,
  );
}

/**
 * Packaged two-layer focus compensation for modal surface popups.
 *
 * Layer 1 (wrap): returns a deterministic Tab-wrap keydown handler — from the
 * last focusable, Tab wraps to the first; from the first, Shift+Tab wraps to
 * the last; focus never reaches the (leaky) upstream guard cycle. Attach it on
 * the popup element; it also fires for bubbled keydowns from focused children.
 * Composition contract (plan 587 m5): run the wrap handler FIRST, then the
 * consumer's own onKeyDown, so user handlers are never swallowed.
 *
 * Layer 2 (initial focus): Base UI's FloatingFocusManager moves initial focus
 * via a module-level rAF (`enqueueFocus`); that scheduled focus can be lost
 * (canceled by a competing manager, dropped across HMR boundary invalidation)
 * and the surface then opens with focus left on the trigger / body. The hook
 * waits one frame past that window and re-establishes focus once, only when
 * nothing inside the popup ended up focused — a no-op on the healthy path.
 */
export function useSurfaceFocusWrap(popupRef: React.RefObject<HTMLElement | null>): {
  handleSurfaceKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
} {
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
      const first = listSurfaceTabbables(popup)[0] ?? null;
      (first ?? popup).focus({ preventScroll: first == null });
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [popupRef]);

  function handleSurfaceKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Tab') {
      return;
    }
    const popup = event.currentTarget;
    const focusables = listSurfaceTabbables(popup);
    if (focusables.length === 0) {
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === focusables[0]) {
        event.preventDefault();
        focusables[focusables.length - 1]!.focus();
      }
    } else if (active === focusables[focusables.length - 1]) {
      event.preventDefault();
      focusables[0]!.focus();
    }
  }

  return { handleSurfaceKeyDown };
}
