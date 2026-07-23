import { useCallback, useEffect, useRef } from 'react';

export interface UseAutoScrollOptions {
  /** Distance from bottom (px) within which auto-scroll stays "pinned". */
  threshold?: number;
}

export interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
  isPinned: () => boolean;
}

/**
 * Auto-scroll-to-bottom hook. Tracks whether the user is pinned to the bottom
 * of a scroll container; when pinned, scrolls to bottom whenever `trigger`
 * changes (a primitive the caller derives, e.g. `messages.length` or a content
 * signature). When the user scrolls up, auto-scroll pauses until they return
 * near the bottom (mirrors tiny-robot `useAutoScroll`).
 *
 * `trigger` is a static dependency (not a dynamic deps array) so it stays
 * React-Compiler friendly.
 *
 * P0 internal use; promoted to a public host utility in P2 (design.md §6).
 */
export function useAutoScroll(trigger: unknown, options?: UseAutoScrollOptions): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const threshold = options?.threshold ?? 80;

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom < threshold;
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
  }, []);

  const isPinned = useCallback(() => pinnedRef.current, []);

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
    isPinned,
  };
}
