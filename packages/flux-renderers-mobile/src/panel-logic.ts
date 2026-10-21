import { nearest } from './hooks/gesture-math.js';

/**
 * Bottom-panel interaction math (plan 666 Phase 1, M8a/M8b).
 *
 * Scroll arbitration follows the vant FloatingPanel semantics
 * (docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md §4.1):
 * 「面板未满屏拖面板 / 满屏滚内容」. The arbitration is re-evaluated on
 * EVERY touchmove so a mid-gesture handoff (panel fully expanded, content
 * scrolled back to 0, same continuing pull) switches ownership.
 */

export function snapToAnchor(offset: number, anchors: number[]): number {
  if (anchors.length === 0) return offset;
  return nearest(offset, anchors);
}

// Internal arbitration input shape (knip: consumers pass an object literal).
interface ScrollArbitrationInput {
  /** The panel is at its top (max-height) anchor. */
  panelAtTop: boolean;
  /** Current scrollTop of the panel content area. */
  contentScrollTop: number;
  /** Finger vertical delta of this move; > 0 = pull down. */
  deltaY: number;
}

/**
 * True → this touchmove belongs to the content scroller (native scroll).
 * False → the panel itself moves (the caller preventDefaults native scroll).
 */
export function shouldScrollContent(input: ScrollArbitrationInput): boolean {
  if (!input.panelAtTop) return false;
  if (input.deltaY <= 0) return true;
  return input.contentScrollTop > 0;
}

/** Magnet edge for the floating bubble: nearest of the two horizontal edges. */
export function bubbleSnapX(x: number, bubbleWidth: number, containerWidth: number): number {
  const left = 0;
  const right = Math.max(0, containerWidth - bubbleWidth);
  return nearest(x, [left, right]);
}
