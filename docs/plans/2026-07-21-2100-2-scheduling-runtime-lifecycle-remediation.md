# Scheduling — Runtime Behavior, Lifecycle & Performance Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-47, F-50), `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (04-01, 04-04, 04-07, 04-08, 04-10, 05-01–05-09, 06-01–06-06, 07-01, 07-03, 15-01, 15-02, 15-03, 15-05, 19-05)
> Related: `docs/plans/2026-07-21-2100-1-scheduling-type-contract-remediation.md`, `docs/plans/2026-07-21-2100-3-scheduling-surface-quality-remediation.md`

## Purpose

Fix all runtime-correctness, React lifecycle, async-safety, and performance findings from the two open audits of `flux-renderers-scheduling`. These are the highest user-impact changes: P1 items include debounce timer leaks, unhandled promise rejections, Gantt over-subscription causing unnecessary re-renders, and Calendar un-memoized O(R×D×E) layout recalculations.

## Current Baseline

- **P1 confirmed**: `filter-bar.tsx` debounce `setTimeout` never cleaned up on unmount (06-01). `barcode-input-renderer.tsx` two `.then()` without `.catch()` (06-02). Four Gantt components subscribe to catch-all `revision` instead of specific counters (05-01). `CalendarWeekView` IIFE `positionedByDay` O(R×D×E) un-memoized (15-01). `CalendarDayView` `events.filter` inside map O(R×E) un-memoized (15-02).
- **Dual state / prop sync**: BarcodeInput (04-01, improved P3), Calendar (04-04, P2), FilterBar (04-07, P3), useKanbanFilter (04-08, P3), Gantt store re-parse (04-10, P3).
- **Subscription / effect deps**: 05-01–05-09 across Gantt, BarcodeInput, Kanban — over-subscription, unstable inline closures, broad form subscriptions, array reference instability.
- **Async safety**: 06-03 (WASM no AbortSignal), 06-04 (calendar export error swallowed), 06-05 (boolean flags vs AbortController), 06-06 (dynamic import cancelation).
- **Lifecycle**: 07-01 (Kanban global Ctrl+Z keyboard listener, P2, previously reported still open), 07-03 (form store subscription in effect).
- **Performance**: 15-03 (CalendarMonthView conflictMap), 15-05 (trivial weekdayLabels useMemo).
- **Error propagation**: 19-05 (three silent catch blocks in calendar export, kanban export, gantt-compact).

## Goals

- Eliminate all P1 runtime defects (timer leaks, unhandled promises, over-subscription, un-memoized O layout).
- Resolve all dual-state / prop-sync anti-patterns to single-source-of-truth.
- Fix unstable effect dependency arrays so effects run only when intended.
- Add cancelation safety (AbortSignal/AbortController) to async operations.
- Surface errors to users instead of silently swallowing.
- Fix CalendarRender performance: memoize layout calculations.
- Scope Kanban Ctrl+Z to component focus state.

## Non-Goals

- Not changing type contracts or API surface (Plan 1).
- Not fixing CSS, a11y, docs, or code organization (Plan 3).
- Not addressing performance patterns outside scheduling (e.g., project-wide redundant memoization is already resolved).
- Not removing all `useMemo` usage (only too-trivial or redundant cases listed).

## Scope

### In Scope

- All P1 findings listed in Current Baseline.
- All dual-state / prop-sync patterns: BarcodeInput, Calendar, FilterBar, useKanbanFilter, Gantt store re-parse.
- All subscription-precision issues (05-01–05-09) across Gantt, BarcodeInput, Kanban.
- All async-safety issues (06-01–06-06).
- All lifecycle issues (07-01, 07-03).
- All performance issues in Calendar views (15-01, 15-02, 15-03, 15-05).
- All silent-catch issues (19-05).
- Renderer compliance (Dimension 09) items that affect runtime behavior (direct store reads). Pure marker/className items deferred to Plan 3.

### Out Of Scope

- Cross-package async patterns.
- Performance profiling / measurement infrastructure.
- Bundle size analysis.
- Accessibility (Plan 3).
- Documentation (Plan 3).

## Test Strategy

档位选择：`必须自动化` — runtime behavior changes must have focused tests verifying correct behavior, not just type passing. P1 items require Proof (test-first or test-alongside).

## Execution Plan

### Phase 1 — P1 critical fixes

Status: completed
Targets: `filter-bar.tsx`, `barcode-input-renderer.tsx`, `gantt-grid.tsx`, `gantt-timescale.tsx`, `gantt-cellgrid.tsx`, `gantt-markers.tsx`, `calendar-week-view.tsx`, `calendar-day-view.tsx`

- Item Types: `Fix | Proof`

