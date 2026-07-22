import { useVirtualizer } from '@tanstack/react-virtual';

export interface UseKanbanVirtualizerOptions {
  cardCount: number;
  overscan: number;
  estimatedCardHeight: number;
  gap: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  virtualizationEnabled?: boolean;
}

export function useKanbanVirtualizer({
  cardCount,
  overscan = 5,
  estimatedCardHeight = 80,
  gap = 8,
  scrollContainerRef,
  virtualizationEnabled = false,
}: UseKanbanVirtualizerOptions) {
  const virtualizer = useVirtualizer({
    count: virtualizationEnabled ? cardCount : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedCardHeight + gap,
    overscan,
    measureElement: (element) => element.getBoundingClientRect().height,
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
