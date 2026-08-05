import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';

export interface WorkbenchShellProps {
  className?: string;
  style?: CSSProperties;
  density?: 'default' | 'flush';
  header?: ReactNode;
  leftPanel?: ReactNode;
  leftCollapsed?: boolean;
  onLeftToggle?: () => void;
  leftLabel?: string;
  leftResizable?: boolean;
  leftWidth?: number;
  onLeftWidthChange?: (width: number) => void;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  canvas: ReactNode;
  rightPanel?: ReactNode;
  rightCollapsed?: boolean;
  onRightToggle?: () => void;
  rightLabel?: string;
  rightResizable?: boolean;
  rightWidth?: number;
  onRightWidthChange?: (width: number) => void;
  rightMinWidth?: number;
  rightMaxWidth?: number;
  dialogs?: ReactNode;
  'data-testid'?: string;
  'data-cid'?: string;
}

const PANEL_CARD = 'min-h-0 overflow-hidden rounded-xl border border-border shadow-sm';
const COLLAPSED_RAIL =
  'h-full w-full rounded-xl border border-border shadow-sm px-1.5 text-muted-foreground hover:text-foreground';
const RESIZE_HANDLE =
  'absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-border focus-visible:outline-none transition-colors';

const DEFAULT_LEFT_WIDTH = 240;
const DEFAULT_RIGHT_WIDTH = 352;
const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MAX_WIDTH = 600;
const RESIZE_STEP = 16;
const TABLET_BREAKPOINT = 1024;

function clampWidth(width: number, min: number, max: number): number {
  return Math.min(Math.max(width, min), max);
}

function useWideWorkbenchViewport(): boolean {
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.innerWidth >= TABLET_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => {
      setIsWide(window.innerWidth >= TABLET_BREAKPOINT);
    };
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isWide;
}

function resolveWorkbenchGridCols(
  hasLeft: boolean,
  hasRight: boolean,
  leftCollapsed: boolean,
  rightCollapsed: boolean,
): string {
  if (!hasLeft && !hasRight) return 'grid-cols-1';
  if (hasLeft && !hasRight) {
    return leftCollapsed ? 'grid-cols-[2rem_minmax(0,1fr)]' : 'grid-cols-[15rem_minmax(0,1fr)]';
  }
  if (!hasLeft && hasRight) {
    return rightCollapsed ? 'grid-cols-[minmax(0,1fr)_2rem]' : 'grid-cols-[minmax(0,1fr)_22rem]';
  }
  if (leftCollapsed && rightCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_2rem]';
  if (leftCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_22rem]';
  if (rightCollapsed) return 'grid-cols-[15rem_minmax(0,1fr)_2rem]';
  return 'grid-cols-[15rem_minmax(0,1fr)_22rem]';
}

