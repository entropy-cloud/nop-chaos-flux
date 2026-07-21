# GanttStore Zustand Migration

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` (F-10 deferred item), `docs/architecture/styling-system.md`, `docs/references/quick-reference.md` (state management conventions)
> Related: `docs/plans/2026-07-20-0800-2-s1-gantt-core-engine-plan.md` (original GanttStore design)

## Purpose

Migrate `GanttStore` from vanilla EventEmitter class to Zustand vanilla store (`zustand/vanilla`), eliminating the ad-hoc React context and `useSyncExternalStore` subscription pattern. This brings the Gantt sub-domain into compliance with project-wide state-management conventions and resolves architecture drift F-10 that was deferred from the scheduling quality remediation plan.

## Current Baseline

- `GanttStore` (`packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:33-496`) is a 464-line EventEmitter class with manual `on`/`off`/`emit` event system, multiple revision counters for change detection, and mutation-based task/link/resource management.
- `gantt-context.tsx` creates an ad-hoc React context (`GanttStoreContext`) with `useSyncExternalStore` hooks (`useGanttStoreSnapshot`, `useGanttTaskSnapshot`, `useGanttLinkSnapshot`, `useGanttLayoutSnapshot`) that subscribe to EventEmitter events to trigger React re-renders.
- ~30 files across the Gantt sub-domain consume the store directly via `useGanttStore()` for imperative operations, and the snapshot hooks for reactive reads.
- Project conventions require "Zustand vanilla stores (not React context stores). Use `use-sync-external-store` for React subscriptions" (AGENTS.md). The GanttStore violates this by using EventEmitter + React context instead of Zustand.

## Goals

- Migrate `GanttStore` class to `zustand/vanilla` `createStore` — the class becomes a Zustand store with immutable state updates.
- Replace ad-hoc React context (`GanttStoreContext`) with Zustand-native subscription: consumers use `useSyncExternalStore(store.subscribe, store.getState)` or the standard Zustand React bridge.
- All existing snapshot hooks (`useGanttStoreSnapshot`, `useGanttTaskSnapshot`, `useGanttLinkSnapshot`, `useGanttLayoutSnapshot`) are reimplemented as thin wrappers over Zustand selectors. API surface and semantics remain identical.
- All mutation methods (`updateTask`, `deleteTask`, `addLink`, `removeLink`, `parse`, `toggleOpen`, `setZoom`, etc.) remain available with identical signatures — the store object keeps the same method API.
- Existing test suite (`gantt-store.test.ts`, `gantt-utils.test.ts`, `undo-stack.test.ts`, `gantt-interactions.test.ts`, component tests) continues to pass without behavioral changes.
- Zero changes to component logic (`gantt.tsx`, `gantt-bars.tsx`, `gantt-links.tsx`, drag hooks, editor, keyboard nav, etc.) — only the store and its context bridge are modified.

## Non-Goals

- No functional or behavioral changes to the Gantt sub-domain — pure refactoring with zero external-observable change.
- No changes to Kanban or Calendar store patterns (Kanban uses pure functions + BoardData immutability; Calendar uses form store — each has its own architecture).
- No undo-stack rewriting beyond updating its store reference.
- No bundle size analysis or tree-shaking verification (covered by the scheduling quality plan's non-blocking follow-ups).
- No `React.memo` / `useCallback` / `useMemo` cleanup (handled separately in the scheduling quality plan).

## Scope

### In Scope

- `packages/flux-renderers-scheduling/package.json` — add `zustand` as a runtime dependency.
- `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts` — rewrite class to Zustand `createStore`; all methods become store actions via `set()`; state is a single immutable object with typed slices.
- `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx` — replace `GanttStoreContext` with Zustand store export; snapshot hooks use `useSyncExternalStore` with `store.subscribe`.
- `packages/flux-renderers-scheduling/src/gantt/gantt-store.test.ts` — update test setup to use `useGanttStore()` (if any test code directly instantiates `new GanttStore()`, update store creation).
- `packages/flux-renderers-scheduling/src/gantt/index.ts` — verify exports are unchanged.
- `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx` — the `GanttStoreProvider` wrapper may be removed or simplified to just passing the Zustand store object.
- All files importing from `./gantt-store.js` or `./gantt-context.js` — verify imports remain valid.

### Out Of Scope

- Rewriting Kanban or Calendar state management.
- Changing the Gantt renderer component logic or schema API.
- Diff-view, barcode, or any other scheduling sub-domain.

## Failure Paths

不适用 — pure internal refactoring with zero behavioral change; no API contracts, auth, or external integrations involved.

## Test Strategy

档位选择：`必须自动化`

The migration is a pure refactoring with zero behavioral change. Every existing test must pass. Key risk: store creation pattern changes may require test setup updates. Proof items (focused comparison tests) precede migration.

## Execution Plan

### Phase 1 — Store Rewrite + Adapter Bridge

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts`, `gantt-context.tsx`

- Item Types: `Fix | Proof`

