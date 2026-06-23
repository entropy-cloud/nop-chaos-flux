import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { SwipeCellSchema } from './schemas.js';
import { useTouch } from './hooks/use-touch.js';

type SwipeDirection = 'left' | 'right' | 'both';
type SwipeOpenState = 'closed' | 'open-left' | 'open-right';

const CLOSE_TRANSITION_MS = 300;
const TRANSITION = `transform ${CLOSE_TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

function resolveSwipeDirection(value: unknown): SwipeDirection {
  if (value === 'left' || value === 'right' || value === 'both') return value;
  return 'both';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function SwipeCellRenderer(props: RendererComponentProps<SwipeCellSchema>) {
  const slotProps = props.props;
  const threshold = typeof slotProps.threshold === 'number' ? slotProps.threshold : 30;
  const directionConfig = resolveSwipeDirection(slotProps.direction);
  const disabled = slotProps.disabled === true;
  const closeOnOutside = slotProps.closeOnOutside !== false;

  const hasLeft = Boolean(props.regions.left);
  const hasRight = Boolean(props.regions.right);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const leftRef = React.useRef<HTMLDivElement | null>(null);
  const rightRef = React.useRef<HTMLDivElement | null>(null);

  const [leftWidth, setLeftWidth] = React.useState(0);
  const [rightWidth, setRightWidth] = React.useState(0);
  const [openState, setOpenState] = React.useState<SwipeOpenState>('closed');

  // openStateRef mirrors the committed open state so open/close guards can run
  // in the handler body. This is required because the onOpen/onClose dispatch
  // was moved OUT of the setOpenState updater (MA-02): the updater must stay
  // pure so React 19 StrictMode does not double-dispatch on each gesture. The
  // ref is updated synchronously on every state transition so rapid successive
  // calls still see the latest intent (matching the old updater `current`).
  const openStateRef = React.useRef<SwipeOpenState>('closed');
  React.useEffect(() => {
    openStateRef.current = openState;
  }, [openState]);

  const { state, touchHandlers, reset } = useTouch({ threshold: 10 });

  React.useLayoutEffect(() => {
    if (leftRef.current) {
      setLeftWidth(leftRef.current.offsetWidth);
    }
    if (rightRef.current) {
      setRightWidth(rightRef.current.offsetWidth);
    }
  }, [hasLeft, hasRight]);

  const canSwipeLeft = (directionConfig === 'both' || directionConfig === 'left') && hasRight;
  const canSwipeRight = (directionConfig === 'both' || directionConfig === 'right') && hasLeft;

  const activeDragOffset =
    state.direction === 'horizontal' && state.isTouching ? state.deltaX : 0;

  const computedOffset = React.useMemo(() => {
    if (openState === 'open-left') return leftWidth;
    if (openState === 'open-right') return -rightWidth;
    return 0;
  }, [openState, leftWidth, rightWidth]);

  const dragOffset = activeDragOffset !== 0 ? activeDragOffset : computedOffset;

  const effectiveOffset = (() => {
    if (openState === 'open-left') {
      return clamp(dragOffset, 0, leftWidth || dragOffset);
    }
    if (openState === 'open-right') {
      return clamp(dragOffset, -rightWidth || dragOffset, 0);
    }
    if (dragOffset > 0 && canSwipeRight) {
      return clamp(dragOffset, 0, leftWidth || dragOffset);
    }
    if (dragOffset < 0 && canSwipeLeft) {
      return clamp(dragOffset, -rightWidth || dragOffset, 0);
    }
    return 0;
  })();

  const isAnimating = activeDragOffset === 0;

  const closeCell = React.useCallback(() => {
    // Dispatch lives in the handler body (not in an updater) so StrictMode
    // does not double-invoke onClose (MA-02). The ref mirror preserves the
    // old `current !== 'closed'` re-entrancy guard.
    if (openStateRef.current === 'closed') return;
    openStateRef.current = 'closed';
    setOpenState('closed');
    void props.events.onClose?.(undefined);
  }, [props.events]);

  const openCell = React.useCallback(
    (target: 'open-left' | 'open-right') => {
      if (openStateRef.current === target) return;
      openStateRef.current = target;
      setOpenState(target);
      void props.events.onOpen?.(undefined);
    },
    [props.events],
  );

  React.useEffect(() => {
    if (!closeOnOutside) return;
    if (disabled) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        closeCell();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closeOnOutside, closeCell, disabled]);

  const handleTouchEnd = React.useCallback(() => {
    touchHandlers.onTouchEnd({} as React.TouchEvent);
    if (state.direction !== 'horizontal') {
      return;
    }
    const absDelta = Math.abs(state.deltaX);
    if (state.deltaX > 0 && canSwipeRight) {
      if (absDelta >= threshold) {
        openCell('open-left');
      } else if (openState === 'open-left') {
        closeCell();
      }
    } else if (state.deltaX < 0 && canSwipeLeft) {
      if (absDelta >= threshold) {
        openCell('open-right');
      } else if (openState === 'open-right') {
        closeCell();
      }
    }
    reset();
  }, [
    touchHandlers,
    state.direction,
    state.deltaX,
    canSwipeRight,
    canSwipeLeft,
    threshold,
    openCell,
    closeCell,
    openState,
    reset,
  ]);

  // OA-05: a system touchcancel (multi-touch, scroll takeover, gesture
  // interruption) is NOT a user lift — it must not commit the swipe or
  // dispatch onOpen/onClose. Release touch tracking so the cell rebounds to
  // its pre-drag openState (which stays unchanged because we never committed).
  const handleTouchCancel = React.useCallback(() => {
    reset();
  }, [reset]);

  const bodyContent = props.regions.body?.render() as React.ReactNode;
  const leftContent = props.regions.left?.render() as React.ReactNode;
  const rightContent = props.regions.right?.render() as React.ReactNode;

  if (!hasLeft && !hasRight) {
    return (
      <div
        ref={containerRef}
        className={cn('nop-swipe-cell', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="swipe-cell"
        data-state="closed"
      >
        <div data-slot="swipe-cell-content" className="nop-swipe-cell__content">
          {bodyContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('nop-swipe-cell', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="swipe-cell"
      data-state={openState}
      style={{ overflow: 'hidden', position: 'relative' }}
      onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
      onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
      onTouchEnd={disabled ? undefined : handleTouchEnd}
      onTouchCancel={disabled ? undefined : handleTouchCancel}
    >
      {hasLeft ? (
        <div
          ref={leftRef}
          data-slot="swipe-cell-left"
          className="nop-swipe-cell__left"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            transform: 'translateX(-100%)',
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {leftContent}
        </div>
      ) : null}
      {hasRight ? (
        <div
          ref={rightRef}
          data-slot="swipe-cell-right"
          className="nop-swipe-cell__right"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: '100%',
            transform: 'translateX(100%)',
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {rightContent}
        </div>
      ) : null}
      <div
        data-slot="swipe-cell-content"
        className="nop-swipe-cell__content"
        style={{
          transform: `translateX(${effectiveOffset}px)`,
          transition: isAnimating ? TRANSITION : 'none',
        }}
      >
        {bodyContent}
      </div>
    </div>
  );
}
