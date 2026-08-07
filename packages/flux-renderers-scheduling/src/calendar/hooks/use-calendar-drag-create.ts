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
  const currentDragRef = useRef<{ date: string; resourceId: string } | null>(null);

  const dismissTypeSelector = () => {
    setShowTypeSelector(false);
    activeRef.current = false;
    startInfoRef.current = null;
    currentDragRef.current = null;
    setPressing(false);
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

  // 1-8: 会话期（pointerdown → pointerup/pointercancel）全程挂窗口监听——
  // 旧实现只在 500ms 定时器触发（active=true）后才挂监听，快速点击（<500ms）
  // 的 pointerup 无监听消费，定时器照常置位 → 下一次任意 pointerup 误弹选择器。
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!pressing) return;

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
          currentDragRef.current = { date: cell.date, resourceId: cell.resourceId };
          setDragCreateState((prev) => ({
            ...prev,
            currentDate: cell.date,
            currentResource: cell.resourceId,
          }));
        }
      }
    };

    const resetSession = () => {
      activeRef.current = false;
      startInfoRef.current = null;
      currentDragRef.current = null;
      pointerDownPos.current = null;
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

    const handlePointerUp = (_e: PointerEvent) => {
      // 无条件清除定时器——快速点击（<500ms）也必须终结会话，不留「定时器
      // 稍后置位」的中间态。
      clearTimer();
      setPressing(false);
      if (!activeRef.current) {
        resetSession();
        return;
      }
      const start = startInfoRef.current;
      if (start) {
        setShowTypeSelector(true);
      } else {
        resetSession();
      }
    };

    const handlePointerCancel = (_e: PointerEvent) => {
      // 1-8: pointercancel 与 pointerup 同等终结：清定时器、清监听、复位会话。
      clearTimer();
      setPressing(false);
      resetSession();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      clearTimer();
    };
  }, [pressing, getCellFromPoint]);

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
    setPressing(true);

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
    setPressing(false);
    activeRef.current = false;
    startInfoRef.current = null;
    currentDragRef.current = null;
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

    const endDate = currentDragRef.current?.date ?? start.date;
    const [startDate, finalEndDate] = start.date <= endDate ? [start.date, endDate] : [endDate, start.date];

    if (onEventCreate) {
      onEventCreate({
        title: title ?? shiftType,
        type: shiftType,
        start: startDate,
        end: finalEndDate,
        resourceId: start.resourceId,
      });
    }

    activeRef.current = false;
    startInfoRef.current = null;
    currentDragRef.current = null;
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
