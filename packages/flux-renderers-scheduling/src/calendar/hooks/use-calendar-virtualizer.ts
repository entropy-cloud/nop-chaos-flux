import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface UseCalendarVirtualizerOptions {
  count: number;
  overscan?: number;
  estimateSize?: (index: number) => number;
}

export interface UseCalendarVirtualizerResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  virtualItems: readonly { index: number; start: number; size: number; key: unknown }[];
  totalSize: number;
}

const ROW_HEIGHT = 48;
const DEFAULT_OVERSCAN = 3;

export function useCalendarVirtualizer(options: UseCalendarVirtualizerOptions): UseCalendarVirtualizerResult {
  const { count, overscan = DEFAULT_OVERSCAN, estimateSize } = options;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: estimateSize ?? (() => ROW_HEIGHT),
    overscan,
  });

  return {
    scrollRef,
    virtualItems: rowVirtualizer.getVirtualItems(),
    totalSize: rowVirtualizer.getTotalSize(),
  };
}
