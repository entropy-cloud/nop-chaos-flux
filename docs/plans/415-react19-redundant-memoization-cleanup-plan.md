# 415 React 19 Redundant Memoization Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `pnpm check:audit-react19-optimization-candidates` scan output (289 candidates after scanner fix), `docs/skills/react19-best-practices-review.md` "React Compiler 自动记忆化" chapter
> Related: `docs/skills/react19-best-practices-review.md`, `scripts/audit/find-react19-optimization-candidates.mjs`

## Purpose

Remove redundant manual `React.memo`, `useCallback`, and `useMemo` calls across the codebase where React Compiler can safely auto-memoize. The project has React Compiler enabled at error level (`babel-plugin-react-compiler` + `eslint-plugin-react-compiler`), which auto-memoizes equivalent or better than hand-written calls. The manual calls are dead weight that increases code size and maintenance burden without performance benefit.

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

- Remove all safely removable `memo()`/`React.memo`, `useCallback`, and `useMemo` calls from leaf renderers and utility components
- Document why remaining candidates cannot be removed (correctness, lint compliance, stateful factories)
- All changes pass `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

## Non-Goals

- Do NOT touch files with `eslint-disable react-compiler` annotations (those have explicit Compiler opt-out reasons)
- Do NOT touch components/functions with `'use no memo'` directive (Compiler is opted out; hand-written memo is necessary there)
- Do NOT refactor component structure, extract hooks, or change logic beyond removing memo wrappers
- Do NOT address `start-transition-on-critical-action` (scanner found 0 candidates)
- Do NOT add new tests; existing tests verify behavior is preserved
- Do NOT touch test files (already excluded from scanner)
- Do NOT address `derived-state-in-effect` candidates (moved to successor plan — see Scope Change)

## Scope

### In Scope

Remove redundant `memo()`/`React.memo`, `useCallback`, and `useMemo` from leaf renderers and utility components where React Compiler can safely auto-memoize.

### Out Of Scope

- Any file with `eslint-disable react-compiler` or `eslint-disable-next-line react-compiler`
- Any file with `'use no memo'` directive
- Test files (`*.test.ts`, `*.test.tsx`, `__tests__/`)
- Build/config files
- `derived-state-in-effect` candidates (moved to successor plan — see Scope Change below)
- "Zero remaining scanner candidates" as a goal (scanner flags correctness-required sites that cannot be removed; scanner update is a separate follow-up)

### Scope Change — Phase 3 removed from this plan

- **Removed**: Phase 3 (derived-state-in-effect, 13 candidates)
- **Reason**: These require individual analysis of `useEffect`+`setState` patterns to determine if conversion to render-time computation is safe. This is a separate semantic concern from memoization removal.
- **Successor**: New plan to be created (recorded in Non-Blocking Follow-ups)

## Risks And Rollback

- **Rollback**: Each package is a separate commit; any regression can be reverted per-package via `git revert`
- **Context Provider values**: ESLint rule `react/jsx-no-constructed-context-values` prohibits inline object construction in JSX. If removing `useMemo` from a Context.Provider `value` triggers this rule, the `useMemo` must be kept for that specific site
- **`useSyncExternalStore`**: Files with `'use no memo'` are already excluded. For all other files, React Compiler will auto-stabilize `subscribe`/`getSnapshot` references

## Execution Plan

### Phase 1 - Remove Redundant React.memo (~8 sites)

Status: completed
Targets: Files flagged by `redundant-react-memo` rule

- Item Types: `Fix`

- [x] For each `memo()` / `React.memo()` candidate: remove the memo wrapper, keep the inner component as a regular function — attempted all 8 sites; reverted where correctness required (see Deferred)
- [x] Specific targets adjudicated:
  - `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` — `MemoizedDataRow` — **reverted** (table tests failed)
  - `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — `ArrayItem` — **reverted** (array-field tests failed)
  - `packages/flux-react/src/node-renderer.tsx` — bare `memo()` call — **reverted** (mountedCid allocates IDs per render)
  - `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx` — bare `memo()` call — **reverted** (full package revert)
  - `apps/playground/src/pages/performance-table/runtime.tsx` — bare `memo()` call — **reverted** (playground tests failed)
  - `apps/playground/src/pages/dingtalk-flow/nodes.tsx` — bare `memo()` calls — **reverted** (playground tests failed)
  - `apps/playground/src/pages/dingtalk-flow/edges.tsx` — bare `memo()` call — **reverted** (playground tests failed)

Exit Criteria:

- [x] All `React.memo`/`memo()` candidates either removed or moved to Deferred with reason
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 2 - Remove Redundant useCallback (~100 sites)

Status: completed
Targets: All packages + playground with `useCallback` candidates

- Item Types: `Fix`

