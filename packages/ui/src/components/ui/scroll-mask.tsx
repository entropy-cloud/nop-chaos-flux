import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { type ScrollMaskAxis, type ScrollMaskState } from '../../hooks/use-scroll-mask.js';

export interface ScrollMaskProps {
  state: ScrollMaskState;
  axis?: ScrollMaskAxis;
  /** Mask fade width in px (both edges). Default 24. */
  size?: number;
  className?: string;
}

/**
 * Edge fade masks for a scrollable container (plan 668 Phase 2, M10b).
 * Pure display: pair with `useScrollMask` (which owns the container ref and
 * scroll/resize listeners) and position this component over the scroller.
 * Mask visibility is data-attribute driven; fade width via
 * `--nop-scroll-mask-size`.
 */
export function ScrollMask({ state, axis = 'x', size, className }: ScrollMaskProps) {
  const maskSize = size !== undefined ? `${size}px` : 'var(--nop-scroll-mask-size, 24px)';
  return (
    <>
      <div
        data-slot="scroll-mask"
        data-axis={axis}
        data-start={state.startMask || undefined}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute',
          axis === 'x' ? 'inset-y-0 left-0' : 'inset-x-0 top-0',
          className,
        )}
        style={{
          width: axis === 'x' ? maskSize : '100%',
          height: axis === 'x' ? '100%' : maskSize,
          background:
            axis === 'x'
              ? 'linear-gradient(to right, var(--nop-scroll-mask-color, rgba(0,0,0,0.08)), transparent)'
              : 'linear-gradient(to bottom, var(--nop-scroll-mask-color, rgba(0,0,0,0.08)), transparent)',
          opacity: state.startMask ? 1 : 0,
          transition: 'opacity 150ms ease-out',
        }}
      />
      <div
        data-slot="scroll-mask"
        data-axis={axis}
        data-end={state.endMask || undefined}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute',
          axis === 'x' ? 'inset-y-0 right-0' : 'inset-x-0 bottom-0',
          className,
        )}
        style={{
          width: axis === 'x' ? maskSize : '100%',
          height: axis === 'x' ? '100%' : maskSize,
          background:
            axis === 'x'
              ? 'linear-gradient(to left, var(--nop-scroll-mask-color, rgba(0,0,0,0.08)), transparent)'
              : 'linear-gradient(to top, var(--nop-scroll-mask-color, rgba(0,0,0,0.08)), transparent)',
          opacity: state.endMask ? 1 : 0,
          transition: 'opacity 150ms ease-out',
        }}
      />
    </>
  );
}
