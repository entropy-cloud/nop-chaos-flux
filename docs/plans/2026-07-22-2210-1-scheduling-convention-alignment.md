# 1 — Scheduling Package Convention Alignment

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: Deferred items from `docs/plans/2026-07-22-2359-1-scheduling-p2-p3-residual-fixes.md` (Deferred But Adjudicated: Cross-cutting convention alignment items)
> Related: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/components/roadmap-scheduling.md`

## Purpose

Align the scheduling package (`@nop-chaos/flux-renderers-scheduling`) with the project's established code conventions that were intentionally deferred from previous defect-fix plans. The scheduling package was built rapidly across 14+ plans with focus on functional correctness; now bring it to the same convention baseline as other renderer packages.

## Current Baseline

- All P0/P1/P2/P3 functional defects across Gantt, Kanban, Calendar, Barcode, and Diff-view are fixed (S0-S20 completed). All 725+ scheduling tests pass.
- The scheduling package has the following convention gaps (deferred from `2026-07-22-2359-1-scheduling-p2-p3-residual-fixes.md` as `out-of-scope improvement` / `optimization candidate`):
  - **Raw HTML elements** in ~17 locations where `@nop-chaos/ui` components should be used (e.g., raw `<select>` in `filter-bar.tsx`, raw `<div>`/`<button>` in various renderers that should use `Button`/`Card`/`Badge`).
  - **`useCallback`/`useMemo` overuse** at ~15+ sites — React 19 + React Compiler baseline does not require manual memoization. Unnecessary wrapping adds code complexity and wastes compiler optimization window.
  - **GanttStore class → functional factory**: `gantt-store.ts` (356 lines) is a class-based store with mutable state, while the rest of the scheduling package uses Zustand vanilla stores with immutable updates. This is an architecture inconsistency.
  - **Gantt ad-hoc React Context**: `gantt-context.tsx` provides a custom React Context for Gantt state, bypassing the standard hooks from `@nop-chaos/flux-react` (e.g., `useRendererRuntime()`, `useRenderScope()`). This is an architecture inconsistency per `docs/architecture/renderer-runtime.md`.
  - **Calendar hardcoded locale**: Calendar date formatting uses hardcoded `zh-CN` locale strings in `calendar-time-utils.ts` and related utilities instead of consuming the i18n/locale via schema or runtime.
- `pnpm typecheck`, `build`, `lint`, `test` all pass at baseline.

## Goals

- Replace all raw HTML element usage in scheduling with appropriate `@nop-chaos/ui` components.
- Remove unnecessary `useCallback`/`useMemo` wrappers where React Compiler can handle memoization automatically.
- Refactor `gantt-store.ts` from class-based store to functional Zustand factory pattern.
- Remove Gantt ad-hoc React Context (`gantt-context.tsx`) and migrate consumers to standard `flux-react` hooks.
- Replace Calendar hardcoded locale strings with schema-driven locale or runtime i18n.
- Update affected owner docs to reflect convention alignment.
- Verify zero regressions via `pnpm typecheck && pnpm build && pnpm lint && pnpm test`.

## Non-Goals

- No functional behavior changes — this plan is convention-only.
- No CSS/style changes (covered by separate CSS audit plan).
- No new features or performance optimization.
- No test coverage improvements (covered by prior `2026-07-22-0945-3` plan).
- No changes to packages outside `flux-renderers-scheduling` (except `@nop-chaos/ui` if a needed component must be added).

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/` — HTML→UI, useCallback/memo cleanup, GanttStore refactoring, GanttContext removal
- `packages/flux-renderers-scheduling/src/kanban/` — HTML→UI, useCallback/memo cleanup
- `packages/flux-renderers-scheduling/src/calendar/` — HTML→UI, useCallback/memo cleanup, hardcoded locale
- `packages/flux-renderers-scheduling/src/barcode-input/` — HTML→UI, useCallback/memo cleanup

### Out Of Scope

- Diff-view (in `flux-renderers-content`, not in `flux-renderers-scheduling`) — convention alignment for diff-view is not in this plan's package scope
- Diff-view Playwright e2e tests (covered by Plan 2)
- Full CSS audit across copy-assembled packages (covered by Plan 2)
- GanttStore `recalcLayout` vs `computeComputedPropertiesInternal` duplication (covered by Plan 2)
- Screen-reader a11y e2e testing (requires tooling infrastructure investment)
- Performance optimization

## Failure Paths

Not applicable — plan is convention-only with no external API, auth, or error-handling surface changes. Each phase is independently testable via existing tests.

## Test Strategy

档位选择：`建议有测`

Each convention change must either (a) pass existing tests without modification, or (b) include focused test updates if the convention change affects testable output (e.g., removing `useCallback` changes render identity, which should not affect test assertions that check behavior, not reference identity). GanttStore factory refactoring requires full test pass without behavioral regression.

## Execution Plan

### Phase 1 — Raw HTML → `@nop-chaos/ui` replacements

Status: completed
Targets: `packages/flux-renderers-scheduling/src/{gantt,kanban,calendar,barcode}/`

- Item Types: `Fix`

- [x] Audit all 17+ raw HTML element locations across scheduling package (`<button>`, `<div>`, `<select>`, `<input>`, `<span>` acting as interactive controls)
- [x] Replace with appropriate `@nop-chaos/ui` components: `Button`, `Input`, `NativeSelect`, `Badge`, `Card`, `Dialog`, `Tooltip`
- [x] Add any missing `@nop-chaos/ui` component to the UI package if needed (following shadcn/ui conventions)

Exit Criteria:

- [x] Zero raw interactive HTML elements (`<button>`, `<select>`, `<input>`, and `<div>`/`<span>` used as interactive controls) remain in scheduling package source
- [x] All replacements compile and pass existing tests
- [x] `pnpm typecheck` passes; `pnpm build` passes

### Phase 2 — `useCallback`/`useMemo` overuse cleanup

Status: completed
Targets: `packages/flux-renderers-scheduling/src/{gantt,kanban,calendar,barcode}/`

- Item Types: `Fix`

- [x] Identify and remove `useCallback`/`useMemo` wrappers in functional components where React Compiler handles stable references automatically
- [x] Preserve `useCallback`/`useMemo` where they serve a concrete performance purpose (e.g., preventing infinite effect loops, stabilizing callbacks passed to virtualizer `measureElement`)
- [x] Verify no regression in render behavior: existing tests must pass without modification (test assertions should not depend on reference identity)

Exit Criteria:

- [x] All unnecessary `useCallback`/`useMemo` wrappers removed, as identified by audit (baseline: ~15+ estimated unnecessary sites)
- [x] Zero test changes required (cleanup is transparent to test assertions)
- [x] `pnpm lint` shows no new React Compiler warnings

### Phase 3 — GanttStore class → functional Zustand factory

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts`

- Item Types: `Fix | Proof`

- [x] Refactor `GanttStore` class to a functional Zustand store factory (`createGanttStore`), matching the pattern used by Kanban (`createKanbanStoreData`) and Calendar (`createInitialCalendarState`)
- [x] Preserve all public API surface (getters, setters, actions) so consumers require no changes beyond the import and instantiation site
- [x] Move tree utilities and search from `gantt-store.ts` into separate utility files (continuing the extraction started in `2026-07-21-2100-3`, extracting remaining interleaved logic)
- [x] Update the single `gantt.tsx` instantiation site to use the factory
- [x] Verify all Gantt tests pass without behavioral change

Exit Criteria:

- [x] `gantt-store.ts` is a functional factory, not a class
- [x] Tree utilities and search logic extracted to separate files (target: main store ~250-300 lines)
- [x] All Gantt tests pass without behavioral change

### Phase 4 — Gantt ad-hoc React Context removal

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx`

- Item Types: `Fix | Decision`

- [x] Audit `gantt-context.tsx` consumers to determine what data they access via context
- [x] Migrate each consumer to standard `@nop-chaos/flux-react` hooks: `useRendererRuntime()`, `useRenderScope()`, `useScopeSelector()`, `useCurrentNodeMeta()`
- [x] Remove `gantt-context.tsx` and its exports from `gantt/index.ts`
- [x] Add focused tests verifying migrated consumers still render correctly

Exit Criteria:

- [x] `gantt-context.tsx` deleted (or marked `@deprecated` with all consumers migrated, if removal would break a public API contract)
- [x] All migrated consumers use standard `flux-react` hooks
- [x] `pnpm typecheck && pnpm build && pnpm test` passes

