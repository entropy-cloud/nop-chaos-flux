# 118 Diff-View Reaction Echo Dispatch Loop Fix

## Problem

- The component-lab diff-view host scenarios (`/#/lab/diff-view`, `c6-5-host-surfaces.spec.ts` ×5 + `smoke.spec.ts:18` diff-view + `lab-batch-zero-error.spec.ts:14`) hung at HEAD: the lab shell rendered but the scenario content never committed, and the tab sometimes died (~40s). Full e2e: 7 failures.
- Regression window: green at CV (2026-08-06, c6-5 5/5) → failing from 08-08 D3.2 onward (previously misattributed to "environment").
- The c6c5 reaction schema declares `toggleViewType: { action: 'component:toggleViewType', dependsOn: ['toggle'] }` and `setViewType: { action: 'component:setViewType', dependsOn: ['viewMode'] }` — the reaction's action resolves to the same component handle method it is dispatched from.

## Diagnostic Method

- Diagnosis difficulty: high — the page showed no JS errors, a responsive main thread, and an empty content area (silent render stall), plus intermittent tab death that looked environmental.
- Investigation path:
  1. Programmatic probes (`page.evaluate` + Playwright test-driven DOM dumps) showed the lab shell mounting in 10-130s (cold Vite transform) but the scenario subtree never committing; `scenarioBlocks = 0`.
  2. `/#/diff-view` (demo page, direct React usage) rendered fine — the hang was specific to the schema-driven lab scenarios.
  3. Bisected the diff-view package to the CV-era state via `git checkout 2692772a3 -- packages/flux-renderers-content/src/diff-view` → lab page rendered (15 scenario elements); restored HEAD → hung again. (The later "dialog-only also hangs" observation was confounded by machine load avg 50-90 + cold-compile timing.)
  4. Narrowed to the reaction scenario only (temporarily trimmed the lab page) → hang reproduced with zero other scenarios.
  5. Code review: `bfff20de` (plan-2026-08-07-1747-3, diff-view 1-9) added `void reactionsRef.current.setViewType?.dispatch()` inside the handle invoke — the handle invoke is also what the reaction's own `component:setViewType` action executes → **self-referential dispatch loop**: mount-time dependsOn fire → invoke → dispatch → invoke → ... forever.

## Root Cause

- The "触发即派发" (trigger = dispatch) pattern added in 1-9 is only safe when the reaction's action does not resolve back to the same handle method. For a self-referential schema (reaction name ↔ component action name 1:1, which is the natural way to declare them), the echo creates an infinite asynchronous dispatch loop that never settles the render.

## Fix

- Added a per-key re-entrancy latch (`reactionLatches` ref) in `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`:
  - `dispatchReaction(key)` skips when the same key's latch is set, sets it, and releases it when the dispatch promise settles.
  - The handle invoke and the UI toggle suppress **both** the echo dispatch and the echo state mutation when `isReactionEcho(key)` — this also makes the mount-time initial fires (both `toggleViewType` and `setViewType` fire on the initial `dependsOn` scope write) settle deterministically instead of racing the echo (final view = `setViewType`'s value, matching pre-regression behavior).

## Tests

- `packages/flux-renderers-content/src/diff-view/__tests__/diff-view-renderer.test.tsx` — "breaks the self-referential reaction echo" regression test: a dispatch mock that re-invokes the same handle method asserts the reaction fires exactly once and the echo mutation is skipped.
- e2e: `c6-5-host-surfaces.spec.ts` 5/5 green (was 0/5); full suite diff-view lab tests green.

## Affected Files

- `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`
- `packages/flux-renderers-content/src/diff-view/__tests__/diff-view-renderer.test.tsx`

## Notes For Future Refactors

- Any renderer adopting the "handle invoke dispatches the schema reaction" pattern must verify the reaction's action does not resolve to the same handle method — otherwise add the same per-key latch.
- The same latent self-reference exists in calendar (`exportPNG` ↔ `component:exportToPNG`) and gantt (`zoomIn` ↔ `component:zoomIn`); they only avoid the loop because no e2e fixture fires them at mount — guard when wiring dependsOn fixtures.
- Machine-load attribution trap: a page that "silently renders nothing" while the main thread is responsive is a stalled async render, not a crash — check for dispatch loops before blaming the environment.
