import { useRef, useEffect, useState } from 'react';
import type { GanttStore } from '../gantt-store.js';
import type { GanttLinkType } from '../gantt.types.js';

export function useGanttLinkDraw(
  store: GanttStore,
  svgRef: React.RefObject<SVGSVGElement | null>,
  onCommit?: (sourceId: string | number, targetId: string | number, linkType: string) => void,
  enabled?: boolean,
) {
  const drawingRef = useRef<{
    sourceId: string | number;
    sourceSide: 'start' | 'end';
    startX: number;
    startY: number;
    tempLine: SVGLineElement | null;
  } | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onCommitRef = useRef(onCommit);
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);

  const cleanup = () => {
    if (drawingRef.current?.tempLine) {
      drawingRef.current.tempLine.remove();
    }
    drawingRef.current = null;
    setIsLinking(false);
    cleanupRef.current = null;
  };

  function inferLinkType(sourceSide: 'start' | 'end', targetSide: 'start' | 'end'): GanttLinkType {
    if (sourceSide === 'end' && targetSide === 'start') return 'finish_to_start';
    if (sourceSide === 'start' && targetSide === 'start') return 'start_to_start';
    if (sourceSide === 'end' && targetSide === 'end') return 'finish_to_finish';
    return 'start_to_finish';
  }

  const onLinkHandlePointerDown = (e: PointerEvent, taskId: string | number, side: 'start' | 'end') => {
    if (enabled === false) return;
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
      sourceSide: side,
      startX: task.$x + task.$w,
      startY: task.$y + task.$h / 2,
      tempLine,
    };
    setIsLinking(true);

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
          const targetHandle = target?.closest('[data-slot="gantt-bar-link-handle"]');
          const targetSide = (targetHandle as HTMLElement)?.getAttribute('data-handle-side') as 'start' | 'end' || 'start';
          const linkType = inferLinkType(drawingRef.current.sourceSide, targetSide);
          onCommitRef.current?.(drawingRef.current.sourceId, targetId, linkType);
          store.addLink(drawingRef.current.sourceId, targetId, linkType);
        }
      }
      cleanup();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cleanup();
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);

    cleanupRef.current = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      cleanup();
    };
  };

  const startKeyboardLink = (sourceTaskId: string | number) => {
    const task = store.tasks.get(sourceTaskId);
    if (!task || !svgRef.current) return;

    const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempLine.setAttribute('stroke', '#3b82f6');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('stroke-dasharray', '5,3');
    tempLine.setAttribute('pointer-events', 'none');
    svgRef.current.appendChild(tempLine);

    drawingRef.current = {
      sourceId: sourceTaskId,
      sourceSide: 'end',
      startX: task.$x + task.$w,
      startY: task.$y + task.$h / 2,
      tempLine,
    };
    setIsLinking(true);
  };

  const completeKeyboardLink = (targetTaskId: string | number) => {
    if (!drawingRef.current) return;
    if (targetTaskId !== String(drawingRef.current.sourceId)) {
      onCommitRef.current?.(drawingRef.current.sourceId, targetTaskId, 'finish_to_start');
      store.addLink(drawingRef.current.sourceId, targetTaskId, 'finish_to_start');
    }
    cleanup();
  };

  const cancelLink = () => {
    cleanup();
  };

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (drawingRef.current?.tempLine) {
        drawingRef.current.tempLine.remove();
      }
    };
  }, []);

  return { onLinkHandlePointerDown, startKeyboardLink, completeKeyboardLink, cancelLink, isLinking };
}
