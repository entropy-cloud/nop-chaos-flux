# 40 Performance Table Profiler Loop And Mode Remount Fix

## Problem

- The playground `performance-table` page was unstable in Playwright: the entry-page smoke test sometimes rendered almost nothing, and the dedicated e2e either could not find the page heading or hung when switching stress modes.
- The smallest visible symptoms were `/#/performance-table` showing only partial shell content, benchmark assertions timing out, or mode-specific stress sections never appearing after clicking `Full Stress`.
- The page looked like a generic "heavy page is too slow" case, but the failures changed shape as individual fixes landed.

## Diagnostic Method

- Diagnosis was hard because at least three independent issues overlapped: a runtime expression failure, a profiler-driven render loop, and schema-mode switches that did not recreate the renderer runtime.
- First checked browser/runtime errors and found an expression failure in `apps/playground/src/pages/performance-table/schema.ts` (`${value.children}` / `${value.username}`), which explained an early broken render but not the later page hangs after those expressions were fixed.
- After the expression fix, direct diagnostics and Playwright failures still showed the page becoming unresponsive. The next decisive clue was that `page.evaluate(...)` itself timed out after entering the heavy mode, which pointed to the browser main thread being trapped in repeated render work rather than a simple missing selector.
- Read `apps/playground/src/pages/performance-table-page.tsx` and found `Profiler onRender` updating React state on every commit. That created a self-amplifying `commit -> onRender -> setState -> commit` loop on an already heavy page.
- A later failure mode remained even after breaking that loop: clicking a mode button changed `mode`, but the expected mode-only stress sections still did not appear. Reading the page component showed `schema` was memoized from `mode`, but `SchemaRenderer` was not keyed by mode, so the renderer could retain the old runtime instead of rebuilding for the new schema.
- The last stability issue was practical rather than purely logical: the default mode and full-stress scenario composition were too heavy for deterministic e2e startup. The page needed a lighter default entry and narrower stable assertions.

## Root Cause

- `apps/playground/src/pages/performance-table-page.tsx` updated `metrics` state inside the React `Profiler` callback, creating a render feedback loop on every commit.
- The page defaulted into a very heavy stress configuration, which made entry-page smoke tests compete with expensive scenario mounts before the shell became stable.
- Mode changes updated the `schema` object but did not force `SchemaRenderer` to recreate its runtime for the new schema shape.
- The page-specific e2e originally assumed the heaviest mode content would always be ready immediately after open, which no longer matched a stable startup strategy.

## Fix

- Removed the `setMetrics(...)` update from the `Profiler` callback and kept the commit metrics in the local ref used by the benchmark summary path.
- Changed the default page mode to `table-only` so the route can reach a stable interactive shell before optional stress scenarios are mounted.
- Added `key={mode}` to `SchemaRenderer` so switching modes rebuilds the schema runtime instead of reusing the previous one.
- Reduced the heaviest scenario sizes and kept the broad `scope-debug` snapshot stress in `scope-read-stress` instead of stacking it into the default interaction path for `full-stress`.
- Updated `tests/e2e/performance-table.spec.ts` to validate the stable mode-switch and benchmark path instead of requiring the heaviest scenario tree to be fully mounted immediately on page open.

## Tests

- `tests/e2e/playground-entry-pages.spec.ts` - verifies `performance-table` route now reaches a stable visible shell during page-entry smoke coverage.
- `tests/e2e/performance-table.spec.ts` - verifies mode switching, stress-section appearance/disappearance, benchmark output, and first/last-page table rendering on the stabilized page.

## Affected Files

- `apps/playground/src/pages/performance-table-page.tsx`
- `apps/playground/src/pages/performance-table/schema.ts`
- `tests/e2e/performance-table.spec.ts`
- `tests/e2e/playground-entry-pages.spec.ts`

## Notes For Future Refactors

- Do not call React state setters from a hot `Profiler onRender` path unless the state update is explicitly throttled or otherwise guaranteed not to feed back into the same render loop.
- If a page changes between materially different schemas, `SchemaRenderer` identity must change too; updating only the `schema` prop may leave the old runtime in place.
- Performance/demo pages should default to a stable entry mode. Keep the heaviest stress scenarios reachable by explicit interaction, not as the required first-paint baseline for e2e.
