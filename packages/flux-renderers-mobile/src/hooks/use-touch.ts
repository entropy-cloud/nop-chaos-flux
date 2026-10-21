import { useCallback, useRef, useState } from 'react';
import { VelocityTracker } from './velocity-tracker.js';

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
  /** Signed horizontal velocity in px/ms sampled over the 170ms window (M6a). */
  velocityX: number;
  /** Signed vertical velocity in px/ms sampled over the 170ms window (M6a). */
  velocityY: number;
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
  velocityX: 0,
  velocityY: 0,
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
  // Lazy per-hook instance: touchend must leave the samples readable so the
  // release decision (swipe-cell K-map) can consume velocity AFTER the lift.
  const trackerRef = useRef<VelocityTracker | null>(null);
  if (trackerRef.current == null) trackerRef.current = new VelocityTracker();

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    trackerRef.current?.reset();
    // Seed the window with the start sample so the first move already has a
    // start→move baseline to diff against.
    trackerRef.current?.add(touch.clientX, touch.clientY, e.timeStamp);
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
      const tracker = trackerRef.current;
      tracker?.add(touch.clientX, touch.clientY, e.timeStamp);
      setState((prev) => ({
        ...prev,
        deltaX,
        deltaY,
        offsetX: Math.abs(deltaX),
        offsetY: Math.abs(deltaY),
        direction: resolveDirection(deltaX, deltaY, threshold),
        velocityX: tracker?.velocityX ?? 0,
        velocityY: tracker?.velocityY ?? 0,
      }));
    },
    [threshold],
  );

  // Velocity is deliberately NOT cleared here: components read it in their
  // touchend handler to make throw/flick release decisions (M6 K-map).
  const onTouchEnd = useCallback(() => {
    setState((prev) => ({ ...prev, isTouching: false }));
  }, []);

  const reset = useCallback(() => {
    trackerRef.current?.reset();
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}
