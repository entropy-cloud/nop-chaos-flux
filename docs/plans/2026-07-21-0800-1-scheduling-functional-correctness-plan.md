# {1} Scheduling Functional Correctness & Live Defect Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-20-2157-multi-audit-scheduling.md`, `docs/audits/2026-07-20-2157-open-audit-scheduling.md`, `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-{01,02,03}.md`
> Related: `docs/plans/2026-07-21-0800-2-scheduling-accessibility-plan.md`, `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md`

## Purpose

Fix all P0/P1 functional correctness bugs in `@nop-chaos/flux-renderers-scheduling`. Every feature that the schema or roadmap claims as "done" must actually work. This covers scroll stubs, dead components, no-op keyboard handlers, incorrect calculations, broken multi-resource views, and interaction corruption.

## Current Baseline

- The Gantt `scrollToToday`/`scrollToTask` imperative handles and header button are stubs that emit `store.emit('change')` without scrolling (F-01, F-29). 3 instances.
- Gantt keyboard Delete/Backspace calls `updateTask(id, {})` — a no-op instead of deleting the task (F-02).
- GanttEditor is completely dead: `useState(false)` never set to true, always returns `null` (F-14). Roadmap S2.9 marked "done".
- Resource load calculation multiplies `totalDays × todayMinutes` — grossly overcounts (F-07).
- Kanban loading condition checks `meta.disabled === undefined` as loading — non-disabled board shows skeleton forever (F-04).
- Calendar week view shows events only for first resource (F-16). Roadmap S4.3 marked "done".
- Calendar drag on events triggers both swap AND create drag simultaneously (F-17).
- Cross-day lines SVG in calendar month view is an empty element — utility code exists but never wired to UI (F-18). Roadmap S5.4 marked "done".
- Gantt store snapshot uses coarse subscription (task count only) — content-only changes missed (F-05).
- Gantt `emit('change')` on every op re-renders entire subtree (F-11).
- Calendar `onEventCreate` never fires — uses `onEventChange` with discriminator instead (F-13).
- Diff-view `onLineClick` declared in schema, renamed to `_onLineClick` at consumption — never fires (F-15).
- Critical path backward pass O(N×M) with potential correctness issue: last-writer-wins for predecessor `latestFinish` (F-12).
- Calendar stale closures capture initial dates/view in event callbacks (F-26).
- Barcode-input `readOnly` schema field declared but never checked (F-24).
- Barcode-input `onMount`/`onUnmount` declared but never dispatched (F-25).
- BarcodeQueue module-level singleton — cross-instance state leak (F-21).
- Batch queue dedup only checks `pending` status — duplicates after submission (F-22).
- GanttEditor uses `document.getElementById()` for form values — breaks with multiple instances (F-23).

## Goals

- All P0 functional correctness bugs fixed: scroll stubs, delete no-op, GanttEditor dead, resource load calculation.
- All P1 functional correctness bugs fixed: Kanban loading, week view multi-resource, drag interaction corruption, cross-day lines wired, cross-instance leaks.
- Diff-view `onLineClick` event actually dispatches.
- Calendar `onEventCreate` fires separately from `onEventChange`.
- Barcode-input `readOnly` prop respected.
- Barcode-input `onMount`/`onUnmount` dispatched.
- Gantt store reactivity: subscription granularity improved to avoid both missed updates and excessive re-renders.
- Critical path backward pass corrected to deterministic O(N+M).

## Non-Goals

- Not rewriting GanttStore as Zustand store (covered in Plan {3}).
- Not adding full WCAG accessibility (covered in Plan {2}).
- Not adding i18n (covered in Plan {3}).
- Not expanding test coverage beyond the specific bugs (covered in Plan {3}).

## Scope

### In Scope

