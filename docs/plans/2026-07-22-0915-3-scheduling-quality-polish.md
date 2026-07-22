# 3 — Scheduling Test Quality & Code Convention Cleanup

> Plan Status: active
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-22-0908-multi-audit-scheduling.md` (D01-01/02/03/04/05/06/07, D21-05/06/12/16, D23-01/02/03/04/05/06/07/09/10/11/12/13/14/15), `docs/audits/2026-07-22-0908-open-audit-scheduling.md` (#1, #2, #3, #4, #10, #11, #12)
> Related: `docs/plans/2026-07-22-0915-1-scheduling-timezone-correctness.md`, `docs/plans/2026-07-22-0915-2-scheduling-contract-drift.md`

## Purpose

Eliminate false-green test coverage (over-mocked root tests, tautological assertions, dead-code tests) and bring `flux-renderers-scheduling` code into compliance with project conventions (ui components, no ad-hoc context, no unused hooks, no dead code, proper error handling, correct dependency boundaries).

## Current Baseline

- Gantt root test mocks every sub-component and hook — only asserts `<div className="nop-gantt">` exists
- Calendar root test mocks all 9 hooks — wiring bugs invisible
- Kanban DnD integration test mocks all DnD adapters as no-ops
- Calendar view tests mock `CalendarEventBlock` — event positioning never validated
- `gantt-visual-states.test.tsx` renders hand-crafted HTML, not real components
- BarcodeScannerOverlay mocks both barcode hooks — detection pipeline untested
- 4 dead-code test files (`CalendarResourceGroup`, `CalendarResourceHeader`, `KanbanWipBadge`, `useKanbanCollab`) exercise unreachable components
- Timezone-sensitive date assertions use local getters (covered by Plan 1)
- 11 test files/tests with zero assertions or misleading titles
- 17 raw HTML element locations across all 4 sub-packages violating AGENTS.md ui component mandate
- Ad-hoc React Context in Gantt violating "NEVER create ad-hoc React contexts" rule
- 4 unused hook call sites (dead subscriptions causing re-renders)
- 15+ `useCallback`/`useMemo` sites redundant with React Compiler
- Dead code: `_dirty` flag, `_handleCardRemove`, `shouldMerge`, dead ternary, duplicate tree utils, unused exports
- Silent catch in Kanban filter expression evaluation
- Dependency boundary issues: flux-runtime rule (c), flux-renderers-form-advanced cross-renderer deps, flux-code-editor inverted dep, flux-i18n test import bypass, flux-renderers-content missing devDep, flux-bundle CSS path, rule (c) doc contradiction

## Goals

- Every scheduling component has at least one integration test that exercises real sub-components and real state
- All "tautological"/"false-green" tests are replaced with meaningful assertions
- Dead-code test files for unreachable components are removed
- All test assertions are meaningful — no zero-assertion tests
- All raw HTML elements replaced with `@nop-chaos/ui` components
- Gantt ad-hoc React Context removed in favor of sanctioned flux-react hooks
- Unused hook calls removed (dead subscriptions)
- `useCallback`/`useMemo` overuse cleaned up (delegated to React Compiler)
- Dead code removed or wired
- Kanban silent `catch` replaced with proper error reporting
- Dependency boundary issues documented and fixed

## Non-Goals

- No full architectural rewrite of `flux-renderers-scheduling` (scope is test quality + convention cleanup)
- No i18n/locale implementation (deferred)
- No design system changes

## Scope

### In Scope

- Replace Gantt, Calendar, Kanban, Barcode root-level over-mocked tests with real integration tests
- Delete or rewrite tautological tests (`gantt-visual-states`, `gantt-editor` store tests, `gantt-interactions` store tests)
- Remove dead-code test files (CalendarResourceGroup, CalendarResourceHeader, KanbanWipBadge, useKanbanCollab)
- Fix zero-assertion tests (useKanbanColumnResize, false-positive barcode click test)
- Fix misleading test titles (useGanttKeyboard, Calendar navigation)
- Replace raw HTML with ui components across all 4 sub-packages
- Remove Gantt ad-hoc React Context; use `useRendererRuntime`/`useScopeSelector` instead
- Remove dead `useRendererRuntime()` and `useRenderScope()` calls
- Clean up `useCallback`/`useMemo` overuse (15+ sites)
- Remove dead code: `_dirty`, `_handleCardRemove`, `shouldMerge`, dead ternary, duplicate tree utils (`flattenTree`, `toggleOpen`, `expandAll`, `collapseAll`), unused exports (`useKanbanAdder`, `useKanbanCollab`)
- Fix Kanban silent `catch` — log or dispatch error event
- Add Calendar default skeleton loading fallback
- Fix Gantt grid minimum height when no tasks
- Fix Calendar "no schedule data" redundancy
- Fix Gantt milestone `$w` misleading value
- Fix baseline deviation label y-clamp
- Fix dependency boundary issues (D01-01 through D01-07)
- Fix GanttStore class `getSnapshot` method

### Out Of Scope

- Full function-level test coverage of every edge case
- Performance profiling
- Accessibility audit beyond code patterns
- Locale/i18n implementation

## Test Strategy

**必须自动化** — test quality fixes must include the new integration tests that replace removed false-green tests. The proof is the test suite itself.

## Execution Plan

### Phase 1 — Test effectiveness overhaul

Status: planned
Targets: `packages/flux-renderers-scheduling/src/` test files

- Item Types: `Fix | Proof`

- [ ] Gantt root test (`gantt.test.tsx`): remove all sub-component/hook mocks; write integration test with real `GanttStoreProvider` and `useGanttStore` that renders real GanttLayout/GanttHeader and verifies structure
- [ ] Calendar root test (`calendar.test.tsx`): remove all hook mocks; write integration test with minimal real events and real `useCalendarState`
- [ ] Kanban DnD integration test (`kanban-dnd-integration.test.tsx`): replace `@atlaskit/pragmatic-drag-and-drop` no-op mocks with real DnD test utilities; test actual drag-start, drop, and reorder
- [ ] Calendar view tests (`calendar-month-view.test.tsx`, `calendar-week-view.test.tsx`, `calendar-day-view.test.tsx`): remove `CalendarEventBlock` mock in at least one test per view; pass real events; assert positioning
- [ ] Delete `gantt-visual-states.test.tsx`; replace with test rendering real Gantt in loading/empty states
- [ ] Delete dead-code test files: `calendar-resource-group.test.tsx`, `calendar-resource-header.test.tsx`, `kanban-wip-badge.test.tsx`, `use-kanban-collab.test.ts`
- [ ] Fix `use-kanban-column-resize.test.ts` — add assertions for state change and callback invocation
- [ ] Fix `barcode-scanner-overlay.test.tsx` false-positive "call onClose" test — actually click button and assert
- [ ] Fix `use-gantt-keyboard.test.ts` — add ArrowRight case or rename test title
- [ ] Fix `use-calendar-navigation.test.ts` — assert actual date offset, not just `toHaveBeenCalled()`
- [ ] Fix `gantt-editor.test.tsx` — add DOM interaction tests for editor component; remove store-level test duplication
- [ ] Fix `gantt-interactions.test.ts` — remove store-level test calls; add keyboard event simulations
- [ ] Fix `calendar-date-utils.test.ts` — add explicit seconds/milliseconds assertion for `getMonthStartEnd` (D23-09)
- [ ] Fix `use-kanban-collab.test.ts` — add WebSocket mock or remove (dead code path)

Exit Criteria:

- [ ] Gantt, Calendar, Kanban, Barcode each have ≥1 integration test exercising real sub-components
- [ ] No tautological/false-green tests remain
- [ ] All dead-code test files removed
- [ ] All test assertions are meaningful and verify actual behavior
- [ ] Test suite passes after changes

### Phase 2 — Code convention alignment

Status: planned
Targets: `packages/flux-renderers-scheduling/src/`

- Item Types: `Fix | Follow-up`

- [ ] Remove Gantt ad-hoc React Context (`gantt-context.tsx`); replace with `useRendererRuntime()` and `useScopeSelector()` from `@nop-chaos/flux-react`
- [ ] Replace all raw HTML with `@nop-chaos/ui` components: - gantt grid: `<table>` → `Table`, `<thead>` → `TableHeader`, `<tr>` → `TableRow`, `<th>` → `TableHead`, `<tbody>` → `TableBody`, `<td>` → `TableCell`, `<button>` → `Button`, `<input>` → `Input` - gantt scheduler-config: `<select>` → `NativeSelect` - kanban column-header/tag-filter/activity-log: `<button>` → `Button` - kanban card-tags: `<img>` → `Avatar` - calendar batch-scheduler: `<input type="checkbox">` → `Checkbox`, `<input type="radio">` → `RadioGroup/RadioGroupItem`, `<label>` → `Label` - calendar overlay: `<div role="dialog">` → `Dialog` - calendar timezone-selector/resource-group: `<button>` → `Button` - barcode-input: `<span>×</span>` → lucide `X` icon, `<div>` spinner → `Spinner`
- [ ] Remove unused hook calls (dead `_runtime`, `_scope`, `_helpers` destructuring) in gantt.tsx, calendar.tsx, barcode-input.tsx
- [ ] Fix calendar.tsx double `useRenderScope()` call (once dead, once live)
- [ ] Remove `useCallback`/`useMemo` overuse (15+ sites): delegate to React Compiler auto-memoization per project convention
- [ ] Remove dead code: - `_dirty` flag in `gantt-store.ts` (set but never read) - Duplicate tree utils `flattenTree, toggleOpen, expandAll, collapseAll` in `gantt-utils.ts` (unused; `gantt-tree-utils.ts` provides equivalents) - `_handleCardRemove` in `kanban-board.tsx` (defined but never called) - `shouldMerge` in `kanban-undo-stack.ts` (exported, tested, never invoked) - Dead ternary `{!isCurrentMonth ? null : null}` in `calendar-month-view.tsx` - Unused exports `useKanbanAdder`, `useKanbanCollab` from kanban index
- [ ] Fix Kanban silent `catch { /* bad expression */ }` — log error via `console.warn` or dispatch error event

Exit Criteria:

- [ ] No raw HTML elements remain; all use `@nop-chaos/ui` components
- [ ] No ad-hoc React Context in Gantt
- [ ] No unused hook calls (dead subscriptions eliminated)
- [ ] All `useCallback`/`useMemo` overuse cleaned up
- [ ] All dead code removed
- [ ] Kanban filter expression errors reported (not silently swallowed)

### Phase 3 — UX polish and dependency boundaries

Status: planned
Targets: `packages/flux-renderers-scheduling/src/`, `packages/flux-runtime/`, `packages/flux-renderers-form-advanced/`, `packages/flux-code-editor/`, `packages/flux-i18n/`, `packages/flux-renderers-content/`, `packages/flux-bundle/`

- Item Types: `Fix | Follow-up`

- [ ] Calendar: add default skeleton loading fallback for loading region (matching Kanban pattern)
- [ ] Gantt: ensure grid minimum height (≥400px) when no tasks, so today-marker line is visible
- [ ] Calendar month view: remove redundant inner "no schedule data" block or align conditions with outer guard
- [ ] Gantt milestone: set `$w = 0` (milestone diamond ignores width)
- [ ] Gantt baseline deviation label: clamp y to minimum 8px
- [ ] GanttStore: add `getSnapshot()` method for proper `useSyncExternalStore` compatibility
- [ ] Gantt keyboard effect deps: remove `store` class instance from dependency array (new reference every mutation)
- [ ] Fix dependency boundary issues: - D01-01/D01-07: Update audit rule (c) to match AGENTS.md — flux-runtime allowed all lower layers - D01-02: Document allowed inter-renderer dep patterns or extract shared types into flux-core - D01-03: Move `formFieldChromeRules` upward or move code-editor into flux-renderers-\* family - D01-04: Export `./lib/i18n` from ui's package.json exports or move test into ui package - D01-05: Add `@nop-chaos/flux-formula` to flux-renderers-content devDependencies - D01-06: Read from dist/ paths instead of sibling src/ in flux-bundle test

Exit Criteria:

- [ ] Calendar shows default skeleton when loading region not provided
- [ ] Gantt grid has minimum height when no tasks
- [ ] No redundant "no schedule data" in calendar month view
- [ ] Milestone `$w` is 0 (honest representation)
- [ ] Baseline deviation label visible in row 0
- [ ] GanttStore has `getSnapshot()` method
- [ ] Keyboard effect deps do not include full store class instance
- [ ] All dependency boundary issues resolved or documented with explicit plan follow-up

## Draft Review Record

> To be filled after independent sub-agent review.

- Reviewer / Agent: TBD
- Verdict: TBD
- Rounds: TBD
- Findings addressed: TBD

## Closure Gates

- [ ] All over-mocked/false-green tests replaced with real integration tests
- [ ] All dead-code test files removed
- [ ] All raw HTML elements replaced with `@nop-chaos/ui` components
- [ ] Gantt ad-hoc React Context removed
- [ ] No unused hook calls remain
- [ ] `useCallback`/`useMemo` overuse cleaned up
- [ ] All dead code removed
- [ ] Kanban filter expression errors reported
- [ ] Calendar shows skeleton loading fallback
- [ ] Gantt grid minimum height implemented
- [ ] Milestone `$w` set to 0
- [ ] Baseline deviation label y-clamp fixed
- [ ] GanttStore `getSnapshot()` added
- [ ] Keyboard effect deps fixed
- [ ] Dependency boundary issues resolved or documented with successor path
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and documented
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Calendar hardcoded locale (open-audit #12)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Calendar hardcoded to `en-US`; adding locale support requires schema field addition, i18n integration, and all view string extraction. This is a feature gap, not a regression or contract drift.
- Successor Required: No

### GanttStore class → functional factory

- Classification: `optimization candidate`
- Why Not Blocking Closure: Current class wrapper is functional; `getSnapshot()` added in Phase 3 mitigates the main concern. Full factory rewrite is architectural preference, not defect.
- Successor Required: No

## Non-Blocking Follow-ups

- D01-02 (flux-renderers-form-advanced cross-renderer deps): document allowed patterns; not a regression
- D21-08/09/13/14/15/20: lower-severity display polish items addressed in Phases 2-3
- Calendar deprecated components: addressed in Plan 2 Phase 3

## Closure

Status Note: TBD

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- No remaining plan-owned work
