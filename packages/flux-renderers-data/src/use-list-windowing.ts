import React, { useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ResolvedListPagination } from './list-pagination.js';

// Windowing gate (plan 2026-09-29-6): only infinite mode above this count
// virtualizes; pagination/page mode and small lists render fully mounted.
export const LIST_VIRTUAL_THRESHOLD = 150;

export interface ListWindowing {
  windowingActive: boolean;
  listRootRef: React.RefObject<HTMLDivElement | null>;
  /** null = render fully mounted (below threshold, no scroller, or disabled). */
  virtualRows: ReturnType<
    typeof useVirtualizer
  >['getVirtualItems'] extends () => infer R
    ? R | null
    : never;
  measureElement: (node: Element | null) => void;
  /** Height of the trailing spacer (total size minus the last rendered row end). */
  windowBottomSpacerHeight: number;
}

/**
 * Infinite-list windowing. Layout-neutral by construction — the scroll
 * element is the nearest scrollable ANCESTOR of the list root (mobile
 * infinite-scroll precedent, MM-20); when none exists the list renders fully
 * mounted exactly as before (no wrapper, no maxHeight, no schema change).
 * Scope lifecycle: off-window item scopes dispose and remount; selection
 * lives in the renderer's component state so it persists across windows.
 */
export function useListWindowing(
  visibleItems: unknown[],
  pagination: ResolvedListPagination,
): ListWindowing {
  const windowingActive =
    pagination.enabled && pagination.mode === 'infinite' && visibleItems.length > LIST_VIRTUAL_THRESHOLD;
  const listRootRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!windowingActive) return;
    const root = listRootRef.current;
    if (!root) return;
    let current: HTMLElement | null = root.parentElement;
    while (current) {
      // inline style first — happy-dom's getComputedStyle does not always
      // resolve shorthand values from the style attribute
      const overflowY = current.style?.overflowY || getComputedStyle(current).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        setScrollElement(current);
        return;
      }
      current = current.parentElement;
    }
    setScrollElement(null);
  }, [windowingActive]);

  const virtualizer = useVirtualizer({
    count: windowingActive && scrollElement ? visibleItems.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => 44,
    overscan: 8,
  });

  const virtualRows =
    windowingActive && scrollElement ? virtualizer.getVirtualItems() : null;
  const measureElement = virtualizer.measureElement;
  const windowBottomSpacerHeight =
    virtualRows && virtualRows.length > 0
      ? Math.max(0, virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end)
      : 0;

  return { windowingActive, listRootRef, virtualRows, measureElement, windowBottomSpacerHeight };
}
