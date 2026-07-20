import { useCallback, useRef, useEffect } from 'react';
import { useGanttStore } from '../gantt-context.js';

export function useGanttLinkDraw(svgRef: React.RefObject<SVGSVGElement | null>) {
  const store = useGanttStore();
  const drawingRef = useRef<{
    sourceId: string | number;
    startX: number;
    startY: number;
    tempLine: SVGLineElement | null;
  } | null>(null);

  const onLinkHandlePointerDown = useCallback((e: PointerEvent, taskId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    const task = store.tasks.get(taskId);
    if (!task || !svgRef.current) return;

    const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempLine.setAttribute('stroke', '#3b82f6');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('stroke-dasharray', '5,3');
    tempLine.setAttribute('pointer-events', 'none');
    svgRef.current.appendChild(tempLine);

    drawingRef.current = {
      sourceId: taskId,
      startX: task.$x + task.$w,
      startY: task.$y + task.$h / 2,
      tempLine,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!drawingRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left + (svgRef.current.parentElement?.scrollLeft ?? 0);
      const y = ev.clientY - rect.top;
      drawingRef.current.tempLine?.setAttribute('x1', String(drawingRef.current.startX));
      drawingRef.current.tempLine?.setAttribute('y1', String(drawingRef.current.startY));
      drawingRef.current.tempLine?.setAttribute('x2', String(x));
      drawingRef.current.tempLine?.setAttribute('y2', String(y));
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!drawingRef.current) return;
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const taskBarEl = target?.closest('[data-task-id]');
      if (taskBarEl) {
        const targetId = taskBarEl.getAttribute('data-task-id');
        if (targetId && targetId !== String(drawingRef.current.sourceId)) {
          store.addLink(drawingRef.current.sourceId, targetId, 'finish_to_start');
        }
      }
      cleanup();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cleanup();
    };

    const cleanup = () => {
      if (drawingRef.current?.tempLine) {
        drawingRef.current.tempLine.remove();
      }
      drawingRef.current = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
  }, [store, svgRef]);

  useEffect(() => {
    return () => {
      if (drawingRef.current?.tempLine) {
        drawingRef.current.tempLine.remove();
      }
    };
  }, []);

  return { onLinkHandlePointerDown };
}
