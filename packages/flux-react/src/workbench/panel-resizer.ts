import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type WorkbenchPanelSide = 'left' | 'right';

/**
 * Single source of truth for workbench panel track/width constants. The grid
 * track strings ('15rem'/'22rem'/'2rem') and the uncontrolled default widths
 * (240px/352px) are both derived from here — literal restatements anywhere else
 * are drift. (15rem=240px, 22rem=352px.)
 */
const WORKBENCH_PANEL_WIDTHS: Record<
  WorkbenchPanelSide,
  { expandedRem: number; collapsedRem: number; defaultPx: number }
> = {
  left: { expandedRem: 15, collapsedRem: 2, defaultPx: 240 },
  right: { expandedRem: 22, collapsedRem: 2, defaultPx: 352 },
};

const WORKBENCH_RESIZE_STEP = 16;

export function workbenchPanelTrack(side: WorkbenchPanelSide, collapsed: boolean): string {
  const widths = WORKBENCH_PANEL_WIDTHS[side];
  return `${collapsed ? widths.collapsedRem : widths.expandedRem}rem`;
}

/**
 * Side-derived mirror chrome: drag axis sign, handle/rail orientation, i18n
 * label key and the testid prefix. Everything that previously existed as a
 * left/right literal pair in WorkbenchShell reads from this table.
 */
export const WORKBENCH_PANEL_SIDE_CHROME: Record<
  WorkbenchPanelSide,
  {
    dragDirection: 1 | -1;
    handlePositionClass: 'right-0' | 'left-0';
    railJustifyClass: 'justify-end' | 'justify-start';
    resizeLabelKey: 'flux.workbench.resizeLeftPanel' | 'flux.workbench.resizeRightPanel';
    testidPrefix: 'left' | 'right';
    dataSlot: 'workbench-left-panel' | 'workbench-right-panel';
  }
> = {
  left: {
    dragDirection: 1,
    handlePositionClass: 'right-0',
    railJustifyClass: 'justify-end',
    resizeLabelKey: 'flux.workbench.resizeLeftPanel',
    testidPrefix: 'left',
    dataSlot: 'workbench-left-panel',
  },
  right: {
    dragDirection: -1,
    handlePositionClass: 'left-0',
    railJustifyClass: 'justify-start',
    resizeLabelKey: 'flux.workbench.resizeRightPanel',
    testidPrefix: 'right',
    dataSlot: 'workbench-right-panel',
  },
};

function clampPanelWidth(width: number, min: number, max: number): number {
  return Math.min(Math.max(width, min), max);
}

interface PanelResizerOptions {
  side: WorkbenchPanelSide;
  width: number | undefined;
  min: number;
  max: number;
  isControlled: boolean;
  onCommit: (width: number) => void;
}

interface PanelResizerController {
  width: number;
  dragWidth: number | null;
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  };
}

/**
 * Per-side pointer/keyboard resize controller for a workbench panel. Invariants
 * (see CX-8 plan 586): pointer capture on down; rAF-coalesced drag preview that
 * stays local to the shell; exactly one commit on pointerup; pending rAF
 * cancelled on unmount and on drag end. Dragging inverts with the side
 * (dir=±1), as do the arrow keys.
 */
export function usePanelResizer(options: PanelResizerOptions): PanelResizerController {
  const { side, width, min, max, isControlled, onCommit } = options;
  const { dragDirection } = WORKBENCH_PANEL_SIDE_CHROME[side];

  const [internalWidth, setInternalWidth] = useState<number>(() =>
    clampPanelWidth(width ?? WORKBENCH_PANEL_WIDTHS[side].defaultPx, min, max),
  );
  const resolvedWidth = isControlled ? (width as number) : internalWidth;

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const dragWidthRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, []);

  const commitWidth = (nextWidth: number) => {
    const clamped = clampPanelWidth(nextWidth, min, max);
    if (isControlled) {
      onCommit(clamped);
    } else {
      setInternalWidth(clamped);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 2) return; // ignore right-click
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { startX: event.clientX, startWidth: resolvedWidth };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    const delta =
      dragDirection === 1
        ? event.clientX - dragState.startX
        : dragState.startX - event.clientX;
    const next = clampPanelWidth(dragState.startWidth + delta, min, max);
    dragWidthRef.current = next;
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        setDragWidth(dragWidthRef.current);
      });
    }
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const committedDragWidth = dragWidthRef.current;
    dragStateRef.current = null;
    dragWidthRef.current = null;
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    setDragWidth(null);
    if (committedDragWidth !== null) {
      commitWidth(committedDragWidth);
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer may already be released
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      commitWidth(resolvedWidth - dragDirection * WORKBENCH_RESIZE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      commitWidth(resolvedWidth + dragDirection * WORKBENCH_RESIZE_STEP);
    }
  };

  return {
    width: resolvedWidth,
    dragWidth,
    handleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onKeyDown: handleKeyDown,
    },
  };
}
