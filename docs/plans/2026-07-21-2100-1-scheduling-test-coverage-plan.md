# Scheduling Package Test Coverage and Performance Baseline

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/components/roadmap-scheduling.md` cross-cutting test strategy, deferred items from S6/S7 Kanban plans and S4 Calendar plan
> Related: `docs/plans/2026-07-20-2000-2-s6-kanban-core-plan.md`, `docs/plans/2026-07-20-2100-2-s7-kanban-advanced-plan.md`, `docs/plans/2026-07-20-0800-3-s4-calendar-core-plan.md`

## Purpose

Close the three largest test-coverage gaps remaining in the scheduling package: Kanban Playwright E2E tests, calendar component rendering integration tests, and performance baseline verification. No functional changes — measurement and verification only.

## Current Baseline

- All 5 scheduling components have colocated focused unit tests (store, hooks, utils)
- Kanban has **zero** Playwright E2E tests — no cross-column drag, filter, add/remove column/card, or undo/redo covered
- Calendar has utility-date-unit tests + virtualizer-unit tests but **zero** component rendering integration tests (month/week/day view output, event positioning, collision detection, multi-day split)
- Diff-view/Barcode have Playwright demo pages but no performance baseline measurement committed
- Performance targets are defined in roadmap-scheduling.md but never verified against live code
- `tests/e2e/` has no scheduling-specific Playwright test files at all — neither kanban, calendar, gantt, nor diff-view e2e coverage exists

## Goals

- Kanban Playwright E2E tests covering cross-column card drag, text filter, column add/remove, undo/redo
- Calendar Playwright E2E tests covering month view, week view, event rendering, day click
- Performance baseline measurement for Kanban (20×300 cards at 60fps drag) and Calendar (300×31, first screen < 500ms)
- Snapshot-based verification for key card-drag edge cases
- Document deferred items that remain truly non-blocking after this sweep

## Non-Goals

- Gantt e2e tests (out of scope for this plan; deferred to separate test-enhancement pass)
- Barcode e2e tests (require camera hardware mock, deferred per design doc)
- Diff-view e2e tests (deferred from S9 plan as optimization candidate)
- Any functional changes or bug fixes
- Undo system unification (separate plan scope)
- CI integration or coverage threshold enforcement

## Scope

### In Scope

- Kanban Playwright E2E test file at `tests/e2e/kanban-demo.spec.ts` (drag cross-column, text filter, add/remove column/card, undo/redo)
- Calendar Playwright E2E test file at `tests/e2e/calendar-demo.spec.ts` (month/week view switch, event visibility, day click, conflict badge, resource grouping)
- Card drag snapshot-based testing — programmatic verification of `moveCard`/`moveColumn` outcome states against known input layouts
- Performance baseline: scripted Kanban drag replay (20 columns × 300 cards at 60fps) and Calendar first-screen timing (300 resources × 31 days)
- Calendar html2canvas export quality assessment and limitation documentation
- Roadmap status update: mark test gaps as addressed

### Out Of Scope

- Any barcode-input or diff-view test expansion
- Gantt test expansion beyond what already exists
- Any functional enhancement or bug fix
- CI pipeline changes or coverage thresholds
- Performance optimization (measurement only)

## Failure Paths

Not applicable — test-only plan, no runtime failure paths.

## Test Strategy

Tier: `必须自动化` — Playwright E2E tests are the primary deliverable; snapshot-based verification uses existing vitest infra.

## Execution Plan

### Phase 1 — Kanban Playwright E2E

Status: completed
Targets: `tests/e2e/kanban-demo.spec.ts`

- Item Types: `Proof`

- [x] Create `tests/e2e/kanban-demo.spec.ts` with test cases for: cross-column card drag, text filter, add/remove column, add/remove card, undo/redo keyboard shortcuts
- [x] Add column-card-limit WIP badge visibility test (S7)
- [x] Verify all tests pass in headless Chromium

Exit Criteria:

- [x] `tests/e2e/kanban-demo.spec.ts` exists with ≥ 6 test cases covering drag, filter, add/remove, undo/redo
- [x] `pnpm test:e2e` — kanban tests all pass

### Phase 2 — Calendar Playwright E2E

Status: completed
Targets: `tests/e2e/calendar-demo.spec.ts`

- Item Types: `Proof`

- [x] Create `tests/e2e/calendar-demo.spec.ts` with test cases for: month/week/day view switch, event rendering (color, position), conflict badge visibility, day click, multi-day event split
- [x] Verify all tests pass in headless Chromium

Exit Criteria:

- [x] `tests/e2e/calendar-demo.spec.ts` exists with ≥ 5 test cases covering view switching, event rendering, conflict detection
- [x] `pnpm test:e2e` — calendar tests all pass

### Phase 3 — Card Drag Snapshot Testing

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.test.ts`

- Item Types: `Proof`

- [x] Add snapshot-style test cases in `kanban-helpers.test.ts` for `moveCard`/`moveColumn` with known BoardData layouts
- [x] Cover edge cases: card to empty column, card to column with existing cards, column reorder, sibling-at-boundary

Exit Criteria:

- [x] New test cases added and passing
- [x] All existing kanban unit tests still pass

### Phase 4 — Performance Baseline Measurement

Status: completed
Targets: `docs/components/roadmap-scheduling.md` (performance baseline section)

- Item Types: `Proof | Follow-up`

- [x] Write a Playwright helper (`tests/e2e/helpers/measure-perf.ts`) that captures fps via `requestAnimationFrame` delta for drag interactions
- [x] Script Kanban drag replay for 20 columns × 300 cards: measure fps using the perf helper
- [x] Script Calendar first-screen timing for 300 resources × 31 days: measure `performance.now()` after SchemaRenderer mount
- [x] Document results in `docs/components/roadmap-scheduling.md` performance baseline section
- [x] If baseline not met, record gap with remediation recommendation

Exit Criteria:

- [x] Performance baseline numbers are documented in roadmap-scheduling.md and can be re-run for regression detection
- [x] Roadmap-scheduling.md performance target table is annotated with current measured values

## Draft Review Record

- Reviewer / Agent: opencode-go/deepseek-v4-flash (fresh independent session)
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - Removed false claim about existing gantt e2e tests from Current Baseline
  - Removed "No regressions in existing gantt e2e tests" from Phase 1 Exit Criteria
  - Changed Non-Goal from "Gantt drag-flow e2e test expansion (already covered)" to honest deferral
  - Fixed Closure Gates: removed non-existent gantt test reference
  - Fixed Phase 4 target ambiguity — now consistently targets roadmap-scheduling.md
  - Added Playwright helper script detail to Phase 4 execution items
- Reviewer / Agent: opencode-go/deepseek-v4-flash (fresh independent session) [Round 2]
- Verdict: `pass`
- Rounds: 2
- Findings addressed: All blocker/major findings from Round 1 resolved; no remaining issues in Round 2

## Closure Gates

- [x] All Kanban Playwright E2E test cases pass on headless Chromium
- [x] All Calendar Playwright E2E test cases pass on headless Chromium
- [x] Card drag snapshot tests pass
- [x] Performance baseline numbers documented in roadmap-scheduling.md
- [x] No regressions in existing scheduling package unit tests
- [x] By independent sub-agent (fresh session) executed closure-audit passed and evidence recorded; execution session must not self-audit or check this item
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm test:e2e`

## Deferred But Adjudicated

### Calendar html2canvas Export Quality Tuning

- Classification: `optimization candidate`
- Why Not Blocking Closure: This plan documents the known limitation (large calendars may clip in PNG export) with a workaround (print → PDF). Actual quality tuning is a visualization enhancement that does not affect correctness or testability.
- Successor Required: `no`

### Barcode-input E2E Tests

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Barcode e2e tests require hardware camera mock or real device. Not feasible in headless Playwright environment without specialized infrastructure. Manual playground verification remains the primary validation path.
- Successor Required: `no`

### Performance Optimization

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: This plan is measurement-only. If baselines are not met, optimization belongs in a separate scope with its own design and exit criteria.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Performance baseline results that fall short of targets should trigger a dedicated remediation plan
- `docs/components/roadmap-scheduling.md` should be updated to note that test gaps from S4/S6/S7 plans are closed

## Closure

Status Note: All 4 phases completed. Kanban/Calendar Playwright E2E test files exist and pass, card drag snapshot tests added to kanban-helpers.test.ts, performance baseline helper and scripts created, measured values documented in roadmap-scheduling.md.

Closure Audit Evidence:

- Auditor / Agent: opencode-go/deepseek-v4-flash (fresh independent closure audit session)
- Evidence:
  - Phase 1: `tests/e2e/kanban-demo.spec.ts` — 6 test cases (drag, filter, add/remove, undo/redo) — verified present and passing
  - Phase 2: `tests/e2e/calendar-demo.spec.ts` — 6 test cases (view switch, event rendering, conflict detection) — verified present and passing
  - Phase 3: `kanban-helpers.test.ts` — snapshot tests for `moveCard`/`moveColumn` covering cross-column, empty column, boundary indices — verified present
  - Phase 4: `tests/e2e/helpers/measure-perf.ts` (FPS capture + timing helper), `tests/e2e/kanban-perf.spec.ts`, `tests/e2e/calendar-perf.spec.ts` — all created; results documented in `docs/components/roadmap-scheduling.md` §性能基线 with measured values and gap analysis
  - All exit criteria verified against live repo — no hollow/placeholder implementations found
  - Deferred items classified honestly (optimization candidate / out-of-scope improvement) — no in-scope live defects disguised as deferrals
  - Daily log: `docs/logs/2026/07-21.md` records execution and verification

Follow-up:

- No remaining plan-owned work. Performance remediation belongs in a successor plan if targets not met.
