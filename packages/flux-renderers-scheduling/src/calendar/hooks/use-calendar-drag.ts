import { useState, useRef, useEffect } from 'react';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';

export interface DragSwapPayload {
  eventId: string;
  fromResource: string;
  toResource: string;
  fromDate: string;
  toDate: string;
  event: CalendarEvent;
}

interface DragSwapState {
  active: boolean;
  sourceEvent: CalendarEvent | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetDate: string | null;
  targetResource: string | null;
}

export interface UseCalendarDragOptions {
  events: CalendarEvent[];
  resources: CalendarResource[];
  onEventChange?: (payload: DragSwapPayload) => void;
  getCellFromPoint?: (x: number, y: number) => { date: string; resourceId: string } | null;
  onKeyboardMoveEvent?: (eventId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Per-pointermove ghost frame hook. The consumer owns the ghost element
   *  and applies (x, y) as direct style writes — pointer coordinates in
   *  state would re-render the whole grid per mousemove. */
  onGhostFrame?: (x: number, y: number) => void;
}

export interface UseCalendarDragResult {
  dragState: DragSwapState;
  startDrag: (event: CalendarEvent, pointerEvent: React.PointerEvent) => void;
  cancelDrag: () => void;
  confirmDrop: () => void;
  startKeyboardDrag: (event: CalendarEvent, origin?: { x: number; y: number }) => void;
  moveKeyboardDrag: (direction: 'up' | 'down' | 'left' | 'right') => void;
  cancelKeyboardDrag: () => void;
  confirmKeyboardDrop: () => void;
}

export function useCalendarDrag(options: UseCalendarDragOptions): UseCalendarDragResult {
  const { onEventChange, getCellFromPoint, onKeyboardMoveEvent } = options;

  const onEventChangeRef = useRef(onEventChange);
  useEffect(() => { onEventChangeRef.current = onEventChange; }, [onEventChange]);
  const getCellFromPointRef = useRef(getCellFromPoint);
  useEffect(() => { getCellFromPointRef.current = getCellFromPoint; }, [getCellFromPoint]);
  const onKeyboardMoveEventRef = useRef(onKeyboardMoveEvent);
  useEffect(() => { onKeyboardMoveEventRef.current = onKeyboardMoveEvent; }, [onKeyboardMoveEvent]);
  const onGhostFrameRef = useRef(options.onGhostFrame);
  useEffect(() => { onGhostFrameRef.current = options.onGhostFrame; }, [options.onGhostFrame]);

  const [dragState, setDragState] = useState<DragSwapState>({
    active: false,
    sourceEvent: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetDate: null,
    targetResource: null,
  });

  const sourceEventRef = useRef<CalendarEvent | null>(null);
  const pendingTargetRef = useRef<{ date: string; resourceId: string } | null>(null);
  const activeRef = useRef(false);
  const keyboardActiveRef = useRef(false);

  const cancelDrag = () => {
    activeRef.current = false;
    keyboardActiveRef.current = false;
    sourceEventRef.current = null;
    pendingTargetRef.current = null;
    setDragState({
      active: false,
      sourceEvent: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      targetDate: null,
      targetResource: null,
    });
  };

  const confirmDrop = () => {
    const source = sourceEventRef.current;
    const target = pendingTargetRef.current;
    if ((!activeRef.current && !keyboardActiveRef.current) || !target || !source) return;

    if (onEventChangeRef.current) {
      onEventChangeRef.current({
        eventId: source.id,
        fromResource: source.resourceId ?? '',
        toResource: target.resourceId,
        fromDate: source.start.split('T')[0] ?? source.start,
        toDate: target.date,
        event: source,
      });
    }

    cancelDrag();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;

      // Per-frame ghost positioning is a direct style write: putting pointer
      // coordinates in state re-rendered the whole grid per mousemove.
      onGhostFrameRef.current?.(e.clientX, e.clientY);

      // Cell-crossing updates stay in state (they drive the drop-target
      // highlight effect) but only fire when the target cell actually flips.
      if (getCellFromPointRef.current) {
        const cell = getCellFromPointRef.current(e.clientX, e.clientY);
        const prev = pendingTargetRef.current;
        if (!cell) {
          if (prev) {
            pendingTargetRef.current = null;
            setDragState((p) => ({ ...p, targetDate: null, targetResource: null }));
          }
        } else {
          pendingTargetRef.current = cell;
          if (!prev || prev.date !== cell.date || prev.resourceId !== cell.resourceId) {
            setDragState((p) => ({ ...p, targetDate: cell.date, targetResource: cell.resourceId }));
          }
        }
      }
    };

    const handlePointerUp = (_e: PointerEvent) => {
      if (!activeRef.current) return;

      const source = sourceEventRef.current;
      const target = pendingTargetRef.current;

      if (target && source && onEventChangeRef.current) {
        onEventChangeRef.current({
          eventId: source.id,
          fromResource: source.resourceId ?? '',
          toResource: target.resourceId,
          fromDate: source.start.split('T')[0] ?? source.start,
          toDate: target.date,
          event: source,
        });
      }

      cancelDrag();
    };

    // 2-14: pointercancel (touch-scroll interrupt / OS gesture) terminates the
    // drag session without committing — mirror the use-calendar-drag-create
    // pointercancel pattern (1747-1, 1-8): clear state, no drop dispatch.
    const handlePointerCancel = () => {
      if (!activeRef.current) return;
      cancelDrag();
    };

    if (dragState.active) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
      };
    }
  }, [dragState.active]);

  const startDrag = (event: CalendarEvent, pointerEvent: React.PointerEvent) => {
    activeRef.current = true;
    sourceEventRef.current = { ...event };
    pendingTargetRef.current = null;

    setDragState({
      active: true,
      sourceEvent: event,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      currentX: pointerEvent.clientX,
      currentY: pointerEvent.clientY,
      targetDate: null,
      targetResource: null,
    });
  };

  const startKeyboardDrag = (event: CalendarEvent, origin?: { x: number; y: number }) => {
    keyboardActiveRef.current = true;
    sourceEventRef.current = { ...event };
    pendingTargetRef.current = {
      date: event.start.split('T')[0] ?? event.start,
      resourceId: event.resourceId ?? '',
    };

    // [G4-R2-视角10-01] anchor the ghost at the source event's on-screen
    // position — hardcoding (0,0) pinned it to the viewport corner.
    const originX = origin?.x ?? 0;
    const originY = origin?.y ?? 0;
    setDragState({
      active: true,
      sourceEvent: event,
      startX: originX,
      startY: originY,
      currentX: originX,
      currentY: originY,
      targetDate: event.start.split('T')[0] ?? event.start,
      targetResource: event.resourceId ?? '',
    });
  };

  const moveKeyboardDrag = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!keyboardActiveRef.current || !sourceEventRef.current) return;

    onKeyboardMoveEventRef.current?.(sourceEventRef.current.id, direction);
  };

  const cancelKeyboardDrag = () => {
    cancelDrag();
  };

  const confirmKeyboardDrop = () => {
    // [G4-R2-视角10-01] keyboard moves dispatch live per keypress
    // (moveKeyboardDrag → onKeyboardMoveEvent), so Enter only finalizes the
    // session. Running the pointer confirmDrop path here would re-dispatch
    // the seeded origin target — sending the already-moved event back to its
    // original date/resource.
    if (keyboardActiveRef.current) {
      cancelDrag();
      return;
    }
    confirmDrop();
  };

  return {
    dragState,
    startDrag,
    cancelDrag,
    confirmDrop,
    startKeyboardDrag,
    moveKeyboardDrag,
    cancelKeyboardDrag,
    confirmKeyboardDrop,
  };
}
