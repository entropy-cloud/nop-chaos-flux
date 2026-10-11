import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

interface GridRovingFocusOptions {
  /**
   * Cell selector within the nearest `[role="grid"]`. The three calendar
   * views deliberately pass different selectors — they match each view's
   * grid anatomy (WA-scheduling-001 adjudication, plan 568):
   *   - month: `[data-slot="calendar-cell"]:not([data-empty])` — placeholder
   *     cells for out-of-range days are not focusable targets;
   *   - week: `[role="gridcell"][data-slot="calendar-cell"]` — the week grid
   *     also renders non-cell grid descendants;
   *   - day: `[role="gridcell"]` — hour cells carry no data-slot.
   */
  selector: string;
  /** Index stride for horizontal keys (ArrowLeft/Right). */
  colStride: number;
  /** Index stride for vertical keys (ArrowUp/Down). */
  rowStride: number;
  /** Invoked after focus lands on the target cell (undefined on clamp-in-place edges). */
  onMove?: (target: HTMLElement) => void;
}

/**
 * Shared CSS-grid roving-focus walker for the calendar views
 * (WA-scheduling-001, plan 568 — extracted from the three hand-rolled
 * per-view handlers born in b73f24ab7). Reads Arrow* keys only; Enter/Space
 * stay view-specific (each view's create-entry semantics differ). A cell
 * outside the resolved cell set (indexOf -1) is a no-op: empty placeholder
 * cells are not focusable targets, so the pre-extraction month-view
 * "focus first cell" edge was unreachable by construction.
 */
export function moveGridFocus(e: ReactKeyboardEvent<HTMLElement>, options: GridRovingFocusOptions): void {
  const grid = e.currentTarget.closest('[role="grid"]');
  if (!grid) return;
  const cells = Array.from(grid.querySelectorAll<HTMLElement>(options.selector));
  const currentIdx = cells.indexOf(e.currentTarget);
  if (currentIdx < 0) return;
  let nextIdx: number;
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      nextIdx = Math.min(currentIdx + options.colStride, cells.length - 1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      nextIdx = Math.max(currentIdx - options.colStride, 0);
      break;
    case 'ArrowDown':
      e.preventDefault();
      nextIdx = Math.min(currentIdx + options.rowStride, cells.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      nextIdx = Math.max(currentIdx - options.rowStride, 0);
      break;
    default:
      return;
  }
  if (nextIdx !== currentIdx && nextIdx >= 0 && nextIdx < cells.length) {
    const target = cells[nextIdx];
    target?.focus();
    if (target) options.onMove?.(target);
  }
}
