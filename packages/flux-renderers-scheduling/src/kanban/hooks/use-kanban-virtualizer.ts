import { useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface UseKanbanVirtualizerOptions {
  cardCount: number;
  overscan: number;
  estimatedCardHeight: number;
  gap: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useKanbanVirtualizer({
  cardCount,
  overscan = 5,
  estimatedCardHeight = 80,
  gap = 8,
  scrollContainerRef,
}: UseKanbanVirtualizerOptions) {
  const virtualizer = useVirtualizer({
    count: cardCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedCardHeight + gap,
    overscan,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: 'center' });
    },
    [virtualizer],
  );

  return {
    virtualizer,
    totalSize: virtualizer.getTotalSize(),
    virtualItems: virtualizer.getVirtualItems(),
    scrollToIndex,
  };
}
