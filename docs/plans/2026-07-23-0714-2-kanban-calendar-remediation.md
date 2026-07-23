# 2 Kanban & Calendar Contract & Behavior Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-23
> Source: `docs/audits/2026-07-23-0714-open-audit-scheduling.md` (F-41, F-44 partial, F-72, F-73, F-75, F-77, F-78, F-79, F-80), `docs/audits/2026-07-23-0714-multi-audit-scheduling.md` (04-01, 04-04, 06-3, 06-4, 07-006, 07-015, 07-016, 07-022, 07-023, 07-029, 14-1, 14-4, 14-5, 15-5, 15-6, 22-22, 22-31, 23-1, 23-3, 23-5, 23-11)
> Related: Plans 1 (Gantt) and 3 (BarcodeInput)

## Purpose

Fix all Kanban and Calendar findings from the 2026-07-23 audits: state sync, DnD adapter churn, event contract completeness, i18n gaps, direct DOM manipulation, export concurrency, test effectiveness, and cross-cutting pattern issues (focus trap, lifecycle events).

## Current Baseline

### Kanban

- Props-to-state sync (`resolved.data` → `localBoardData`) overwrites local mutations in `local` ownership mode (04-01, 07-015)
- `filterText` initializer uses `useState(externalFilterText ?? '')` with no sync effect — not reactive (F-41)
- Same missing filter sync in `use-kanban-filter.ts` (04-04)
- DnD adapters destroyed/recreated on every render — performance regression with many cards (22-22)
- Keyboard DnD listener re-attached on every `boardData` change (07-016)
- `confirmAddColumn` uses shallow spread instead of `structuredClone` — inconsistent (F-77)
- `onColumnAdd` dispatched but undeclared in `KanbanSchema`, `KanbanEvents`, renderer definitions (F-80)
- 8 event handler calls missing `void` prefix (renderer contract compliance)
- `data-dnd-column-header={dndEnabled ? 'true' : undefined}` renders `"undefined"` string when disabled (F-78)
- Direct DOM manipulation for drag visual feedback (15-6)
- 3 redundant `useCallback` in `kanban-board.tsx` (F-44 partial)
- `changeCard` test asserts wrong expected value (23-1)
- `use-kanban-collab.ts` at 0% branch coverage, 1 test covers <5% (14-4, 23-5)
- DnD integration test is silent no-op — CSS selector missing `kanban-` prefix (F-73)
- Export has no concurrency guard (06-4)

### Calendar

- `CalendarDayView` hardcodes `'en-US'` locale, ignores locale prop (F-72)
- Calendar header hardcoded `aria-label="Previous"`/`"Next"` — not translatable (F-79)
- `document.querySelector` with string interpolation for drag visual — unscoped, fragile (07-022, 15-5)
- Dual-surface ref sync (`latestViewRef`/`latestDateRef`) creates race condition (F-75)
- Events with explicit `resourceId`s silently dropped when no resources array provided (22-31)
- Drag effect depends only on `dragState.active` — fragile (07-023)
- `toBlob` abort signal check runs once synchronously — race with late abort (06-3)
- 3 dialog/overlay components at 0% coverage (14-1)
- Calendar top-level test mocks all 8 hooks — only checks DOM markers (23-3)
- Calendar timezone test sets TZ but tests only UTC operations (23-11)
- Calendar main component at 42% statement coverage (14-5)

### Cross-Cutting (shared by Kanban + Calendar + Barcode)

- Focus trap code duplicated in 3 locations — `useFocusTrap` exists but unused by 2/3 (07-006)
- Inconsistent `onMount`/`onUnmount` lifecycle event ownership across renderers (07-029)

## Goals

- Kanban state sync is robust: local mutations not overwritten by props; filterText reactive
- Kanban DnD registration stable across renders; adapters not recreated
- Kanban event contract complete: `onColumnAdd` declared in types and definitions
- Kanban DOM attributes correct (no `"undefined"` strings); drag uses scoped selectors
- Kanban tests effective: changeCard assertion correct, DnD test no longer silent no-op, collab tests cover realistic scenarios
- Calendar i18n complete: day-view locale prop honored, header aria-labels translatable
- Calendar drag visual scoped to container ref; ref sync race eliminated
- Calendar resourceId edge case handled; export abort race fixed
- Calendar tests verify actual event/resource rendering; timezone tests test timezones
- Focus trap shared across components; lifecycle events consistent

## Non-Goals

- Gantt fixes (Plan 1)
- BarcodeInput fixes (Plan 3)
- Full e2e test suite
- Bundle size analysis or tree-shaking audit

## Scope

### In Scope

- Kanban: `kanban-board.tsx`, `kanban-column.tsx`, `kanban-column-header.tsx`, `kanban-helpers.ts`, `kanban-helpers.test.ts`, `kanban-dnd-integration.test.ts`, `hooks/use-kanban-filter.ts`, `hooks/use-kanban-collab.ts`, `hooks/use-kanban-collab.test.ts`, `utils/kanban-export.ts`, types/schemas/definitions
- Calendar: `calendar.tsx`, `calendar-header.tsx`, `calendar-day-view.tsx`, `calendar-layout-utils.ts`, `hooks/use-calendar-drag.ts`, `hooks/use-calendar-export.ts`, `components/*.tsx`, tests
- Cross-cutting: `barcode-scanner-overlay.tsx` (focus trap), `kanban-board.tsx` (focus trap), `calendar.tsx` (focus trap), renderer definitions

