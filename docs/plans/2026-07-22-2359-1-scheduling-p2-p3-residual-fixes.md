# 1 Scheduling P2/P3 Residual Quality Fixes

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: Deferred items from `docs/plans/2026-07-22-1600-2-gantt-p1-display-operability-fixes.md`, `docs/plans/2026-07-22-2300-1-kanban-p1-defect-remediation.md`, `docs/plans/2026-07-22-2300-2-calendar-p1-defect-remediation.md`, `docs/plans/2026-07-22-2300-3-barcode-p1-defect-remediation.md`, `docs/plans/2026-07-22-0915-3-scheduling-quality-polish.md`, `docs/plans/2026-07-22-0915-2-scheduling-contract-drift.md`
> Related: `docs/components/{gantt,kanban,calendar,barcode-input}/design.md`

## Purpose

Fix all P2/P3 residual defects across the scheduling package (Gantt/Kanban/Calendar/Barcode) that were deferred from previous P1 remediation plans as `watch-only residual`. Also resolves the Calendar dead components maintained as `@deprecated` since the Calendar P1 plan. The result is a scheduling package with zero deferred P2-level defects.

## Current Baseline

- All P0 and P1 defects across scheduling's 4 components are fixed (S11-S18 phases completed; 11 plans all `completed`).
- ~51 P2/P3 defect IDs across Gantt, Kanban, Calendar, and Barcode were deferred from P1 plans as `watch-only residual` — they do not affect default config correctness but represent quality gaps.
- Calendar dead components (CalendarBatchScheduler, CalendarTimezoneSelector, CalendarResourceGroup, CalendarResourceHeader, useCalendarICal) were marked `@deprecated` with no production wiring.
- Scheduling roadmap (S0-S20) is fully done with no remaining work items.

## Goals

- Fix all P2/P3 residual display, operability, and contract-drift defects across Gantt, Kanban, Calendar, and Barcode.
- Resolve Calendar dead components: either remove or wire each of the 5 deprecated items.
- Achieve "no deferred P2-level defects remain in scheduling" state.
- Update affected design docs to reflect resolved drift items.

## Non-Goals

- Cross-cutting convention alignment: raw HTML → `@nop-chaos/ui` replacements (17 locations), `useCallback`/`useMemo` overuse cleanup (15+ sites), GanttStore class → functional factory, Gantt ad-hoc React Context removal, Calendar hardcoded locale — these are `optimization candidate` / `out-of-scope improvement` items, tracked separately.
- Diff-view Playwright e2e tests — already adjudicated as non-blocking follow-up.
- Performance optimization beyond defect fixes.
- Screen-reader a11y e2e testing — requires tooling infrastructure investment.

## Scope

### In Scope

- **Gantt**: G-DISP-09 (sticky header), G-DISP-10 (scale alignment), G-DISP-11 (weekend UTC), G-DISP-12 (empty/loading skeleton), G-OPS-09 (start/end handle), G-OPS-10 (event dispatch completeness), G-DRIFT-01/02/03/04/05 (contract drift)
- **Kanban**: K-DISP-06 (virtualizer measureElement), K-DISP-07 (invalid HTML nesting), K-OP-07 (add column placeholder), K-OP-08 (dead hooks), K-OP-09 (columnsConfig dead field), K-OP-10 (card delete UI), K-OP-11 (controlled undo/redo), K-OP-12 (equal width + tabindex), K-DRIFT-03/04/05 (contract drift), DnD per-component ref registration
- **Calendar**: C-DISP-06 (header cell data-slot), C-DISP-07 (cross-day SVG units), C-DISP-08 (conflict false positive), C-DISP-09 (empty/loading states), C-OPS-03 (drag ghost), C-OPS-05 (keyboard cast), C-DRIFT-02/03/04/05/06 (contract drift), 5 dead components (remove or wire)
- **Barcode**: B-DISP-03 (missing CSS), B-DISP-04 (state machine i18n), B-DISP-05 (duplicate data-slot), B-OP-03 (camera probe overhead), B-OP-05 (skew retry CPU), B-OP-06 (mount effect deps), B-OP-07 (scan session bleed), B-CD-01/02/03/04/05 (contract drift)

### Out Of Scope

- P0/P1 defects (all resolved in prior plans)
- GanttStore `recalcLayout` vs `computeComputedPropertiesInternal` duplication
- Diff-view Playwright e2e tests
- Cross-cutting convention alignment items (listed in Non-Goals)
- Performance baseline measurement (covered by `2026-07-21-2300-1-scheduling-performance-remediation-plan.md`)