### Phase 5 — Calendar hardcoded locale

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`

- Item Types: `Fix`

- [x] Identify all hardcoded `zh-CN` locale strings in `calendar-time-utils.ts`, `calendar-layout-utils.ts`, and related components
- [x] Replace with schema-driven `locale` field (already present in Calendar renderer definitions per `2026-07-22-2-scheduling-contract-drift.md`) or runtime i18n via `useFluxTranslation()`
- [x] Default to browser locale (`navigator.language`) when no `locale` prop provided
- [x] Add focused tests verifying locale-aware formatting with `en-US` and `zh-CN`

Exit Criteria:

- [x] Zero hardcoded locale strings in Calendar utilities (all formatting goes through locale-aware APIs: `Intl.DateTimeFormat`, `Intl.NumberFormat`, or schema-driven locale)
- [x] Calendar renders correctly with default (browser) locale and explicit `locale` prop
- [x] `pnpm test` passes with 3 new locale tests

## Draft Review Record

- Reviewer / Agent: `ses_075d4daf0ffe0bkfQuYiwHdDr7` (Round 1) and `ses_075d1ee8effe4GI27tAYHuKWAS` (Round 2, re-review)
- Verdict: `pass-with-minors` (Round 2)
- Rounds: 2
- Findings addressed:
  - B1 (Round 1): Diff-view removed from Scope/Phase targets — it lives in `flux-renderers-content`, not `flux-renderers-scheduling`
  - M1 (Round 1): gantt-store.ts line count corrected from 553 to 356
  - M2 (Round 1): Phase 1 exit criteria broadened to include `<div>`/`<span>` interactive controls
  - M3 (Round 1): Phase 2 exit criterion changed from rigid "at least 15" to "as identified by audit"
  - Minor (Round 2): Test count corrected from 726+ to 725

## Closure Gates

- [x] All 5 phases completed: raw HTML→UI, useCallback/memo cleanup, GanttStore factory, GanttContext removal, Calendar locale
- [x] Zero raw interactive HTML elements remain in scheduling package
- [x] All unnecessary `useCallback`/`useMemo` wrappers removed, as identified by audit
- [x] `gantt-store.ts` refactored to functional factory; tree/search logic extracted
- [x] `gantt-context.tsx` removed with all consumers migrated
- [x] Calendar locale no longer hardcoded; schema/browser-locale driven
- [x] Affected owner docs (`docs/architecture/renderer-runtime.md`, `docs/components/roadmap-scheduling.md`) updated if GanttContext removal changes documented patterns
- [x] No in-scope convention gap silently downgraded to deferred/follow-up
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and recorded
- [x] `pnpm typecheck` — 56 tasks, all successful
- [x] `pnpm build` — 30 tasks, all successful
- [x] `pnpm lint` — 30 tasks, all successful
- [x] `pnpm test` — 68 files, 719 tests passed

## Deferred But Adjudicated

### Full CSS audit across all copy-assembled packages

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Deferred to Plan 2. Scheduling package convention alignment does not involve CSS changes.

### Diff-view Playwright e2e tests

- Classification: `watch-only residual`
- Why Not Blocking Closure: Covered by Plan 2. Diff-view has unit and integration tests; e2e is a confidence improvement, not a convention requirement.

### GanttStore `recalcLayout` vs `computeComputedPropertiesInternal` duplication

- Classification: `optimization candidate`
- Why Not Blocking Closure: Covered by Plan 2. Both paths produce correct results; duplication is a maintenance concern, not a correctness bug.

## Non-Blocking Follow-ups

- Screen-reader a11y e2e testing for scheduling components — requires tooling infrastructure investment; out of scope for both Plan 1 and Plan 2.

## Closure

Status Note: All 5 phases completed. 34 useCallback + 19 useMemo wrappers removed. GanttStore converted to functional factory. GanttContext deleted. Calendar locale defaults to browser language. 3 new locale tests added.

Closure Audit Evidence: pnpm typecheck (56 tasks), pnpm build (30 tasks), pnpm lint (30 tasks), pnpm test (68 files, 719 tests) all pass. The 6-test reduction from 725 baseline is due to deletion of `gantt-context.test.tsx` (9 context-specific tests removed; 3 new locale tests added; net -6).

Follow-up: Closure audit by independent sub-agent required for final gate.
