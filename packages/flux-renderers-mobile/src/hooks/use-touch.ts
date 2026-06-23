import { useCallback, useRef, useState } from 'react';

export type TouchDirection = '' | 'horizontal' | 'vertical';

export interface TouchState {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  offsetX: number;
  offsetY: number;
  direction: TouchDirection;
  isTouching: boolean;
}

export interface UseTouchOptions {
  threshold?: number;
}

export interface UseTouchReturn {
  state: TouchState;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  reset: () => void;
}

const INITIAL_STATE: TouchState = {
  startX: 0,
  startY: 0,
  deltaX: 0,
  deltaY: 0,
  offsetX: 0,
  offsetY: 0,
  direction: '',
  isTouching: false,
};

function resolveDirection(
  deltaX: number,
  deltaY: number,
  threshold: number,
): TouchDirection {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (absX <= threshold && absY <= threshold) return '';
  if (absX > absY) return 'horizontal';
  return 'vertical';
}

export function useTouch(options: UseTouchOptions = {}): UseTouchReturn {
  const threshold = options.threshold ?? 10;
  const [state, setState] = useState<TouchState>(INITIAL_STATE);
  const startRef = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startRef.current = { x: touch.clientX, y: touch.clientY };
    setState({
      ...INITIAL_STATE,
      startX: touch.clientX,
      startY: touch.clientY,
      isTouching: true,
    });
  }, []);

  const onTouchMove = useCallback(
  (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;
      setState((prev) => ({
        ...prev,
        deltaX,
        deltaY,
        offsetX: Math.abs(deltaX),
        offsetY: Math.abs(deltaY),
        direction: resolveDirection(deltaX, deltaY, threshold),
      }));
    },
    [threshold],
  );

  const onTouchEnd = useCallback(() => {
    setState((prev) => ({ ...prev, isTouching: false }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}
