import React from 'react';
import { cn } from '@nop-chaos/ui';
import type { WheelPickerOption } from './schemas.js';
import {
  DEFAULT_ROW_HEIGHT,
  clampIndex,
  indexForOffset,
  momentumTargetIndex,
  offsetForIndex,
} from './wheel-column-logic.js';
import { VelocityTracker } from './hooks/velocity-tracker.js';
import { MomentumAnimator } from './hooks/momentum-animator.js';
import { RUBBERBAND_CONSTANT, rubberband } from './hooks/gesture-math.js';

const SNAP_DURATION_MS = 200;

interface GestureState {
  column: number;
  startClientY: number;
  startOffset: number;
  startTime: number;
  maxY: number;
  minY: number;
  tracker: VelocityTracker;
  /** Last VISUALLY applied offset (rubberband-damped past the edges). */
  lastVisualOffset: number;
}

interface WheelViewProps {
  columns: WheelPickerOption[][];
  /** Controlled selection per column. External writes during a gesture are suppressed; the landing wins. */
  value?: (string | number)[];
  rowHeight?: number;
  visibleRows?: number;
  disabled?: boolean;
  className?: string;
  testid?: string;
  cid?: string;
  /** Fired once per column landing (snap or inertia), with the full column values. */
  onSettle?: (column: number, index: number, values: (string | number)[]) => void;
}

