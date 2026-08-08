# 98 Pagination Render-Phase Clamp Fix

## Problem

The pagination renderer clamped its page/per-page values to the valid range
**during the render phase** instead of at derivation boundaries. With
out-of-range props (e.g. a page index larger than the data allows), the
clamp wrote derived state while rendering, causing render-phase state writes
(Render 1 produced a different value than Render 2) and React
warnings/instability.

## Diagnostic Method

- Hard part: the renderer looks correct — the visible output is always in
  range — so the defect only shows as render-phase inconsistency (double
  render, `setState during render` style warnings) and only with
  out-of-range inputs.
- Inspected the render path of `pagination-renderer.tsx` for any value
  normalization happening inline during JSX evaluation.
- Rejected "UI-level clamp is fine" by the audit finding: normalization must
  happen before render state is derived, not during it.
- Decisive evidence: the clamp site was inside the render computation
  (`pagination-renderer.tsx:147`), mutating derived values while rendering.

## Root Cause

- `pagination-renderer.tsx:147` applied clamping during the render phase,
  which violated the render-derivation contract and produced unstable
  render output for out-of-range inputs.

## Fix

- Moved the clamp so values are normalized at the derivation boundary
  (before render consumes them), keeping the render phase pure
  (`pagination-renderer.tsx:147`).

## Tests

- `packages/flux-renderers-data/src/__tests__/data-pagination-rendering.test.tsx:294`
  (test-first, red before the fix): out-of-range page/per-page props render
  clamped values without render-phase state writes.
- `packages/flux-renderers-data/src/__tests__/data-table-pagination-clamp.test.tsx`
  — table-level clamp consistency.

## Affected Files

- `packages/flux-renderers-data/src/pagination-renderer.tsx`

## Notes For Future Refactors

- Renderers must never clamp/normalize values inside the render phase;
  normalization belongs at the derivation boundary (memo/derived value
  creation), keeping render output stable across re-renders.
- Watch for `Math.min`/`Math.max`/`clamp` calls inside JSX expressions —
  they are a common source of render-phase writes.
