import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const ROW_HEIGHT = 24;
const VIRTUALIZATION_THRESHOLD = 500;

interface DiffVirtualListProps {
  totalRows: number;
  children: (index: number) => ReactNode;
  overscan?: number;
}

export function DiffVirtualList({ totalRows, children, overscan = 10 }: DiffVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan,
  });

  return (
    <div ref={parentRef} className="nop-diff-virtual-list" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {children(virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function shouldVirtualize(totalRows: number): boolean {
  return totalRows > VIRTUALIZATION_THRESHOLD;
}

