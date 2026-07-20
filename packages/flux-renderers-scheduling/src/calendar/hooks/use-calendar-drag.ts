import { useState, useCallback, useRef, useEffect } from 'react';
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
}

export interface UseCalendarDragResult {
  dragState: DragSwapState;
  startDrag: (event: CalendarEvent, pointerEvent: React.PointerEvent) => void;
  cancelDrag: () => void;
  confirmDrop: () => void;
}

export function useCalendarDrag(options: UseCalendarDragOptions): UseCalendarDragResult {
  const { onEventChange, getCellFromPoint } = options;

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

  const cancelDrag = useCallback(() => {
    activeRef.current = false;
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
  }, []);

  const confirmDrop = useCallback(() => {
    const source = sourceEventRef.current;
    const target = pendingTargetRef.current;
    if (!activeRef.current || !target || !source) return;

    if (onEventChange) {
      onEventChange({
        eventId: source.id,
        fromResource: source.resourceId ?? '',
        toResource: target.resourceId,
        fromDate: source.start.split('T')[0] ?? source.start,
        toDate: target.date,
        event: source,
      });
    }

    cancelDrag();
  }, [onEventChange, cancelDrag]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!activeRef.current) return;

    setDragState((prev) => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    if (getCellFromPoint) {
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        pendingTargetRef.current = cell;
        setDragState((prev) => ({
          ...prev,
          targetDate: cell.date,
          targetResource: cell.resourceId,
        }));
      } else {
        pendingTargetRef.current = null;
        setDragState((prev) => ({
          ...prev,
          targetDate: null,
          targetResource: null,
        }));
      }
    }
  }, [getCellFromPoint]);

  const handlePointerUp = useCallback((_e: PointerEvent) => {
    if (!activeRef.current) return;

    const source = sourceEventRef.current;
    const target = pendingTargetRef.current;

    if (target && source && onEventChange) {
      onEventChange({
        eventId: source.id,
        fromResource: source.resourceId ?? '',
        toResource: target.resourceId,
        fromDate: source.start.split('T')[0] ?? source.start,
        toDate: target.date,
        event: source,
      });
    }

    cancelDrag();
  }, [onEventChange, cancelDrag]);

  useEffect(() => {
    if (dragState.active) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragState.active, handlePointerMove, handlePointerUp]);

  const startDrag = useCallback((event: CalendarEvent, pointerEvent: React.PointerEvent) => {
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
  }, []);

  return {
    dragState,
    startDrag,
    cancelDrag,
    confirmDrop,
  };
}
