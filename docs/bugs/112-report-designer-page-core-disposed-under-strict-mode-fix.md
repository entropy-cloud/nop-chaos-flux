# 112 Report Designer Page Core Disposed Under React StrictMode Fix

## Problem

- Under React StrictMode (the default in React 19 dev and in the playground `main.tsx`), the `report-designer-page` host renderer mounted with **zero field sources** permanently: the field panel stayed empty, selection mirroring stopped updating, and preview state went stale.
- No console error — the failure is silent (the `initialize()` promise resolves early).
- Minimal reproducible: render `<ReportDesignerPageRenderer>` inside `<React.StrictMode>` and probe `fieldSources`/`fieldCount` in scope — stays `0:[]`.

## Diagnostic Method

- The e2e host page for this audit surfaced the symptom: the demo page (raw component composition) showed 4 fields, but the same config through the real page renderer showed `0 fields`.
- A throwaway unit test with the exact demo schema passed outside StrictMode and failed inside `<React.StrictMode>` — isolating StrictMode as the trigger (the playground wraps everything in StrictMode; the unit suite does not).
- Traced the page renderer effect `useEffect(() => () => core.dispose(), [core])`: StrictMode runs mount → cleanup → mount. The cleanup calls `core.dispose()`, which sets the internal `disposed` flag. The remount's `core.initialize()` then hits the `if (disposed) return Promise.resolve()` guard and no-ops — field sources, inspector refresh, and selection mirroring never start.
- Verified sibling host pages (`spreadsheet-renderers` page renderer, `word-editor`, `flow-designer` page body) do **not** dispose their cores in renderer effects — this was the only host page with an effect-scoped dispose.

## Root Cause

- `core.dispose()` was wired to a React effect cleanup, but effect cleanups also run for StrictMode's simulated unmount (and HMR remounts). Disposing a memoized core is a _component-lifetime_ operation, not an _effect-lifetime_ operation; the `disposed` flag makes the core permanently dead after the simulated unmount.

## Fix

- `packages/report-designer-renderers/src/page-renderer.tsx`: replaced the dispose-on-cleanup effect with ref-diff ownership: a `lastReportDesignerCoreRef` tracks the live core; when the memoized `core` is _replaced_ (new document/config → new core), the previous core is disposed; StrictMode remounts keep the same core alive. Real unmount without a replacement leaves the core for GC (matches the sibling host pages' no-dispose baseline — no timers leak since the abort controllers only fire during in-flight operations).

## Tests

- `packages/report-designer-renderers/src/__tests__/page-renderer-strict-mode.test.tsx` — renders the page renderer inside `<React.StrictMode>` and asserts the scope `fieldSources` probe reaches `1` (red: `0`, green: `1`).

## Affected Files

- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/__tests__/page-renderer-strict-mode.test.tsx`

## Notes For Future Refactors

- Same mechanism family as bug 90 (flux-react `useHostScope` StrictMode dispose): any host page that disposes a memoized store/core in an effect cleanup under StrictMode will permanently kill it. The ref-diff ownership pattern (dispose only on replacement) is the established mitigation.
- The e2e confirmation point lives in `tests/e2e/report-designer-host.spec.ts` (host page field panel renders 4 items under the StrictMode playground).
