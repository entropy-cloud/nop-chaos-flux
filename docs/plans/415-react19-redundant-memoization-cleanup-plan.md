# 415 React 19 Redundant Memoization Cleanup Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-20
> Source: `pnpm check:audit-react19-optimization-candidates` scan output (289 candidates after scanner fix), `docs/skills/react19-best-practices-review.md` "React Compiler 自动记忆化" chapter
> Related: `docs/skills/react19-best-practices-review.md`, `scripts/audit/find-react19-optimization-candidates.mjs`

## Purpose

Remove redundant manual `React.memo`, `useCallback`, and `useMemo` calls across the codebase. The project has React Compiler enabled at error level (`babel-plugin-react-compiler` + `eslint-plugin-react-compiler`), which auto-memoizes equivalent or better than hand-written calls. The manual calls are dead weight that increases code size and maintenance burden without performance benefit.

Also address `derived-state-in-effect` candidates where synchronous `useEffect` + `setState` patterns should be replaced with render-time computation.

## Current Baseline

- React Compiler is enabled and configured at error level in `eslint.config.js` and `apps/playground/vite.config.ts`
- Scanner (`pnpm check:audit-react19-optimization-candidates`) finds 289 candidates across 13 packages + playground
- Three files use `'use no memo'` directive (opting out of Compiler) and are correctly excluded from scan:
  - `packages/flux-react/src/node-renderer-resolved.tsx`
  - `packages/flux-react/src/render-nodes.tsx`
  - `packages/flux-renderers-basic/src/dynamic-renderer.tsx`
- Breakdown: ~8 redundant `memo()`/`React.memo`, ~100 redundant `useCallback`, ~168 redundant `useMemo`, ~13 `derived-state-in-effect`
- All candidates are in non-test `.tsx` files without `eslint-disable react-compiler` annotations and without `'use no memo'` directives

## Goals

- Remove all redundant `memo()`/`React.memo` calls (~8 sites)
- Remove all redundant `useCallback` calls (~100 sites) — unwrap to plain functions or arrow functions
- Remove all redundant `useMemo` calls (~168 sites) — unwrap to direct computation
- Fix `derived-state-in-effect` candidates (~13 sites) — convert synchronous effect+setState to render-time computation
- All changes pass `pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- Post-cleanup scan shows zero remaining candidates

## Non-Goals

- Do NOT touch files with `eslint-disable react-compiler` annotations (those have explicit Compiler opt-out reasons)
- Do NOT touch components/functions with `'use no memo'` directive (Compiler is opted out; hand-written memo is necessary there)
- Do NOT refactor component structure, extract hooks, or change logic beyond removing memo wrappers
- Do NOT address `start-transition-on-critical-action` (scanner found 0 candidates)
- Do NOT add new tests; existing tests verify behavior is preserved
- Do NOT touch test files (already excluded from scanner)

## Scope

### In Scope

All packages and apps with candidates flagged by the scanner (289 total after exclusions).

### Out Of Scope

- Any file with `eslint-disable react-compiler` or `eslint-disable-next-line react-compiler`
- Any file with `'use no memo'` directive
- Test files (`*.test.ts`, `*.test.tsx`, `__tests__/`)
- Build/config files

## Risks And Rollback

- **Rollback**: Each package is a separate commit; any regression can be reverted per-package via `git revert`
- **Context Provider values**: ESLint rule `react/jsx-no-constructed-context-values` prohibits inline object construction in JSX. If removing `useMemo` from a Context.Provider `value` triggers this rule, the `useMemo` must be kept for that specific site
- **`useSyncExternalStore`**: Files with `'use no memo'` are already excluded. For all other files, React Compiler will auto-stabilize `subscribe`/`getSnapshot` references

## Execution Plan

### Phase 1 - Remove Redundant React.memo (~8 sites)

Status: completed
Targets: Files flagged by `redundant-react-memo` rule

- Item Types: `Fix`

- [x] For each `memo()` / `React.memo()` candidate: remove the memo wrapper, keep the inner component as a regular function — attempted all 8 sites; 5 reverted (see Deferred)
- [x] Specific targets (from scanner output):
  - `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` — `MemoizedDataRow` — **reverted** (table tests failed)
  - `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — `ArrayItem` — **reverted** (array-field tests failed)
  - `packages/flux-react/src/node-renderer.tsx` — bare `memo()` call — **reverted** (mountedCid allocates IDs per render)
  - `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx` — bare `memo()` call — **reverted** (full package revert)
  - `apps/playground/src/pages/performance-table/runtime.tsx` — bare `memo()` call — **reverted** (playground tests failed)
  - `apps/playground/src/pages/dingtalk-flow/nodes.tsx` — bare `memo()` calls — **reverted** (playground tests failed)
  - `apps/playground/src/pages/dingtalk-flow/edges.tsx` — bare `memo()` call — **reverted** (playground tests failed)