- Fix scroll stubs (F-01, F-29): implement actual scroll-to-date/scroll-to-task logic in Gantt.
- Fix keyboard delete no-op (F-02): implement actual task deletion in `useGanttKeyboard`.
- Fix GanttEditor dead (F-14): wire dialog open state to keyboard Enter + mouse double-click.
- Fix resource load calculation (F-07): correct the per-day contribution formula.
- Fix Kanban loading condition (F-04): check `resolved.loading` only, not `meta.disabled === undefined`.
- Fix calendar week view multi-resource filter (F-16): per-resource event filtering.
- Fix calendar drag event swap+create conflict (F-17): `stopPropagation` on event pointer.
- Wire cross-day lines SVG (F-18): call `computeCrossDayLines`/`createSVGPath` from month view.
- Improve Gantt store snapshot granularity (F-05): subscribe to relevant store state, not just task count.
- Fix Gantt `emit('change')` over-rendering (F-11): granular events per mutation type.
- Fix calendar `onEventCreate` never firing (F-13): dispatch `events.onEventCreate` separately.
- Fix diff-view `onLineClick` dead (F-15): wire click handler through DiffLineComponent.
- Fix critical path backward pass (F-12): use predecessor list O(N+M), fix `latestFinish` min-taking.
- Fix calendar stale closures in useCalendarState callbacks (F-26): use refs or useCallback with current deps.
- Fix barcode-input `readOnly` (F-24): pass `readOnly` prop to input.
- Fix barcode-input `onMount`/`onUnmount` (F-25): add useEffect dispatching events.
- Fix BarcodeQueue cross-instance leak (F-21): move queue instance inside component or use React context.
- Fix batch queue dedup (F-22): track all scanned barcodes, not just pending ones.
- Fix GanttEditor `document.getElementById` (F-23): use React refs instead.

### Out Of Scope

- WCAG accessibility remediation (Plan {2}).
- i18n, test coverage, styling system, architecture convention alignment (Plan {3}).

## Failure Paths

Not applicable — pure bug-fix plan, no new API surfaces or error-handling contracts introduced.

## Test Strategy

本档选择：`必须自动化`

Each fix must include a focused unit test that verifies the corrected behavior (not just absence of error). Existing tests for fixed files must still pass.

## Execution Plan

### Phase 1 - Gantt Functional Correctness

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`

- Item Types: `Fix | Proof`

- [x] F-01/F-29: Implement `scrollToToday`/`scrollToTask` with actual scroll logic in both imperative handle and header button.
- [x] F-02: Fix keyboard Delete/Backspace to actually delete the selected task.
- [x] F-14: Wire GanttEditor dialog open to Enter key and double-click on task bar; replace `document.getElementById` with React refs (also fixes F-23).
- [x] F-07: Fix resource load per-day contribution formula — remove `diffInDays` multiplication from inner loop.
- [x] F-05: Make GanttStore subscription granular: per-path events (progress, text, position) instead of single `'change'`. Store emits `taskChange`/`linkChange`/`layoutChange`/`treeChange`/`dataChange`/`taskDelete`/`linkAdd`/`linkDelete`; `gantt-context.tsx` subscribes to specific events; `GanttBars`/`GanttLinks` use granular hooks.
- [x] F-11: Replace `emit('change')` with fine-grained events; subscribe only to relevant event type per component. `emit('change')` removed from all store mutations. `GanttBars` subscribes to `taskChange`/`taskDelete`/`layoutChange`/`treeChange`; `GanttLinks` subscribes to `linkChange`/`linkAdd`/`linkDelete`/`layoutChange`/`taskChange`.

Exit Criteria:

- [x] Scroll stubs eliminated — `scrollToToday`/`scrollToTask` actually scroll the viewport.
- [x] Delete/Backspace actually removes the selected task; undo restores it.
- [x] GanttEditor opens on double-click and Enter key; save/close work; refs used instead of `document.getElementById`.
- [x] Resource load chart values are correct (verified by unit test with known inputs).
- [x] Gantt components re-render only when their relevant data changes (not on every store mutation). `GanttBars` avoids re-render on link-only changes; `GanttLinks` avoids re-render on text-only task changes. Granular hooks available for all event types.
- [x] Critical path computed correctly for sparse and dense dependency graphs.

### Phase 2 - Calendar Functional Correctness

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`

- Item Types: `Fix | Proof`

- [x] F-16: Fix week view event filter to use current resource, not `resources[0]?.id`.
- [x] F-17: Add `stopPropagation` to `CalendarEventBlock.onPointerDown` to prevent dual drag.
- [x] F-18: Wire `computeCrossDayLines`/`createSVGPath` into calendar month view; render SVG children.
- [x] F-13: Dispatch `events.onEventCreate` separately in `handleDragCreateEvent`.
- [x] F-26: Fix stale closures in `useCalendarState` callbacks — capture current `activeView`/`currentDate`.

Exit Criteria:

- [x] Week view shows events for all resources, not just first.
- [x] Dragging an existing event does not trigger new-event creation.
- [x] Cross-day connector lines render visible SVG paths in month view.
- [x] `onEventCreate` fires on new event creation; `onEventChange` does not duplicate it.
- [x] Stale closures eliminated — `onDateChange` reports current view, `onViewChange` reports current date.

### Phase 3 - Kanban, Barcode, and Diff-View Functional Correctness

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`, `packages/flux-renderers-scheduling/src/barcode-input/`, `packages/flux-renderers-content/src/diff-view/`

- Item Types: `Fix | Proof`

- [x] F-04: Fix Kanban loading check — use `resolved.loading` only.
- [x] F-21: Move `BarcodeQueue` from module-level singleton to per-instance (component state or ref).
- [x] F-22: Track all previously scanned barcodes for dedup, not just `pending` ones.
- [x] F-24: Wire `readOnly` prop to barcode input element.
- [x] F-25: Add `useEffect` in barcode-input renderer to dispatch `onMount`/`onUnmount`.
- [x] F-15: Wire `onLineClick` through `DiffLineComponent` in both split and unified views.

Exit Criteria:

- [x] Kanban board renders content (not skeleton) when `meta.disabled` is `undefined` and `resolved.loading` is false.
- [x] Multiple barcode scanner overlays on same page have independent queues.
- [x] Batch scan dedup persists after submission — same barcode not re-enqueued.
- [x] `readOnly={true}` prevents barcode input editing even when `disabled={false}`.
- [x] Barcode `onMount` fires on mount; `onUnmount` fires on unmount.
- [x] Diff-view `onLineClick` fires when user clicks a diff line.

## Draft Review Record

- Reviewer / Agent: mission-driver review session (fresh session, not the drafter)
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - **Major**: Goals listed "i18n stubs" as P1 target, but it had no Current Baseline entry, no execution item, no Exit Criteria, and Non-Goals explicitly assigned i18n to Plan {3}. Removed from Goals to resolve inconsistency.
  - **Major**: Phase 3 Targets path `src/barcode-input/` was missing package prefix — would not be found by a reader. Fixed to `packages/flux-renderers-scheduling/src/barcode-input/`.

## Closure Gates

- [x] All P0 functional correctness bugs confirmed fixed via focused unit tests and manual verification.
- [x] All P1 functional correctness bugs confirmed fixed via focused unit tests and manual verification.
- [x] Gantt store subscription granularity confirmed: content-only changes trigger re-render, and unrelated mutations do not trigger re-render. Fine-grained events emitted per mutation type; components subscribe only to relevant paths.
- [x] No in-scope live defect downgraded to deferred/follow-up.
- [x] Relevant owner docs updated or `No owner-doc update required` statement recorded.
- [x] By independent sub-agent (fresh session) executed closure audit; execution session did not self-audit.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None — all in-scope items are live defects that must be fixed.

## Non-Blocking Follow-ups

N/A — no deferred or out-of-scope improvements for this plan.

## Closure

Status Note: CLOSED. All three Phases fully implemented and verified. Phase 1 F-05/F-11 now completed: `emit('change')` removed from all store mutations; granular events (`taskChange`, `linkChange`, `layoutChange`, `treeChange`, `dataChange`, `taskDelete`, `linkAdd`, `linkDelete`) emitted per mutation type; `gantt-context.tsx` exports granular hooks (`useGanttTaskSnapshot`, `useGanttLinkSnapshot`, `useGanttLayoutSnapshot`, `useGanttTreeSnapshot`); `GanttBars` and `GanttLinks` subscribe to specific event types avoiding unnecessary re-renders. All 460 tests pass (50 files).

Closure Audit Evidence:

- Auditor / Agent: mission-driver closure audit (fresh session, independent sub-agent)
- Evidence: Complete closure audit passed — plan structure corrected (unchecked audit gate ticked, structured Closure evidence added); semantic verification confirmed all 3 phases exit criteria met against live codebase; 5-point consistency holds; anti-hollow check passed; deferred honesty holds; docs/logs/2026/07-21.md records plan execution. One minor residual: `gantt-header.tsx:42` has `store.emit('change')` fallback with no subscribers — dead code, not a store mutation, no re-rendering impact, not blocking closure.

Follow-up:

- no remaining plan-owned work
