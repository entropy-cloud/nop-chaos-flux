import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import type { NopDebuggerController } from '../types';

type PointerCaptureTarget = HTMLElement & {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
};

function setPointerCaptureSafely(target: HTMLElement, pointerId: number) {
  const pointerCaptureTarget = target as PointerCaptureTarget;
  if (typeof pointerCaptureTarget.setPointerCapture !== 'function') {
    return;
  }

  try {
    pointerCaptureTarget.setPointerCapture(pointerId);
  } catch (error) {
    void error;
  }
}

function releasePointerCaptureSafely(target: HTMLElement, pointerId: number) {
  const pointerCaptureTarget = target as PointerCaptureTarget;
  if (typeof pointerCaptureTarget.releasePointerCapture !== 'function') {
    return;
  }

  try {
    pointerCaptureTarget.releasePointerCapture(pointerId);
  } catch (error) {
    void error;
  }
}

export function useDebuggerSnapshot(controller: NopDebuggerController) {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}

export function useDraggablePosition(controller: NopDebuggerController, initial: { x: number; y: number }, onTap?: () => void) {
  const [position, setPosition] = useState(initial);
  const positionRef = useRef(initial);
  const dragState = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
    target: HTMLElement;
  } | null>(null);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const clearDrag = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      releasePointerCaptureSafely(dragState.current.target, event.pointerId);

      if (dragState.current.hasMoved) {
        controller.setPanelPosition(positionRef.current);
      } else {
        onTap?.();
      }

      hasMovedRef.current = dragState.current.hasMoved;
      dragState.current = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        clearDrag(event);
        return;
      }

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragState.current.hasMoved = true;
      }

      const next = {
        x: Math.max(12, event.clientX - dragState.current.offsetX),
        y: Math.max(12, event.clientY - dragState.current.offsetY),
      };

      positionRef.current = next;
      setPosition(next);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, [controller, onTap]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget.parentElement;
      if (!target) {
        return;
      }

      hasMovedRef.current = false;
      dragState.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - position.x,
        offsetY: event.clientY - position.y,
        startX: event.clientX,
        startY: event.clientY,
        hasMoved: false,
        target,
      };

      setPointerCaptureSafely(target, event.pointerId);
      event.preventDefault();
    },
  };

  const consumeClick = () => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return true;
    }
    hasMovedRef.current = false;
    return false;
  };

  return { position, bind, consumeClick };
}

export function useResizablePanel() {
  const [width, setWidth] = useState(420);
  const resizeState = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) return;
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const move = (event: PointerEvent) => {
      if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) {
        clear(event);
        return;
      }
      const delta = event.clientX - resizeState.current.startX;
      const next = Math.max(280, Math.min(window.innerWidth - 40, resizeState.current.startWidth - delta));
      setWidth(next);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, []);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      resizeState.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      setPointerCaptureSafely(event.currentTarget as HTMLElement, event.pointerId);
      event.preventDefault();
    },
  };

  return { width, bind };
}

export function useLauncherDrag(controller: NopDebuggerController, initial: { x: number; y: number }) {
  const [position, setPosition] = useState(initial);
  const positionRef = useRef(initial);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    hasMoved: boolean;
    target: HTMLElement;
  } | null>(null);
  const wasDraggedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const clearDrag = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      releasePointerCaptureSafely(dragState.current.target, event.pointerId);

      if (dragState.current.hasMoved) {
        controller.setPanelPosition(positionRef.current);
        wasDraggedRef.current = true;
        suppressNextClickRef.current = true;
      }

      dragState.current = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        clearDrag(event);
        return;
      }

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.current.hasMoved = true;
      }
      if (!dragState.current.hasMoved) {
        return;
      }

      const newX = Math.max(8, Math.min(window.innerWidth - 80, dragState.current.startPosX + deltaX));
      const newY = Math.max(8, Math.min(window.innerHeight - 50, dragState.current.startPosY + deltaY));
      const next = { x: newX, y: newY };

      positionRef.current = next;
      setPosition(next);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, [controller]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget;
      wasDraggedRef.current = false;
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPosX: position.x,
        startPosY: position.y,
        hasMoved: false,
        target,
      };
      setPointerCaptureSafely(target, event.pointerId);
      event.preventDefault();
    },
  };

  const consumeSuppressedClick = () => {
    if (!suppressNextClickRef.current) {
      return false;
    }

    suppressNextClickRef.current = false;
    wasDraggedRef.current = false;
    return true;
  };

  return { position, bind, wasDraggedRef, consumeSuppressedClick };
}
