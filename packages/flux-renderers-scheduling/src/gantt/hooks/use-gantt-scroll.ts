import { useRef, useEffect } from 'react';

export function useGanttScroll(
  gridRef: React.RefObject<HTMLElement | null>,
  timelineRef: React.RefObject<HTMLElement | null>,
  onScroll?: (scrollLeft: number, scrollTop: number) => void,
  /** 1-7: 就绪信号——loading/empty 首挂载（refs 为空）时监听不挂；ready 翻真后必挂。 */
  active = true,
) {
  const rafRef = useRef<number | null>(null);
  const syncRef = useRef(false);
  const onScrollRef = useRef(onScroll);
  useEffect(() => { onScrollRef.current = onScroll; }, [onScroll]);

  useEffect(() => {
    // 1-7: 监听对「就绪信号」响应，不依赖稳定 ref 对象 + 首挂载 early-return。
    // 首挂载处于 loading/empty（refs 为空）时 active=false 不挂；数据到达
    // active 翻真后 effect 重跑，此时 refs 已非空，grid↔timeline 同步必挂。
    if (!active) return;
    const syncScroll = (source: 'grid' | 'timeline') => {
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
    };

    const grid = gridRef.current;
    const timeline = timelineRef.current;
    if (!grid || !timeline) return;
    const onGridScroll = () => {
      syncScroll('grid');
      onScrollRef.current?.(grid.scrollLeft, grid.scrollTop);
    };
    const onTimelineScroll = () => {
      syncScroll('timeline');
      onScrollRef.current?.(timeline.scrollLeft, timeline.scrollTop);
    };
    grid.addEventListener('scroll', onGridScroll, { passive: true });
    timeline.addEventListener('scroll', onTimelineScroll, { passive: true });
    return () => {
      grid.removeEventListener('scroll', onGridScroll);
      timeline.removeEventListener('scroll', onTimelineScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gridRef, timelineRef, active]);
}
