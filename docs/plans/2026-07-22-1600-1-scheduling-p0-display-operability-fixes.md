# 1 Scheduling P0 Display & Operability Fixes

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §1–§4
> Mission: scheduling
> Work Item: S11, S12, S13, S14
> Related: `docs/plans/2026-07-22-1-scheduling-critical-fixes.md` (previous critical-fix plan, different audit source)

## Purpose

Fix all confirmed P0 display-algorithm and operability-interaction defects in `@nop-chaos/flux-renderers-scheduling` discovered by the 2026-07-22 deep analysis (dimensions 21/22/23 — visual correctness, interaction, and test effectiveness). These are **not** covered by the previous critical-fix plan (`2026-07-22-1-scheduling-critical-fixes.md`) which addressed a separate open-audit finding set (F-51 to F-70). After this plan, the four scheduling components (Gantt, Kanban, Calendar, BarcodeInput) render correctly in the playground demo and respond to basic user interactions.

## Current Baseline

- Gantt: `zoomLevels` not transmitted to store → time scale/cell grid/zoom buttons all blank (G-DISP-01/P0). Grid row height content-driven vs timeline fixed 40px → vertical misalignment (G-DISP-02/P0). `scrollToToday`/`scrollToTask` scrolls left grid instead of timeline (G-OPS-01/P0). `_dirty` guard in `parse()` silently drops data reloads after any edit (G-OPS-02/P0). No production component subscribes `treeRevision` → expand/collapse updates zero subscribers (G-OPS-11/P0). `toggleOpen` never recomputes child coordinates → expanded tasks render at (0,0) zero-size (G-OPS-12/P0). These 6 P0s collectively make the Gantt timeline blank, tree navigation dead, and data reload frozen.
- Kanban: Providing `data` prop enters controlled mode where `setBoardData` is no-op → all mutations (drag, add, delete) silently dropped, cards snap back (K-OP-01/P0).
- Calendar: View switching reads schema `view` instead of internal state → switch completely dead (C-OPS-01/P0). Month events fixed at 25% width regardless of concurrency → 75% wasted space (C-DISP-01/P0). Month view renders 42-day generic calendar grid instead of N×M resource-date matrix → columns ~28px unreadable (C-DISP-02/P0). Virtualizer rows lack `position:absolute` → row spacing doubled to 96px with giant gaps (C-DISP-03/P0).
- BarcodeInput: `<video>` only mounts in `scanning` phase but stream attaches in `loading` phase to null ref → permanent black screen, decoder dead (B-DISP-02/P0).
- `pnpm typecheck`/`build`/`lint`/`test` all pass at baseline (prior plans green).
- Open-audit critical fixes (F-51 to F-70) already landed via `2026-07-22-1-scheduling-critical-fixes.md`.

## Goals

- Gantt zoom levels transmitted to store; time scale, cell grid, zoom buttons render and function.
- Gantt grid rows use fixed `rowHeight` matching timeline; vertical alignment correct.
- Gantt `scrollToToday`/`scrollToTask` scroll timeline, not grid.
- Gantt `parse()` no longer silently guarded by `_dirty`; data reloads work after edits.
- Gantt expand/collapse causes visible tree update; child tasks appear with correct coordinates.
- Kanban controlled mode allows mutations (drag/add/delete) when no `data-source` binding.
- Calendar view switching works in local/controlled modes.
- Calendar month events use actual concurrency for width; single events fill 100%.
- Calendar month view renders resource × days-of-month matrix (28-31 cols), not 42-day generic grid.
- Calendar virtualizer rows use `position:absolute` with correct row spacing.
- BarcodeInput `<video>` receives stream regardless of phase; camera preview visible.
- All fixed behaviors have focused regression tests (not mocking the integration layer).

## Non-Goals

- P1 display/operability fixes (Gantt P1 → Plan 2, Kanban P1 → separate plan, Calendar/Barcode P1 → separate plan).
- Contract drift / dead code / unconsumed schema fields (covered by `2026-07-22-2-scheduling-contract-drift.md`).
- Styling system compliance, a11y, i18n (covered by prior plans).
- Test coverage beyond the P0-specific regression tests.
- Diff-view defects (Plan 3).

## Scope

### In Scope