## Failure Paths

Not applicable — plan fixes display/operability defects and contract drift. No external API, auth, or error-handling surface changes.

## Test Strategy

档位选择：建议有测

Each fix must include a focused unit or integration test validating the corrected behavior. Calendar dead component removal must verify no regressions via existing focused tests.

## Execution Plan

### Phase 1 — Gantt P2/P3 Residual Fixes

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`

- Item Types: `Fix`, `Proof`

- [x] G-DISP-09: Make time scale header sticky (`position: sticky; top: 0` on scale wrapper or split scroll containers)
- [x] G-DISP-10: Align `scaleRange` to scale unit boundaries in `gantt-store.ts`; consolidate duplicate `computeScaleRange` in `utils/scale.ts`
- [x] G-DISP-11: Verify live code already uses `getUTCDay()` (confirmed by reviewer); add focused unit test with mocked timezone to guard against regression
- [x] G-DISP-12: Render `regions.empty` / default skeleton when no tasks in `gantt.tsx`
- [x] G-OPS-09: Pass handle side `'start'|'end'` to `onLinkHandlePointerDown`; infer link type from both sides
- [x] G-OPS-10: Dispatch `onTaskClick`, `onEmptyCellClick`, `onZoomChange`, `onScroll` at corresponding interaction points
- [x] G-DRIFT-01: Change `category` from `'scheduling'` to `'data'` in `scheduling-renderer-definitions.ts`
- [x] G-DRIFT-02: Remove dead `body` region from definitions or wire it in `gantt.tsx`
- [x] G-DRIFT-03: Normalize `link.type` in store or fix demo to use long-form consistently; add `normalizeLinkType` utility
- [x] G-DRIFT-04/05: Declared-but-unused props: add `@deprecated` JSDoc or consume; add focused verification

Exit Criteria:

> All `[x]` before Phase Status → `completed`.

- [x] Sticky header stays visible during vertical scroll (verified by DOM inspection or e2e screenshot)
- [x] Scale range snaps to unit boundaries (verified by store test)
- [x] Weekend highlighting correct across UTC timezones (verified by unit test with mocked timezone)
- [x] Empty/loading states render when no tasks provided (verified by integration test)
- [x] Link handles distinguish start vs end; link type inferred from both sides (verified by unit test)
- [x] All interaction events dispatched at corresponding points (verified by spy tests)
- [x] All contract drift items resolved (category, body region, link type normalization, unused props)
- [x] `packages/flux-renderers-scheduling/src/gantt/` focused tests pass

### Phase 2 — Kanban P2/P3 Residual Fixes

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`

- Item Types: `Fix`, `Proof`, `Follow-up`

- [x] K-DISP-06: Add `measureElement` to virtualizer; default virtualization to off (matching design §12.2 guidance)
- [x] K-DISP-07: Change `KanbanCard` from `<li>` to `<div>` or restructure virtual wrapper for valid HTML nesting
- [x] K-OP-07: Wire "Add Column" as interactive button with inline title input; remove `aria-hidden`
- [x] K-OP-08: Remove or mark `@deprecated` on unused exports `useKanbanAdder` / `useKanbanCollab`
- [x] K-OP-09: Remove dead `columnsConfig` field from types or wire it; fix misleading comment in definitions
- [x] K-OP-10: Add UI entry point for card deletion (context menu or delete button on card); wire `onCardRemove` event
- [x] K-OP-11: In controlled mode, undo/redo surfaces a console warning instead of silently failing
- [x] K-OP-12: Equal column width → `flex-1` distribution; implement roving `tabindex` for card list
- [x] K-DRIFT-03: Remove dead `body` region from Kanban types
- [x] K-DRIFT-04: Make `filterCard` type and runtime check consistent (support both string expression and function)
- [x] K-DRIFT-05: Fix `moveCardKeyboard` parameter/call inconsistency; add memoization
- [x] DnD refactor `Follow-up`: Re-register drop zones as per-component ref registration (RKK pattern); verify `useMemo(wipOverLimitColumns)` remains as safety layer

Exit Criteria:

> All `[x]` before Phase Status → `completed`.