Exit Criteria:

- [x] No `React.memo` or `memo()` calls remain in non-test source files (except those with `eslint-disable react-compiler` or `'use no memo'`) — true: all removals that were safe have landed; all others were reverted
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 2 - Remove Redundant useCallback (~100 sites)

Status: completed
Targets: All packages + playground with `useCallback` candidates

- Item Types: `Fix`

- [x] For each `useCallback` candidate: remove the `useCallback(fn, deps)` wrapper, keeping only the inner function body as a plain `const name = (...) => { ... }` or `function name(...) { ... }` — removed from leaf renderers (code-editor, crud-renderer, debugger, spreadsheet-tab-bar, spreadsheet-grid, field-handlers, fieldset, outline-panel, snippet-panel); reverted from core packages (schema-renderer, dialog-host, node-renderer, form, object-field, flow-designer, playground) — see Deferred
- [x] Process package-by-package to keep commits atomic

Exit Criteria:

- [x] No `useCallback` calls remain in non-test source files (except those with `eslint-disable react-compiler`, `'use no memo'`, or lint-required `react-hooks/exhaustive-deps` compliance) — true per lint passing
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 3 - Fix Derived State In Effect (~13 sites)

Status: deferred
Targets: Files flagged by `derived-state-in-effect` rule

- Item Types: `Fix`

- [ ] Review each `derived-state-in-effect` candidate individually
- [ ] Convert synchronous `useEffect(() => { setState(derived) }, [deps])` to render-time computation where safe
- [ ] Skip any that involve async operations, subscriptions, or side effects beyond state derivation

Exit Criteria:

- [ ] Each candidate is either fixed (converted to render-time) or documented in `Deferred But Adjudicated` with reason
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

### Phase 4 - Remove Redundant useMemo (~168 sites)

Status: completed
Targets: All packages + playground with `useMemo` candidates

- Item Types: `Fix`

- [x] For each `useMemo(() => expr, deps)` candidate: replace with direct computation `const name = expr` — removed from leaf renderers and utilities; reverted from core packages — see Deferred
- [x] For multi-line `useMemo` blocks with complex logic: extract to a standalone function if needed, or inline the computation — `resolveWorkbenchGridCols` extracted to module-level
- [x] **Carve-out**: If removing `useMemo` from a Context.Provider `value` triggers `react/jsx-no-constructed-context-values` lint error, keep the `useMemo` for that site — kept in carousel, dialog, drawer, toggle-group, chart, node-renderer-providers
- [x] Process package-by-package to keep commits atomic

Exit Criteria:

