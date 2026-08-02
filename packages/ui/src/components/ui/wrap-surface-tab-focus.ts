import type React from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Deterministic Tab wrap for modal surface popups (dialog/drawer).
 *
 * Base UI's focus guards handle the wrap in most cases, but the upstream guard
 * cycle can let focus escape to the document body / page chrome (observed with
 * @base-ui/react 1.3.0 in real browsers — C1.1 a11y-focus-trap failure path).
 * This handler runs on the popup itself (bubbled keydown from focused
 * children): from the last focusable, Tab wraps to the first; from the first,
 * Shift+Tab wraps to the last. Focus therefore never reaches the guard cycle.
 */
export function wrapSurfaceTabFocus(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') {
    return;
  }
  const popup = event.currentTarget;
  const candidates = Array.from(popup.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const focusables = candidates.filter((element) => element.offsetParent !== null);
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