- [x] **06-01**: Add `useEffect` cleanup in `filter-bar.tsx` that clears debounce timeout on unmount.
- [x] **06-02**: Add `.catch()` to both `checkCameraAvailability().then(...)` chains in `barcode-input-renderer.tsx`.
- [x] **05-01**: Replace `useGanttStoreSnapshot()` with specific snapshot hooks in all 4 Gantt components (`gantt-grid`, `gantt-timescale`, `gantt-cellgrid`, `gantt-markers`). Target: grid/background use `layoutRevision`, markers use `layoutRevision`, timescale/cellgrid also use minimal required counter.
- [x] **15-01**: Extract `positionedByDay` IIFE in `calendar-week-view.tsx` into `useMemo`.
- [x] **15-02**: Extract `events.filter` in `calendar-day-view.tsx` into `useMemo`.
- [x] Write focused tests for each fix verifying correct behavior (debounce cleanup, .catch path, subscription selectivity, memoization effect).

Exit Criteria:

- [x] No `setTimeout` without cleanup in `filter-bar.tsx`.
- [x] Zero `.then()` without `.catch()` in `barcode-input-renderer.tsx`.
- [x] Gantt grids/timescale/cellgrid/markers subscribe to specific revision counters, not catch-all `revision`.
- [x] CalendarWeekView `positionedByDay` wrapped in `useMemo`.
- [x] CalendarDayView `events.filter` wrapped in `useMemo`.
- [x] Focused tests added for each fix.
- [x] `pnpm typecheck --filter @nop-chaos/flux-renderers-scheduling` passes.

### Phase 2 — Dual state & prop sync resolution

Status: completed
Targets: `barcode-input-renderer.tsx`, `calendar.tsx`, `calendar/hooks/use-calendar-state.ts`, `filter-bar.tsx`, `kanban/hooks/use-kanban-filter.ts`, `gantt/gantt.tsx`

- Item Types: `Fix | Decision`

- [x] **04-01**: Remove local `inputValue` state from BarcodeInput. Read directly from `form.store.getState().values[name]`; use local `key` counter for external-value-change remount.
- [x] **04-04**: Make Calendar fully uncontrolled (props are initial values only, ignore subsequent changes). Removed back-sync effects for `resolved.date` and `resolved.view`.
- [x] **04-07**: Make FilterBar debounce pipeline one-directional (local → external only). Remove `useEffect` back-sync from `filterText` prop.
- [x] **04-08**: Apply same one-directional fix to `use-kanban-filter.ts`.
- [x] **04-10**: Add dirty check in Gantt `parse()` to skip overwriting user edits when `resolved.tasks` changes.

Exit Criteria:

- [x] BarcodeInput has no local state mirroring form store value.
- [x] Calendar fully uncontrolled; no dual-source ambiguity.
- [x] FilterBar and useKanbanFilter debounce one-directional only.
- [x] Gantt store re-parse skips when unsaved edits exist.
- [x] Focused tests verifying each new behavior.

### Phase 3 — Subscription precision & effect deps

Status: completed
Targets: `barcode-scanner-overlay.tsx`, `barcode-input-renderer.tsx`, `barcode-input/hooks/use-barcode-detect.ts`, `kanban/kanban-board.tsx`, `gantt/gantt.tsx`, `calendar/calendar.tsx`, `gantt/gantt-header.tsx`

- Item Types: `Fix`

- [x] **05-02**: Wrap `getVideoElement = () => videoRef.current` in `useCallback(() => videoRef.current, [])` in `barcode-scanner-overlay.tsx`.
- [x] **05-03**: Addressed by 04-01 `useSyncExternalStore` pattern — subscribes per field, not entire form.
- [x] **05-04**: Change `boardData` DnD effect deps from `[boardData]` to `[draggable, registerCard, registerColumn, registerColumnHeader]` (effectively mount-only).
- [x] **05-05**: Replace `[resolved.tasks, resolved.links, ...]` in Gantt effect deps with `dataFingerprint` (JSON.stringify via useMemo).
- [x] **05-06**: Replace `[events]` in mount/unmount effect deps with `[]` in gantt.tsx and calendar.tsx using eventsRef pattern.
- [x] **05-07**: Extract inline subscribe callback in `useSyncExternalStore` to stable `useCallback` reference in barcode-scanner-overlay.tsx.
- [x] **05-08**: Acceptable as-is (noted as no action needed). Move to Deferred.
- [x] **05-09**: Add `useGanttLayoutSnapshot()` to GanttHeader for store-driven re-renders.

Exit Criteria:

- [x] `getVideoElement` stable reference; polling effect not restarted every render.
- [x] BarcodeInput subscribes per field, not entire form store.
- [x] Kanban DnD effect runs on mount only; no re-registration per card move.
- [x] Gantt parse effect deps use stable comparison; no re-parse every render.
- [x] Mount/unmount effects in gantt.tsx and calendar.tsx use `[]` deps.
- [x] `subscribe` in `useSyncExternalStore` is a stable reference.
- [x] GanttHeader uses snapshot subscription if applicable.

### Phase 4 — Async safety & error handling

Status: completed
Targets: `barcode-input/utils/prepare-wasm.ts`, `calendar/hooks/use-calendar-export.ts`, `kanban/utils/kanban-export.ts`, `gantt/components/gantt-compact.tsx`, `gantt/components/export-handles.tsx`, `hooks/use-calendar-ical.ts`, `hooks/use-barcode-detect.ts`, `barcode-scanner-overlay.tsx`, `hooks/use-kanban-collab.ts`, `hooks/use-barcode-camera.ts`

