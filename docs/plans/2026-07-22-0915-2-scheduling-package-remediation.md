# {2} Scheduling Package Deep Remediation

> Plan Status: active
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-22-0908-multi-audit-scheduling.md`, `docs/audits/2026-07-22-0908-open-audit-scheduling.md`
> Related: `docs/plans/2026-07-22-0915-1-timezone-calendar-interaction-correctness.md`

## Purpose

Cover all remaining P1-P3 findings from the multi-dimensional and open-ended scheduling audits that are NOT addressed by `{1}` (note: D03-01 Calendar reaction key mismatch IS addressed by `{1}` Phase 2). This plan has three work areas: (A) barcode-input validation integration and lifecycle correctness (2 P1 + P2 items), (B) Gantt performance — row virtualization and redundant traversal elimination (2 P1), and (C) Kanban/cross-cutting fixes — collab backoff, undo wiring, contract drift, dead code, event hygiene, callback stability, doc cleanup, and miscellaneous P2/P3 items.

## Current Baseline

- Barcode-input at `barcode-input/barcode-input.tsx` has zero validation contributor — `required`, `minLength`, `maxLength`, `pattern`, `validate.action` are declared in schema but never compiled into validation rules. `handleChange` calls `form.setValue()` without input-blocking guards; invalid keystrokes are not blocked, but no validation lifecycle is invoked. No `touchField`/`visitField`/`validateField` calls in focus/blur handlers.
- `useBarcodeDetect` at `barcode-input/hooks/use-barcode-detect.ts:36-125` uses `useEffect` with `[]` deps + ref pattern, causing deadlock on `enabled` toggle (D07-01, P1).
- Gantt at `gantt-bars.tsx`, `gantt-grid.tsx`, `gantt-cellgrid.tsx` has zero row virtualization — all tasks rendered unconditionally (D15-001, P1).
- `getVisibleTasks()` at `gantt-tree-utils.ts:36-56` is a full recursive DFS tree traversal called 6 times per render across callsites in `gantt-bars.tsx`, `gantt.tsx`, and others (D15-002, P1).
- `useKanbanCollab` at `kanban/hooks/use-kanban-collab.ts:34,46,56-58,95-101` missing exponential backoff and has stale closure — infinite reconnect storm risk (D06-01, P1).
- Gantt undo stack at `gantt/gantt.tsx:156` created once, never populated with commands — `Ctrl+Z` silent no-op (D22-15, P1). Also not cleared on schema data refresh (F-78, P2).
- Kanban `void` pattern: only 2 of 11 event dispatches use `void` operator — 9 remaining (`onCardMove`, `onColumnReorder`, `onCardClick`, `onColumnClick`, `onCardAdd`, `onCardRemove`, `onColumnAdd`) risk unhandled promise rejections.
- `gantt/components/critical-path.ts` (138 lines) is dead production code imported by zero production files (F-71, P3).
- `columnsOrderOwnership`/`columnsOrderStatePath` in `kanban-board.tsx:73-76` are read then immediately `void`ed — schema promises a feature that doesn't exist (F-72, P2).
- `GanttSchema.body` declared in type at `schemas.ts:78` but never registered as region or consumed — silent contract drift (F-76, P2).
- 7 Gantt fields marked `// @deprecated` in comments at `scheduling-renderer-definitions.ts` but `GanttSchema` type has no `@deprecated` JSDoc — invisibility to consumers (F-77, P2).
- `useGanttDrag` drop indicator at `gantt/hooks/use-gantt-drag.ts:31-41,172-181` can leak DOM nodes on stale pointer events (F-79, P3).
- 8+ effects across the package have unstable callback refs in deps causing unnecessary listener re-registrations: `barcode-input/barcode-scanner-overlay.tsx:99-133`, `gantt-bars.tsx:27-59`, `gantt/hooks/use-gantt-keyboard.ts:34-112`, `kanban-board.tsx:237-255`.
- `html2canvas` accessed as global in `calendar/hooks/use-calendar-export.ts`.
- `calendar/components/calendar-month-view.tsx` uses `useEffect` for layout measurement — should be `useLayoutEffect`.
- No `barcode-input/index.ts` barrel file for consistency.
- `gantt/undo-stack.ts` has stale comments referencing Kanban.
- `RenderRegionHandle` import source varies across sub-renderers.
- `pnpm typecheck` ✅ | `pnpm test` ✅ (63 files, 673 tests).

## Goals