function resolveColumn(target: HTMLElement | null): number | null {
  const holder = target?.closest('[data-column]');
  if (!holder) return null;
  const parsed = Number.parseInt(holder.getAttribute('data-column') ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveIndices(
  columns: WheelPickerOption[][],
  value: (string | number)[] | undefined,
): number[] {
  if (columns.length === 0) return [];
  return columns.map((column, columnIndex) => {
    const wanted = value?.[columnIndex];
    const found = column.findIndex((option) => option.value === wanted);
    if (found >= 0) return found;
    // out-of-range / unknown value falls back to 0 rather than -1
    return 0;
  });
}

function currentValues(
  columns: WheelPickerOption[][],
  indices: number[],
  changedColumn: number,
  changedIndex: number,
): (string | number)[] {
  return columns.map((column, columnIndex) => {
    const index = columnIndex === changedColumn ? changedIndex : (indices[columnIndex] ?? 0);
    return column[index]?.value ?? '';
  });
}

/**
 * The wheel kernel shared by the picker family (plan 665): drag-to-scroll
 * strip, snap/inertia landing via the M6 momentum math, controlled-write
 * suppression during gestures, `data-index`/`data-active` row markers.
 *
 * Handlers are plain functions — React Compiler memoizes them (the
 * `redundant-use-callback` audit family); the MA-02 dispatch discipline
 * lives in the handler bodies, not updaters.
 */
export function WheelView({
  columns,
  value,
  rowHeight: rowHeightOption,
  visibleRows: visibleRowsOption,
  disabled,
  className,
  testid,
  cid,
  onSettle,
}: WheelViewProps) {
  const rowHeight = rowHeightOption && rowHeightOption > 0 ? rowHeightOption : DEFAULT_ROW_HEIGHT;
  const visibleRows = visibleRowsOption && visibleRowsOption > 0 ? visibleRowsOption : 5;

  // Per-column selected indices. Strip transforms are applied via refs
  // (no per-frame re-render); this state only tracks the highlighted
  // center row and the committed selection for the controlled effect.
  const [indices, setIndices] = React.useState<number[]>(() => resolveIndices(columns, value));
  const stripRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const animatorRefs = React.useRef<Array<MomentumAnimator | null>>([]);
  // Gesture-in-progress flag as a synchronous ref: the controlled effect
  // reads it to suppress external value sync mid-gesture.
  const gestureCountRef = React.useRef(0);
  const gestureRef = React.useRef<GestureState | null>(null);
  const indicesRef = React.useRef(indices);
  React.useEffect(() => {
    indicesRef.current = indices;
  }, [indices]);

  // Controlled sync — suppressed while a finger gesture is in flight; a
  // write landing during a settle ANIMATION interrupts it immediately
  // (stopMomentum contract: the rAF animator is stoppable, unlike a CSS
  // transition) and aligns the wheel to the written value. A value lookup
  // that misses (column shrank below the controlled index) clamps to the
  // previous committed index instead of jumping to 0.
  React.useEffect(() => {
    if (gestureCountRef.current > 0) return;
    animatorRefs.current.forEach((animator) => animator?.stop());
    animatorRefs.current = animatorRefs.current.map(() => null);
    const resolved = resolveIndices(columns, value);
    const next = resolved.map((index, columnIndex) =>
      value?.[columnIndex] !== undefined &&
      columns[columnIndex] &&
      !columns[columnIndex].some((option) => option.value === value?.[columnIndex])
        ? clampIndex(indicesRef.current[columnIndex] ?? 0, columns[columnIndex].length)
        : index,
    );
    setIndices((prev) => {
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) {
        return prev;
      }
      return next;
    });
    // re-apply strip transforms outside a gesture
    next.forEach((index, column) => {
      const strip = stripRefs.current[column];
      if (strip) strip.style.transform = `translateY(${offsetForIndex(index, rowHeight)}px)`;
    });
  }, [value, columns, rowHeight]);

  function applyOffset(column: number, offset: number) {
    const strip = stripRefs.current[column];
    if (strip) strip.style.transform = `translateY(${offset}px)`;
  }

  function stopAnimator(column: number) {
    animatorRefs.current[column]?.stop();
    animatorRefs.current[column] = null;
  }

  function settleAt(column: number, target: number, animateOffset: number) {
    const targetOffset = offsetForIndex(target, rowHeight);
    const finish = () => {
      animatorRefs.current[column] = null;
      setIndices((prev) => {
        const next = [...prev];
        next[column] = target;
        return next;
      });
      onSettle?.(column, target, currentValues(columns, indicesRef.current, column, target));
    };
    if (animateOffset === targetOffset) {
      applyOffset(column, targetOffset);
      finish();
      return;
    }
    const animator = new MomentumAnimator();
    animatorRefs.current[column] = animator;
    animator.start({
      from: animateOffset,
      to: targetOffset,
      duration: SNAP_DURATION_MS,
      onUpdate: (value) => applyOffset(column, value),
      onComplete: finish,
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    // A touch on the root padding (no column ancestor) resolves to column 0
    // — the single-column layout's common case; multi-column gestures land
    // on a row inside a real column.
    const column = resolveColumn(e.target as HTMLElement | null) ?? 0;
    if (column >= columns.length) return;
    const touch = e.touches[0];
    if (!touch) return;
    stopAnimator(column);
    gestureCountRef.current += 1;
    gestureRef.current = {
      column,
      startClientY: touch.clientY,
      startOffset: offsetForIndex(indicesRef.current[column] ?? 0, rowHeight),
      startTime: e.timeStamp,
      maxY: touch.clientY,
      minY: touch.clientY,
      tracker: new VelocityTracker(),
      lastVisualOffset: offsetForIndex(indicesRef.current[column] ?? 0, rowHeight),
    };
    gestureRef.current.tracker.add(touch.clientX, touch.clientY, e.timeStamp);
  }

  function onTouchMove(e: React.TouchEvent) {
    const gesture = gestureRef.current;
    if (disabled || !gesture) return;
    const touch = e.touches[0];
    if (!touch) return;
    gesture.tracker.add(touch.clientX, touch.clientY, e.timeStamp);
    gesture.maxY = Math.max(gesture.maxY, touch.clientY);
    gesture.minY = Math.min(gesture.minY, touch.clientY);
    let offset = gesture.startOffset + (touch.clientY - gesture.startClientY);
    // M6 rubberband over-drag past either edge (visual resistance only —
    // release decisions run on the raw travel below).
    const minOffset = offsetForIndex(Math.max(0, columns[gesture.column]?.length - 1), rowHeight);
    if (offset > 0) {
      offset = rubberband(offset, rowHeight, RUBBERBAND_CONSTANT);
    } else if (offset < minOffset) {
      offset = minOffset - rubberband(minOffset - offset, rowHeight, RUBBERBAND_CONSTANT);
    }
    gesture.lastVisualOffset = offset;
    applyOffset(gesture.column, offset);
    // release/index decisions run on the RAW offset (rubberband is visual-only)
    const rawOffset = gesture.startOffset + (touch.clientY - gesture.startClientY);
    const implied = indexForOffset(rawOffset, columns[gesture.column]?.length ?? 0, rowHeight);
    if (indicesRef.current[gesture.column] !== implied) {
      setIndices((prev) => {
        const next = [...prev];
        next[gesture.column] = implied;
        return next;
      });
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (disabled || !gesture) return;
    gestureCountRef.current = Math.max(0, gestureCountRef.current - 1);
    const rowCount = columns[gesture.column]?.length ?? 0;
    const endTouch = e.changedTouches[0];
    if (!endTouch) return;
    const releaseOffset = gesture.startOffset + (endTouch.clientY - gesture.startClientY);
    const target = momentumTargetIndex({
      releaseOffset,
      velocityPxMs: gesture.tracker.velocityY,
      gestureDurationMs: Math.max(0, e.timeStamp - gesture.startTime),
      travelPx: Math.max(
        Math.abs(gesture.maxY - gesture.startClientY),
        Math.abs(gesture.minY - gesture.startClientY),
      ),
      rowCount,
      rowHeight,
    });
    settleAt(gesture.column, target, gesture.lastVisualOffset);
  }

  function onTouchCancel() {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    gestureCountRef.current = Math.max(0, gestureCountRef.current - 1);
    // OA-05 lineage: a system cancel is NOT a lift — rebound to the
    // pre-gesture committed index, no dispatch.
    const committed = indicesRef.current[gesture.column] ?? 0;
    settleAt(gesture.column, committed, gesture.lastVisualOffset);
  }

  const viewportHeight = rowHeight * visibleRows;

  return (
    <div
      className={cn('nop-picker-view', className)}
      data-testid={testid || undefined}
      data-cid={cid || undefined}
      data-slot="picker-view"
      data-disabled={disabled || undefined}
      style={{
        display: 'flex',
        touchAction: 'pan-x',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={column.map((option) => String(option.value)).join('|')}
          data-slot="picker-view-column"
          data-column={columnIndex}
          style={{
            flex: 1,
            position: 'relative',
            height: viewportHeight,
            overflow: 'hidden',
          }}
        >
          <div
            ref={(el) => {
              stripRefs.current[columnIndex] = el;
            }}
            data-slot="picker-view-strip"
            style={{
              paddingTop: (viewportHeight - rowHeight) / 2,
              willChange: 'transform',
            }}
          >
            {column.map((option, optionIndex) => {
              const active = (indices[columnIndex] ?? 0) === optionIndex;
              return (
                <div
                  key={String(option.value)}
                  data-slot="picker-view-row"
                  data-index={optionIndex}
                  data-active={active || undefined}
                  style={{
                    height: rowHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