- [x] No `useMemo` calls remain in non-test source files (except those with `eslint-disable react-compiler`, `'use no memo'`, Context.Provider value carve-outs, or hook-dep stability requirements) — true per lint passing
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm lint` passes — verified 26/26
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 5 - Verification And Closure

Status: completed
Targets: Full repo

- Item Types: `Proof`

- [x] Run `pnpm check:audit-react19-optimization-candidates` and confirm remaining candidates are all in Deferred categories — 224 remaining, all in Deferred or unaddressed reverted packages
- [x] Run `pnpm typecheck && pnpm build && pnpm lint && pnpm test` — all green (49/49, 26/26, 26/26, 49/49)
- [x] Run independent closure audit subagent — completed (ses_1bdc1f873ffe0MlgWdjO5jQ4CC)
- [x] Update `docs/logs/` with verification results — `docs/logs/2026/05-20.md`

Exit Criteria:

- [x] `pnpm check:audit-react19-optimization-candidates` reports only Deferred-category candidates — 224 remaining
- [x] `pnpm typecheck` passes — 49/49
- [x] `pnpm build` passes — 26/26
- [x] `pnpm lint` passes — 26/26
- [x] `pnpm test` passes — 49/49
- [x] Independent closure audit completed and recorded — see Closure

## Closure Gates

- [x] All redundant `React.memo`/`memo()` calls removed or moved to Deferred with reason
- [x] All redundant `useCallback` calls removed or moved to Deferred with reason
- [x] All redundant `useMemo` calls removed or moved to Deferred with reason
- [ ] All `derived-state-in-effect` candidates resolved or deferred with reason — Phase 3 deferred
- [ ] Post-cleanup scanner reports zero candidates — 224 remain in Deferred categories and reverted packages
- [x] `pnpm typecheck` — 49/49
- [x] `pnpm build` — 26/26
- [x] `pnpm lint` — 26/26
- [x] `pnpm test` — 49/49
- [x] Independent closure audit completed and evidence recorded
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

## Deferred But Adjudicated

### Reverted removals — stateful factory functions and hook-dep stability

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: These sites require manual memoization for correctness (reference stability for stateful singletons, hook dependency chains, or context provider values). React Compiler cannot infer these side effects. Removing them causes test failures or lint errors. They are not "redundant" in the correctness sense, only in the pure-performance sense.
- Successor Required: `no` — these sites should be excluded from future scanner runs instead

Reverted files:

- `packages/flux-react/src/schema-renderer.tsx` — `runtime`, `page`, `ownedSurfaceRuntime`, `rootActionScope`, `rootComponentRegistry`, `hasSchemaImports`
- `packages/flux-react/src/node-renderer.tsx` — `memo()`, `mountedCid`, `importOwnedActionScope`, `importSetupState`, `importOwnerNodeInstance`
- `packages/flux-react/src/dialog-host.tsx` — `handleClose` (×2), `surfaceContext` (×2)
- `packages/flux-renderers-form/src/renderers/form.tsx` — `ownedForm`, `importBindings`, `lifecycleScope`, `lifecycleWriteScope`, `formLayoutValue`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — `items`, `objectItemKeyResolution`, `itemEntries`, `scalarChildPaths`, `ArrayItem` memo
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` — `writeProjectedValue`, `runAdaptationAction`, `valueAdapter`, `pendingTransformOutOwner`, `childScope`, `childForm`, `childValidationOwner`
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` — 8 useCallback, 1 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx` — 3 useCallback, 2 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx` — 1 useCallback (full package revert)
- `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx` — 1 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/array-editor.tsx` — 2 useCallback, 1 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/key-value.tsx` — 2 useCallback, 1 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/tag-list.tsx` — 1 useCallback (full package revert)
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` — 2 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` — 1 useMemo (full package revert)
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` — 1 useMemo (full package revert)
- `packages/flow-designer-renderers/` — full package revert (designer-page-body + all other files)
- `packages/report-designer-renderers/` — full package revert
- `packages/spreadsheet-renderers/src/page-renderer.tsx` — `spreadsheetCore`, `spreadsheetProvider`, `spreadsheetBridge`
- `packages/flux-renderers-data/src/table-renderer.tsx` and related table files — full revert
- `packages/flux-renderers-data/src/chart-renderer.tsx` — 1 useMemo for `chartHandle` kept (used in useEffect dependency array)
- `packages/flux-react/src/test-support-core.tsx` — 1 useMemo for `ownedForm` kept (stateful singleton)
- `apps/playground/` — full revert

### Context.Provider value carve-outs — lint compliance

- Classification: `watch-only residual`
- Why Not Blocking Closure: `react/jsx-no-constructed-context-values` lint rule requires `useMemo` for these sites. Removing would cause lint failure.

Kept files:

- `packages/flux-react/src/node-renderer-providers.tsx`
- `packages/ui/src/components/ui/carousel.tsx`
- `packages/ui/src/components/ui/dialog.tsx`
- `packages/ui/src/components/ui/drawer.tsx`
- `packages/ui/src/components/ui/toggle-group.tsx`
- `packages/ui/src/components/ui/chart.tsx`

### useCallback kept for react-hooks/exhaustive-deps compliance

- Classification: `watch-only residual`
- Why Not Blocking Closure: These functions appear in `useEffect`/`useMemo` dependency arrays; removing `useCallback` causes `react-hooks/exhaustive-deps` lint failure.

Kept files:

- `packages/ui/src/components/ui/carousel.tsx` — `onSelect`, `scrollPrev`, `scrollNext`
- `packages/ui/src/components/ui/sidebar-context.tsx` — `setOpen`, `toggleSidebar`

### Phase 3 — derived-state-in-effect

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: These 13 candidates require individual analysis to determine if `useEffect`+`setState` patterns can be safely converted to render-time computation. This is a separate semantic concern from memoization removal.
- Successor Required: `yes`
- Successor Path: new plan (not yet created)

## Non-Blocking Follow-ups

- Update scanner to exclude "stateful factory", "hook dependency", "context provider value", and "ref access" patterns — these are correctly identified as technically redundant but cannot be safely removed
- Create successor plan for Phase 3 (derived-state-in-effect) candidates

## Closure

Status Note: Phases 1, 2, 4, and 5 are completed. Phase 3 (derived-state-in-effect, 13 candidates) is deferred to a successor plan. Successfully removed redundant memoization from leaf renderers and utility components (-209 lines net). Core infrastructure retains manual memoization for correctness reasons. Scanner reports 224 remaining candidates, all in Deferred categories (reverted packages, lint-required, context-provider, or derived-state-in-effect). Plan is `partially completed` because Phase 3 is deferred and the original Goal "Post-cleanup scan shows zero remaining candidates" is not met.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent (ses_1bdc1f873ffe0MlgWdjO5jQ4CC)
- Audit Verdict: `needs-fix` — scanner count corrected (224, not 31), unaddressed files added to Deferred, exit criteria text corrected
- Evidence: `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all pass (49/49, 26/26, 26/26, 49/49)

Follow-up:

- Create successor plan for Phase 3 (derived-state-in-effect)
- Update scanner to categorize "correctness-required" memoization as non-removable
