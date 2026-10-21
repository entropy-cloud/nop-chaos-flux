/**
 * Click suppression after a drag gesture (M6a; f7/swiper/embla
 * allowClick pattern). A touch drag that ends on top of a button must not
 * fire that button's click. The suppressor marks the container once the
 * finger travels beyond the 6px threshold and intercepts the NEXT trusted
 * click in the capture phase.
 *
 * Programmatic clicks (`isTrusted === false` — `HTMLElement.click()` and
 * `dispatchEvent` in both jsdom and real browsers) are exempt so gesture
 * features like swipe-cell overswipe can still synthesize action clicks
 * through the same container.
 */

const DRAG_CLICK_SUPPRESS_THRESHOLD_PX = 6;

// Internal handle contract (knip: consumers receive it from suppressClickAfterDrag).
interface DragClickSuppressor {
  /** Remove all listeners. */
  cleanup: () => void;
  /**
   * Disarm the pending suppression exactly once. Gesture features that
   * synthesize their own action clicks (swipe-cell overswipe) call this
   * right before `element.click()` — reliable across DOM implementations
   * where `isTrusted` is not faithfully modeled (happy-dom reports true
   * even for dispatched events).
   */
  allowNextClick: () => void;
}

export function suppressClickAfterDrag(container: HTMLElement): DragClickSuppressor {
  let tracking = false;
  let suppressNext = false;
  let allowNext = false;
  let startX = 0;
  let startY = 0;

  const onTouchStart = (event: Event) => {
    const touch = (event as TouchEvent).touches?.[0];
    if (!touch) return;
    tracking = true;
    suppressNext = false;
    startX = touch.clientX;
    startY = touch.clientY;
  };

  const onTouchMove = (event: Event) => {
    if (!tracking || suppressNext) return;
    const touch = (event as TouchEvent).touches?.[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_CLICK_SUPPRESS_THRESHOLD_PX) {
      suppressNext = true;
    }
  };

  const onTouchEnd = () => {
    tracking = false;
  };

  const onClickCapture = (event: MouseEvent) => {
    if (allowNext) {
      allowNext = false;
      return;
    }
    if (!suppressNext) return;
    // Synthetic clicks (isTrusted === false) carry gesture intent, not
    // ghost taps — let them reach the real handlers.
    if (event.isTrusted === false) return;
    event.preventDefault();
    // stopImmediatePropagation: the suppressor shares the container node
    // with swipe-cell's action-capture handler, and stopPropagation alone
    // does not silence same-node listeners.
    event.stopImmediatePropagation();
    suppressNext = false;
  };

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });
  container.addEventListener('click', onClickCapture, true);

  return {
    cleanup: () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('click', onClickCapture, true);
    },
    allowNextClick: () => {
      allowNext = true;
    },
  };
}
