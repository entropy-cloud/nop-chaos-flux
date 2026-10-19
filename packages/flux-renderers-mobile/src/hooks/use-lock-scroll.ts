import { useEffect } from 'react';
import type { RefObject } from 'react';
import { supportsPassiveEvents } from './supports-passive.js';

/**
 * Scroll-through lock for mobile custom surfaces (M6b; vant
 * use-lock-scroll lineage).
 *
 * Global mode (default): reference-counted — the first active consumer adds
 * `nop-scroll-lock` to `<body>` (package styles.css), the last one removes
 * it. A single document-level touchmove listener (installed while the count
 * is >0, re-synced when the strict mix changes) decides per gesture whether
 * to preventDefault using a direction bitmask: if no scrollable ancestor of
 * the touch target can scroll along the gesture axis, the event is blocked
 * so the page behind the surface does not scroll through.
 *
 * Local mode (`localRef`): locks only events originating inside the
 * container element; the body class is untouched. Intended for non-modal
 * surfaces (floating panels, picker popups) that manage their own scroll.
 *
 * `strict` blocks unconditionally, even when a scrollable ancestor could
 * consume the gesture (content without internal scrolling).
 */

export interface UseLockScrollOptions {
  /** Block every touchmove while locked, ignoring scrollable ancestors. */
  strict?: boolean;
  /** Lock only events inside this container instead of the document body. */
  localRef?: RefObject<HTMLElement | null>;
}

const VERTICAL_BIT = 0b10;
const HORIZONTAL_BIT = 0b01;

let globalLockCount = 0;
let strictLockCount = 0;
let globalInstalled = false;
let activeDocumentHandler: ((event: Event) => void) | null = null;
let gestureStart: { x: number; y: number } | null = null;

function scrollableBitSum(target: EventTarget | null): number {
  let bits = 0;
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      node.scrollWidth > node.clientWidth;
    if (canScrollY) bits |= VERTICAL_BIT;
    if (canScrollX) bits |= HORIZONTAL_BIT;
    if (bits === (VERTICAL_BIT | HORIZONTAL_BIT)) return bits;
    node = node.parentElement;
  }
  return bits;
}

function gestureAxisBit(event: Event): number {
  if (!gestureStart) return VERTICAL_BIT;
  const touch = (event as TouchEvent).touches?.[0];
  if (!touch) return VERTICAL_BIT;
  const dx = touch.clientX - gestureStart.x;
  const dy = touch.clientY - gestureStart.y;
  return Math.abs(dx) > Math.abs(dy) ? HORIZONTAL_BIT : VERTICAL_BIT;
}

function handleTouchStart(event: Event): void {
  const touch = (event as TouchEvent).touches?.[0];
  if (!touch) return;
  gestureStart = { x: touch.clientX, y: touch.clientY };
}

function makeTouchMoveHandler(strict: boolean, scope: HTMLElement | null) {
  return (event: Event) => {
    if (scope && !scope.contains(event.target as Node)) return;
    const blocked = strict || (scrollableBitSum(event.target) & gestureAxisBit(event)) === 0;
    if (blocked) event.preventDefault();
  };
}

function listenerOptions(): AddEventListenerOptions | boolean {
  // preventDefault requires a non-passive listener where the platform
  // distinguishes them.
  return supportsPassiveEvents() ? { passive: false } : false;
}

function setDocumentHandler(strict: boolean): void {
  if (activeDocumentHandler) {
    document.removeEventListener('touchmove', activeDocumentHandler, listenerOptions());
  }
  activeDocumentHandler = makeTouchMoveHandler(strict, null);
  document.addEventListener('touchmove', activeDocumentHandler, listenerOptions());
}

function syncGlobalLock(): void {
  if (globalLockCount > 0) {
    if (!globalInstalled) {
      globalInstalled = true;
      document.body.classList.add('nop-scroll-lock');
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    setDocumentHandler(strictLockCount > 0);
    return;
  }
  if (globalInstalled) {
    globalInstalled = false;
    document.body.classList.remove('nop-scroll-lock');
    document.removeEventListener('touchstart', handleTouchStart);
    if (activeDocumentHandler) {
      document.removeEventListener('touchmove', activeDocumentHandler, listenerOptions());
      activeDocumentHandler = null;
    }
    gestureStart = null;
  }
}

function acquireGlobalLock(strict: boolean): () => void {
  globalLockCount += 1;
  if (strict) strictLockCount += 1;
  syncGlobalLock();

  return () => {
    globalLockCount -= 1;
    if (strict) strictLockCount -= 1;
    syncGlobalLock();
  };
}

function attachLocalLock(container: HTMLElement, strict: boolean): () => void {
  const onTouchMove = makeTouchMoveHandler(strict, container);
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, listenerOptions());
  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', onTouchMove, listenerOptions());
    gestureStart = null;
  };
}

export function useLockScroll(enabled: boolean = true, options: UseLockScrollOptions = {}): void {
  const { strict = false, localRef } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined') return;
    if (localRef) {
      const container = localRef.current;
      if (!container) return;
      return attachLocalLock(container, strict);
    }
    return acquireGlobalLock(strict);
  }, [enabled, strict, localRef]);
}
