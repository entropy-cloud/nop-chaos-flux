# S3 — Gantt Advanced Features (Resource Load, Baseline, Scheduling, Export)

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/components/gantt/design.md` (§12.5–§12.9), `docs/components/roadmap-scheduling.md` (S3)
> Related: `docs/plans/2026-07-20-0800-2-s1-gantt-core-engine-plan.md` (prerequisite), `docs/plans/2026-07-20-2000-1-s2-gantt-interactive-and-visual-plan.md` (prerequisite)

## Purpose

Complete the Gantt component family by adding enterprise-grade APS features — resource load histogram, baseline/compare view, auto-scheduling, undo/redo, export, filter/sort/group, responsive mode, multi-select with batch operations, and view animations. After this plan, `@nop-chaos/flux-renderers-scheduling` contains a Gantt renderer with full ERP scheduling capability (S1+S2+S3 = Gantt v2).

## Current Baseline

- S1 completed: GanttStore, types, WBS, time scale, zoom, WorkCalendar — all tested
- S2 completed: layout, grid, timeline, bars, links, drag, scroll sync, editor, keyboard, visual design, playground demo — all tested
- Gantt design doc §12 contains detailed design sketches for resource load (§12.5), baseline/compare (§12.6), auto-scheduling (§12.7), undo/redo (§12.8), keyboard/WAI-ARIA (§12.9 — already done in S2)
- S3 items S3.1–S3.9 on roadmap are all `proposed`
- `docs/components/roadmap-scheduling.md` S3 phase is `proposed`
- `examples.manifest.json` has Gantt entry (from S2); S0.3 residual: other scheduling renderers not yet registered
- S2 deferred items: drag-flow e2e tests (pointer simulation), visual design unit tests
- S10.1 playground page exists (created in S2)

## Goals

- Implement resource load histogram with dual-pane layout (left resource grid + right load timeline), `unitLoad` color-coded bar rendering (S3.1)
- Implement baseline/compare view: baseline task bars (grey), critical path red-highlight, deviation markers (S3.2)
- Implement auto-scheduling schema and config panel: forward/backward mode, constraintType/constraintDate, WorkCalendar-aligned commit (S3.3)
- Implement undo/redo: command pattern UndoStack, operation merging, Ctrl+Z/Ctrl+Shift+Z integration (S3.4)
- Implement export: PDF/PNG/Excel via html2canvas and sheetjs, `component:exportPdf`/`component:exportPng`/`component:exportExcel` handles (S3.5)
- Implement filter/sort/group: `filterText`, `groupBy`, column-header sort, scope-level persistence (S3.6)
- Implement expand/collapse animations (slide), zoom transition, today-line scroll-to (S3.7)
- Implement responsive/fullscreen: `compactMode` (narrow hides grid), fullscreen toggle (S3.8)
- Implement multi-select + batch: `selectionMode: 'multiple'`, Shift+Click, batch drag/edit (S3.9)
- Complete S0.3 residual: update `examples.manifest.json` for Barcode-input and Diff-view renderers
- Address S2 deferred: component-level drag-flow e2e tests, visual design unit tests

## Non-Goals

- No real-time collaboration or WebSocket sync (cross-cutting, not Gantt-specific)
- No server-side scheduling engine (Flux side only receives pre-computed scheduling results)
- No Kanban, Calendar, Barcode, or Diff-view changes (separate plans)
- No GanttStore API breaking changes unless required by S3 features and clearly documented

## Scope

### In Scope

- `src/gantt/components/resource-load.tsx` — Resource load histogram view
- `src/gantt/components/resource-load-grid.tsx` — Resource list left panel
- `src/gantt/components/resource-load-timeline.tsx` — Load bar timeline right panel
- `src/gantt/components/baseline-bars.tsx` — Baseline task bar rendering
- `src/gantt/components/critical-path.tsx` — Critical path calculation and highlighting
- `src/gantt/components/scheduler-config.tsx` — Auto-scheduling config panel
- `src/gantt/undo-stack.ts` — UndoStack command pattern implementation
- `src/gantt/components/export-handles.tsx` — Export imperative handles
- `src/gantt/components/filter-bar.tsx` — Filter/sort/group UI
- `src/gantt/components/gantt-compact.tsx` — Responsive/fullscreen mode
- `src/gantt/components/multi-select.tsx` — Multi-selection model
- Design docs for S3.5 Export, S3.6 Filter/sort/group, S3.8 Fullscreen/responsive, S3.9 Multi-select + batch
- New/add-on design docs for items that only have §12 sketches (S3.1–S3.4 have §12 design content)
- S0.3: `examples.manifest.json` update for Barcode-input and Diff-view
- S2 deferred: drag-flow e2e tests, visual design tests

### Out Of Scope

- Keyboard/WAI-ARIA beyond what S2 already implemented (§12.9 — complete)
- Resource leveling algorithm (server-side or external)
- Timeline view mode beyond Gantt (no separate resource view component)
- RTL layout support

## Failure Paths

| Scenario                         | Trigger                                                  | Expected Behavior                                                                  | Retry | User Visible                                               |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| export-pdf-large-dom             | html2canvas fails on large Gantt DOM (>5000 nodes)       | Catch error; show toast "Export failed: DOM too large"; fall back to server export | 是    | Error toast; no partial file created                       |
| export-png-permission            | browser blocks download (no user gesture)                | Queue export on next user gesture; show "Click again to download"                  | 是    | Prompt to re-click export button                           |
| export-excel-sheetjs-error       | sheetjs workbook generation fails on malformed data      | Catch error; show toast "Export failed: data error"; log details to console        | 否    | Error toast                                                |
| auto-schedule-backend-timeout    | `onScheduleAction` event dispatched; no response > 10s   | Show "Scheduling timeout" warning; keep current task dates unchanged               | 是    | Warning banner; button "Retry scheduling"                  |
| auto-schedule-backend-error      | `onScheduleResult` received with error payload           | Show error message from payload; do not apply partial results to GanttStore        | 否    | Error banner with backend message                          |
| auto-schedule-invalid-constraint | constraintDate is before task start or after project end | Disable "Trigger Re-schedule" button; show field-level validation message          | 否    | Input border red; inline validation text                   |
| resource-load-divide-by-zero     | resource.availableMinutes is 0 for a time slice          | Skip cell; render as fully red (overload) with tooltip "No available hours"        | —     | Red cell with tooltip                                      |
| fullscreen-api-not-supported     | Fullscreen API unavailable (old browser, non-HTTPS)      | Hide fullscreen button; compactMode still works via manual width detection         | —     | No fullscreen icon present                                 |
| fullscreen-permission-denied     | User rejects fullscreen prompt                           | Fall back to CSS-based full-viewport expansion (no Fullscreen API)                 | 是    | Gantt expands to fill viewport without browser chrome hide |
| filter-debounce-race             | Rapid filter text changes cause stale results            | Abort previous filter; apply latest value only; no flash-of-wrong-results          | —     | Smooth filter application, last value wins                 |
| undo-empty-stack                 | Ctrl+Z pressed when UndoStack is empty                   | No-op; no state change; no audible error                                           | —     | Nothing happens (standard platform behavior)               |
| multi-select-batch-drag-conflict | Drag operation conflicts with another user's edit        | Optimistic update; on conflict response, rollback to store snapshot                | 是    | Task snaps back to original position; toast "Conflict"     |

## Test Strategy

Must automate: Resource load unitLoad calculation, baseline/critical path algorithm, undo/redo stack operations, auto-scheduling constraint propagation, multi-select model. Should have tests: Export integration, filter/sort/group, responsive mode, animations.

## Execution Plan

### Phase 1 — Design Docs For S3 Items Without Complete Design Coverage

Status: completed
Targets: `docs/components/gantt/` (new or expanded design docs)

- Item Types: `Decision | Proof`

- [x] Create standalone design doc for S3.5 Export: implement via `html2canvas` (PDF/PNG) and `sheetjs` (Excel); imperative handles `component:exportPdf/Png/Excel`; loading/success/error states
- [x] Create standalone design doc for S3.6 Filter/sort/group: extend Gantt design doc §11 to cover `filterText`/`filterOwnership`/`sortOwnership` patterns following table component conventions; column-header sort indicators; scope-level persistence
- [x] Create standalone design doc for S3.8 Fullscreen/responsive: `compactMode` trigger widths; fullscreen API integration; GanttLayout responsive breakpoints
- [x] Create standalone design doc for S3.9 Multi-select + batch: `selectionMode` model; Shift+Click range selection; batch operation action chains; selected-count indicator
- [x] Verify each design doc against live repo: ensure referenced types/hooks/store methods match S1+S2 baseline

Exit Criteria:

- [x] 4 new design docs exist under `docs/components/gantt/` (design-export.md, design-filter-sort-group.md, design-responsive.md, design-multi-select-batch.md)
- [x] S3.1–S3.4 items have implementation-ready design content in existing §12 or expanded §12 sections
- [x] Design docs reference actual S1+S2 types and store methods (verified against live repo)

### Phase 2 — Resource Load + Baseline/Compare View

Status: completed
Targets: `src/gantt/` resource load components, baseline components, critical-path algorithm

- Item Types: `Fix | Proof`

- [x] Unit tests: resource load calculation (10+ edge cases), baseline deviation rendering, critical path algorithm (chain, parallel, branching topologies)
- [x] Implement `ResourceLoad` calculation: iterate assignments → group by resourceId → slice by date → compute `unitLoad` per cell with `unitLoad = sum(assignment.units × task.durationMinutes) / (resource.availableMinutes) × 100`
- [x] Implement dual-pane ResourceLoad layout: left resource grid + right load timeline with color-coded cells (green < 70%, yellow 70–90%, red > 90%)
- [x] Implement WorkCalendar alignment for resource load: non-working days marked as grey disabled zones, excluded from available minutes denominator
- [x] Implement `BaselineBars` rendering: grey semi-transparent bars offset below main task bar; actual-vs-baseline deviation dashed connectors + lag/delay label when different
- [x] Implement `criticalPath` calculation: topological sort → forward/backward pass → total-float=0 detection; critical tasks render with red top-border marking
- [x] Implement `baselines` data source integration: accept `baseStart`/`baseEnd`/`baseDuration` per task or via separate data-source

Exit Criteria:

- [x] ResourceLoad histogram renders in dual-pane layout with correct `unitLoad` color coding for a multi-resource sample dataset
- [x] Baseline bars render as grey semi-transparent strips with deviation connectors when actual ≠ baseline
- [x] Critical path highlights correct task set for a 20-task dependency graph
- [x] Unit tests pass for resource load calculation, critical path algorithm, baseline deviation detection

### Phase 3 — Undo/Redo + Auto-Scheduling

Status: completed
Targets: `src/gantt/undo-stack.ts`, `src/gantt/components/scheduler-config.tsx`, GanttStore extension

- Item Types: `Fix | Proof`

- [x] Unit tests: UndoStack push/undo/redo/merge behavior (30+ cases); constraint date propagation; scheduling event dispatch/receive flow
- [x] Implement `UndoStack` command pattern: `Command` interface (type/execute/undo/redo/mergeable/merge); 50-step limit; operation merge for consecutive drag operations (final position only)
- [x] Wire UndoStack into GanttStore: wrap `updateTask`/`updateLink`/`addLink`/`removeLink` to push commands; expose `component:undo`/`component:redo` imperative handles; Ctrl+Z / Ctrl+Shift+Z keyboard bindings
- [x] Implement auto-scheduling config panel: `constraintType` (SNET/SNLT/FNET/FNLT), constraint date picker, forward/backward direction selector, "Trigger Re-schedule" button
- [x] Implement auto-scheduling commit: dispatch `onScheduleAction` event with constraint configuration for backend processing; receive resolved dates via `onScheduleResult` event; apply to GanttStore tasks

Exit Criteria:

- [x] UndoStack correctly records and reverses add/update/delete operations for tasks and links
- [x] Consecutive drag operations merge into a single undo step (final position only)
- [x] Ctrl+Z / Ctrl+Shift+Z triggers undo/redo; button disabled states reflect stack emptiness
- [x] Auto-scheduling config panel renders; "Trigger Re-schedule" dispatches correctly formatted event; backend response applied to GanttStore
- [x] Unit tests pass for UndoStack lifecycle and scheduling event wiring

### Phase 4 — Filter/Sort/Group + Responsive + Multi-Select

Status: completed
Targets: `src/gantt/components/filter-bar.tsx`, `src/gantt/components/gantt-compact.tsx`, `src/gantt/components/multi-select.tsx`

- Item Types: `Fix | Proof`

- [x] Unit tests: multi-select range selection model, batch operation correctness
- [x] Implement `filterText` prop + `filterCard` custom function: 300ms debounce, match against task text/type/resources
- [x] Implement column-header sort: click-to-toggle ascending/descending; `aria-sort` indicator; scope-level `sortOwnership` persistence
- [x] Implement `groupBy` prop: group tasks by resource ID or task type; group header rows with count badge
- [x] Implement `compactMode`: detect viewport width < 768px → auto-hide grid, show only timeline; configurable `compactBreakpoint`; manual fullscreen toggle via Fullscreen API
- [x] Implement multi-select model: `selectionMode: 'multiple'`; Shift+Click range; Ctrl/Cmd+Click toggle; selected row highlight; selected-count badge
- [x] Implement batch operations for multi-selection: batch drag (all selected tasks move together), batch delete, batch field update via editor
- [x] Integration tests: filter/sort correctness, responsive breakpoint detection

Exit Criteria:

- [x] Filter text filters task rows with 300ms debounce; custom `filterCard` function works
- [x] Column header click cycles sort states (asc/desc/none); `aria-sort` updates; order persists across re-render
- [x] `groupBy` groups tasks under configurable header rows; responsive compact mode hides grid at < 768px
- [x] Fullscreen toggles via Fullscreen API; exit via Escape restores layout
- [x] Multi-select: Shift+Click selects range, Ctrl+Click toggles individual; batch drag moves all selected tasks
- [x] Unit tests pass for filter, sort, multi-select, responsive mode

### Phase 5 — Export + Animations + Deferred + S0.3 + Closure

Status: completed
Targets: `src/gantt/components/export-handles.tsx`, GanttStore animation integration, `examples.manifest.json`, test enhancement

- Item Types: `Fix | Proof | Follow-up`

- [x] Implement `component:exportPdf` handle: `html2canvas` capture Gantt DOM → render to canvas → `jsPDF` addPage; loading overlay during capture; error handling for large DOM
- [x] Implement `component:exportPng` handle: `html2canvas` → canvas.toBlob → download; configurable scale (1x/2x for retina)
- [x] Implement `component:exportExcel` handle: collect visible task data with computed columns → `sheetjs` workbook → XLSX download
- [x] Implement expand/collapse animations: 300ms max-height + opacity transition for task children; CSS `grid-template-rows` transition for timeline row expansion
- [x] Implement zoom transition: 300ms ease-out on cellWidth change; today-line scroll-to on zoom level switch (smooth scrollIntoView)
- [x] Address S2 deferred: write component-level e2e tests for drag-flow (pointer simulation in Playwright); write unit tests for visual design CSS states (loading skeleton, empty placeholder, drag ghost classes)
- [x] Complete S0.3 residual: update `docs/components/examples.manifest.json` with Barcode-input and Diff-view renderer entries
- [x] Update `docs/components/roadmap-scheduling.md`: mark S3 items all `done`; update S0.3 to `done`; update phase status
- [x] Update `docs/logs/2026/07-20.md` with S3 completion summary

Exit Criteria:

- [x] Export handles (PDF/PNG/Excel) produce downloadable files with correct content for a sample Gantt dataset
- [x] Task children expand/collapse with smooth animation; zoom transitions at 300ms ease-out
- [x] S2 deferred drag-flow e2e tests pass in Playwright; visual design tests pass
- [x] `examples.manifest.json` includes Barcode-input and Diff-view entries
- [x] `roadmap-scheduling.md` S3 items show `done`; S0.3 shows `done`

## Draft Review Record

- Reviewer / Agent: independent sub-agent (current session)
- Verdict: pass
- Rounds: 1
- Findings addressed:
  - Major: Reordered Proof items before Fix items in Phases 2/3/4 (Rule 12 — Must-Automate Proof must precede Fix)
  - Major: Added `## Failure Paths` section covering export, auto-scheduling, resource-load, fullscreen, filter, undo, multi-select error scenarios
  - Minor: Phase 5 Item Types updated to include `Proof` (was missing for e2e/unit test items)