- `src/gantt/gantt.tsx` — `createInitialStore` zoomLevels pass-through
- `src/gantt/gantt-store.ts` — `_dirty` guard removal, `toggleOpen` coordinate recompute + `layoutRevision` bump, `GanttStoreConfig.zoomLevels` seed
- `src/gantt/gantt-grid.tsx` — `<tr>` fixed height, content truncation, chevron condition
- `src/gantt/gantt-bars.tsx` — `useGanttTreeSnapshot` subscription
- `src/gantt/gantt-cellgrid.tsx` — `useGanttTreeSnapshot` subscription
- `src/gantt/gantt-timescale.tsx` — `useGanttTreeSnapshot` subscription
- `src/gantt/gantt-context.tsx` — ensure `useGanttTreeSnapshot`/`useGanttStoreSnapshot` usable in production
- `src/gantt/utils/layout.ts` — coordinate computation path
- `src/kanban/kanban-board.tsx` — controlled mode logic fix
- `src/calendar/calendar.tsx` — view switch to internal state, `activeView` from `useCalendarState`
- `src/calendar/components/calendar-month-view.tsx` — event width algorithm, days matrix, virtualizer positioning
- `src/calendar/utils/calendar-layout-utils.ts` — event width calculation
- `src/calendar/utils/calendar-date-utils.ts` — month days range
- `src/calendar/hooks/use-calendar-state.ts` — activeView state
- `src/barcode-input/barcode-scanner-overlay.tsx` — `<video>` mount unconditional
- `src/barcode-input/hooks/use-barcode-camera.ts` — stream→video attachment effect

### Out Of Scope

- Kanban DnD visual feedback, drop indicator, column drag, filter wiring (K-DISP-03..05, K-OP-02..06) — P1
- Calendar timezone/export/ownership/drag-create/overflow-day fixes — P1
- BarcodeInput portal/zxing ponyfill/torch/error-propagation — P1
- Gantt bar width/links/keyboard/resource-load — P1
- Test infrastructure changes (no mock architecture rewrite)
- Contract drift / design doc alignment

## Test Strategy

档位选择：`必须自动化` — P0 behavioral fixes must have focused regression tests that verify the correct result, not just absence of error. Tests must exercise the real component wiring, not mock away the integration layer.

## Execution Plan

### Phase 1 — Gantt P0: zoomLevels + \_dirty guard + scrollTo + row height + expand/toggle

Status: completed
Targets: `gantt.tsx`, `gantt-store.ts`, `gantt-grid.tsx`, `gantt-bars.tsx`, `gantt-cellgrid.tsx`, `gantt-timescale.tsx`, `gantt-context.tsx`, `utils/layout.ts`

- Item Types: `Fix`

- [x] **G-DISP-01**: Pass `resolved.zoomLevels` to `createInitialStore` in `gantt.tsx`. Seed default `day/week/month` when absent. Verify time scale, cell grid, and zoom buttons render with content.
- [x] **G-DISP-02**: Force `<tr>` height to `store.rowHeight` (default 40px). Add `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` to task text cells. Verify grid rows align with timeline bar positions.
- [x] **G-OPS-01**: Change `scrollToToday`/`scrollToTask` in `gantt.tsx` to set `timelineRef.current.scrollLeft` directly. Only sync `scrollTop` to grid container. Remove the grid-scrollLeft → timeline-scrollLeft roundtrip.
- [x] **G-OPS-02**: Remove `_dirty` guard from `gantt-store.ts` `parse()` (or reset `_dirty=false` at end of successful parse). Verify data reloads after `updateTask`/`toggleOpen`/`deleteTask`.
- [x] **G-OPS-11 + G-OPS-12**: Make `GanttGrid`, `GanttBars`, `GanttCellGrid`, `GanttTimeScale` subscribe `useGanttTreeSnapshot()` or `treeRevision`. In `toggleOpen`/`expandAll`/`collapseAll`, call `computeComputedPropertiesInternal()` (or at minimum `computeCoordinates`) and bump `layoutRevision`. Verify expand/collapse causes visible tree update with correct child coordinates.

Exit Criteria:

- [x] `zoomLevels` passed to store; zoom buttons available; time scale renders dates
- [x] Grid row height matches timeline; no vertical drift after 10+ rows
- [x] `scrollToToday` scrolls timeline to today; `scrollToTask(id)` scrolls to task's horizontal position
- [x] After `updateTask` followed by store re-`parse()`, new data is reflected in render
- [x] Toggling chevron on a parent task shows/hides children with correct positions and grid row updates
- [x] Focused tests for each fix (5+ new tests)

### Phase 2 — Kanban P0: controlled mode fix

Status: completed
Targets: `kanban-board.tsx`

- Item Types: `Fix`

- [x] **K-OP-01**: Change default to uncontrolled: on mount / rawData reference change, copy into local `localBoardData`. Only enter controlled mode when explicit `controlled` flag or `data-source` binding is present. In controlled mode, still update local state for optimistic UI but dispatch `onBoardChange` for external sync. Verify drag, add-card, delete-card, undo/redo all update visible board state.

Exit Criteria:

- [x] Default `data` prop allows all mutations (drag, add, delete) with visible UI update
- [x] Controlled mode (opt-in) dispatches change events
- [x] Focused test verifying mutation after `data` prop is applied

### Phase 3 — Calendar P0: view switch + event width + days matrix + virtualizer

Status: completed
Targets: `calendar.tsx`, `components/calendar-month-view.tsx`, `utils/calendar-layout-utils.ts`, `utils/calendar-date-utils.ts`, `hooks/use-calendar-state.ts`

- Item Types: `Fix`

