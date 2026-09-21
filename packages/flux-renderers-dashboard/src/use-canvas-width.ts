import React, { useEffect, useRef, useState } from 'react';

/**
 * 画布宽度测量 hook（编辑态/运行态共用同一测量模式，design: docs/components/dashboard-editor/design.md §2.2）。
 *
 * ResizeObserver 实测容器宽（`width > 0` 才覆盖），初始/回退 1200 兜底
 * SSR/首帧（实测 width=0）与 ResizeObserver 缺失场景（jsdom/旧宿主）。
 * 面板像素换算（panelToPixels）消费该宽度：首帧回退 → 实测事件到达后一次重排。
 */
export function useCanvasWidth(): {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
} {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setCanvasWidth(width);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { canvasRef, canvasWidth };
}
