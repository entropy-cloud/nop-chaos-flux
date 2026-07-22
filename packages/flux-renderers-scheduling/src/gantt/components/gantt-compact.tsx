import React, { useState, useEffect, useRef } from 'react';
import { Button, cn } from '@nop-chaos/ui';

interface GanttCompactProps {
  children: React.ReactNode;
  compactBreakpoint?: number;
  className?: string;
  onCompactChange?: (compact: boolean) => void;
}

export function GanttCompact({
  children,
  compactBreakpoint = 768,
  className,
  onCompactChange,
}: GanttCompactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const compact = width < compactBreakpoint;
        setIsCompact(compact);
        onCompactChange?.(compact);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [compactBreakpoint, onCompactChange]);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[gantt-compact] Fullscreen API failed, falling back to CSS fullscreen:', err instanceof Error ? err.message : String(err));
      const styles = el.style;
      if (isFullscreen) {
        styles.position = '';
        styles.inset = '';
        styles.zIndex = '';
        styles.width = '';
        styles.height = '';
      } else {
        styles.position = 'fixed';
        styles.inset = '0';
        styles.zIndex = '9999';
        styles.width = '100vw';
        styles.height = '100vh';
        styles.background = 'white';
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const fullscreenSupported = typeof document !== 'undefined' && 'fullscreenEnabled' in document;

  return (
    <div
      ref={containerRef}
      className={cn('nop-gantt-compact relative', className)}
      data-compact={isCompact ? 'true' : undefined}
      data-fullscreen={isFullscreen ? 'true' : undefined}
    >
      {isCompact && (
        <div className="absolute top-1 right-1 z-20 flex gap-1">
          {fullscreenSupported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
              className="h-6 text-xs"
            >
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
