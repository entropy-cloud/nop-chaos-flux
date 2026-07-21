import { useCallback, useRef, useEffect } from 'react';

export function useGanttScroll(
  gridRef: React.RefObject<HTMLElement | null>,
  timelineRef: React.RefObject<HTMLElement | null>,
) {
  const rafRef = useRef<number | null>(null);
  const syncRef = useRef(false);

  const syncScroll = useCallback((source: 'grid' | 'timeline') => {
    if (syncRef.current) return;
    syncRef.current = true;

    const gridEl = gridRef.current;
    const timelineEl = timelineRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (source === 'grid' && gridEl && timelineEl) {
        timelineEl.scrollTop = gridEl.scrollTop;
      } else if (source === 'timeline' && gridEl && timelineEl) {
        gridEl.scrollTop = timelineEl.scrollTop;
      }
      syncRef.current = false;
      rafRef.current = null;
    });
  }, [gridRef, timelineRef]);

  useEffect(() => {
    const grid = gridRef.current;
    const timeline = timelineRef.current;
    if (!grid || !timeline) return;
    const onGridScroll = () => syncScroll('grid');
    const onTimelineScroll = () => syncScroll('timeline');
    grid.addEventListener('scroll', onGridScroll, { passive: true });
    timeline.addEventListener('scroll', onTimelineScroll, { passive: true });
    return () => {
      grid.removeEventListener('scroll', onGridScroll);
      timeline.removeEventListener('scroll', onTimelineScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gridRef, timelineRef, syncScroll]);
}
