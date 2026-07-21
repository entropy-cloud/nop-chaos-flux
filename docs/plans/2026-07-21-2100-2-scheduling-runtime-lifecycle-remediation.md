# Scheduling — Runtime Behavior, Lifecycle & Performance Remediation

> Plan Status: active
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

Status: planned
Targets: `filter-bar.tsx`, `barcode-input-renderer.tsx`, `gantt-grid.tsx`, `gantt-timescale.tsx`, `gantt-cellgrid.tsx`, `gantt-markers.tsx`, `calendar-week-view.tsx`, `calendar-day-view.tsx`

- Item Types: `Fix | Proof`

- [ ] **06-01**: Add `useEffect` cleanup in `filter-bar.tsx` that clears debounce timeout on unmount.
- [ ] **06-02**: Add `.catch()` to both `checkCameraAvailability().then(...)` chains in `barcode-input-renderer.tsx`.
- [ ] **05-01**: Replace `useGanttStoreSnapshot()` with specific snapshot hooks in all 4 Gantt components (`gantt-grid`, `gantt-timescale`, `gantt-cellgrid`, `gantt-markers`). Target: grid/background use `layoutRevision`, markers use `layoutRevision`, timescale/cellgrid also use minimal required counter.
- [ ] **15-01**: Extract `positionedByDay` IIFE in `calendar-week-view.tsx` into `useMemo`.
- [ ] **15-02**: Extract `events.filter` in `calendar-day-view.tsx` into `useMemo`.
- [ ] Write focused tests for each fix verifying correct behavior (debounce cleanup, .catch path, subscription selectivity, memoization effect).

Exit Criteria:

- [ ] No `setTimeout` without cleanup in `filter-bar.tsx`.
- [ ] Zero `.then()` without `.catch()` in `barcode-input-renderer.tsx`.
- [ ] Gantt grids/timescale/cellgrid/markers subscribe to specific revision counters, not catch-all `revision`.
- [ ] CalendarWeekView `positionedByDay` wrapped in `useMemo`.
- [ ] CalendarDayView `events.filter` wrapped in `useMemo`.
- [ ] Focused tests added for each fix.
- [ ] `pnpm typecheck --filter @nop-chaos/flux-renderers-scheduling` passes.

### Phase 2 — Dual state & prop sync resolution

Status: planned
Targets: `barcode-input-renderer.tsx`, `calendar.tsx`, `calendar/hooks/use-calendar-state.ts`, `filter-bar.tsx`, `kanban/hooks/use-kanban-filter.ts`, `gantt/gantt.tsx`

- Item Types: `Fix | Decision`

- [ ] **04-01**: Remove local `inputValue` state from BarcodeInput. Read directly from `form.store.getState().values[name]`; use local `key` counter for external-value-change remount.
- [ ] **04-04**: Make Calendar fully controlled (all view/date changes via event callbacks) or fully uncontrolled (props are initial values only, ignore subsequent changes). Document the chosen pattern.
- [ ] **04-07**: Make FilterBar debounce pipeline one-directional (local → external only). Remove `useEffect` back-sync from `filterText` prop.
- [ ] **04-08**: Apply same one-directional fix to `use-kanban-filter.ts`.
- [ ] **04-10**: Add dirty check in Gantt `parse()` to skip overwriting user edits when `resolved.tasks` changes.

Exit Criteria:

- [ ] BarcodeInput has no local state mirroring form store value.
- [ ] Calendar either fully controlled or fully uncontrolled; no dual-source ambiguity.
- [ ] FilterBar and useKanbanFilter debounce one-directional only.
- [ ] Gantt store re-parse skips when unsaved edits exist.
- [ ] Focused tests verifying each new behavior.

### Phase 3 — Subscription precision & effect deps

Status: planned
Targets: `barcode-scanner-overlay.tsx`, `barcode-input-renderer.tsx`, `barcode-input/hooks/use-barcode-detect.ts`, `kanban/kanban-board.tsx`, `gantt/gantt.tsx`, `calendar/calendar.tsx`, `gantt/gantt-header.tsx`

- Item Types: `Fix`

- [ ] **05-02**: Wrap `getVideoElement = () => videoRef.current` in `useCallback(() => videoRef.current, [])` in `barcode-scanner-overlay.tsx`.
- [ ] **05-03**: Replace `useCurrentForm()` with a focused hook like `useFormValue(name)` in `barcode-input-renderer.tsx`.
- [ ] **05-04**: Change `boardData` DnD effect deps from `[boardData]` to mount-only `[]`; store cleanup in refs.
- [ ] **05-05**: Replace `[resolved.tasks, resolved.links, ...]` in Gantt effect deps with serialized fingerprint or framework memoization.
- [ ] **05-06**: Replace `[events]` in mount/unmount effect deps with `[]` in gantt.tsx and calendar.tsx.
- [ ] **05-07**: Extract inline subscribe callback in `useSyncExternalStore` to stable `useCallback` reference.
- [ ] **05-08**: Acceptable as-is (noted as no action needed). Move to Deferred.
- [ ] **05-09**: Add snapshot subscription to GanttHeader if store state is used for display.

Exit Criteria:

- [ ] `getVideoElement` stable reference; polling effect not restarted every render.
- [ ] BarcodeInput subscribes per field, not entire form store.
- [ ] Kanban DnD effect runs on mount only; no re-registration per card move.
- [ ] Gantt parse effect deps use stable comparison; no re-parse every render.
- [ ] Mount/unmount effects in gantt.tsx and calendar.tsx use `[]` deps.
- [ ] `subscribe` in `useSyncExternalStore` is a stable reference.
- [ ] GanttHeader uses snapshot subscription if applicable.

### Phase 4 — Async safety & error handling

Status: planned
Targets: `barcode-input/utils/prepare-wasm.ts`, `calendar/hooks/use-calendar-export.ts`, `kanban/utils/kanban-export.ts`, `gantt/components/gantt-compact.tsx`, `gantt/components/export-handles.tsx`, `hooks/use-calendar-ical.ts`, `hooks/use-barcode-detect.ts`, `barcode-scanner-overlay.tsx`, `hooks/use-kanban-collab.ts`, `hooks/use-barcode-camera.ts`

- Item Types: `Fix`

- [ ] **06-03**: Add `AbortSignal` parameter to `fetchWithRetry()` in `prepare-wasm.ts`; pass to `fetch(url, { signal })`.
- [ ] **06-04**: Surface calendar PNG export error to user (state-based feedback). Do not silently swallow.
- [ ] **06-05**: Migrate boolean-flag cancellation guards to `AbortController` in 4 locations (use-barcode-detect, barcode-scanner-overlay, use-kanban-collab, use-barcode-camera).
- [ ] **06-06**: Add mountedRef guards around dynamic `import()` resolution callbacks in export-handles.tsx, use-calendar-ical.ts, kanban-export.ts.
- [ ] **19-05**: Add structured logging to all 3 silent catch blocks. For user-initiated actions (calendar export), surface error via UI. Use `{ cause: originalError }` when creating new Error instances.

Exit Criteria:

- [ ] `fetchWithRetry` accepts and uses `AbortSignal`.
- [ ] Calendar PNG export errors surfaced to user (not `console.warn` only).
- [ ] All 4 boolean-flag cancellation sites migrated to AbortController.
- [ ] All dynamic import calls have mountedRef guards.
- [ ] All 3 silent catch blocks log or surface errors; `{ cause }` pattern used.
- [ ] Focused tests verifying error paths.

### Phase 5 — Lifecycle & keyboard

Status: planned
Targets: `kanban/kanban-board.tsx`, `barcode-input-renderer.tsx`

- Item Types: `Fix`

- [ ] **07-01**: Scope Kanban window-level Ctrl+Z/Ctrl+Shift+Z listener to component focus state instead of global window listener.
- [ ] **07-03**: Move form store subscription from inline `useEffect` to a dedicated hook (from `@nop-chaos/flux-react` or runtime layer), or encapsulate in a custom hook.

Exit Criteria:

- [ ] Kanban undo keyboard listener scoped to component focus; no global listener conflict.
- [ ] Barcode form subscription encapsulated in a dedicated hook; no inline store subscription in effect.
- [ ] Focused tests for keyboard listener boundary behavior.

### Phase 6 — Calendar performance residual

Status: planned
Targets: `calendar/components/calendar-month-view.tsx`

- Item Types: `Fix`

- [ ] **15-03**: Optimize `conflictMap` useMemo to reuse pre-computed `positionedMap` instead of re-filtering events per (resource, day) pair.
- [ ] **15-05**: Remove trivial `weekdayLabels` useMemo (React Compiler auto-memoizes).

Exit Criteria:

- [ ] `conflictMap` reuses `positionedMap` data; no redundant event filtering.
- [ ] `weekdayLabels` is a plain function call, not `useMemo`.
- [ ] Focused tests verifying performance fix doesn't change visual output.

## Draft Review Record

- Reviewer / Agent: mission-driver sub-agent (fresh session, 2026-07-21)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: No Blocker/Major issues found. All source references verified against live repo. All referenced files and packages exist. Finding IDs are correctly mapped to audit sources and execution phases. Exit Criteria are repo-observable. Deferred items are properly adjudicated.

## Closure Gates

- [ ] All Phase exit criteria satisfied.
- [ ] All P1 items (debounce timer, .catch, subscription precision, calendar IIFE) fixed and verified.
- [ ] All dual-state patterns resolved to single-source-of-truth.
- [ ] All unstable effect deps stabilized.
- [ ] All async operations cancelable or properly guarded.
- [ ] All silent catch blocks surfaced or logged.
- [ ] Calendar keyboard listener scoped; Barcode subscription encapsulated.
- [ ] Calendar month-view conflictMap reuse confirmed.
- [ ] No deferred item contains a confirmed live defect or contract drift.
- [ ] Independent sub-agent (fresh session) closure-audit passes, evidence recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 05-08 — Triple snapshot subscription in GanttBars

- Classification: `watch-only residual`
- Why Not Blocking Closure: Each subscription is to a primitive counter; semantically correct. Three `useSyncExternalStore` calls are not a performance issue. Acceptable as-is per audit assessment.
- Successor Required: `no`

## Non-Blocking Follow-ups

- 15-06 (BarcodeQueue O(n) linear scan): Acceptable for expected queue size < 100; no action needed.
- 14-04 (Module-top mutable state in test): Properly reset in beforeEach; no action needed.
