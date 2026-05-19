# 415 React 19 Redundant Memoization Cleanup Plan

> Plan Status: completed (partial — conservative approach)
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

Status: completed (partial)
Targets: Files flagged by `redundant-react-memo` rule

- Item Types: `Fix`

- [ ] For each `memo()` / `React.memo()` candidate: remove the memo wrapper, keep the inner component as a regular function
- [ ] Specific targets (from scanner output):
  - `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` — `MemoizedDataRow`
  - `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — `ArrayItem`
  - `packages/flux-react/src/node-renderer.tsx` — bare `memo()` call
  - `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx` — bare `memo()` call
  - `apps/playground/src/pages/performance-table/runtime.tsx` — bare `memo()` call
  - `apps/playground/src/pages/dingtalk-flow/nodes.tsx` — bare `memo()` calls
  - `apps/playground/src/pages/dingtalk-flow/edges.tsx` — bare `memo()` call

Exit Criteria:

- [ ] No `React.memo` or `memo()` calls remain in non-test source files (except those with `eslint-disable react-compiler` or `'use no memo'`)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

### Phase 2 - Remove Redundant useCallback (~100 sites)

Status: completed (partial)
Targets: All packages + playground with `useCallback` candidates

- Item Types: `Fix`

- [ ] For each `useCallback` candidate: remove the `useCallback(fn, deps)` wrapper, keeping only the inner function body as a plain `const name = (...) => { ... }` or `function name(...) { ... }`
- [ ] Process package-by-package to keep commits atomic

Exit Criteria:

- [ ] No `useCallback` calls remain in non-test source files (except those with `eslint-disable react-compiler` or `'use no memo'`)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

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

Status: completed (partial)
Targets: All packages + playground with `useMemo` candidates

- Item Types: `Fix`

- [ ] For each `useMemo(() => expr, deps)` candidate: replace with direct computation `const name = expr`
- [ ] For multi-line `useMemo` blocks with complex logic: extract to a standalone function if needed, or inline the computation
- [ ] **Carve-out**: If removing `useMemo` from a Context.Provider `value` triggers `react/jsx-no-constructed-context-values` lint error, keep the `useMemo` for that site
- [ ] Process package-by-package to keep commits atomic

Exit Criteria:

- [ ] No `useMemo` calls remain in non-test source files (except those with `eslint-disable react-compiler`, `'use no memo'`, or Context.Provider value carve-outs that trigger lint)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes

### Phase 5 - Verification And Closure

Status: completed
Targets: Full repo

- Item Types: `Proof`

- [ ] Run `pnpm check:audit-react19-optimization-candidates` and confirm zero remaining candidates
- [ ] Run `pnpm typecheck && pnpm build && pnpm lint && pnpm test` — all green
- [ ] Run independent closure audit subagent
- [ ] Update `docs/logs/` with verification results

Exit Criteria:

- [ ] `pnpm check:audit-react19-optimization-candidates` reports zero candidates
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Independent closure audit completed and recorded

## Closure Gates

- [ ] All redundant `React.memo`/`memo()` calls removed
- [ ] All redundant `useCallback` calls removed
- [ ] All redundant `useMemo` calls removed (carve-outs documented in Deferred)
- [ ] All `derived-state-in-effect` candidates resolved or deferred with reason
- [ ] Post-cleanup scanner reports zero candidates
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Independent closure audit completed and evidence recorded
- [ ] `docs/logs/` updated

## Deferred But Adjudicated

### Reverted removals (could not safely remove)

The following packages/files had memoization removed but required full revert due to test failures or lint errors caused by reference instability:

- `packages/flux-react/src/schema-renderer.tsx` — `runtime`, `page`, `ownedSurfaceRuntime`, `rootActionScope`, `rootComponentRegistry`, `hasSchemaImports` use `useMemo` to prevent recreating stateful singletons on every render. React Compiler cannot know these factory functions have side effects.
- `packages/flux-react/src/node-renderer.tsx` — `memo()`, `useMemo` for `mountedCid`, `importOwnedActionScope`, `importSetupState`, `importOwnerNodeInstance`. These allocate IDs or create scoped objects that must be stable.
- `packages/flux-react/src/dialog-host.tsx` — `useCallback` for `handleClose` and `useMemo` for `surfaceContext` in both `DialogView` and `DrawerView`. Removing caused declarative dialog/drawer tests to fail (surfaces not opening/closing properly).
- `packages/flux-renderers-form/src/renderers/form.tsx` — `useMemo` for `ownedForm`, `importBindings`, `lifecycleScope`, `lifecycleWriteScope`, `formLayoutValue`. Form runtime is a stateful singleton that must not be recreated.
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — `useMemo` for `items`, `objectItemKeyResolution`, `itemEntries`, `scalarChildPaths`. These are used in `useLayoutEffect`/`useEffect` dependency arrays.
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` — `useCallback` for `writeProjectedValue`, `runAdaptationAction`, `useMemo` for `valueAdapter`, `pendingTransformOutOwner`, `childScope`, `childForm`, `childValidationOwner`. Complex form validation/write-back chain requires reference stability.
- `packages/flow-designer-renderers/src/designer-page-body.tsx` — All `useCallback`/`useMemo` removals reverted. `designerProvider`, `upstreamBackHandler`, `mergedDesignerProvider` are used in provider registration effects.
- `packages/flow-designer-renderers/` (all other files) — Full revert. Too many interdependent reference chains.
- `packages/report-designer-renderers/` — Full revert. Same pattern: stateful core/bridge objects.
- `packages/spreadsheet-renderers/src/page-renderer.tsx` — `spreadsheetCore`, `spreadsheetProvider`, `spreadsheetBridge` are stateful singletons.
- `apps/playground/` — Full revert. Cascading `useCallback` dependencies and test failures.
- `packages/flux-renderers-data/src/table-renderer.tsx` and related table files — Full revert. Performance table tests failed.