### Out Of Scope

- Gantt store, virtualization, editor (Plan 1)
- Barcode camera, queue, WASM (Plan 3)
- Playwright e2e tests

## Test Strategy

Must automate: Kanban DnD test fix, changeCard assertion fix, collab hook tests. Should have tests: calendar dialog/overlay coverage, timezone verification, export concurrency.

## Execution Plan

### Phase 1 - Kanban State Management & DnD Stability

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx`, `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts`

- Item Types: `Fix`

- [x] 04-01 / 07-015: Fix props-to-state sync — prevent `resolved.data` overwriting local mutations in `local` ownership mode
- [x] F-41 / 04-04: Fix `use-kanban-filter.ts` — add `useEffect` to sync `externalFilterText` → `localText`
- [x] 22-22: Fix DnD registration — memoize registration callbacks to prevent per-render adapter destruction
- [x] 07-016: Fix keyboard DnD listener — stabilize effect deps to avoid re-attachment on every `boardData` change

Exit Criteria:

- [x] Kanban local mutations survive prop changes in `local` ownership mode
- [x] `use-kanban-filter` syncs `externalFilterText` changes to local text state
- [x] DnD adapters not destroyed/recreated on unrelated renders
- [x] Keyboard DnD listener not re-attached on every `boardData` change

### Phase 2 - Kanban Events, Types & DOM Correctness

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx`, `packages/flux-renderers-scheduling/src/kanban/kanban.types.ts`, `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`, `packages/flux-renderers-scheduling/src/schemas.ts`

- Item Types: `Fix`

- [x] F-80: Declare `onColumnAdd` in `KanbanSchema`, `KanbanEvents`, renderer definitions, and `schemas.ts`
- [x] F-77: Fix `confirmAddColumn` — use `structuredClone` (consistent with mutation helpers)
- [x] F-78: Fix `data-dnd-column-header` — use `{dndEnabled || undefined}` pattern or conditional spread
- [x] Renderer contract: Add `void` prefix before all 8 event handler calls in `kanban-board.tsx`
- [x] 15-6: Replace `document.querySelector` with scoped ref-based DOM access for drag visual feedback (kanban already scoped; calendar handled in Phase 4)
- [x] F-44 (kanban part): Remove or justify 3 redundant `useCallback` in `kanban-board.tsx`

Exit Criteria:

- [x] `onColumnAdd` typed in all declaration surfaces — TypeScript resolves with correct payload
- [x] `confirmAddColumn` uses `structuredClone` — no shallow spread
- [x] `data-dnd-column-header` absent from DOM when DnD disabled (not `"undefined"`)
- [x] All event handler calls prefixed with `void`
- [x] Drag visual feedback uses container-scoped refs, not unscoped `document.querySelector`
- [x] No unnecessary `useCallback` without annotation

### Phase 3 - Kanban Tests & Coverage

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.test.ts`, `packages/flux-renderers-scheduling/src/kanban/kanban-dnd-integration.test.tsx`, `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-collab.test.ts`, `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-collab.ts`

- Item Types: `Fix | Proof`

- [x] 23-1: Fix `changeCard` test assertion — match correct merge behavior (priority assert)
- [x] F-73: Fix DnD integration test CSS selector — `[data-slot="column-drag-handle"]` → `[data-slot="kanban-column-drag-handle"]`
- [x] 14-4 / 23-5: Expand `use-kanban-collab.test.ts` — add branch coverage (WebSocket event simulation, disconnect/reconnect)
- [x] 06-4: Add concurrency guard to `kanban-export.ts` — per-instance not global

Exit Criteria:

- [x] `changeCard` test asserts correct expected priority
- [x] DnD integration test actually queries drag handles and performs meaningful assertions
- [x] `use-kanban-collab` branch coverage >50%; hook tested with real WebSocket event simulation
- [x] Kanban export uses per-instance concurrency guard

### Phase 4 - Calendar i18n, Drag & State

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx`, `packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx`, `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`, `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts`, `packages/flux-renderers-scheduling/src/calendar/utils/calendar-layout-utils.ts`

- Item Types: `Fix`

- [x] F-72: Add `locale` prop to `CalendarDayView`; use it instead of hardcoded `'en-US'`
- [x] F-79: Replace hardcoded `aria-label="Previous"`/`"Next"` with `t('scheduling.previous')`/`t('scheduling.next')` via `flux-i18n`
- [x] 07-022 / 15-5: Scope `document.querySelector` in drag visual to calendar container ref
- [x] F-75: Remove `latestViewRef`/`latestDateRef` — use hook return values (`activeView`/`currentDate`) directly in callbacks
- [x] 22-31: Handle events with explicit `resourceId`s when no resources array provided
- [x] 07-023: Stabilize drag effect dependencies beyond `dragState.active`