- Barcode-input has a working validation contributor; `required`, `minLength`, `maxLength`, `pattern`, `validate.action` are compiled into validation rules; `handleChange` calls validation lifecycle; focus/blur handlers call `touchField`/`validateField`.
- `useBarcodeDetect` poll loop correctly reacts to `enabled` toggle changes.
- Gantt implements row virtualization OR at minimum caches `getVisibleTasks()` to eliminate redundant tree traversal.
- `useKanbanCollab` has exponential backoff and correct closure refs.
- Gantt undo stack populated with commands after each mutation; cleared on schema data refresh.
- All 9 Kanban event dispatches use `void` operator.
- `gantt/components/critical-path.ts` removed or placed under conditional import only when consumed.
- Schema contract drift fixed: `columnsOrderOwnership`/`columnsOrderStatePath` either fully implemented or removed from type; `GanttSchema.body` either registered+consumed or removed; deprecated fields have `@deprecated` JSDoc.
- Drop indicator DOM leak fixed with guard in cleanup.
- EventsRef/callback stability fixed in 8+ affected effects.
- `html2canvas` imported properly instead of global access.
- `calendar/components/calendar-month-view.tsx` uses `useLayoutEffect` for layout measurement.
- `barcode-input/index.ts` barrel created.
- Stale comments and import inconsistencies cleaned up.

## Non-Goals

- Timezone/Calendar correctness bugs — covered by `{1}`.
- Full localization/i18n — only `locale` prop exposure in `{1}`.
- Kanban undo memory pressure analysis or optimization.
- Cross-package type narrowing audit at `flux-core` → `flux-react` boundary.

## Scope

### In Scope

**P1 items (must fix):**

- D08-01: Add validation contributor to barcode-input renderer definition.
- D07-01: Fix `useBarcodeDetect` poll loop enabled reactivity.
- D15-001: Implement Gantt row virtualization or cache.
- D15-002: Eliminate redundant `getVisibleTasks()` traversal.
- D06-01: Add exponential backoff + fix stale closure in `useKanbanCollab`.
- D22-15: Populate Gantt undo stack after each mutation.

**P2 items:**

- Replace barcode-input `handleChange` input-blocking guards with validation lifecycle calls.
- Add `void` to 9 Kanban event dispatches.
- F-72: Either implement `columnsOrderOwnership`/`columnsOrderStatePath` or remove from schema/type.
- F-76: Either register `GanttSchema.body` as region+consume or remove from type.
- F-77: Add `@deprecated` JSDoc to deprecated Gantt schema fields.
- F-78: Clear Gantt undo stack on schema data refresh.
- EventsRef/callback stability fix in 8+ effects.
- Fix `html2canvas` global access in `calendar/hooks/use-calendar-export.ts`.
- Add `paths` option to `useScopeSelector` calls in Calendar and Kanban.
- Replace `useEffect` with `useLayoutEffect` in `calendar/components/calendar-month-view.tsx` layout measurement.

**P3 items:**

- F-71: Remove or conditionally guard `gantt/components/critical-path.ts`.
- F-79: Fix drop indicator DOM leak.
- Create `barcode-input/index.ts` barrel.
- Remove deprecated Gantt field definitions from renderer contract.
- Remove dead code (`prevBoardRef`, `columnsOrderOwnership` void-cast, deprecated `GanttTask`/`GanttLink`, `|| 'Unknown error'` fallbacks, `gantt-utils` `_progressBarHeight` etc.).
- Add doc comments for `scrollLeft` design decision and `structuredClone` trade-off.
- Fix stale comments in `gantt/undo-stack.ts` about Kanban.
- Standardize `RenderRegionHandle` import source across sub-renderers.
- Remove 43+ redundant `useCallback`/`useMemo` instances (P3 — React Compiler baseline).

### Out Of Scope

- Accessibility audit of scheduling components.
- CSS-in-JS / Tailwind v4 `@source` monorepo scanning issue.
- Cross-package type narrowing verification at `flux-core` boundary.
- Full i18n coverage — `locale` prop handled in `{1}`.

## Test Strategy

档位选择：`必须自动化` for P1 items (validation integration, performance, collab backoff — core regression paths). `建议有测` for P2/P3 cleanup items. Dead code removal and doc-only changes: `不适用：无行为变更`.

## Execution Plan

### Phase 1 - BarcodeInput Validation & Lifecycle

Status: planned
Targets: `barcode-input/`, `scheduling-renderer-definitions.ts`

- Item Types: `Fix | Fix | Fix | Follow-up`

- [ ] D08-01: Add validation contributor to `scheduling-renderer-definitions.ts` barcode-input entry. Wire `required`, `minLength`, `maxLength`, `pattern`, `validate.action` through the compiler rules pipeline.
- [ ] D07-01: Fix `useBarcodeDetect` — add `enabled` to effect deps OR restructure with ref pattern to correctly react to toggle changes. Fix the `[]` deps + ref pattern deadlock.
- [ ] Replace barcode-input `handleChange` input-blocking guards with validation lifecycle calls (`touchField`/`visitField`/`validateField` on focus/blur/change).
- [ ] Create `barcode-input/index.ts` barrel file for consistent package structure.

