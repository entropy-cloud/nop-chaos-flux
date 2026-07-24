import { useEffect, useRef } from 'react';

export interface UseAutoScrollOptions {
  /** Distance from bottom (px) within which auto-scroll stays "pinned". */
  threshold?: number;
}

export interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
  /** Whether the viewport is currently pinned at the bottom. */
  isAtBottom: () => boolean;
}

/**
 * Auto-scroll-to-bottom hook (A-9 host-utility contract). Tracks whether the
 * user is pinned to the bottom of a scroll container; when pinned, scrolls to
 * bottom whenever `trigger` changes (a primitive the caller derives, e.g.
 * `messages.length` or a content signature). When the user scrolls up,
 * auto-scroll pauses until they return near the bottom (mirrors tiny-robot
 * `useAutoScroll`).
 *
 * `trigger` is a static dependency (not a dynamic deps array) so it stays
 * React-Compiler friendly.
 *
 * Stable host-utility contract (design.md §6): `{ containerRef, onScroll,
 * scrollToBottom, isAtBottom }`.
 */
export function useAutoScroll(trigger: unknown, options?: UseAutoScrollOptions): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const threshold = options?.threshold ?? 80;

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom < threshold;
  }

  function scrollToBottom() {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
  }

  function isAtBottom() {
    return pinnedRef.current;
  }

  useEffect(() => {
    if (pinnedRef.current) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [trigger]);

  return {
    containerRef,
    onScroll,
    scrollToBottom,
    isAtBottom,
  };
}
