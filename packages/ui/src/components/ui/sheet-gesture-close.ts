import * as React from 'react';

/**
 * Mobile pull-down-to-close for bottom Sheets (plan 666 Phase 3, M8c; f7
 * swipeToClose lineage). Opt-in via `Sheet gestureClose` — default off.
 *
 * Contract:
 * - Drag maps 1:1 to panel `translateY` (down only) and dims the backdrop
 *   (`opacity = 1 - progress`); `--sheet-progress` is set on the panel's
 *   portal parent (the common ancestor of the sibling overlay/popup — CSS
 *   variables do not cross siblings).
 * - Release decides via f7's swipeToClose test: a fast short pull
 *   (`t < 300ms && d > 20px`) or any pull past half the panel height closes;
 *   everything else springs back (backdrop transition restored).
 * - Breakpoints (半开档位) are deliberately NOT implemented here — multi-
 *   anchor positioning belongs to the floating-panel renderer (M8a).
 *
 * Listeners are delegated on document.body: Base-UI portals may mount the
 * popup after the consumer's effects run, so direct panel attachment races
 * the mount; delegation is mount-timing independent.
 */

// Internal options shape (knip: SheetContent passes the object literal inline).
interface SheetGestureCloseOptions {
  enabled: boolean;
  /** Selector matching the sheet panel (default `[data-slot="sheet-content"]`). */
  panelSelector?: string;
  onClose: () => void;
}

export function shouldCloseOnRelease(input: {
  durationMs: number;
  distancePx: number;
  panelHeight: number;
}): boolean {
  return (
    (input.durationMs < 300 && input.distancePx > 20) ||
    input.distancePx > input.panelHeight / 2
  );
}

interface GestureState {
  panel: HTMLElement;
  overlay: HTMLElement | null;
  portalParent: HTMLElement | null;
  startClientY: number;
  startTime: number;
  transitionRestore: string;
  overlayTransitionRestore: string;
}

export function useSheetGestureClose(options: SheetGestureCloseOptions): void {
  const { enabled, panelSelector = '[data-slot="sheet-content"]', onClose } = options;
  const gestureRef = React.useRef<GestureState | null>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined') return;

    function findPanel(target: EventTarget | null): HTMLElement | null {
      return target instanceof Element
        ? (target.closest(panelSelector) as HTMLElement | null)
        : null;
    }

    function overlayOf(panel: HTMLElement): HTMLElement | null {
      return panel.parentElement?.querySelector<HTMLElement>('[data-slot="sheet-overlay"]') ?? null;
    }

    function onTouchStart(event: TouchEvent) {
      const panel = findPanel(event.target);
      if (!panel) return;
      const touch = event.touches[0];
      if (!touch) return;
      const overlay = overlayOf(panel);
      gestureRef.current = {
        panel,
        overlay,
        portalParent: panel.parentElement,
        startClientY: touch.clientY,
        startTime: event.timeStamp,
        transitionRestore: panel.style.transition,
        overlayTransitionRestore: overlay?.style.transition ?? '',
      };
      // drag maps 1:1 — the enter/exit transitions must not fight the finger
      panel.style.transition = 'none';
      if (overlay) overlay.style.transition = 'none';
    }

    function onTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const touch = event.touches[0];
      if (!touch) return;
      if (!findPanel(event.target)) return;
      const dy = touch.clientY - gesture.startClientY;
      const progress = Math.max(0, Math.min(1, dy / Math.max(1, gesture.panel.offsetHeight)));
      gesture.panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
      if (gesture.overlay) gesture.overlay.style.opacity = String(1 - progress);
      gesture.portalParent?.style.setProperty('--sheet-progress', String(progress));
    }

    function onTouchEnd(event: TouchEvent) {
      const gesture = gestureRef.current;
      if (!gesture) return;
      gestureRef.current = null;
      const endTouch = event.changedTouches[0];
      // happy-dom has no layout (offsetHeight 0); fall back to a viewport-derived
      // height so the half-height test stays meaningful in tests and real browsers.
      const panelHeight = gesture.panel.offsetHeight || Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.6);
      const distance = endTouch ? endTouch.clientY - gesture.startClientY : 0;
      const duration = Math.max(0, (endTouch ? event.timeStamp : 0) - gesture.startTime);
      const close =
        distance > 0 &&
        shouldCloseOnRelease({ durationMs: duration, distancePx: distance, panelHeight });
      if (close) {
        onCloseRef.current();
        return;
      }
      // spring back: restore transitions and clear the drag transform
      gesture.panel.style.transition = gesture.transitionRestore;
      if (gesture.overlay) {
        gesture.overlay.style.transition = gesture.overlayTransitionRestore;
        gesture.overlay.style.opacity = '';
      }
      gesture.panel.style.transform = '';
      gesture.portalParent?.style.removeProperty('--sheet-progress');
    }

    document.body.addEventListener('touchstart', onTouchStart, { passive: true });
    document.body.addEventListener('touchmove', onTouchMove, { passive: true });
    document.body.addEventListener('touchend', onTouchEnd, { passive: true });
    document.body.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, panelSelector]);
}
