import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { FloatingBubbleSchema } from './schemas.js';
import { MomentumAnimator } from './hooks/momentum-animator.js';
import { RUBBERBAND_CONSTANT, rubberband } from './hooks/gesture-math.js';
import { bubbleSnapX } from './panel-logic.js';

const BUBBLE_SIZE = 48;
const CLICK_THRESHOLD_PX = 6;

/**
 * Floating bubble (plan 666 Phase 2, M8b): draggable ball with magnetic
 * edge snapping (nearest horizontal edge, M6 animator), rubberband
 * over-drag resistance at the container bounds, and a click branch for
 * sub-threshold taps (movement < 6px dispatches `onClick` — the threshold
 * constant is shared with, but semantically inverse to, M6 click
 * suppression).
 */
export function FloatingBubbleRenderer(props: RendererComponentProps<FloatingBubbleSchema>) {
  const slotProps = props.props;
  const disabled = slotProps.disabled === true;
  const magnetic = slotProps.magnetic !== false;

  const [pos, setPos] = React.useState(() => ({
    x: slotProps.initialX ?? 0,
    y: slotProps.initialY ?? 0,
  }));
  const bubbleRef = React.useRef<HTMLDivElement | null>(null);
  const animatorRef = React.useRef<MomentumAnimator | null>(null);
  const gestureRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    moved: boolean;
    lastX: number;
    lastY: number;
  } | null>(null);
  const posRef = React.useRef(pos);
  React.useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const bounds = React.useMemo(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 390;
    const height = typeof window !== 'undefined' ? window.innerHeight : 844;
    return { maxX: Math.max(0, width - BUBBLE_SIZE), maxY: Math.max(0, height - BUBBLE_SIZE) };
  }, []);

  // Default position: bottom-right on first mount when unspecified. The
  // lazy useState initializer already honors explicit values; the mount
  // effect only fills in the window-derived defaults without them.
  React.useEffect(() => {
    const { initialX, initialY } = slotProps;
    if (initialX !== undefined && initialY !== undefined) return;
    setPos((prev) => ({
      x: initialX ?? (prev.x || bounds.maxX),
      y: initialY ?? (prev.y || bounds.maxY),
    }));
  }, [slotProps, bounds.maxX, bounds.maxY]);

  function applyPosition(next: { x: number; y: number }) {
    const bubble = bubbleRef.current;
    if (bubble) bubble.style.transform = `translate(${next.x}px, ${next.y}px)`;
  }

  function clampToBounds(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(bounds.maxX, x)),
      y: Math.max(0, Math.min(bounds.maxY, y)),
    };
  }

  function settle(target: { x: number; y: number }, from: { x: number; y: number }) {
    const finish = () => {
      animatorRef.current = null;
      setPos(target);
      applyPosition(target);
    };
    if (from.x === target.x && from.y === target.y) {
      finish();
      return;
    }
    const animator = new MomentumAnimator();
    animatorRef.current = animator;
    animator.start({
      from: from.x,
      to: target.x,
      duration: 240,
      onUpdate: (value) => applyPosition({ x: value, y: target.y }),
      onComplete: finish,
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    animatorRef.current?.stop();
    animatorRef.current = null;
    const touch = e.touches[0];
    if (!touch) return;
    gestureRef.current = {
      startClientX: touch.clientX,
      startClientY: touch.clientY,
      startX: posRef.current.x,
      startY: posRef.current.y,
      moved: false,
      lastX: posRef.current.x,
      lastY: posRef.current.y,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    const gesture = gestureRef.current;
    if (disabled || !gesture) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - gesture.startClientX;
    const dy = touch.clientY - gesture.startClientY;
    if (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX) {
      gesture.moved = true;
    }
    let next = clampToBounds(gesture.startX + dx, gesture.startY + dy);
    // rubberband resistance at the bounds (visual; clamped values remain)
    if (gesture.startX + dx < 0) {
      next = { ...next, x: -rubberband(-(gesture.startX + dx), BUBBLE_SIZE, RUBBERBAND_CONSTANT) };
    } else if (gesture.startX + dx > bounds.maxX) {
      next = {
        ...next,
        x: bounds.maxX + rubberband(gesture.startX + dx - bounds.maxX, BUBBLE_SIZE, RUBBERBAND_CONSTANT),
      };
    }
    gesture.lastX = next.x;
    gesture.lastY = next.y;
    applyPosition(next);
  }

  function onTouchEnd() {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (disabled || !gesture) return;
    if (!gesture.moved) {
      // click branch: sub-threshold tap
      const payload = { type: 'click' };
      void props.events.onClick?.(payload, {
        event: payload,
        evaluationBindings: payload,
        scope: props.node.scope,
      });
      return;
    }
    const current = { x: gesture.lastX, y: gesture.lastY };
    const target = clampToBounds(
      magnetic ? bubbleSnapX(current.x, BUBBLE_SIZE, bounds.maxX + BUBBLE_SIZE) : current.x,
      current.y,
    );
    settle(target, current);
  }

  return (
    <div
      ref={bubbleRef}
      className={cn('nop-floating-bubble', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="floating-bubble"
      data-disabled={disabled || undefined}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        background: 'var(--nop-floating-bubble-bg)',
        color: 'var(--nop-floating-bubble-fg)',
        touchAction: 'none',
        zIndex: 900,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {(props.regions.body?.render() as React.ReactNode) ?? (
        <span data-slot="floating-bubble-dot" aria-hidden="true" />
      )}
    </div>
  );
}
