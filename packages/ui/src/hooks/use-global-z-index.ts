import * as React from 'react';

/**
 * Global z-index stack baseline.
 *
 * Mirrors Vant's `useGlobalZIndex` pattern: every overlay (dialog, drawer,
 * sheet, popover, tooltip, ...) that opens requests a value from a single
 * process-wide counter. Later-opened overlays always get a higher value than
 * earlier ones, so stacking order follows open order even when the overlays
 * belong to different component families.
 *
 * Baseline is 2000 (matches Vant, matches docs/architecture/mobile-responsive-baseline.md
 * §10.4). The value is intentionally far above the legacy flat `z-50` so the
 * migrated overlays all sit in their own band and never collide with
 * non-overlay content that still uses `z-50`.
 *
 * The counter is module-scoped (process-wide), not per-React-root. This is
 * deliberate: multiple host roots (e.g. popover inside a dialog opened from a
 * different root) must still share the same stack.
 */

const GLOBAL_Z_INDEX_BASELINE = 2000;

let globalZIndex = GLOBAL_Z_INDEX_BASELINE;

/**
 * Reserve the next z-index value. Each call returns the current counter and
 * increments it, so concurrent callers never receive the same value.
 *
 * Not a React hook by itself — see {@link useGlobalZIndex} for the React API.
 */
export function nextGlobalZIndex(): number {
  return globalZIndex++;
}

/**
 * Read the current counter without reserving a value.
 */
export function peekGlobalZIndex(): number {
  return globalZIndex;
}

/**
 * Reset the counter. Test-only escape hatch so focused unit tests can start
 * from a known baseline and assert deterministic increment sequences.
 *
 * Production code MUST NOT call this.
 */
export function setGlobalZIndex(value: number): void {
  globalZIndex = value;
}

export const GLOBAL_Z_INDEX_BASELINE_VALUE = GLOBAL_Z_INDEX_BASELINE;

/**
 * React hook that reserves a stable z-index value for the lifetime of the
 * calling component instance. Each mount grabs a new value; the value stays
 * stable across re-renders of the same instance.
 *
 * Use this in overlay components (Dialog, Drawer, Sheet, Popover, Tooltip, ...)
 * to replace hardcoded `z-50`. Multiple overlays rendered at the same time
 * each get their own increasing value, so later-mounted overlays stack above
 * earlier ones.
 *
 * @returns a numeric z-index value (>= 2000).
 */
export function useGlobalZIndex(): number {
  const [zIndex] = React.useState(nextGlobalZIndex);
  return zIndex;
}