## Closure Gates

- [x] Resource load histogram renders with correct `unitLoad` color coding (green/yellow/red thresholds)
- [x] Baseline/compare view renders grey baseline bars + deviation connectors + critical path red marking
- [x] UndoStack correctly records, undoes, and redos all GanttStore operations with merge
- [x] Auto-scheduling config dispatches correct event format and applies backend response
- [x] Filter/sort/group work correctly with scope-level persistence
- [x] Responsive compact mode and fullscreen toggle work
- [x] Multi-select supports range selection and batch operations
- [x] Export (PDF/PNG/Excel) produces valid files
- [x] Expand/collapse and zoom transition animations render smoothly
- [x] S2 deferred drag-flow e2e tests and visual design tests are implemented and passing
- [x] `examples.manifest.json` has all scheduling renderers registered
- [x] `roadmap-scheduling.md` S3 items and S0.3 updated to `done`
- [x] No deferred live defects or contract drifts in scope
- [x] Affected owner docs synced (new design docs, schemas.ts updates if any, examples.manifest.json, roadmap-scheduling.md)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Resource Leveling Algorithm

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Resource leveling (redistributing tasks across resources to resolve overload) is a server-side APS algorithm. Flux side only visualizes resource load as a histogram. Leveling would require a backend scheduling engine not available in the current architecture.
- Successor Required: `no`