Exit Criteria:

- [ ] `barcode-input` renderer definition includes a `validation` contributor that compiles `required`, `minLength`, `maxLength`, `pattern`, `validate.action`.
- [ ] `handleChange` no longer blocks invalid keystrokes; validation lifecycle reports errors.
- [ ] `useBarcodeDetect` poll loop correctly starts/stops when `enabled` toggles.
- [ ] Focused tests verify validation rules fire and errors surface.
- [ ] `barcode-input/index.ts` exports all public API members.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes.

### Phase 2 - Gantt Performance

Status: planned
Targets: `gantt/`, `gantt-tree-utils.ts`

- Item Types: `Fix | Fix | Proof`

- [ ] D15-001: Implement row virtualization in Gantt (or at minimum windowed rendering via intersection observer / virtualizer). Follow existing Kanban virtualizer pattern.
- [ ] D15-002: Cache `getVisibleTasks()` result to eliminate 6x tree traversal per render. Memoize or store in Zustand computed value.
- [ ] Add performance regression test verifying visible task count stays bounded with large datasets.

Exit Criteria:

- [ ] Gantt renders only visible rows + overscan buffer (virtualized) OR `getVisibleTasks()` is called once per render (cached).
- [ ] No redundant DFS tree traversals on every child component render.
- [ ] Focused performance test passes with N=1000+ tasks and verifies bounded DOM nodes.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes.

### Phase 3 - Kanban & Cross-Cutting

Status: planned
Targets: `kanban/`, `gantt/`, `calendar/`, `scheduling-renderer-definitions.ts`, `schemas.ts`

- Item Types: `Fix | Fix | Fix | Decision | Decision | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Follow-up | Follow-up | Follow-up | Follow-up | Proof`

- [ ] D06-01: Fix `useKanbanCollab` — add exponential backoff (1s, 2s, 4s, max 30s), fix stale closure in reconnect handler by using ref pattern.
- [ ] D22-15: Populate Gantt undo stack — push `UpdateTaskCommand` (etc.) after each `store.updateTask` call in keyboard handler and drag handlers.
- [ ] F-78: Clear Gantt undo stack when `store.parse()` re-runs on schema-driven task/link/resource/assignment prop changes.
- [ ] F-72 (Decision): Either implement `columnsOrderOwnership` + `columnsOrderStatePath` semantics in Kanban board, or remove both props from `KanbanSchema` type and `scheduling-renderer-definitions.ts` (with `@deprecated` JSDoc if retaining). Recommended: remove — the void expressions are type-system workarounds.
- [ ] F-76 (Decision): Either register `GanttSchema.body` as `{ key: 'body', kind: 'region' }` and consume in `gantt.tsx`, or remove `body?` from `GanttSchema` type. Recommended: remove — Gantt is not a container component.
- [ ] F-77: Add `/** @deprecated */` JSDoc to all 7 deprecated Gantt schema fields (`scales`, `startDate`, `endDate`, `progressBarHeight`, `calendar`, `childrenField`, `initiallyExpanded`). Add `@deprecated` to `component:print`/`component:exportPNG`/`component:importICal`/`component:exportToICal` reaction keys.
- [ ] F-79: Fix drop indicator DOM leak — add cleanup guard in `useGanttDrag` to check if `dropIndicatorRef.current` is still in DOM before creating. Use `isMounted` ref or `AbortController`.
- [ ] Add `void` prefix to all 9 Kanban event dispatches missing it.
- [ ] Fix eventsRef/callback stability in 8+ effects: `barcode-input/barcode-scanner-overlay.tsx:99-133`, `gantt-bars.tsx:27-59`, `gantt/hooks/use-gantt-keyboard.ts:34-112`, `kanban-board.tsx:237-255` and remaining sites.
- [ ] Fix `html2canvas` global access in `calendar/hooks/use-calendar-export.ts` — use proper ES module import.
- [ ] Add `paths` option to `useScopeSelector` calls in Calendar and Kanban for subscription scoping.
- [ ] Replace `useEffect` with `useLayoutEffect` in `calendar/components/calendar-month-view.tsx` for DOM measurement.
- [ ] Remove deprecated Gantt field definitions from renderer contract (7 fields).
- [ ] Remove dead code: `gantt/components/critical-path.ts` (F-71), `prevBoardRef`, void-casts, deprecated types, error fallbacks, `_progressBarHeight`.
- [ ] Add doc comments for `scrollLeft` design decision and `structuredClone` trade-off.
- [ ] Fix stale comments in `gantt/undo-stack.ts` referencing Kanban.
- [ ] Standardize `RenderRegionHandle` import source across sub-renderers.
- [ ] Remove 43+ redundant `useCallback`/`useMemo` instances (P3 — React Compiler handles them).
- [ ] Add focused tests for `useKanbanCollab` backoff behavior, Kanban void dispatch, and undo stack isolation across schema refreshes.

