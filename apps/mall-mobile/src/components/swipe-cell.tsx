import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface SwipeCellProps {
  children: ReactNode;
  rightAction: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

type OpenState = 'closed' | 'open-right';

const CLOSE_TRANSITION_MS = 250;
const TRANSITION = `transform ${CLOSE_TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
const SWIPE_AXIS_THRESHOLD = 10;

export function SwipeCell({
  children,
  rightAction,
  threshold = 40,
  disabled = false,
}: SwipeCellProps) {
  const [openState, setOpenState] = useState<OpenState>('closed');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rightWidth, setRightWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; horizontal: boolean } | null>(null);
  const dragOffsetRef = useRef(0);
  const openRef = useRef<OpenState>('closed');

  useEffect(() => {
    openRef.current = openState;
  }, [openState]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = rightRef.current;
    if (!el) return;
    setRightWidth(el.offsetWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width ?? el.clientWidth ?? 0;
        setRightWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const close = useCallback(() => {
    if (openRef.current === 'closed') return;
    setOpenState('closed');
    setDragOffset(0);
    dragOffsetRef.current = 0;
  }, []);

  useEffect(() => {
    if (disabled) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !containerRef.current) return;
      if (!containerRef.current.contains(target)) {
        close();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [close, disabled]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, horizontal: false };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = startRef.current;
    if (!start || disabled) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(dx) > SWIPE_AXIS_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        start.horizontal = true;
      } else if (Math.abs(dy) > SWIPE_AXIS_THRESHOLD) {
        return;
      }
    }
    if (!start.horizontal) return;
    const isOpen = openRef.current === 'open-right';
    const base = isOpen ? -rightWidth : 0;
    const next = clamp(base + dx, -rightWidth, 0);
    dragOffsetRef.current = next;
    setDragOffset(next);
    setIsDragging(true);
  };

  const onTouchEnd = () => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || !start.horizontal || disabled) {
      setIsDragging(false);
      return;
    }
    const offset = dragOffsetRef.current;
    if (offset <= -threshold) {
      setOpenState('open-right');
      setDragOffset(-rightWidth);
      dragOffsetRef.current = -rightWidth;
    } else {
      setOpenState('closed');
      setDragOffset(0);
      dragOffsetRef.current = 0;
    }
    setIsDragging(false);
  };

  const committedOffset = openState === 'open-right' ? -rightWidth : 0;
  const effectiveOffset = isDragging ? dragOffset : committedOffset;

  return (
    <div
      ref={containerRef}
      className="mall-swipe-cell"
      data-testid="mall-swipe-cell"
      data-state={openState === 'open-right' ? 'open' : 'closed'}
      style={{ overflow: 'hidden', position: 'relative', touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={rightRef}
        className="mall-swipe-cell-right"
        data-slot="swipe-cell-right"
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
        {rightAction}
      </div>
      <div
        className="mall-swipe-cell-content"
        style={{
          transform: `translateX(${effectiveOffset}px)`,
          transition: isDragging ? 'none' : TRANSITION,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
