import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@nop-chaos/ui';

const MIN_GRID_WIDTH = 200;
const MAX_GRID_WIDTH_PERCENT = 0.7;
const RESIZE_STEP = 20;

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

  const clampWidth = useCallback((width: number) => {
    if (!containerRef.current) return width;
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxWidth = containerRect.width * MAX_GRID_WIDTH_PERCENT;
    return Math.max(MIN_GRID_WIDTH, Math.min(maxWidth, width));
  }, []);

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

  const handleResizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setGridWidth((prev) => clampWidth(prev - RESIZE_STEP));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setGridWidth((prev) => clampWidth(prev + RESIZE_STEP));
    }
  }, [clampWidth]);

  return (
    <div ref={containerRef} className={cn('nop-gantt flex flex-col h-full', className)}>
      {header}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="overflow-hidden flex-shrink-0" style={{ width: gridWidth }}>
          {grid}
        </div>
        <div
          role="separator"
          tabIndex={0}
          aria-label="Resize grid panel"
          aria-valuenow={gridWidth}
          aria-valuemin={MIN_GRID_WIDTH}
          aria-orientation="vertical"
          className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 shrink-0 relative z-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onPointerDown={onPointerDown}
          onKeyDown={handleResizeKeyDown}
        />
        <div className="flex-1 overflow-hidden min-w-0">
          {timeline}
        </div>
      </div>
    </div>
  );
}
