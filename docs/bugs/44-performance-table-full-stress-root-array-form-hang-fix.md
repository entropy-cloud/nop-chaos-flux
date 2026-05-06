# 44 Performance Table Full Stress Root Array Form Hang Fix

## Problem

- The playground `performance-table` page could become unresponsive after clicking `Full Stress`.
- The visible symptom was that the mode button click appeared to do nothing or the page effectively hung before `Scenario B/C/D` became visible.
- In browser automation, even basic reads like `page.locator('body').textContent()` could time out after the click.

## Diagnostic Method

- Reproduced it with Playwright and direct DOM reads, because the failure looked like a generic heavy-page stall rather than a clear runtime error.
- First confirmed a known regression had returned: `performance-table-page.tsx` was again calling `setMetrics(...)` from `Profiler.onRender`.
- After removing that feedback path, `Full Stress` still hung, so the remaining `full-stress`-only blocks had to be isolated.
- The decisive clue was that `Scenario D` was the only remaining block introducing a root-array inline form: `data: '${perfRows.slice(0, 8)}'` plus `array-field name: ''`.

## Root Cause

- `apps/playground/src/pages/performance-table-page.tsx` had regressed to updating React state from the hot `Profiler` callback, recreating the earlier render-feedback loop.
- `apps/playground/src/pages/performance-table/schema.ts` also mounted `Scenario D` as a root-array inline form using `array-field name: ''`.
- That root-array shape is fragile for the current projected form/array-field runtime because child paths are derived from the field name; in this stress scenario it could stall the main thread during the heavy mode switch.

## Fix

- Removed the `setMetrics(...)` write from the `Profiler` callback again and kept commit accounting in the ref used for measurement summaries.
- Reworked `Scenario D` to use ordinary object-backed form data: `data: { rows: '${perfRows.slice(0, 8)}' }`, `array-field name: 'rows'`, and `itemKind: 'object'`.
- Extended the e2e to click `Full Stress` and assert that `Scenario B`, `Scenario C`, and `Scenario D` all become visible.

## Tests

- `tests/e2e/performance-table.spec.ts` - verifies `Full Stress` mode now mounts all expected stress sections and still reaches the benchmark path.
- `tests/e2e/playground-entry-pages.spec.ts` - rechecked the `performance-table` smoke path on an alternate Playwright port after the fix.

## Affected Files

- `apps/playground/src/pages/performance-table-page.tsx`
- `apps/playground/src/pages/performance-table/schema.ts`
- `tests/e2e/performance-table.spec.ts`

## Notes For Future Refactors

- Do not reintroduce React state writes from `Profiler.onRender` on heavy pages unless the update is explicitly throttled and guaranteed not to feed back into rendering.
- Avoid root-array inline forms in playground stress scenarios when a simple object wrapper can express the same workload with a safer path model.

## Related Notes

- `docs/bugs/40-performance-table-profiler-loop-and-mode-remount-fix.md` records the earlier stabilization pass for the same page: the original `Profiler` loop, schema remount identity fix, and lighter default entry mode. This note only covers the later `Full Stress` regression and the `Scenario D` root-array form shape.