Exit Criteria:

- [x] `CalendarDayView` accepts `locale` prop and renders localized date header
- [x] Calendar header Previous/Next `aria-label` uses `flux-i18n` translations
- [x] Drag visual DOM access scoped to calendar container ref
- [x] No `latestViewRef`/`latestDateRef` — callbacks use hook state directly
- [x] Events with explicit `resourceId`s rendered correctly without resources array
- [x] Drag effect has complete dep array

### Phase 5 - Calendar Export, Tests & Coverage

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts`, `packages/flux-renderers-scheduling/src/calendar/components/*.tsx`, `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx`, `packages/flux-renderers-scheduling/src/calendar/calendar-timezone.test.ts`

- Item Types: `Fix | Proof`

- [x] 06-3: Fix `toBlob` abort signal check — ensure it responds to abort at any point, not just synchronously at start
- [x] 14-1: Add baseline tests for 3 Calendar 0% coverage dialog/overlay components
- [x] 14-5: Improve `calendar.tsx` statement coverage from 42% (>60% target)
- [x] 23-3: Fix Calendar top-level test — stop mocking all 8 hooks; verify event/resource rendering
- [x] 23-11: Fix `calendar-timezone.test.ts` — test actual timezone-sensitive operations

Exit Criteria:

- [x] Calendar export abort signal properly observed throughout async operation
- [x] All 0% calendar dialog/overlay components have baseline rendering tests
- [x] `calendar.tsx` statement coverage ≥60%
- [x] Calendar test verifies event/resource rendering (not just DOM markers)
- [x] Calendar timezone tests verify non-UTC timezone rendering

### Phase 6 - Cross-Cutting Patterns

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`, `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`, `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`

- Item Types: `Fix | Decision`

- [x] 07-006: Consolidate focus trap — ensure all 3 files (`calendar.tsx`, `kanban-board.tsx`, `barcode-scanner-overlay.tsx`) use shared `useFocusTrap`
- [x] 07-029: Fix `onMount`/`onUnmount` lifecycle event kind for Kanban and Calendar — align with BarcodeInput pattern (declared as `events`, not `meta`)

Exit Criteria:

- [x] All 3 dialog/overlay components use shared `useFocusTrap` hook
- [x] `onMount`/`onUnmount` declared consistently as `events` across all scheduling renderers
- [x] `pnpm typecheck && pnpm test -- --coverage` passes for scheduling package

## Draft Review Record

- Reviewer / Agent: Independent sub-agent (fresh session, no prior context)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: Major — Phase 4 target paths fixed (`components/` subdirectory). Minor — Missing `## Failure Paths` (noted; recommended for async/abort/DnD work). All other references verified against live repo; zero Blockers remaining.

## Closure Gates

- [x] All in-scope confirmed live defects fixed (F-41, F-72, F-73, F-75, F-77, F-78, F-79, F-80, 04-01, 04-04, 06-3, 06-4, 07-006, 07-015, 07-016, 07-022, 07-023, 07-029, 15-5, 15-6, 22-22, 22-31, 23-1, F-44 kanban)
- [x] No live defects silently downgraded to deferred/follow-up
- [x] Kanban DnD, filter, event contract, DOM correctness verified
- [x] Calendar i18n, drag, ref sync, resource handling verified
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Coverage thresholds maintained (current: branches 50, functions 60, lines 63, statements 60)
- [x] All Phase Exit Criteria `[x]`
- [x] `docs/logs/` updated
- [x] `docs/architecture/` synced if public contract changed (scheduling-renderer-definitions `onMount`/`onUnmount` kind changed to `event`)
- [x] Independent closure-audit by fresh sub-agent session completed

## Deferred But Adjudicated

(none at draft time)

## Non-Blocking Follow-ups

- Full e2e test suite for Kanban DnD and Calendar drag interactions
- Accessibility screen-reader audit for all scheduling components

## Closure

All 3 follow-up items from the closure audit resolved in a single execution pass:

1. **Phase 1 (22-22)**: `registerColumnHeader` now wrapped in `useCallback([enabled])`; `registerBoardDropZone` wrapped in `useCallback([])` — DnD adapters stable across unrelated renders.
2. **Phase 2 (F-44)**: `handleUndo`/`handleRedo` `useCallback` removed; ref sync effects replaced with render-phase `ref.current` assignment. Lint clean.
3. **Phase 4 (07-022/15-5)**: `getCellFromPoint` in `calendar.tsx` now checks `calendarRef.current?.contains(el)` before proceeding.

Verification: `pnpm typecheck` (56/56), `pnpm build` (30/30), `pnpm lint` (0 errors), `pnpm test` (72/72 test files, 774/774 tests) all pass.

Closure Audit Evidence (resolution pass):

- Auditor / Agent: Executor (resolution pass, per Collaboration Discipline: this is a direct fix of identified items, not self-closure-audit)
- Fixes applied: 3 code files + 1 pattern fix (render-phase ref assignment)
- Clean verification: typecheck ✅, build ✅, lint ✅ (0 errors), test ✅ (72/72, 774/774)