- [x] Audit: list all call sites of `GanttStore` methods across the Gantt sub-domain (hooks, components, tests). Verify method signatures and return types are fully documented.
- [x] Add `zustand` as a runtime dependency of `packages/flux-renderers-scheduling/package.json` (already in the monorepo, used by multiple sibling packages).
- [x] Proof: write focused comparison tests that create both an EventEmitter `GanttStore` and a Zustand store with the same initial data, then assert identical outputs for `getVisibleTasks()`, `recalcLayout()`, and revision-count getters after a sequence of mutations (add/update/delete task, add/remove link, toggleOpen, setZoom).
- [x] Rewrite `gantt-store.ts`: define Zustand state interface (`GanttStoreState` containing all Maps + config + revision counters + expanded set); implement all existing methods as `set()`-driven actions; export `createGanttStore(config)` factory returning `StoreApi<GanttStoreState>`.
- [x] Rewrite `gantt-context.tsx`: replace `GanttStoreContext` with direct Zustand store export; reimplement `useGanttStore()` as `() => useSyncExternalStore(store.subscribe, store.getState)` pointing to singleton context; reimplement snapshot hooks as selector-based wrappers.
- [x] Run focused tests: `gantt-store.test.ts`, `gantt-context.test.tsx` (if exists), `gantt-interactions.test.ts`, `undo-stack.test.ts` — all pass.
- [x] Run full package typecheck: `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck`.

Exit Criteria:

- [x] GanttStore is a Zustand vanilla store with identical public method signatures and export surface.
- [x] All existing snapshot hooks reimplemented with identical semantics.
- [x] Focused comparison proof tests pass (both old and new store produce identical outputs).
- [x] All Gantt sub-domain tests pass.
- [x] Package typecheck passes.

### Phase 2 — Full Integration Verification

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`

- Item Types: `Fix | Proof`

- [x] Verify all 30+ component/hook files compile and pass typecheck without changes to their internal logic (only import-side updates if any).
- [x] Run `pnpm test` on the scheduling package — verify all Gantt tests pass (store, hooks, components, interactions, undo).
- [x] Run `pnpm build` on the scheduling package — verify no build regressions.
- [x] Run playground dev build (`pnpm dev`) and visually confirm Gantt demo page loads without errors, renders tasks, supports drag/zoom/interaction.

Exit Criteria:

- [x] Full package test suite green (no regressions).
- [x] `pnpm typecheck` + `pnpm build` pass for the scheduling package.
- [x] Playground Gantt demo page loads and renders correctly.

### Phase 3 — Cleanup & Closure

Status: completed
Targets: `gantt-context.tsx`, `gantt-store.ts`, scheduler renderer

- Item Types: `Fix | Follow-up`

- [x] Remove dead code from `gantt-context.tsx`: delete `GanttStoreProvider`, `GanttStoreContext`, `ALL_EVENTS` constant, old `subscribeToEvents` helper (if no longer referenced elsewhere). Verify no imports point to removed symbols.
- [x] Remove `gantt-context.tsx` from `gantt/index.ts` exports if the renamed Zustand store is exported directly from store file.

Exit Criteria:

- [x] EventEmitter subscription infrastructure removed from `gantt-context.tsx` (`ALL_EVENTS`/`subscribeToEvents` gone); store-level `on`/`off`/`emit` methods retained for backward compatibility with tests and `gantt-header.tsx`.
- [x] All snapshot hooks function through Zustand subscriptions only.
- [x] Clean `pnpm typecheck` / `pnpm test` with zero warnings.

## Draft Review Record

- Reviewer / Agent: _(to be filled by independent fresh sub-agent session)_
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

> All Phase Exit Criteria must be met. The full workspace verification is run here once.

- [x] GanttStore migrated to Zustand with zero behavioral change.
- [x] All existing Gantt tests pass without modifications requiring store behavior changes.
- [x] Ad-hoc React context eliminated or reduced to a minimal Zustand-store carrier.
- [x] EventEmitter-based context subscription code (`ALL_EVENTS`/`subscribeToEvents`) removed; store-level `on`/`off`/`emit` methods retained for backward compatibility with tests and `gantt-header.tsx`.
- [x] No drift introduced between contract surface and actual behavior (verified via comparison proof tests).
- [x] Affected owner docs updated: `docs/architecture/styling-system.md` (if any convention section references GanttStore pattern), `docs/logs/` daily log entry.
- [x] No in-scope live defect or contract drift silently deferred.
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Undo System Unification (F-06)

- Classification: `optimization candidate`
- Why Not Blocking Closure: Gantt and Kanban each have their own undo stack with similar but independently working implementations. Unification is a code quality improvement that does not affect correctness or user-observable behavior. The inconsistency is already documented in code FIXME annotations per the scheduling quality plan.
- Successor Required: `no`

## Non-Blocking Follow-ups

- No remaining plan-owned work.
- `gantt-header.tsx:42 store.emit('change')` fires with zero registered listeners — orphaned line. Cleanup deferred as `optimization candidate`; no user-observable effect.

## Closure

Status Note: Plan completed — GanttStore migrated from EventEmitter class to zustand/vanilla `createStore`. All existing test suites pass (572 tests, 69 files), typecheck clean, build clean. EventEmitter on/off/emit retained on the Zustand store hybrid for backward compatibility with `gantt-header.tsx` and test assertions; context-subscription infrastructure (`ALL_EVENTS`/`subscribeToEvents`) removed.

Closure Audit Evidence:

- Auditor / Agent: fresh-sub-agent (closure audit session)
- Evidence: Verified live code in `packages/flux-renderers-scheduling/src/gantt/` — gantt-store.ts uses `createStore` with immutable `setState()`, gantt-context.tsx snapshot hooks use `useSyncExternalStore(store.subscribe, ...)`. `zustand` dependency present in `package.json`. All 572 scheduling tests pass (69 files). `pnpm typecheck` + `pnpm build` + `pnpm lint` pass. Daily log at `docs/logs/2026/07-21.md` records the migration. No architecture doc updates needed (`docs/architecture/styling-system.md` has no GanttStore references).

Follow-up:

- No remaining plan-owned work.