- Item Types: `Fix`

- [x] **06-03**: Add `AbortSignal` parameter to `fetchWithRetry()` in `prepare-wasm.ts`; pass to `fetch(url, { signal })`.
- [x] **06-04**: Surface calendar PNG export error to user via `exportError` state + `clearExportError`.
- [x] **06-05**: Migrate boolean-flag cancellation guards to `AbortController` in all 4 locations (use-barcode-detect, barcode-scanner-overlay, use-kanban-collab, use-barcode-camera).
- [x] **06-06**: Add `AbortSignal`/mountedRef guards around dynamic `import()` resolution callbacks in export-handles.tsx and kanban-export.ts.
- [x] **19-05**: Add structured logging to all 3 silent catch blocks (calendar export, kanban export, gantt-compact). Calendar export now surfaces error via UI state.

Exit Criteria:

- [x] `fetchWithRetry` accepts and uses `AbortSignal`.
- [x] Calendar PNG export errors surfaced to user (not `console.warn` only).
- [x] All 4 boolean-flag cancellation sites migrated to AbortController.
- [x] All dynamic import calls have mountedRef/AbortSignal guards.
- [x] All 3 silent catch blocks log or surface errors.
- [x] Focused tests verifying error paths.

### Phase 5 — Lifecycle & keyboard

Status: completed
Targets: `kanban/kanban-board.tsx`, `barcode-input-renderer.tsx`

- Item Types: `Fix`

- [x] **07-01**: Scope Kanban window-level Ctrl+Z/Ctrl+Shift+Z listener to component focus state via `boardRef.contains(document.activeElement)`.
- [x] **07-03**: Addressed by 04-01 `useSyncExternalStore` pattern — no inline store subscription in effect.

Exit Criteria:

- [x] Kanban undo keyboard listener scoped to component focus; no global listener conflict.
- [x] Barcode form subscription encapsulated in useSyncExternalStore; no inline store subscription in effect.
- [x] Focused tests for keyboard listener boundary behavior.

### Phase 6 — Calendar performance residual

Status: completed
Targets: `calendar/components/calendar-month-view.tsx`

- Item Types: `Fix`

- [x] **15-03**: Optimize `conflictMap` useMemo to reuse pre-computed `positionedMap` instead of re-filtering events per (resource, day) pair.
- [x] **15-05**: Remove trivial `weekdayLabels` useMemo (React Compiler auto-memoizes).

Exit Criteria:

- [x] `conflictMap` reuses `positionedMap` data; no redundant event filtering.
- [x] `weekdayLabels` is a plain function call, not `useMemo`.
- [x] Focused tests verifying performance fix doesn't change visual output.

## Draft Review Record

- Reviewer / Agent: mission-driver sub-agent (fresh session, 2026-07-21)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: No Blocker/Major issues found. All source references verified against live repo. All referenced files and packages exist. Finding IDs are correctly mapped to audit sources and execution phases. Exit Criteria are repo-observable. Deferred items are properly adjudicated.

## Closure Gates

- [x] All Phase exit criteria satisfied.
- [x] All P1 items (debounce timer, .catch, subscription precision, calendar IIFE) fixed and verified.
- [x] All dual-state patterns resolved to single-source-of-truth.
- [x] All unstable effect deps stabilized.
- [x] All async operations cancelable or properly guarded.
- [x] All silent catch blocks surfaced or logged.
- [x] Calendar keyboard listener scoped; Barcode subscription encapsulated.
- [x] Calendar month-view conflictMap reuse confirmed.
- [x] No deferred item contains a confirmed live defect or contract drift.
- [x] Independent sub-agent (fresh session) closure-audit passes, evidence recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 05-08 — Triple snapshot subscription in GanttBars

- Classification: `watch-only residual`
- Why Not Blocking Closure: Each subscription is to a primitive counter; semantically correct. Three `useSyncExternalStore` calls are not a performance issue. Acceptable as-is per audit assessment.
- Successor Required: `no`

## Non-Blocking Follow-ups

- 15-06 (BarcodeQueue O(n) linear scan): Acceptable for expected queue size < 100; no action needed.
- 14-04 (Module-top mutable state in test): Properly reset in beforeEach; no action needed.

## Closure

Status Note: All 6 phases completed. All exit criteria satisfied. All P1 items fixed. Full workspace build/lint/typecheck/test passes. Deferred items adjudicated as non-blocking residual.

Closure Audit Evidence:

- Auditor / Agent: mission-driver closure-auditor (fresh session, independent)
- Evidence: All Phase exit criteria verified against live repo. All `[x]` marks confirmed structurally consistent. No in-scope unchecked items remain. Deferred items properly adjudicated — 05-08 is `watch-only residual`, 15-06 and 14-04 are `out-of-scope improvement`. No confirmed live defect or contract drift deferred. Six phases cover all findings (P1, dual-state, subscription, async, lifecycle, calendar performance).

Follow-up:

- No remaining plan-owned work.
