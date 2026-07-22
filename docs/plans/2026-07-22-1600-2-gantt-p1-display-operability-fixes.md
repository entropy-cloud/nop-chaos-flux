# 2 Gantt P1 Display & Operability Fixes

> Plan Status: active
> Last Reviewed: 2026-07-22
> Source: `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §1 (G-DISP-03..08, G-OPS-03..09, G-OPS-13, G-OPS-14)
> Mission: scheduling
> Work Item: S15
> Related: `docs/plans/2026-07-22-1600-1-scheduling-p0-display-operability-fixes.md` (prerequisite — fixes Gantt P0s first)

## Purpose

Fix all P1 display and operability defects in the Gantt component. These are non-blocking for basic demo operation (P0s already fixed in Plan 1) but cause visible visual errors (bar width off-by-one, wrong link arrows, garbled week labels), broken customization paths (taskBar region, custom columns), degraded drag interaction (no visual feedback, no event dispatch), and keyboard confusion. After this plan, the Gantt component is fully functional for production use.

## Current Baseline

- Plan 1 (prerequisite) has resolved Gantt P0s: zoomLevels transmission, row height alignment, scrollTo target, \_dirty guard, expand/toggle revision subscription + coordinate recompute.
- Remaining **13 P1 defects** (matching roadmap S15.1–S15.13):
  - **G-DISP-03** (S15.1): Bar width off-by-one — `diffInDays` without inclusive/exclusive handling; same-day tasks render as 4px.
  - **G-DISP-04** (S15.2): Dependency lines ignore `link.type` — SS/FF/SF all drawn as FS; wrong anchor points and no leftward routing.
  - **G-DISP-05** (S15.3): `%V`/`%W`/`%q` format tokens unimplemented in `FORMAT_TOKENS` — week/quarter labels print raw tokens as literal characters.
  - **G-DISP-06** (S15.4): Milestone bars `pointer-events:none`, no positioning wrapper, no link handles — cannot select/drag/connect.
  - **G-DISP-07** (S15.5): `taskBar` region registered but never read from `regions` — custom bar templates silently ignored.
  - **G-DISP-08** (S15.6): Grid custom columns render empty (`default: ''`); `predecessor` column reads `$source` (successors) instead of `$target`.
  - **G-OPS-03** (S15.7): Drag ghost uses `translate(dx,dy)` (vertical drift allowed), original bar stays full opacity, no drop indicator.
  - **G-OPS-04** (S15.8): `onTaskDragEnd`/`onLinkDragEnd` events never dispatched — drag/link-drop changes invisible to host.
  - **G-OPS-06** (S15.9): Keyboard ArrowLeft/ArrowRight both call `toggleOpen` (same action); conflicts with per-bar arrow→resize mapping.
  - **G-OPS-07** (S15.10): Keyboard ArrowUp/Down updates selectedTaskId state but does not move DOM focus; `updateRowAria` is dead code.
  - **G-OPS-08** (S15.11): Top-level parent tasks (`$level===0`) with children have no chevron — cannot collapse top-level items.
  - **G-OPS-13** (S15.12): `updateTask` does not bump `layoutRevision` — editing task dates leaves cell grid, time scale, today line, dependency lines stale.
  - **G-OPS-14** (S15.13): ArrowUp/Down on focused bars triggers both per-bar "move date" handler and container-level "select navigation" — both execute.
- `pnpm typecheck`/`build`/`lint`/`test` pass at baseline.

## Goals

- Bar width computed correctly with end-semantics explicitly documented and computed (min width = 1 cell). Milestone diamond centered on date.
- Link polyline routes per `link.type` (FS/SS/FF/SF) with correct anchor points and leftward wrapping.
- Week/quarter time scale labels display formatted values (ISO week number, quarter number).
- Milestones selectable, positionable, linkable (pointer-events + proper wrapper).
- `taskBar` region consumed by `GanttBars`; custom column `cell` region and field-name fallback work.
- Drag ghost translates horizontally only; original bar fades to 0.3 opacity; drop indicator rendered.
- `onTaskDragEnd`/`onLinkDragEnd` dispatched with correct payloads.
- Keyboard: ArrowLeft=collapse, ArrowRight=expand (or scroll); ArrowUp/Down moves DOM focus; no per-bar date-move conflict; `updateRowAria` wired.
- Top-level parent tasks with visible children render chevron.
- `updateTask` bumps `layoutRevision` so grid/timeline/links stay in sync.
- Focused regression tests for each fix (13 item groups).

## Non-Goals

- P2/P3 Gantt defects (sticky header, scale alignment, weekend UTC, empty/loading skeleton, start/end handle distinction, event dispatch completeness) — deferred.
- Contract drift / design doc alignment (G-DRIFT items) — covered by prior contract-drift plan.
- Kanban/Calendar/Barcode fixes — separate plans.
- CSS/styling/a11y — covered by prior surface-quality plan.

## Scope

### In Scope

- `src/gantt/utils/layout.ts` — bar width calculation, link polyline routing, milestone positioning
- `src/gantt/utils/date.ts` — `FORMAT_TOKENS` for `%V`/`%W`/`%q`
- `src/gantt/gantt-bars.tsx` — milestone wrapper, `taskBar` region consumption, drag ghost/opacity, keyboard handler stopPropagation
- `src/gantt/gantt-grid.tsx` — custom column cell rendering, predecessor field, chevron condition
- `src/gantt/hooks/use-gantt-drag.ts` — ghost translation, bar opacity, drop indicator, `onCommit` callback for event dispatch
- `src/gantt/hooks/use-gantt-link-draw.ts` — link type routing, `onCommit` callback for `onLinkDragEnd`
- `src/gantt/hooks/use-gantt-keyboard.ts` — Left/Right semantics, ArrowUp/Down focus, `updateRowAria` wiring
- `src/gantt/gantt-store.ts` — `updateTask` bump `layoutRevision`
- `src/gantt/gantt.tsx` — pass `events` callbacks to drag hooks

### Out Of Scope

- Gantt P0 fixes (Plan 1)
- Kanban/Calendar/Barcode P0/P1 plans
- Contract drift / unconsumed schema fields
- Full test infrastructure overhaul

## Test Strategy

档位选择：`必须自动化` — each P1 fix must include a focused test verifying correct behavior. Tests that currently "assert the bug" (e.g., `utils/layout.test.ts` asserting 4px for same-day bar) must be corrected.

## Execution Plan

### Phase 1 — Display: bar width, link routing, format tokens, milestones, taskBar region, custom columns

Status: planned
Targets: `utils/layout.ts`, `utils/date.ts`, `gantt-bars.tsx`, `gantt-grid.tsx`

- Item Types: `Fix | Proof`

- [ ] **G-DISP-03** (S15.1): Clarify end semantics (recommend exclusive). Change `Math.max(diffDays * cellWidth, 4)` to `Math.max((diffDays + (exclusive?1:0)) * cellWidth, cellWidth)`. Update/add test asserting 1-day task >= cellWidth, 10-day task = 10×cellWidth.
- [ ] **G-DISP-04** (S15.2): In `linkToPolyline`, branch by `link.type`: FS = source.right→target.left, SS = source.left→target.left, FF = source.right→target.right, SF = source.left→target.right. Add leftward routing (bend around when target is left of source). Add tests for all 4 types.
- [ ] **G-DISP-05** (S15.3): Add `V` (ISO week number, `getISOWeek` helper), `W` (week-of-year, locale-aware), `q` (quarter) formatters to `FORMAT_TOKENS`. Add tests for each.
- [ ] **G-DISP-06** (S15.4): Remove `pointer-events:none` from milestone SVG. Use same positioning wrapper as task bars. Add link handle anchors when `linkable`. Add test verifying milestone click/selection works.
- [ ] **G-DISP-07** (S15.5): Thread `regions.taskBar` from `gantt.tsx` through to `GanttBars`. When present, render via region's `.render()` instead of default `<span>{task.text}</span>`. Add test with custom taskBar region.
- [ ] **G-DISP-08** (S15.6): Change `getCellValue` default to `(task as any)[col.name]`. Fix `case 'predecessor'` to read `task.$target`. Wire `col.cell` region rendering. Add test verifying custom column values appear.

Exit Criteria:

- [ ] Bar width is correct (same-day task = 1 cell; 10-day = 10 cells); existing bug-asserting test corrected
- [ ] All 4 link types produce correct polylines with correct anchor points
- [ ] `%V`/`%W`/`%q` render as week number, week number, quarter number respectively
- [ ] Milestone bars clickable, positioned correctly, have link handles when linkable
- [ ] Schema-defined `taskBar` region renders in place of default text
- [ ] Grid columns render `col.name` values; `predecessor` shows predecessor task IDs; `col.cell` region renders when provided

### Phase 2 — Operability: drag visual feedback, event dispatch, keyboard fixes, chevron, layoutRevision bump

Status: planned
Targets: `hooks/use-gantt-drag.ts`, `hooks/use-gantt-link-draw.ts`, `hooks/use-gantt-keyboard.ts`, `gantt-bars.tsx`, `gantt-grid.tsx`, `gantt-store.ts`, `gantt.tsx`

- Item Types: `Fix | Proof`

- [ ] **G-OPS-03** (S15.7): Change ghost to `translateX(dx)` only (no vertical drift). Set original bar `opacity:0.3` during drag. Render drop indicator (`gantt-drop-indicator` class, 2px blue line) at target position.
- [ ] **G-OPS-04** (S15.8): Pass `onCommit(taskId, changes)` callback to `useGanttDrag` and `useGanttLinkDraw`. On drag end / link draw end, call `helpers.dispatch(events.onTaskDragEnd, ...)` / `helpers.dispatch(events.onLinkDragEnd, ...)`. Add test verifying event fires.
- [ ] **G-OPS-06** (S15.9): Change ArrowLeft to collapse/scroll-left, ArrowRight to expand/scroll-right (consistent semantics). Remove per-bar ArrowLeft/Right→resize mapping (conflicts with keyboard handler).
- [ ] **G-OPS-07** (S15.10): On ArrowUp/Down selection change, call `row.focus()` on the newly selected row's DOM element. Wire `updateRowAria` into production keyboard handler.
- [ ] **G-OPS-08** (S15.11): Change chevron condition from `task.$level > 0` to `store.getVisibleDescendantCount(task.id) > 0` (or equivalent). Top-level parents with children show chevron.
- [ ] **G-OPS-13** (S15.12): In `updateTask`, bump `layoutRevision` after `computeComputedPropertiesInternal()`, or have `computeComputedPropertiesInternal` bump it consistently. Verify grid/timeline/today-line/links update after task drag.
- [ ] **G-OPS-14** (S15.13): Add `event.stopPropagation()` to per-bar ArrowUp/ArrowDown handlers in `gantt-bars.tsx`, or remove per-bar date-move binding entirely (retain only container-level select-navigation).

Exit Criteria:

- [ ] Drag ghost stays at same vertical position as bar; original bar at 0.3 opacity; drop indicator visible
- [ ] `onTaskDragEnd` fires with correct payload after drag; `onLinkDragEnd` fires after link draw
- [ ] ArrowLeft collapses parent, ArrowRight expands parent (or scrolls); no per-bar resize conflict
- [ ] ArrowUp/Down moves DOM focus to adjacent row
- [ ] Top-level parent tasks with visible children show expand/collapse chevron
- [ ] After dragging a task to change dates, grid background, time scale, today line, and links update
- [ ] Per-bar ArrowUp/Down does not also trigger container-level select-navigation
- [ ] Focused tests for each fix (7+ new or corrected tests)

## Draft Review Record

- Reviewer / Agent: plan-review (fresh sub-agent session)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: None — all source references verified against live repo; format, scope, exit criteria, and closure gates comply with plan-authoring guide.

## Closure Gates

- [ ] All 13 in-scope P1 defects fixed and verified with focused tests
- [ ] Any previously bug-asserting test corrected to expect correct values
- [ ] Gantt P0s from Plan 1 remain intact (no regression)
- [ ] No in-scope P1 defect silently downgraded to deferred/follow-up
- [ ] Affected owner docs updated if public contract changed
- [ ] By independent sub-agent (fresh session) closure-audit completed with evidence recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### G-DISP-09 (sticky header), G-DISP-10 (scale alignment), G-DISP-11 (weekend UTC), G-DISP-12 (empty/loading), G-OPS-09 (start/end handle), G-OPS-10 (event dispatch completeness), G-DRIFT items

- Classification: `watch-only residual`
- Why Not Blocking Closure: These are P2/P3 or contract-drift items. P2s do not affect basic usability; contract drift is covered by `2026-07-22-2-scheduling-contract-drift.md`. No requirement to fix in this plan.

## Non-Blocking Follow-ups

- `gantt-store.ts` `recalcLayout` vs `computeComputedPropertiesInternal` duplication warrants future consolidation.

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
