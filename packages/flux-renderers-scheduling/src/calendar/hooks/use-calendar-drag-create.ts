import { useState, useRef, useEffect } from 'react';

export interface DragCreatePayload {
  title: string;
  type: string;
  start: string;
  end: string;
  resourceId: string;
}

interface DragCreateState {
  active: boolean;
  startDate: string | null;
  startResource: string | null;
  currentDate: string | null;
  currentResource: string | null;
  currentX: number;
  currentY: number;
}

export interface UseCalendarDragCreateOptions {
  onEventCreate?: (payload: DragCreatePayload) => void;
  getCellFromPoint?: (x: number, y: number) => { date: string; resourceId: string } | null;
  longPressMs?: number;
}

export interface UseCalendarDragCreateResult {
  dragCreateState: DragCreateState;
  startCellDrag: (date: string, resourceId: string, pointerEvent: React.PointerEvent) => void;
  cancelCreate: () => void;
  confirmCreate: (shiftType: string, title?: string) => void;
  showTypeSelector: boolean;
  availableTypes: string[];
  selectType: (type: string) => void;
  dismissTypeSelector: () => void;
}

const DEFAULT_SHIFT_TYPES = ['shift', 'leave', 'appointment', 'maintenance'];

export function useCalendarDragCreate(options: UseCalendarDragCreateOptions): UseCalendarDragCreateResult {
  const { onEventCreate, getCellFromPoint, longPressMs = 500 } = options;

  const [dragCreateState, setDragCreateState] = useState<DragCreateState>({
    active: false,
    startDate: null,
    startResource: null,
    currentDate: null,
    currentResource: null,
    currentX: 0,
    currentY: 0,
  });

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [availableTypes] = useState<string[]>(DEFAULT_SHIFT_TYPES);

  const pointerDownPos = useRef<{ x: number; y: number; date: string; resourceId: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const startInfoRef = useRef<{ date: string; resourceId: string } | null>(null);

  const dismissTypeSelector = () => {
    setShowTypeSelector(false);
    activeRef.current = false;
    startInfoRef.current = null;
    setDragCreateState({
      active: false,
      startDate: null,
      startResource: null,
      currentDate: null,
      currentResource: null,
      currentX: 0,
      currentY: 0,
    });
  };

  useEffect(() => {
    const clearTimer = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;

      setDragCreateState((prev) => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
      }));

      if (getCellFromPoint) {
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) {
          setDragCreateState((prev) => ({
            ...prev,
            currentDate: cell.date,
            currentResource: cell.resourceId,
          }));
        }
      }
    };

    const handlePointerUp = (_e: PointerEvent) => {
      clearTimer();
      if (!activeRef.current) return;

      const start = startInfoRef.current;
      if (start) {
        setShowTypeSelector(true);
      } else {
        activeRef.current = false;
        setDragCreateState({
          active: false,
          startDate: null,
          startResource: null,
          currentDate: null,
          currentResource: null,
          currentX: 0,
          currentY: 0,
        });
      }
    };

    if (dragCreateState.active) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragCreateState.active, getCellFromPoint]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  const startCellDrag = (date: string, resourceId: string, pointerEvent: React.PointerEvent) => {
    pointerDownPos.current = { x: pointerEvent.clientX, y: pointerEvent.clientY, date, resourceId };

    longPressTimer.current = setTimeout(() => {
      activeRef.current = true;
      startInfoRef.current = { date, resourceId };
      setDragCreateState({
        active: true,
        startDate: date,
        startResource: resourceId,
        currentDate: date,
        currentResource: resourceId,
        currentX: pointerEvent.clientX,
        currentY: pointerEvent.clientY,
      });
    }, longPressMs);
  };

  const cancelCreate = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    activeRef.current = false;
    startInfoRef.current = null;
    pointerDownPos.current = null;
    setShowTypeSelector(false);
    setDragCreateState({
      active: false,
      startDate: null,
      startResource: null,
      currentDate: null,
      currentResource: null,
      currentX: 0,
      currentY: 0,
    });
  };

  const confirmCreate = (shiftType: string, title?: string) => {
    const start = startInfoRef.current;
    if (!start) return;

    if (onEventCreate) {
      onEventCreate({
        title: title ?? shiftType,
        type: shiftType,
        start: start.date,
        end: start.date,
        resourceId: start.resourceId,
      });
    }

    activeRef.current = false;
    startInfoRef.current = null;
    setShowTypeSelector(false);
    setDragCreateState({
      active: false,
      startDate: null,
      startResource: null,
      currentDate: null,
      currentResource: null,
      currentX: 0,
      currentY: 0,
    });
  };

  const selectType = (type: string) => {
    confirmCreate(type);
  };

  return {
    dragCreateState,
    startCellDrag,
    cancelCreate,
    confirmCreate,
    showTypeSelector,
    availableTypes,
    selectType,
    dismissTypeSelector,
  };
}