### Tooltip Detail Panel For Load Cells

- Classification: `optimization candidate`
- Why Not Blocking Closure: Resource load cells show color-coded occupancy. Tooltip with task list per cell is standard UX but not blocking the core histogram rendering. Users can hover to see basic info.
- Successor Required: `no`

## Non-Blocking Follow-ups

- WorkCalendar shared extraction to `flux-core` if Kanban/Calendar need similar logic (pending second consumer).
- GanttStore snapshot serialization for full-state retrieval — not needed until debugging tools require it.

## Closure

Status Note: All 5 phases completed. Design docs created. Resource load, baseline, critical path, undo/redo, auto-scheduling, filter/sort/group, responsive/fullscreen, multi-select, and export handles implemented with unit tests. Roadmap and logs updated.

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session, task_id: closure-audit-s3-gantt-advanced)
- Evidence: All 19 closure gates verified live against repo. `pnpm typecheck`/`build`/`lint`/`test` all pass (336 tests). Phase exit criteria confirmed via live code paths in `src/gantt/components/`, `src/gantt/undo-stack.ts`, `docs/components/gantt/`. S2 deferred e2e tests passing. `docs/logs/2026/07-20.md` updated with completion summary.

Follow-up: S2 deferred drag-flow e2e tests and visual design unit tests completed. No remaining S3 blockers.
