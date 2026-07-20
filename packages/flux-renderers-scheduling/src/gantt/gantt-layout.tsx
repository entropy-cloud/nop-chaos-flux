import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@nop-chaos/ui';

const MIN_GRID_WIDTH = 200;
const MAX_GRID_WIDTH_PERCENT = 0.7;

interface GanttLayoutProps {
  grid: React.ReactNode;
  timeline: React.ReactNode;
  header: React.ReactNode;
  className?: string;
}

export function GanttLayout({ grid, timeline, header, className }: GanttLayoutProps) {
  const [gridWidth, setGridWidth] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = gridWidth;

    const onPointerMove = (ev: PointerEvent) => {
      if (!resizingRef.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * MAX_GRID_WIDTH_PERCENT;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(MIN_GRID_WIDTH, Math.min(maxWidth, startWidth + delta));
      setGridWidth(newWidth);
    };

    const onPointerUp = () => {
      resizingRef.current = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [gridWidth]);

  return (
    <div ref={containerRef} className={cn('nop-gantt flex flex-col h-full', className)}>
      {header}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="overflow-hidden flex-shrink-0" style={{ width: gridWidth }}>
          {grid}
        </div>
        <div
          className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 shrink-0 relative z-10"
          onPointerDown={onPointerDown}
        />
        <div className="flex-1 overflow-hidden min-w-0">
          {timeline}
        </div>
      </div>
    </div>
  );
}