- [x] Virtualizer correctly measures element sizes (verified by unit test with varied card heights)
- [x] HTML nesting is valid (verified by DOM inspection)
- [x] Add Column button is interactive (verified by integration test)
- [x] Unused hooks removed or explicitly deprecated
- [x] `columnsConfig` either removed or properly wired
- [x] Card deletion available via UI (verified by integration test)
- [x] Controlled mode undo/redo warns instead of silently failing (verified by spy test)
- [x] Equal width uses `flex-1`; roving `tabindex` produces N=1 tab stops (verified by test)
- [x] All contract drift items resolved
- [x] DnD refactor produces stable ref registrations (verified by render-count test)
- [x] `packages/flux-renderers-scheduling/src/kanban/` focused tests pass

### Phase 3 — Calendar P2/P3 Residual Fixes + Dead Components

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`

- Item Types: `Fix`, `Decision`, `Proof`

- [x] C-DISP-06: Remove `data-slot="calendar-cell"` from weekday header cells; use `role="columnheader"` + non-conflicting class
- [x] C-DISP-07: Unify cross-day SVG coordinates to pixels via `getBoundingClientRect`; add `viewBox`
- [x] C-DISP-08: Call `detectConflicts` (utils/calendar-layout-utils.ts:170) instead of naive `dayEvents.length > 1` check
- [x] C-DISP-09: Add built-in empty/loading skeleton fallback matching design §10 spec
- [x] C-OPS-03: Add `data-drop-target` + ok/conflict classes to hovered cells; center ghost with `translate(-50%, -50%)`
- [x] C-OPS-05: Fix keyboard Enter/Space handler to synthesize cell-center coordinates instead of casting `KeyboardEvent` as `PointerEvent`
- [x] C-DRIFT-02: Align `CalendarResource.text` vs `title` — keep only `title` per design
- [x] C-DRIFT-03: Wire declared events (`onEventCreate`, `onBatchSchedule`, `onImport`, etc.) and component actions (`print`, `exportPNG`, `importICal`, `exportToICal`); update design §8 event table
- [x] C-DRIFT-04: Either wire `CalendarResourceGroup`/`CalendarResourceHeader` or remove dead exports
- [x] C-DRIFT-05: Change `firstDayOfWeek` default to 1 (Monday) for zh-CN ERP locale
- [x] C-DRIFT-06: Document multi-day end inclusivity semantics; update demo to match
- [x] Calendar dead components: For each of `CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal` — either (a) remove entirely with test cleanup, or (b) wire to main Calendar renderer with schema integration

Exit Criteria:

> All `[x]` before Phase Status → `completed`.

- [x] Header cells no longer match `getCellFromPoint` query selector (verified by unit test)
- [x] Cross-day SVG uses uniform pixel coordinates with viewBox (verified by test rendering)
- [x] Conflict detection uses interval-based overlap check (verified by unit test with non-overlapping events in same cell)
- [x] Empty/loading states render skeleton matching design §10 (verified by integration test)
- [x] Drag ghost renders with `translate(-50%, -50%)` + `data-drop-target` markers (verified by test)
- [x] Keyboard Enter/Space creates events at cell center (verified by spy test)
- [x] All contract drift items resolved
- [x] Dead components either removed (with test cleanup) or wired as functional features (with schema integration)
- [x] `docs/components/calendar/design.md` §8 event table updated
- [x] `packages/flux-renderers-scheduling/src/calendar/` focused tests pass

### Phase 4 — Barcode P2/P3 Residual Fixes

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/`

- Item Types: `Fix`, `Proof`

- [x] B-DISP-03: Add missing CSS: scan-button hover (`#f1f5f9`) / active (`scale(0.95)`), close-button hover, backdrop fade-in 200ms, video scale transition
- [x] B-DISP-04: Add i18n strings for "recognizing" / "recognition failed, please retry" status messages; update overlay
- [x] B-DISP-05: Fix duplicate `data-slot="barcode-scanner-status"` — assign unique selectors per element
- [x] B-OP-03: Replace `getUserMedia` probe with `enumerateDevices` + `isSecureContext`; cache result in mount effect
- [x] B-OP-05: Replace all-angles-per-frame with single-angle polling (`skewIndexRef++ % SKEW_ANGLES.length`); fix rotation canvas dimensions
- [x] B-OP-06: Fix effect deps — use `[]` and read events via ref
- [x] B-OP-07: Clear scan result at end of single-scan session; deduplicate identical barcode in continuous mode
- [x] B-CD-01: Update design doc `sourcePackage` to `scheduling` (or move package per design §3)
- [x] B-CD-02: Verify schema compiler auto-flatten for nested `events.onScan`; fix if not supported
- [x] B-CD-03: Add zxing ponyfill name mapping for `BarcodeFormat`
- [x] B-CD-04: Implement proper failure codes in `scanNow` / `stopScan` handles per design §8
- [x] B-CD-05: Document or remove undocumented features (`batchMode`, `torchButton`, `onBatchScan`); update design doc