- [x] **C-OPS-01**: Read `activeView` from `useCalendarState` hook for rendering and header. Schema `view` only as initial value (when `viewOwnership:'local'` default). Wire `header.onViewChange` to internal state setter.
- [x] **C-DISP-01**: Change event width to `100 / Math.min(dayBlocks.length, effectiveMax)`. `effectiveMax` only used for fold "+N" display. Single event = 100% width. Remove the hardcoded `widthPerEvent = 100/effectiveMax` path.
- [x] **C-DISP-02**: Replace `getMonthDays` (28-42 day range) with `getDateRange(getMonthStartEnd(...))` for month view. Month grid = resources × days-in-month (28-31 cols).
- [x] **C-DISP-03**: Add `position:'absolute',left:0,right:0` to virtualizer row divs. Remove flow-layout offset. Use only `transform: translateY(virtualItem.start)` for positioning.

Exit Criteria:

- [x] Clicking week/day/month header buttons switches visible view
- [x] Month view events with single event per cell render at 100% width; 2 concurrent at 50% each
- [x] Month view grid has correct number of columns (28-31 for February, 31 for December, etc.)
- [x] Virtualizer rows render without doubled spacing; correct total height
- [x] Focused tests for each fix (4+ new tests)

### Phase 4 — BarcodeInput P0: video stream attachment

Status: completed
Targets: `barcode-scanner-overlay.tsx`, `use-barcode-camera.ts`

- Item Types: `Fix`

- [x] **B-DISP-02**: Option A: Always render `<video ref={videoRef}>` (CSS `hidden`/`visible` by phase). Option B: Add `useEffect` that watches `camera.stream` and `videoRef.current`, attaching `stream → srcObject` reactively. Verify camera preview visible in overlay after camera permission granted.

Exit Criteria:

- [x] `<video>` element renders and receives stream in `scanning` phase; camera preview visible
- [x] `videoWidth > 0` in scanning phase (decoder can start)
- [x] Focused test verifying stream→video attachment (with `getUserMedia` mock/stub)

## Draft Review Record

- Reviewer / Agent: mission_driver (fresh session)
- Verdict: pass
- Rounds: 1
- Findings addressed:
  - [Major] `src/calendar/calendar-month-view.tsx` corrected to `src/calendar/components/calendar-month-view.tsx` (file lives under `components/` subdirectory)

## Closure Gates

- [x] All 12 in-scope P0 defects fixed and verified with focused tests
- [x] Gantt renders timeline with dates, zoom works, tree expand/collapse works
- [x] Kanban mutations (drag/add/delete) update visible UI
- [x] Calendar view switching works, event widths correct, grid is resource×date matrix, virtualizer rows not doubled
- [x] BarcodeInput camera preview visible
- [x] No in-scope P0 defect silently downgraded to deferred/follow-up
- [x] No public contract changes requiring owner-doc update — all fixes are internal behavioral corrections; schema/action types and design-doc contracts unchanged
- [x] By independent sub-agent (fresh session) closure-audit completed with evidence recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Gantt `_dirty` parse guard — alternative fix path

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Primary fix (remove guard or reset at parse end) is clean and in-scope. A more sophisticated approach (incremental update instead of full re-parse) would be a performance optimization not required for correctness.

## Non-Blocking Follow-ups

- Fixing integration-layer-mock test pattern (full sub-component mocking that masks P0s) is a systemic test quality issue beyond the individual regression tests added here.

## Closure

Status Note: All 4 phases executed. All 12 P0 defects fixed. `pnpm typecheck` 56/56, `pnpm build` 30/30, `pnpm lint` 0 errors (1 pre-existing warning), `pnpm test` — scheduling 667/667 (70 files), full workspace all green.

Closure Audit Evidence:

- Auditor / Agent: closure_auditor (fresh session — independent closure audit per AGENTS.md closure gate)
- Evidence: `pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 0 errors (1 pre-existing) ✓, `pnpm test` — scheduling 667/667 (70 files) ✓, full workspace all green. Live code verification via grep/glob/read confirmed: gantt-store.ts (parse guard removed line 72, toggleOpen coordinate recompute + layoutRevision bump lines 204-215), gantt.tsx (zoomLevels pass-through lines 37-41, scrollToToday/scollToTask timeline-scroll lines 141-159), gantt-grid.tsx (rowHeight subscription line 95, treeSnapshot line 24, text truncation lines 131/135), kanban-board.tsx (uncontrolled default line 68, no controlled guard), calendar.tsx (activeView from useCalendarState hook line 264), calendar-month-view.tsx (getDateRange(getMonthStartEnd()) days matrix lines 63-66, virtualizer position:absolute lines 183-188), calendar-layout-utils.ts (event width 100/visibleCount lines 109-124), barcode-scanner-overlay.tsx (unconditional <video> line 244). All 12 P0 defect fixes landed. Daily log `docs/logs/2026/07-22.md` records execution. Design docs (`docs/components/gantt/design.md`, `docs/components/kanban/design.md`, `docs/components/calendar/design.md`) unchanged — no public contract drift.

Follow-up:
