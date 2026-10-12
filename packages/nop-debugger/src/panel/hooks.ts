import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { NopDebuggerController } from '../types.js';
import type { NopDebuggerSnapshot } from '../types.js';

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

export function useDebuggerSnapshot<T = NopDebuggerSnapshot>(
  controller: NopDebuggerController,
  selector?: (snapshot: NopDebuggerSnapshot) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const select = selector ?? ((snapshot: NopDebuggerSnapshot) => snapshot as T);
  return useSyncExternalStoreWithSelector(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
    select,
    equalityFn,
  );
}

type WindowPointerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  hasMoved: boolean;
  target: HTMLElement;
};

type WindowPointerDragConfig = {
  /** hasMoved 判定阈值（px）；3px/4px 双阈值漂移一次裁定统一为 4px（WA-debugger-001）。 */
  threshold: number;
  clampPosition(position: { x: number; y: number }): { x: number; y: number };
  /** 阈值未到前保持原位（launcher：避免点击意图的微抖位移面板已动的视觉跳变）。 */
  moveOnlyAfterThreshold?: boolean;
  onTap?: () => void;
  onDragStart?(): void;
  onDragSettled?(hasMoved: boolean): void;
  resolveDragTarget(event: ReactPointerEvent<HTMLElement>): HTMLElement | null | undefined;
};

/**
 * 窗口级指针拖拽共享原语（WA-debugger-001 单源）：dragState 生命周期、
 * pointermove/up/cancel 监听与清理、buttons===0 断拖守卫、hasMoved 阈值、
 * docked 首拖按当前盒换算、setPointerCapture 安全包装与拖拽落点持久化。
 */
function useWindowPointerDrag(
  controller: NopDebuggerController,
  initial: { x: number; y: number },
  docked: boolean,
  config: WindowPointerDragConfig,
) {
  const [position, setPosition] = useState(initial);
  const positionRef = useRef(initial);
  const dragState = useRef<WindowPointerDragState | null>(null);

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
        config.onTap?.();
      }
      config.onDragSettled?.(dragState.current.hasMoved);

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
      if (Math.abs(deltaX) > config.threshold || Math.abs(deltaY) > config.threshold) {
        dragState.current.hasMoved = true;
      }
      if (config.moveOnlyAfterThreshold && !dragState.current.hasMoved) {
        return;
      }

      const next = config.clampPosition({
        x: dragState.current.baseX + deltaX,
        y: dragState.current.baseY + deltaY,
      });

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
  }, [controller, config]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      const target = config.resolveDragTarget(event);
      if (!target) {
        return;
      }

      config.onDragStart?.();

      // docked（bottom-left）锚定渲染无绝对坐标：首拖时按当前盒换算基准位置并转 floating
      let baseX = position.x;
      let baseY = position.y;
      if (docked && target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        baseX = rect.left;
        baseY = rect.top;
        positionRef.current = { x: baseX, y: baseY };
        setPosition(positionRef.current);
      }
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseX,
        baseY,
        hasMoved: false,
        target,
      };

      setPointerCaptureSafely(target, event.pointerId);
      event.preventDefault();
    },
  };

  return { position, bind };
}

export function useDraggablePosition(
  controller: NopDebuggerController,
  initial: { x: number; y: number },
  onTap?: () => void,
  docked = false,
) {
  const hasMovedRef = useRef(false);

  const { position, bind } = useWindowPointerDrag(controller, initial, docked, {
    threshold: 4,
    clampPosition: ({ x, y }) => ({ x: Math.max(12, x), y: Math.max(12, y) }),
    onTap,
    onDragStart() {
      hasMovedRef.current = false;
    },
    onDragSettled(hasMoved) {
      hasMovedRef.current = hasMoved;
    },
    resolveDragTarget(event) {
      return event.currentTarget.parentElement;
    },
  });

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
  const resizeState = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(
    null,
  );

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
      const next = Math.max(
        280,
        Math.min(window.innerWidth - 40, resizeState.current.startWidth - delta),
      );
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
      resizeState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: width,
      };
      // eslint-disable-next-line react-compiler/react-compiler
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      setPointerCaptureSafely(event.currentTarget as HTMLElement, event.pointerId);
      event.preventDefault();
    },
  };

  return { width, bind };
}

export function useLauncherDrag(
  controller: NopDebuggerController,
  initial: { x: number; y: number },
  docked = false,
) {
  const wasDraggedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const { position, bind } = useWindowPointerDrag(controller, initial, docked, {
    threshold: 4,
    clampPosition: ({ x, y }) => ({
      x: Math.max(8, Math.min(window.innerWidth - 80, x)),
      y: Math.max(8, Math.min(window.innerHeight - 50, y)),
    }),
    moveOnlyAfterThreshold: true,
    onDragStart() {
      wasDraggedRef.current = false;
    },
    onDragSettled(hasMoved) {
      if (hasMoved) {
        wasDraggedRef.current = true;
        suppressNextClickRef.current = true;
      }
    },
    resolveDragTarget(event) {
      return event.currentTarget;
    },
  });

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