Exit Criteria:

> All `[x]` before Phase Status → `completed`.

- [x] CSS hover/active/transition styles match design §10 spec (verified by visual inspection or style test)
- [x] State machine text uses i18n keys (verified by i18n test)
- [x] No duplicate `data-slot` values in overlay (verified by DOM query)
- [x] Camera probe is lightweight — no `getUserMedia` on every scan (verified by spy test)
- [x] Skew retry uses single-angle polling per frame (verified by test with controlled timing)
- [x] Effect deps are stable — cleanup/setup fires only on mount/unmount (verified by render-count test)
- [x] Scan result cleared between sessions; continuous mode deduplicates (verified by integration test)
- [x] All contract drift items resolved or documented in design doc
- [x] `packages/flux-renderers-scheduling/src/barcode-input/` focused tests pass

## Draft Review Record

> Reviewed per `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule. Consensus reached (0 Blocker, 0 Major).

- Reviewer / Agent: `ses_076ac3d22ffeOihJzVrAPdUDrQ` (independent sub-agent, fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor #1: `layout-utils.ts:143` → `calendar-layout-utils.ts:170` (corrected file path and line number)
  - Minor #2: G-DISP-11 live code already uses `getUTCDay()`; changed to verification-only item with test guard
  - Minor #3: DnD refactor reclassified from `Fix` to `Follow-up` (optimization candidate)
  - Minor #4: Defect count updated from ~44 to ~51

## Closure Gates

> All items must be `[x]` before `Plan Status` can be changed to `completed`.

- [x] All P2/P3 residual defects across Gantt, Kanban, Calendar, Barcode are fixed per Phase exit criteria
- [x] Calendar dead components resolved (removed or wired)
- [x] All contract drift items (G-DRIFT, K-DRIFT, C-DRIFT, B-CD) are resolved
- [x] No deferred P2-level defects remain in scheduling package
- [x] Focused tests added or updated for each fix category
- [x] Affected design docs (`docs/components/{gantt,kanban,calendar,barcode-input}/`) updated to reflect resolved drift items
- [x] By independent sub-agent (fresh session) executed closure-audit completed and recorded; execution session may not self-audit this item
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Cross-cutting convention alignment items

Raw HTML → `@nop-chaos/ui` replacements (17 locations), `useCallback`/`useMemo` overuse cleanup (15+ sites), GanttStore class → functional factory, Gantt ad-hoc React Context removal, Calendar hardcoded locale.

- Classification: `out-of-scope improvement` / `optimization candidate`
- Why Not Blocking Closure: These are architecture/convention hygiene tasks with zero user-visible impact. No functional correctness depends on them. Raw HTML renders correctly; React Compiler handles memoization; GanttStore wrapper is functional; GanttContext is architecturally valid for its purpose; Calendar locale is a feature gap.
- Successor Required: `no`

### Diff-view Playwright e2e tests

- Classification: `watch-only residual`
- Why Not Blocking Closure: Diff-view has unit and integration tests. E2e coverage would improve confidence but is not required for defect closure.
- Successor Required: `no`

### GanttStore `recalcLayout` vs `computeComputedPropertiesInternal` duplication

- Classification: `optimization candidate`
- Why Not Blocking Closure: Both paths produce correct results. Duplication is a maintenance concern, not a correctness bug.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Screen-reader a11y e2e testing for scheduling components — requires tooling infrastructure investment; out of scope.
- Calendar hardcoded locale — remains gated on i18n infrastructure; flagged as out-of-scope improvement.

## Closure

Status Note: All 4 phases landed and verified against live repo. Minor residual docs/code gaps fixed during audit (K-DRIFT-03 body type removed, B-CD-01 sourcePackage doc updated, B-CD-05/B-DISP-05 design doc references cleaned). Zero deferred P2-level defects remain. Plan closure approved.

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent, fresh session (closure audit per MISSION_DRIVER)
- Evidence: Live code verification of all 4 phases completed. Gantt (10/10 items confirmed), Kanban (12/12 items confirmed, 1 fixed during audit), Calendar (12/12 confirmed), Barcode (12/12 items confirmed, 3 design doc fixes during audit). Design docs updated. `pnpm typecheck/build/lint/test` all pass.

Follow-up:

- No remaining plan-owned work after all 4 phases landed and closure gates verified.