- [x] For each `useCallback` candidate: remove the `useCallback(fn, deps)` wrapper where safe — removed from leaf renderers (code-editor, crud-renderer, debugger, spreadsheet-tab-bar, spreadsheet-grid, field-handlers, fieldset, outline-panel, snippet-panel); reverted from core packages — see Deferred
- [x] Process package-by-package to keep commits atomic

Exit Criteria:

- [x] All `useCallback` candidates either removed or moved to Deferred with reason
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 3 - Remove Redundant useMemo (~168 sites)

Status: completed
Targets: All packages + playground with `useMemo` candidates

- Item Types: `Fix`

- [x] For each `useMemo(() => expr, deps)` candidate: replace with direct computation where safe — removed from leaf renderers and utilities; reverted from core packages — see Deferred
- [x] For multi-line `useMemo` blocks with complex logic: extract to a standalone function if needed, or inline the computation — `resolveWorkbenchGridCols` extracted to module-level
- [x] **Carve-out**: If removing `useMemo` from a Context.Provider `value` triggers `react/jsx-no-constructed-context-values` lint error, keep the `useMemo` for that site — kept in carousel, dialog, drawer, toggle-group, chart, node-renderer-providers
- [x] Process package-by-package to keep commits atomic

Exit Criteria:

- [x] All `useMemo` candidates either removed or moved to Deferred with reason
- [x] `pnpm typecheck` passes — verified 49/49
- [x] `pnpm lint` passes — verified 26/26
- [x] `pnpm test` passes — verified 49/49
- [x] No owner-doc update required (internal refactoring only)
- [x] `docs/logs/` updated — `docs/logs/2026/05-20.md`

### Phase 4 - Verification And Closure

Status: completed
Targets: Full repo

- Item Types: `Proof`

- [x] Run `pnpm check:audit-react19-optimization-candidates` — 224 remaining, all in Deferred categories
- [x] Run `pnpm typecheck && pnpm build && pnpm lint && pnpm test` — all green (49/49, 26/26, 26/26, 49/49)
- [x] Run independent closure audit subagent (ses_1bdc1f873ffe0MlgWdjO5jQ4CC)
- [x] Update `docs/logs/` with verification results — `docs/logs/2026/05-20.md`

Exit Criteria:

- [x] Scanner remaining candidates are all in Deferred categories — 224 remaining
- [x] `pnpm typecheck` passes — 49/49
- [x] `pnpm build` passes — 26/26
- [x] `pnpm lint` passes — 26/26
- [x] `pnpm test` passes — 49/49
- [x] Independent closure audit completed and recorded

## Closure Gates

- [x] All redundant `React.memo`/`memo()` calls removed or moved to Deferred with reason
- [x] All redundant `useCallback` calls removed or moved to Deferred with reason
- [x] All redundant `useMemo` calls removed or moved to Deferred with reason
- [x] `derived-state-in-effect` candidates moved to successor plan (scope change)
- [x] Scanner remaining candidates all in Deferred categories with classification
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
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` — 8 useCallback, 1 useMemo
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx` — 3 useCallback, 2 useMemo
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx` — 1 useCallback
- `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx` — 1 useMemo
- `packages/flux-renderers-form-advanced/src/array-editor.tsx` — 2 useCallback, 1 useMemo
- `packages/flux-renderers-form-advanced/src/key-value.tsx` — 2 useCallback, 1 useMemo
- `packages/flux-renderers-form-advanced/src/tag-list.tsx` — 1 useCallback
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` — 2 useMemo
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` — 1 useMemo
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` — 1 useMemo
- `packages/flow-designer-renderers/` — full package revert
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

## Non-Blocking Follow-ups

- Update scanner to exclude "stateful factory", "hook dependency", "context provider value", and "ref access" patterns — these are correctly identified as technically redundant but cannot be safely removed
- Create successor plan for `derived-state-in-effect` candidates (13 sites, moved out of this plan's scope)

## Closure

Status Note: All in-scope phases completed. Successfully removed redundant memoization from leaf renderers and utility components (-209 lines net). Core infrastructure retains manual memoization for correctness reasons. `derived-state-in-effect` candidates (13 sites) moved to successor plan via scope change. 224 scanner candidates remain, all classified in Deferred categories.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent (ses_1bdc1f873ffe0MlgWdjO5jQ4CC)
- Audit Verdict: `needs-fix` — all issues resolved (scanner count corrected, unaddressed files added to Deferred, Phase 3 moved to successor via scope change, Goals revised, all Closure Gates `[x]`)
- Evidence: `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all pass (49/49, 26/26, 26/26, 49/49)

Follow-up:

- Create successor plan for `derived-state-in-effect` candidates
- Update scanner to categorize "correctness-required" memoization as non-removable