export function WorkbenchShell({
  className,
  style,
  density = 'default',
  header,
  leftPanel,
  leftCollapsed = false,
  onLeftToggle,
  leftLabel = 'Expand left panel',
  leftResizable,
  leftWidth,
  onLeftWidthChange,
  leftMinWidth,
  leftMaxWidth,
  canvas,
  rightPanel,
  rightCollapsed = false,
  onRightToggle,
  rightLabel = 'Expand right panel',
  rightResizable,
  rightWidth,
  onRightWidthChange,
  rightMinWidth,
  rightMaxWidth,
  dialogs,
  'data-testid': testId,
  'data-cid': cid,
}: WorkbenchShellProps) {
  const hasLeft = leftPanel !== undefined;
  const hasRight = rightPanel !== undefined;
  const hasBoth = hasLeft && hasRight;

  const leftResizeActive = leftResizable === true && hasLeft;
  const rightResizeActive = rightResizable === true && hasRight;
  const leftMin = leftMinWidth ?? DEFAULT_MIN_WIDTH;
  const leftMax = leftMaxWidth ?? DEFAULT_MAX_WIDTH;
  const rightMin = rightMinWidth ?? DEFAULT_MIN_WIDTH;
  const rightMax = rightMaxWidth ?? DEFAULT_MAX_WIDTH;
  const isLeftWidthControlled = leftWidth !== undefined;
  const isRightWidthControlled = rightWidth !== undefined;

  const [internalLeftWidth, setInternalLeftWidth] = useState<number>(() =>
    clampWidth(leftWidth ?? DEFAULT_LEFT_WIDTH, leftMin, leftMax),
  );
  const [internalRightWidth, setInternalRightWidth] = useState<number>(() =>
    clampWidth(rightWidth ?? DEFAULT_RIGHT_WIDTH, rightMin, rightMax),
  );

  const resolvedLeftWidth = isLeftWidthControlled ? (leftWidth as number) : internalLeftWidth;
  const resolvedRightWidth = isRightWidthControlled ? (rightWidth as number) : internalRightWidth;

  const leftResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const rightResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const isWideViewport = useWideWorkbenchViewport();

  function commitLeftWidth(nextWidth: number) {
    const clamped = clampWidth(nextWidth, leftMin, leftMax);
    if (isLeftWidthControlled) {
      onLeftWidthChange?.(clamped);
    } else {
      setInternalLeftWidth(clamped);
    }
  }

  function commitRightWidth(nextWidth: number) {
    const clamped = clampWidth(nextWidth, rightMin, rightMax);
    if (isRightWidthControlled) {
      onRightWidthChange?.(clamped);
    } else {
      setInternalRightWidth(clamped);
    }
  }

  function finishResize(event: ReactPointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer may already be released
    }
  }

  const handleLeftPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 2) return; // ignore right-click
    event.currentTarget.setPointerCapture(event.pointerId);
    leftResizeRef.current = { startX: event.clientX, startWidth: resolvedLeftWidth };
  };

  const handleLeftPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!leftResizeRef.current) return;
    const dx = event.clientX - leftResizeRef.current.startX;
    commitLeftWidth(leftResizeRef.current.startWidth + dx);
  };

  const handleLeftPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    leftResizeRef.current = null;
    finishResize(event);
  };

  const handleLeftKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      commitLeftWidth(resolvedLeftWidth - RESIZE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      commitLeftWidth(resolvedLeftWidth + RESIZE_STEP);
    }
  };

  const handleRightPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 2) return; // ignore right-click
    event.currentTarget.setPointerCapture(event.pointerId);
    rightResizeRef.current = { startX: event.clientX, startWidth: resolvedRightWidth };
  };

  const handleRightPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rightResizeRef.current) return;
    // Dragging left on the right panel widens it.
    const dx = rightResizeRef.current.startX - event.clientX;
    commitRightWidth(rightResizeRef.current.startWidth + dx);
  };

  const handleRightPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    rightResizeRef.current = null;
    finishResize(event);
  };

  const handleRightKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      commitRightWidth(resolvedRightWidth + RESIZE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      commitRightWidth(resolvedRightWidth - RESIZE_STEP);
    }
  };

  const gridColsClass = resolveWorkbenchGridCols(hasLeft, hasRight, leftCollapsed, rightCollapsed);

  let gridTemplateColumns: string | undefined;
  if ((leftResizeActive || rightResizeActive) && isWideViewport) {
    const columns: string[] = [];
    if (hasLeft) {
      columns.push(
        leftCollapsed ? '2rem' : leftResizeActive ? `${resolvedLeftWidth}px` : '15rem',
      );
    }
    columns.push('minmax(0,1fr)');
    if (hasRight) {
      columns.push(
        rightCollapsed ? '2rem' : rightResizeActive ? `${resolvedRightWidth}px` : '22rem',
      );
    }
    gridTemplateColumns = columns.join(' ');
  }

  return (
    <div
      className={cn(
        'nop-workbench grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0 gap-3',
        density === 'default' ? 'p-6' : 'p-0',
        className,
      )}
      style={style}
      data-testid={testId}
      data-cid={cid}
    >
      {header !== undefined && (
        <div data-slot="workbench-header" className="min-h-0">
          {header}
        </div>
      )}
      <div
        data-testid="workbench-body"
        className={cn(
          'grid grid-rows-1 gap-3 min-h-0 h-full',
          gridColsClass,
          hasBoth && 'max-[1023px]:grid-cols-[15rem_minmax(0,1fr)]',
          hasBoth && 'max-[1023px]:[&>*:nth-child(3)]:hidden',
          hasBoth && 'max-[767px]:grid-cols-1',
          hasBoth && 'max-[767px]:[&>*:first-child]:hidden',
        )}
        style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
        >
          {hasLeft &&
            (leftCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                className={cn(COLLAPSED_RAIL, 'justify-end')}
                onClick={onLeftToggle}
                aria-label={leftLabel}
                data-slot="workbench-left-panel"
                data-testid="left-panel-collapsed"
              >
                <span
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background"
                  data-testid="expand-left-panel"
                >
                  <ChevronRight className="size-4" />
                </span>
              </Button>
          ) : (
            <div
              className={cn(PANEL_CARD, leftResizeActive ? 'relative' : undefined)}
              data-slot="workbench-left-panel"
              data-testid="left-panel-expanded"
            >
              {leftPanel}
              {leftResizeActive && (
                <div
                  data-slot="workbench-resize-handle"
                  data-testid="left-resize-handle"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize left panel"
                  aria-valuenow={Math.round(resolvedLeftWidth)}
                  aria-valuemin={leftMin}
                  aria-valuemax={leftMax}
                  tabIndex={0}
                  className={cn(RESIZE_HANDLE, 'right-0')}
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleLeftPointerDown}
                  onPointerMove={handleLeftPointerMove}
                  onPointerUp={handleLeftPointerUp}
                  onPointerCancel={handleLeftPointerUp}
                  onKeyDown={handleLeftKeyDown}
                />
              )}
            </div>
          ))}
        <div
          className={cn(PANEL_CARD, 'relative')}
          data-slot="workbench-canvas"
          data-testid="canvas"
        >
          {canvas}
        </div>
        {hasRight &&
          (rightCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                className={cn(COLLAPSED_RAIL, 'justify-start')}
                onClick={onRightToggle}
                aria-label={rightLabel}
                data-slot="workbench-right-panel"
                data-testid="right-panel-collapsed"
              >
                <span
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background"
                  data-testid="expand-right-panel"
                >
                  <ChevronLeft className="size-4" />
                </span>
              </Button>
          ) : (
            <div
              className={cn(PANEL_CARD, rightResizeActive ? 'relative' : undefined)}
              data-slot="workbench-right-panel"
              data-testid="right-panel-expanded"
            >
              {rightPanel}
              {rightResizeActive && (
                <div
                  data-slot="workbench-resize-handle"
                  data-testid="right-resize-handle"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize right panel"
                  aria-valuenow={Math.round(resolvedRightWidth)}
                  aria-valuemin={rightMin}
                  aria-valuemax={rightMax}
                  tabIndex={0}
                  className={cn(RESIZE_HANDLE, 'left-0')}
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleRightPointerDown}
                  onPointerMove={handleRightPointerMove}
                  onPointerUp={handleRightPointerUp}
                  onPointerCancel={handleRightPointerUp}
                  onKeyDown={handleRightKeyDown}
                />
              )}
            </div>
          ))}
      </div>
      {dialogs !== undefined && (
        <div data-slot="workbench-dialogs" className="relative">
          {dialogs}
        </div>
      )}
    </div>
  );
}
