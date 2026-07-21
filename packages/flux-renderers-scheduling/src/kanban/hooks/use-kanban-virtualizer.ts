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
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack React Virtual API returns functions incompatible with compiler memoization
  const virtualizer = useVirtualizer({
    count: cardCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedCardHeight + gap,
    overscan,
  });

  const scrollToIndex = (index: number) => {
    virtualizer.scrollToIndex(index, { align: 'center' });
  };

  return {
    virtualizer,
    totalSize: virtualizer.getTotalSize(),
    virtualItems: virtualizer.getVirtualItems(),
    scrollToIndex,
  };
}
