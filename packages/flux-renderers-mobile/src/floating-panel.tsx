import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { FloatingPanelSchema } from './schemas.js';
import { MomentumAnimator } from './hooks/momentum-animator.js';
import { useLockScroll } from './hooks/use-lock-scroll.js';
import { shouldScrollContent, snapToAnchor } from './panel-logic.js';

/**
 * Floating panel (plan 666 Phase 1, M8a): multi-anchor draggable bottom
 * panel with vant-style scroll arbitration — below the top anchor the panel
 * follows the finger; at the top anchor vertical drags scroll the content
 * until it is back at scrollTop 0. Local scroll lock (M6 useLockScroll
 * localRef) guards page scroll-through while the panel handles a gesture.
 */
export function FloatingPanelRenderer(props: RendererComponentProps<FloatingPanelSchema>) {
  const slotProps = props.props;
  const anchors = React.useMemo(
    () =>
      (slotProps.anchors ?? [])
        .filter((height): height is number => typeof height === 'number' && height > 0)
        .sort((a, b) => a - b),
    [slotProps.anchors],
  );
  const disabled = slotProps.disabled === true;
  const topAnchor = anchors[anchors.length - 1] ?? 0;
  const defaultHeight = React.useMemo(() => {
    if (typeof slotProps.defaultHeight === 'number' && slotProps.defaultHeight > 0) {
      return slotProps.defaultHeight;
    }
    return anchors[0] ?? 0;
  }, [anchors, slotProps.defaultHeight]);

  const [height, setHeight] = React.useState(() => snapToAnchor(defaultHeight, anchors));
  const [anchorIndex, setAnchorIndex] = React.useState(() =>
    anchors.indexOf(snapToAnchor(defaultHeight, anchors)),
  );
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const animatorRef = React.useRef<MomentumAnimator | null>(null);
  const gestureRef = React.useRef<{
    startClientY: number;
    startHeight: number;
    draggingPanel: boolean;
    decided: boolean;
    lastVisualHeight?: number;
  } | null>(null);
  const heightRef = React.useRef(height);
  const anchorIndexStateRef = React.useRef(anchorIndex);
  React.useEffect(() => {
    heightRef.current = height;
    anchorIndexStateRef.current = anchorIndex;
  }, [height, anchorIndex]);
  const anchorsRef = React.useRef(anchors);
  const topAnchorRef = React.useRef(topAnchor);
  const disabledRef = React.useRef(disabled);
  React.useEffect(() => {
    anchorsRef.current = anchors;
    topAnchorRef.current = topAnchor;
    disabledRef.current = disabled;
  }, [anchors, topAnchor, disabled]);

  // Arbitration runs in a NATIVE non-passive touchmove listener: React's
  // synthetic touchmove is passive, so e.preventDefault() inside it throws
  // "Unable to preventDefault inside passive event listener" in real Chrome
  // (use-lock-scroll.ts listenerOptions precedent). React synthetic handlers
  // remain only for start/end (no preventDefault needed there).

  // M6 local scroll lock: while the panel is handling/arbitrating touches it
  // guards page scroll-through (first localRef consumer of the hook).
  useLockScroll(!disabled, { localRef: panelRef });

  const applyHeight = React.useCallback((next: number) => {
    const panel = panelRef.current;
    if (panel) panel.style.height = `${next}px`;
  }, []);

  function settleAt(target: number, from: number) {
    const previousIndex = anchorIndexStateRef.current;
    const finish = () => {
      animatorRef.current = null;
      setHeight(target);
      const nextIndex = anchors.indexOf(target);
      setAnchorIndex(nextIndex);
      if (nextIndex !== previousIndex) {
        const payload = { type: 'anchor', index: nextIndex, height: target };
        void props.events.onChange?.(payload, {
          event: payload,
          evaluationBindings: payload,
          scope: props.node.scope,
        });
      }
    };
    if (from === target) {
      applyHeight(target);
      finish();
      return;
    }
    const animator = new MomentumAnimator();
    animatorRef.current = animator;
    animator.start({
      from,
      to: target,
      duration: 240,
      onUpdate: (value) => applyHeight(value),
      onComplete: finish,
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || anchors.length === 0) return;
    animatorRef.current?.stop();
    animatorRef.current = null;
    const touch = e.touches[0];
    if (!touch) return;
    gestureRef.current = {
      startClientY: touch.clientY,
      startHeight: heightRef.current,
      draggingPanel: false,
      decided: false,
    };
  }

  React.useEffect(() => {
    if (disabled) return;
    const panel = panelRef.current;
    if (!panel) return;
    function onNativeTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const touch = event.touches[0];
      if (!touch) return;
      const anchorList = anchorsRef.current;
      const maxAnchor = topAnchorRef.current;
      if (anchorList.length === 0) return;
      const dy = touch.clientY - gesture.startClientY;
      const content = contentRef.current;
      const panelAtTop = heightRef.current >= maxAnchor - 1;
      const scroll = shouldScrollContent({
        panelAtTop,
        contentScrollTop: content?.scrollTop ?? 0,
        deltaY: dy,
      });
      if (scroll) {
        // hand ownership to the native content scroller for this move
        gesture.draggingPanel = false;
        return;
      }
      // panel ownership: prevent the native scroller from also moving
      event.preventDefault();
      gesture.draggingPanel = true;
      const raw = gesture.startHeight - dy;
      const clamped = Math.max(anchorList[0] ?? 0, Math.min(maxAnchor, raw));
      gesture.lastVisualHeight = clamped;
      applyHeight(clamped);
    }
    panel.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      panel.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, [disabled, applyHeight]);

  function onTouchEnd() {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (disabled || !gesture || anchors.length === 0) return;
    const from = gesture.lastVisualHeight ?? heightRef.current;
    settleAt(snapToAnchor(from, anchors), from);
  }

  return (
    <div
      ref={panelRef}
      className={cn('nop-floating-panel', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="floating-panel"
      data-anchor={anchorIndex}
      data-height={Math.round(height)}
      data-disabled={disabled || undefined}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        // ux-u6 族 A-3：宿主未定义 --nop-floating-panel-bg 时兜底白底，
        // 避免面板透出下层列表（plan 846 U1 F-S1-3 同根因的渲染器级收口）。
        background: 'var(--nop-floating-panel-bg, #ffffff)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        // owns the vertical axis while below the top anchor; the content
        // area switches to pan-y at the top anchor (arbitration contract)
        touchAction: height >= topAnchor - 1 ? 'pan-y' : 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div data-slot="floating-panel-handle" aria-hidden="true" />
      <div
        ref={contentRef}
        data-slot="floating-panel-content"
        style={{
          height: '100%',
          overflowY: 'auto',
          touchAction: height >= topAnchor - 1 ? 'pan-y' : 'none',
        }}
      >
        {(props.regions.body?.render() as React.ReactNode) ?? null}
      </div>
    </div>
  );
}
