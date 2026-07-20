import { useCallback, useRef, useEffect } from 'react';
import { useGanttStore } from '../gantt-context.js';

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

interface DragState {
  mode: DragMode;
  taskId: string | number;
  startX: number;
  startY: number;
  originalX: number;
  originalW: number;
  ghostEl: HTMLElement | null;
}

export function useGanttDrag(_containerRef: React.RefObject<HTMLElement | null>) {
  const store = useGanttStore();
  const dragRef = useRef<DragState | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);

  const createGhost = useCallback((barEl: HTMLElement) => {
    const ghost = barEl.cloneNode(true) as HTMLElement;
    ghost.classList.add('nop-gantt-bar-ghost');
    ghost.style.position = 'fixed';
    ghost.style.opacity = '0.8';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '1000';
    ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);
    return ghost;
  }, []);

  const onPointerDown = useCallback((e: PointerEvent, taskId: string | number, mode: DragMode) => {
    if (!mode) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ghost = createGhost(target);
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghostRef.current = ghost;

    dragRef.current = {
      mode,
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      originalX: rect.left,
      originalW: rect.width,
      ghostEl: ghost,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const cellWidth = store.cellWidth;
      const dayDelta = Math.round(dx / cellWidth);
      const task = store.tasks.get(dragRef.current.taskId);
      if (task) {
        if (dragRef.current.mode === 'move' && dayDelta !== 0) {
          const oldStart = new Date(task.start);
          const newStart = new Date(oldStart);
          newStart.setDate(newStart.getDate() + dayDelta);
          const oldEnd = new Date(task.end);
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() + dayDelta);
          store.updateTask(task.id, {
            start: newStart.toISOString().slice(0, 10),
            end: newEnd.toISOString().slice(0, 10),
          });
        } else if (dragRef.current.mode === 'resize-end' && dayDelta !== 0) {
          const oldEnd = new Date(task.end);
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() + dayDelta);
          if (newEnd > new Date(task.start)) {
            store.updateTask(task.id, { end: newEnd.toISOString().slice(0, 10) });
          }
        } else if (dragRef.current.mode === 'resize-start' && dayDelta !== 0) {
          const oldStart = new Date(task.start);
          const newStart = new Date(oldStart);
          newStart.setDate(newStart.getDate() + dayDelta);
          if (newStart < new Date(task.end)) {
            store.updateTask(task.id, { start: newStart.toISOString().slice(0, 10) });
          }
        }
      }
      cleanup();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        cleanup();
      }
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      if (ghostRef.current) {
        ghostRef.current.remove();
        ghostRef.current = null;
      }
      dragRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
  }, [store, createGhost]);

  useEffect(() => {
    return () => {
      if (ghostRef.current) ghostRef.current.remove();
    };
  }, []);

  return { dragRef, onPointerDown };
}