Exit Criteria:

- [ ] `useKanbanCollab` has exponential backoff (verified via test).
- [ ] Gantt undo stack is populated after mutations and cleared on schema data refresh.
- [ ] `columnsOrderOwnership`/`columnsOrderStatePath` either works or is cleanly removed from type/definition.
- [ ] `GanttSchema.body` either works or is cleanly removed.
- [ ] All 7 deprecated Gantt fields have `@deprecated` JSDoc in schema type.
- [ ] 9 Kanban event dispatches all use `void`.
- [ ] `useGanttDrag` cleanup handles stale pointer events (no DOM leak).
- [ ] `html2canvas` imported, not global.
- [ ] `calendar/components/calendar-month-view.tsx` uses `useLayoutEffect` for layout measurement.
- [ ] No dead `gantt/components/critical-path.ts` in production bundle (or guarded).
- [ ] `RenderRegionHandle` import source is consistent across all sub-renderers.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling test` passes.

## Draft Review Record

- Reviewer / Agent: `ses_07670094bffeUii2j8wbo4tqLy` (fresh sub-agent)
- Verdict: `revised` → resolved to consensus via author amendments
- Rounds: 2 (round-2 fixes applied by author)
- Findings addressed:
  - **Blocker-1** (D03-01 not accounted for): D03-01 IS covered by `{1}` Phase 2 (Calendar reaction key mismatch fix). Added explicit clarifying note in Purpose section: `"note: D03-01 Calendar reaction key mismatch IS addressed by {1} Phase 2"`. No change to scope needed.
  - **Major-1** (Phase 3 item types mismatch): Fixed — corrected to `Fix(12) | Decision(2) | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Fix | Follow-up(4) | Proof(1)` accurately matching all 19 checklist items. Added `(Decision)` labels to F-72 and F-76 items.
  - **Minor-1** (handleChange baseline inaccuracy): Fixed — corrected description from `"blocks invalid keystrokes"` to `"calls form.setValue() without input-blocking guards; no validation lifecycle invoked"`.
  - **Minor-2** (Gantt file names): Fixed — corrected `grid.tsx`, `cellgrid.tsx` to `gantt-grid.tsx`, `gantt-cellgrid.tsx`.

## Closure Gates

- [ ] All P1 items fixed (D08-01, D07-01, D15-001, D15-002, D06-01, D22-15) and verified by focused tests.
- [ ] All P2 schema contract drifts resolved (F-72, F-76, F-77).
- [ ] All P2/P3 cleanup items completed or moved to deferred with explicit non-blocking rationale.
- [ ] New focused verification tests added and passing for barcode validation, Gantt performance, collab backoff, and undo isolation.
- [ ] No in-scope live defect silently deferred or reclassified.
- [ ] Affected owner docs (`docs/architecture/renderer-runtime.md`, scheduling component docs) synced to live baseline where behavior changed, or no-owner-doc-update confirmed.
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and evidence recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Cross-package type narrowing verification

- Classification: `watch-only residual`
- Why Not Blocking Closure: No confirmed defect — the open-ended audit identified it as a blind spot, not a confirmed issue. If type narrowing issues exist, they would surface as TypeScript compile errors or incorrect generic inference at the `flux-core` → `flux-react` boundary. Follow-up audit can address.
- Successor Required: `yes`
- Successor Path: Recommended for next deep-audit round, not this plan.

### Full accessibility audit of scheduling components

- Classification: `watch-only residual`
- Why Not Blocking Closure: Dimensions 20 (accessibility) was not executed in the multi-audit due to time constraints. No confirmed defects. Out of scope for correctness/performance remediation.
- Successor Required: `yes` (recommended for follow-up audit)

## Non-Blocking Follow-ups

- Remove 43+ redundant `useCallback`/`useMemo` instances once `{1}` and `{2}` code changes are stable — React Compiler handles them automatically.
- CSS-in-JS / Tailwind v4 `@source` monorepo content scan issue (known bug #14) — not specific to scheduling but worth monitoring.

## Closure

Status Note: <<filled on completion>>

Closure Audit Evidence:

- Auditor / Agent: <<filled on completion>>
- Evidence: <<filled on completion>>

Follow-up:

- <<filled on completion>>
