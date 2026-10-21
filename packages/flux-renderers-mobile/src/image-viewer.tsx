import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { ImageViewerSchema } from './schemas.js';
import { useGlobalZIndex } from '@nop-chaos/ui';
import { useLockScroll } from './hooks/use-lock-scroll.js';
import {
  MIN_SCALE,
  panClamp,
  pinchMatrix,
  resolveGesture,
  type ViewerTransform,
} from './viewer-matrix.js';

const SWIPE_CLOSE_THRESHOLD_PX = 120;
const SWIPE_PAGE_THRESHOLD_PX = 60;
const DOUBLE_TAP_WINDOW_MS = 300;

interface PointerEntry {
  x: number;
  y: number;
}

/**
 * Image viewer (plan 667 Phase 1, M9a): controlled full-screen preview with
 * two-finger anchor pinch zoom, double-tap 1↔2, horizontal paging and
 * swipe-down close. Zoomed state freezes paging (resolveGesture
 * arbitration). Transform math lives in viewer-matrix.ts.
 */
export function ImageViewerRenderer(props: RendererComponentProps<ImageViewerSchema>) {
  const slotProps = props.props;
  const images = slotProps.images ?? [];
  const disabled = slotProps.disabled === true;
  // disabled 只冻结手势响应，不卸载弹层（对齐 Failure Paths `disabled` 行语义）
  const open = slotProps.open === true && images.length > 0;
  const initialIndex = Math.max(
    0,
    Math.min(images.length - 1, typeof slotProps.initialIndex === 'number' ? slotProps.initialIndex : 0),
  );

  const zIndex = useGlobalZIndex();
  useLockScroll(open);

  const [pageIndex, setPageIndex] = React.useState(initialIndex);
  const pageIndexRef = React.useRef(pageIndex);
  React.useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);
  // re-sync when the host re-opens with a different initial index
  React.useEffect(() => {
    if (open) setPageIndex(initialIndex);
  }, [open, initialIndex]);

  const [transform, setTransform] = React.useState<ViewerTransform>({ scale: 1, x: 0, y: 0 });
  const [pullY, setPullY] = React.useState(0);
  const transformRef = React.useRef(transform);
  React.useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const pointers = React.useRef(new Map<number, PointerEntry>());
  const pinchStartRef = React.useRef<{ distance: number; transform: ViewerTransform } | null>(null);
  const lastTapRef = React.useRef<{ time: number; x: number; y: number } | null>(null);
  const pageDragRef = React.useRef<{ startX: number; decided: boolean; vertical: boolean } | null>(null);
  const pullStartRef = React.useRef<number | null>(null);

  const close = () => {
    const payload = { type: 'close', index: pageIndex };
    void props.events.onClose?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  };

  const notifyPage = (index: number) => {
      const payload = { type: 'change', index };
      void props.events.onChange?.(payload, {
        event: payload,
        evaluationBindings: payload,
        scope: props.node.scope,
      });
    };

  const goToPage = (index: number) => {
      const clamped = Math.max(0, Math.min(images.length - 1, index));
      setPageIndex(clamped);
      setTransform({ scale: 1, x: 0, y: 0 });
      if (clamped !== pageIndexRef.current) notifyPage(clamped);
    };

  function onTouchStart(e: React.TouchEvent) {
      for (const touchItem of Array.from(e.touches)) {
        pointers.current.set(touchItem.identifier, { x: touchItem.clientX, y: touchItem.clientY });
      }
      const count = pointers.current.size;
      if (count === 2) {
        const [a, b] = [...pointers.current.values()];
        pinchStartRef.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          transform: transformRef.current,
        };
      } else if (count === 1) {
        const only = e.touches[0];
        if (!only) return;
        pageDragRef.current = { startX: only.clientX, decided: false, vertical: false };
        pullStartRef.current = only.clientY;
      }
    };

  function onTouchMove(e: React.TouchEvent) {
      if (disabled) return;
      for (const touchItem of Array.from(e.touches)) {
        pointers.current.set(touchItem.identifier, { x: touchItem.clientX, y: touchItem.clientY });
      }
      const gesture = resolveGesture({
        pointerCount: pointers.current.size,
        zoomed: transformRef.current.scale > MIN_SCALE,
      });

      if (gesture.kind === 'pinch') {
        const start = pinchStartRef.current;
        const [a, b] = [...pointers.current.values()];
        if (!start || !a || !b) return;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const anchorX = (a.x + b.x) / 2;
        const anchorY = (a.y + b.y) / 2;
        const requested = start.transform.scale * (distance / (start.distance || 1));
        const next = pinchMatrix({
          prev: start.transform,
          scale: requested,
          anchorX,
          anchorY,
        });
        setTransform(panClamp(next, window.innerWidth, window.innerHeight));
        return;
      }

      if (gesture.kind === 'pan') {
        const touchItem = e.touches[0];
        if (!touchItem || pageDragRef.current == null) return;
        const dx = touchItem.clientX - pageDragRef.current.startX;
        const dy = touchItem.clientY - (pullStartRef.current ?? touchItem.clientY);
        setTransform((prev) =>
          panClamp({ ...prev, x: prev.x + dx * 0.2, y: prev.y + dy * 0.2 }, window.innerWidth, window.innerHeight),
        );
        return;
      }

      // unzoomed: pull-down close or horizontal paging (direction decided once)
      const touchItem = e.touches[0];
      if (!touchItem || pageDragRef.current == null) return;
      const dx = touchItem.clientX - pageDragRef.current.startX;
      const dy = touchItem.clientY - (pullStartRef.current ?? 0);
      if (!pageDragRef.current.decided && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        pageDragRef.current.decided = true;
        pageDragRef.current.vertical = Math.abs(dy) > Math.abs(dx);
      }
      const g = pageDragRef.current as { vertical?: boolean };
      if (g.vertical && dy > 0) {
        setPullY(dy);
      } else if (!g.vertical && dx !== 0) {
        setPullY(0);
      }
    };

  function onTouchEnd(e: React.TouchEvent) {
    pointers.current.clear();
    pinchStartRef.current = null;

    // pull-down release
    if (pullY > SWIPE_CLOSE_THRESHOLD_PX) {
      setPullY(0);
      close();
      return;
    }
    setPullY(0);

    // double-tap detection (zoom toggle centered on the tap)
    const touchItem = e.changedTouches[0];
    if (touchItem && !disabled) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < DOUBLE_TAP_WINDOW_MS) {
        lastTapRef.current = null;
        setTransform((prev) => {
          if (prev.scale > MIN_SCALE) {
            return { scale: 1, x: 0, y: 0 };
          }
          return panClamp(
            pinchMatrix({ prev, scale: 2, anchorX: touchItem.clientX, anchorY: touchItem.clientY }),
            window.innerWidth,
            window.innerHeight,
          );
        });
        pageDragRef.current = null;
        return;
      }
      lastTapRef.current = { time: now, x: touchItem.clientX, y: touchItem.clientY };
    }

    // horizontal paging on release
    const drag = pageDragRef.current;
    pageDragRef.current = null;
    if (!drag || disabled || transformRef.current.scale > MIN_SCALE) return;
    const dx = touchItem ? touchItem.clientX - drag.startX : 0;
    if (dx <= -SWIPE_PAGE_THRESHOLD_PX && pageIndex < images.length - 1) {
      goToPage(pageIndex + 1);
    } else if (dx >= SWIPE_PAGE_THRESHOLD_PX && pageIndex > 0) {
      goToPage(pageIndex - 1);
    }
  }

  if (!open) {
    return null;
  }

  const t = transform;

  return (
    <div
      data-slot="image-viewer"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-scale={t.scale}
      data-index={pageIndex}
      className={cn('nop-image-viewer', props.meta.className)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        overflow: 'hidden',
      }}
      onTouchStart={disabled ? undefined : onTouchStart}
      onTouchMove={disabled ? undefined : onTouchMove}
      onTouchEnd={disabled ? undefined : onTouchEnd}
      onTouchCancel={disabled ? undefined : onTouchEnd}
    >
      <div
        data-slot="image-viewer-mask"
        role="button"
        aria-label="close"
        tabIndex={-1}
        onClick={close}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === 'Escape' || event.key === 'Enter') close();
        }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${pullY}px)`,
          transition: pullY === 0 ? 'transform 200ms ease-out' : 'none',
        }}
      >
        <img
          data-slot="image-viewer-image"
          src={images[pageIndex]}
          alt=""
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
            transition: 'none',
            userSelect: 'none',
          }}
        />
        {images.length > 1 ? (
          <span
            data-slot="image-viewer-indicator"
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 14,
            }}
          >
            {pageIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