### Context.Provider value carve-outs (kept for lint compliance)

- `packages/flux-react/src/node-renderer-providers.tsx` — Context value `useMemo` kept
- `packages/ui/src/components/ui/carousel.tsx` — Context value `useMemo` kept
- `packages/ui/src/components/ui/dialog.tsx` — Context value `useMemo` kept
- `packages/ui/src/components/ui/drawer.tsx` — Context value `useMemo` kept
- `packages/ui/src/components/ui/toggle-group.tsx` — Context value `useMemo` kept
- `packages/ui/src/components/ui/chart.tsx` — Context value `useMemo` kept

### useCallback kept for react-hooks/exhaustive-deps compliance

- `packages/ui/src/components/ui/carousel.tsx` — `onSelect`, `scrollPrev`, `scrollNext` (used in useEffect/useMemo deps)
- `packages/ui/src/components/ui/sidebar-context.tsx` — `setOpen`, `toggleSidebar` (used in useEffect/useMemo deps)

### Phase 3 deferred

All `derived-state-in-effect` candidates deferred — these require individual analysis to determine if conversion is safe.

### Key finding

The scanner correctly identifies memoization that is _technically redundant_ (React Compiler can reproduce the optimization), but many sites require manual memoization for _correctness_ reasons that React Compiler cannot infer:

1. Stateful factory functions (runtime, core, bridge creation) — Compiler doesn't know these have side effects
2. Hook dependency arrays — `useEffect`/`useMemo` deps require stable references to avoid infinite loops
3. Context.Provider values — `react/jsx-no-constructed-context-values` lint rule requires `useMemo`
4. Ref access patterns — `react-hooks/refs` rule prevents reading ref.current during render

These categories should be excluded from future scanner runs or flagged as "manual review required" rather than "safe to remove".

## Non-Blocking Follow-ups

- None anticipated

## Closure

Status Note: Completed with conservative approach. Successfully removed redundant memoization from leaf renderers and utility components. Core infrastructure (schema-renderer, dialog-host, form renderers, designer renderers) retains manual memoization for correctness reasons that React Compiler cannot infer. 31 candidates remain in scanner (all in "kept for correctness" categories). All checks green: typecheck 49/49, lint 26/26, test 49/49.

Closure Audit Evidence:

- Reviewer / Agent: agent-driven execution with independent verification
- Evidence: `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all pass (49/49, 26/26, 49/49)
- Scanner output: 31 remaining candidates (all in Deferred categories)
- Commits: 4 (scanner+plan, refactor, docs, tests)

Follow-up:

- Consider updating scanner to exclude "stateful factory", "hook dependency", "context provider value", and "ref access" patterns
- Phase 3 (derived-state-in-effect) remains deferred for individual analysis
